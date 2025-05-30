package main

import (
    "crypto/rsa"
    "database/sql"
    "encoding/base64"
    "encoding/json"
    "fmt"
    "math/big"
    "net/http"
    "os"
    "strings"
    // "time"
	"sync"

    "github.com/golang-jwt/jwt/v4" 
    _ "github.com/go-sql-driver/mysql"

    "time"
    amqp "github.com/rabbitmq/amqp091-go"
)

type Post struct {
    ID           int       `json:"id"`
    Title        string    `json:"title"`
    Price        float64   `json:"price"`
    Size         int       `json:"size"`
    Street       string    `json:"street"`  
    City         string    `json:"city"`
    District     string    `json:"district"`
    CreatedAt    string    `json:"created_at"`
    UpdatedAt    string    `json:"updated_at"`
    Description  string    `json:"description"`
    AvailableFrom string    `json:"available_from"`
    MinRentalPeriod   int       `json:"min_rental_period"`
    Amenities    string    `json:"amenities"`
    Roommates    int       `json:"roommates"`
    Email        string    `json:"email"`  
    Phone        string    `json:"phone"`
	AuthorID 	 string `json:"author_id"` 
	AuthorUsername string `json:"author_username"` 
}

type KeycloakClaims struct {
    Sub               string `json:"sub"`               
    PreferredUsername string `json:"preferred_username"` 
    Email             string `json:"email"`
    RealmAccess       struct {
        Roles []string `json:"roles"`
    } `json:"realm_access"`
    jwt.RegisteredClaims
}


var db *sql.DB
var publicKey *rsa.PublicKey
var publicKeyMutex sync.Mutex
var publicKeyInitialized bool
var rabbitMQConn *amqp.Connection
var rabbitMQChannel *amqp.Channel

func initDB() {
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s", dbUser, dbPassword, dbHost, dbPort, dbName)
	var err error
	db, err = sql.Open("mysql", dsn)
	if err != nil {
		fmt.Println("Error connecting to the database:", err)
		return
	}
	err = db.Ping()
	if err != nil {
		fmt.Println("Error pinging the database:", err)
		return
	}
	fmt.Println("Connected to the database successfully")

}

func initRabbitMQ() error {
    rabbitmqHost := os.Getenv("RABBITMQ_HOST")
    if rabbitmqHost == "" {
        rabbitmqHost = "rabbitmq"
    }
    
    var err error
    for i := 0; i < 5; i++ {
        rabbitMQConn, err = amqp.Dial(fmt.Sprintf("amqp://guest:guest@%s:5672/", rabbitmqHost))
        if err == nil {
            break
        }
        fmt.Printf("Failed to connect to RabbitMQ: %v, retrying in 5 seconds...\n", err)
        time.Sleep(5 * time.Second)
    }
    
    if err != nil {
        return err
    }
    fmt.Println("Connected to RabbitMQ successfully")
    
    rabbitMQChannel, err = rabbitMQConn.Channel()
    if err != nil {
        return err
    }
    
    _, err = rabbitMQChannel.QueueDeclare(
        "notifications", 
        true,           
        false,          
        false,          
        false,         
        nil,            
    )
    
    return err
}

func getKeycloakPublicKey() (*rsa.PublicKey, error) {
    publicKeyMutex.Lock()
    defer publicKeyMutex.Unlock()
    
    if publicKeyInitialized && publicKey != nil {
        return publicKey, nil
    }
    
    keycloakURL := os.Getenv("KEYCLOAK_URL")
    if keycloakURL == "" {
        keycloakURL = "http://keycloak:8080"
    }
    
    realm := os.Getenv("KEYCLOAK_REALM")
    if realm == "" {
        realm = "TwojKwadrat"
    }

    url := fmt.Sprintf("%s/realms/%s/protocol/openid-connect/certs", keycloakURL, realm)
    fmt.Printf("Fetching public key from: %s\n", url)
    
    resp, err := http.Get(url)
    if err != nil {
        return nil, fmt.Errorf("error fetching JWKS: %v", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != 200 {
        return nil, fmt.Errorf("JWKS endpoint returned status %d", resp.StatusCode)
    }

    var jwks struct {
        Keys []struct {
            Kty string `json:"kty"`
            Use string `json:"use"`
            N   string `json:"n"`
            E   string `json:"e"`
        } `json:"keys"`
    }

    if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
        return nil, fmt.Errorf("error decoding JWKS: %v", err)
    }

    if len(jwks.Keys) == 0 {
        return nil, fmt.Errorf("no keys found in JWKS")
    }

    key := jwks.Keys[0]
    
    nBytes, err := base64.RawURLEncoding.DecodeString(key.N)
    if err != nil {
        return nil, fmt.Errorf("error decoding n: %v", err)
    }
    
    eBytes, err := base64.RawURLEncoding.DecodeString(key.E)
    if err != nil {
        return nil, fmt.Errorf("error decoding e: %v", err)
    }

    n := big.NewInt(0).SetBytes(nBytes)
    e := big.NewInt(0).SetBytes(eBytes).Int64()
    
    publicKey = &rsa.PublicKey{
        N: n,
        E: int(e),
    }

    publicKeyInitialized = true
    fmt.Println("Keycloak public key loaded successfully")
    return publicKey, nil
}


func verifyJWT(tokenString string) (*KeycloakClaims, error) {
    key, err := getKeycloakPublicKey()
    if err != nil {
        return nil, fmt.Errorf("failed to get public key: %v", err)
    }
    
    token, err := jwt.ParseWithClaims(tokenString, &KeycloakClaims{}, func(token *jwt.Token) (interface{}, error) {
        if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
            return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
        }
        return key, nil
    })

    if err != nil {
        return nil, fmt.Errorf("error parsing token: %v", err)
    }

    if claims, ok := token.Claims.(*KeycloakClaims); ok && token.Valid {
        return claims, nil
    }

    return nil, fmt.Errorf("invalid token")
}


