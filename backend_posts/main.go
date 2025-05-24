package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	_ "github.com/go-sql-driver/mysql"
)

type Post struct {
	ID      int    `json:"id"`
	Title   string `json:"title"`
	Price  float64    `json:"price"`
	Address string `json:"address"`
    City string `json:"city"`
    District string `json:"district"`
    CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
	Description string `json:"description"`


	// Author  string `json:"author"`

}



//weryfikacje tokenow w api zrob
// -- dzielnica sama sie uzupelni na froncie (polaczenie jakos z google maps)
// -- author do polaczenia z keycloakiem
var db *sql.DB

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

	query := "SELECT id, title, price, address, city, district, created_at, updated_at, description FROM posts WHERE 1=1"
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
            &post.Address,
            &post.City,
            &post.District,
            &post.CreatedAt,
            &post.UpdatedAt,
            &post.Description); err != nil {
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

// func postPost(w http.ResponseWriter, r *http.Request) {
// 	w.Header().Set("Access-Control-Allow-Origin", "*")
// 	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
// 	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
// 	if r.Method == "OPTIONS" {
// 		return
// 	}
// 	w.Header().Set("Content-Type", "application/json")
// 	var post Post
// 	err := json.NewDecoder(r.Body).Decode(&post)
// 	if err != nil {
// 		http.Error(w, err.Error(), http.StatusBadRequest)
// 		return
// 	}
// 	query := "INSERT INTO posts (title, price, address, city, district, created_at, updated_at, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
// 	_, err = db.Exec(query, post.Title, post.Price, post.Address, post.City, post.District, post.CreatedAt, post.UpdatedAt, post.Description)
// 	if err != nil {
// 		http.Error(w, err.Error(), http.StatusInternalServerError)
// 		return
// 	}
// 	w.WriteHeader(http.StatusCreated)
// 	w.Write([]byte("Post created successfully"))
// } //takie api juz do zabezpieczenia

func main() {
	initDB()
	http.HandleFunc("/api/posts/", getPosts) //rejestracja endpointa
	// http.HandleFunc("/api/posts", postPost) 
	http.HandleFunc("/health", healthCheck)

	fmt.Println("Server is running on port 5001")
	err := http.ListenAndServe(":5001", nil)
	if err != nil {
		fmt.Printf("Error starting server: %s\n", err)
	}
}

