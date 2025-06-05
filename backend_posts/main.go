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
)




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

