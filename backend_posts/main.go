package main

import (
    "crypto/rsa"
    "database/sql"
    "fmt"
    "net/http"
    "os"
	"sync"
    _ "github.com/go-sql-driver/mysql"

    "time"
    amqp "github.com/rabbitmq/amqp091-go"
    "golang.org/x/time/rate"
    "strings"
    "net"
    "github.com/go-redis/redis/v8"
    "context"
    "github.com/golang-jwt/jwt/v4"
    "encoding/json"
)




var db *sql.DB
var publicKey *rsa.PublicKey
var publicKeyMutex sync.Mutex
var publicKeyInitialized bool
var rabbitMQConn *amqp.Connection
var rabbitMQChannel *amqp.Channel
var clients = make(map[string]*rate.Limiter)
var mu sync.Mutex
var redisClient *redis.Client


func initRedis() {
    redisHost := os.Getenv("REDIS_HOST")
    redisPort := os.Getenv("REDIS_PORT")
    if redisHost == "" {
        redisHost = "redis"
    }
    if redisPort == "" {
        redisPort = "6379"
    }

    redisClient = redis.NewClient(&redis.Options{
        Addr: redisHost + ":" + redisPort,
    })
    
    ctx := context.Background()
    _, err := redisClient.Ping(ctx).Result()
    if err != nil {
        fmt.Printf("Redis connection failed: %v\n", err)
        redisClient = nil
    } else {
        fmt.Println("Go Backend connected to Redis successfully")
    }
}
func blacklistToken(token string, expiration time.Time) {
    if redisClient == nil {
        fmt.Println("Redis not available - cannot blacklist token")
        return
    }
    
    ctx := context.Background()
    ttl := time.Until(expiration)
    if ttl > 0 {
        err := redisClient.Set(ctx, "bl:"+token, "1", ttl).Err()
        if err != nil {
            fmt.Printf("Redis blacklist error: %v\n", err)
        } else {
            fmt.Printf("Token blacklisted for %v\n", ttl)
        }
    }
}

func isTokenBlacklisted(token string) bool {
    if redisClient == nil {
        return false
    }
    
    ctx := context.Background()
    exists := redisClient.Exists(ctx, "bl:"+token).Val()
    result := exists > 0
    
    if result {
        fmt.Printf("Token is blacklisted\n")
    }
    
    return result
}

func parseTokenClaims(tokenString string) (*KeycloakClaims, error) {
    token, _, err := new(jwt.Parser).ParseUnverified(tokenString, &KeycloakClaims{})
    if err != nil {
        return nil, err
    }
    
    if claims, ok := token.Claims.(*KeycloakClaims); ok {
        return claims, nil
    }
    
    return nil, fmt.Errorf("invalid token claims")
}


func logoutHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    
    if r.Method != "POST" {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
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

    fmt.Printf("🔍 Go: Logout request for token: %s...\n", tokenString[:20])

    claims, err := parseTokenClaims(tokenString)
    if err != nil {
        http.Error(w, "Invalid token", http.StatusBadRequest)
        return
    }

    var expiration time.Time 
    if claims.ExpiresAt != nil {
        expiration = claims.ExpiresAt.Time
    } else {
        expiration = time.Now().Add(24 * time.Hour)
    }

    blacklistToken(tokenString, expiration)

    response := map[string]string{
        "message": "Successfully logged out from Go backend",
        "blacklisted_until": expiration.Format(time.RFC3339),
    }
    
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(response)
}

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

func getIP(r *http.Request) string {
    if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
        return strings.Split(forwarded, ",")[0]
    }
    if realIP := r.Header.Get("X-Real-IP"); realIP != "" {
        return realIP
    }
    ip, _, _ := net.SplitHostPort(r.RemoteAddr)
    return ip
}


func rateLimitMiddleware(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        ip := getIP(r)
        
        mu.Lock()
        if _, exists := clients[ip]; !exists {
            clients[ip] = rate.NewLimiter(3, 5) 
        }
        limiter := clients[ip]
        mu.Unlock()
        
        if !limiter.Allow() {
            http.Error(w, "Too many requests", http.StatusTooManyRequests)
            return
        }
        
        next(w, r)
    }
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



func healthCheck(w http.ResponseWriter, r *http.Request) {
    userAgent := r.Header.Get("User-Agent")

    if strings.Contains(userAgent, "kube-probe") {
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(http.StatusOK)
        w.Write([]byte(`{"status":"ok"}`))
        return
    }
    
    ip := getIP(r)
    
    mu.Lock()
    healthKey := ip + "_health"
    if _, exists := clients[healthKey]; !exists {
        clients[healthKey] = rate.NewLimiter(0.5, 2) 
    }
    limiter := clients[healthKey]
    mu.Unlock()
    
    if !limiter.Allow() {
        http.Error(w, "Too many health requests", http.StatusTooManyRequests)
        return
    }
    
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    w.Write([]byte(`{"status":"ok"}`))
}







func main() {
    initDB()
    initRedis()
    err := initRabbitMQ()
    if err != nil {
        fmt.Printf("Warning: Could not connect to RabbitMQ: %v\n", err)
        fmt.Println("Continuing without notifications...")
    } else {
        fmt.Println("Connected to RabbitMQ successfully")
        defer rabbitMQConn.Close()
        defer rabbitMQChannel.Close()
    }

    http.HandleFunc("/api/get/", rateLimitMiddleware(corsMiddleware(getPostByID)))
    http.HandleFunc("/api/posts/", rateLimitMiddleware(corsMiddleware(getPosts)))
    http.HandleFunc("/api/posts/create", rateLimitMiddleware(corsMiddleware(requireAuth(postPost))))
    http.HandleFunc("/health", healthCheck) 
    http.HandleFunc("/api/logout", rateLimitMiddleware(corsMiddleware(logoutHandler)))

    fmt.Println("Server is running on port 5001")
    
    err = http.ListenAndServe(":5001", nil)
    if err != nil {
        fmt.Printf("Error starting server: %s\n", err)
    }
}

