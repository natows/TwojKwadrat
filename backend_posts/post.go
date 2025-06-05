package main 

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
	_ "github.com/go-sql-driver/mysql"
	amqp "github.com/rabbitmq/amqp091-go"
)

func getPosts(w http.ResponseWriter, r *http.Request) {
	
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
        notification := map[string]interface{}{
            "event": "post_created",
            "post_id": postID,
            "title": post.Title,
            "author": post.AuthorUsername,
            "city": post.City,
            "price": post.Price,
            "timestamp": time.Now().Format(time.RFC3339),
        }

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