func requireAuth(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Access-Control-Allow-Origin", "*")
        w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

        if r.Method == "OPTIONS" {
            return
        }

        authHeader := r.Header.Get("Authorization")
        if authHeader == "" {
            http.Error(w, "Missing Authorization header", http.StatusUnauthorized)
            return
        }

        tokenString := strings.TrimPrefix(authHeader, "Bearer ")
        if tokenString == authHeader {
            http.Error(w, "Invalid Authorization header format", http.StatusUnauthorized)
            return
        }

        claims, err := verifyJWT(tokenString)
        if err != nil {
            fmt.Printf("JWT verification failed: %v\n", err)
            http.Error(w, "Invalid token", http.StatusUnauthorized)
            return
        }

        r.Header.Set("X-User-ID", claims.Sub)
        r.Header.Set("X-Username", claims.PreferredUsername)
        

        fmt.Printf("Authenticated user: %s (ID: %s)\n", claims.PreferredUsername, claims.Sub)

        next(w, r)
    }
}

func healthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	if r.Method == "OPTIONS" {
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"ok"}`))
}


func getPosts(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
    w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
        return
    }
	
	
	w.Header().Set("Content-Type", "application/json")

	
	queryParams := r.URL.Query()
	id := queryParams.Get("id")
	title := queryParams.Get("title")
	minPrice := queryParams.Get("min_price")
	maxPrice := queryParams.Get("max_price")
	city := queryParams.Get("city")
	district := queryParams.Get("district")
	roommates := queryParams.Get("roommates")

	

	query := `SELECT id, title, price, size, street, city, district, 
              created_at, updated_at, description, available_from, 
              min_rental_period, amenities, roommates, email, phone,
              COALESCE(author_id, '') as author_id, 
              COALESCE(author_username, '') as author_username
              FROM posts WHERE 1=1`
	var args []interface{}
	if id != "" {
		query += " AND id = ?"
		args = append(args, id)
	}
	if title != "" {
		query += " AND title LIKE ?"
		args = append(args, "%"+title+"%")
	}
	if minPrice != "" && maxPrice != "" {
		query += " AND price BETWEEN ? AND ?"
		args = append(args, minPrice, maxPrice)
	} else if minPrice != "" {
		query += " AND price >= ?"
		args = append(args, minPrice)
	} else if maxPrice != "" {
		query += " AND price <= ?"
		args = append(args, maxPrice)
	}
	if city != "" {
		query += " AND city = ?"
		args = append(args, city)
	}
	if district != "" {
		query += " AND district = ?"
		args = append(args, district)
	}
	if roommates != "" {
		query += " AND roommates <= ?"
		args = append(args, roommates)
	}

	rows, err := db.Query(query, args...)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	var posts []Post
	for rows.Next() {
        var post Post
        
        
		if err := rows.Scan(
			&post.ID,
			&post.Title, 
			&post.Price,
			&post.Size,
			&post.Street,
			&post.City,
			&post.District,
			&post.CreatedAt,
			&post.UpdatedAt,
			&post.Description,
			&post.AvailableFrom,
			&post.MinRentalPeriod, 
			&post.Amenities,
			&post.Roommates,
			&post.Email,
			&post.Phone,
			&post.AuthorID,
			&post.AuthorUsername); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		
        
        
        posts = append(posts, post)
    }
    
    if err = rows.Err(); err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    
    json.NewEncoder(w).Encode(posts)

}

func getPostByID(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	if r.Method == "OPTIONS" {
		return
	}
	w.Header().Set("Content-Type", "application/json")
	path := strings.TrimPrefix(r.URL.Path, "/api/get/")
	if path == "" {
		http.Error(w, "Post ID is required", http.StatusBadRequest)
		return
	}

	fmt.Printf("Fetching post with ID: %s\n", path)

	query := `SELECT id, title, price, size, street, city, district, 
              created_at, updated_at, description, available_from, 
              min_rental_period, amenities, roommates, email, phone,
              COALESCE(author_id, '') as author_id, 
              COALESCE(author_username, '') as author_username
              FROM posts WHERE id = ?`

	var post Post
    err := db.QueryRow(query, path).Scan(
        &post.ID,
        &post.Title, 
        &post.Price,
        &post.Size,
        &post.Street,
        &post.City,
        &post.District,
        &post.CreatedAt,
        &post.UpdatedAt,
        &post.Description,
        &post.AvailableFrom,
        &post.MinRentalPeriod, 
        &post.Amenities,
        &post.Roommates,
        &post.Email,
        &post.Phone,
        &post.AuthorID,
        &post.AuthorUsername)

	if err != nil {
        if err == sql.ErrNoRows {
            fmt.Printf("Post with ID %s not found\n", path)
            http.Error(w, "Post not found", http.StatusNotFound)
            return
        }
        fmt.Printf("Database error: %v\n", err)
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    fmt.Printf("Found post: %s\n", post.Title)
    json.NewEncoder(w).Encode(post)
}

func postPost(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")

    userID := r.Header.Get("X-User-ID")
    username := r.Header.Get("X-Username")
    
    if userID == "" {
        http.Error(w, "User not authenticated", http.StatusUnauthorized)
        return
    }
    
    var post Post
    err := json.NewDecoder(r.Body).Decode(&post)
    if err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    post.AuthorID = userID
    post.AuthorUsername = username

    fmt.Printf("Received post data: %+v\n", post)

    if post.Title == "" || post.Price == 0 || post.Size == 0 || 
       post.Street == "" || post.City == "" || post.District == "" ||
       post.Description == "" || post.AvailableFrom == "" ||
       post.Email == "" || post.Phone == "" || post.MinRentalPeriod < 1 {
        fmt.Println("Missing required fields")
        http.Error(w, "Missing required fields", http.StatusBadRequest)
        return
    }

    query := `INSERT INTO posts (
            title, price, size, street, city, district, 
            description, available_from, min_rental_period, amenities, 
            roommates, email, phone, author_id, author_username
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

    fmt.Printf("Executing query with author: %s (%s)\n", post.AuthorUsername, post.AuthorID)

    result, err := db.Exec(
        query,
        post.Title,
        post.Price,
        post.Size,
        post.Street,
        post.City,
        post.District,
        post.Description,
        post.AvailableFrom,
        post.MinRentalPeriod,
        post.Amenities,
        post.Roommates,
        post.Email,          
        post.Phone,
        post.AuthorID,     
        post.AuthorUsername,
    )
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    postID, err := result.LastInsertId()
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    fmt.Printf("Post created successfully with ID: %d\n", postID)

    if postID > 0 && rabbitMQChannel != nil {
    // Przygotuj dane powiadomienia
        notification := map[string]interface{}{
            "event": "post_created",
            "post_id": postID,
            "title": post.Title,
            "author": post.AuthorUsername,
            "city": post.City,
            "price": post.Price,
            "timestamp": time.Now().Format(time.RFC3339),
        }
        
        // Serializuj do JSON
        notificationJson, err := json.Marshal(notification)
        if err == nil {
            err = rabbitMQChannel.Publish(
                "",             
                "notifications", 
                false,         
                false,          
                amqp.Publishing{
                    DeliveryMode: amqp.Persistent,
                    ContentType: "application/json",
                    Body:        notificationJson,
                },
            )
            
            if err != nil {
                fmt.Printf("Error sending notification: %v\n", err)
            } else {
                fmt.Printf("Notification sent for post %d\n", postID)
            }
        }else{
            fmt.Printf("Error serializing notification: %v\n", err)
        }
    }
        response := struct {
        ID int64 `json:"id"`
        Message string `json:"message"`
    }{
        ID: postID,
        Message: "Post created successfully",
    }
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(response)
}

func main() {
    fmt.Println("=== RUNNING UPDATED CODE VERSION WITH RABBITMQ FIX ===")

	initDB()
    err := initRabbitMQ()
    if err != nil {
        fmt.Printf("Warning: Could not connect to RabbitMQ: %v\n", err)
        fmt.Println("Continuing without notifications...")
    } else {
        fmt.Println("Connected to RabbitMQ successfully")
        defer rabbitMQConn.Close()
        defer rabbitMQChannel.Close()
    }

	http.HandleFunc("/api/get/", getPostByID)
	http.HandleFunc("/api/posts/", getPosts) 
	http.HandleFunc("/api/posts/create", requireAuth(postPost))
	http.HandleFunc("/health", healthCheck)

	fmt.Println("Server is running on port 5001")
	err = http.ListenAndServe(":5001", nil)
	if err != nil {
		fmt.Printf("Error starting server: %s\n", err)
	}
}

