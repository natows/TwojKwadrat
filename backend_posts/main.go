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
)




var db *sql.DB
var publicKey *rsa.PublicKey
var publicKeyMutex sync.Mutex
var publicKeyInitialized bool
var rabbitMQConn *amqp.Connection
var rabbitMQChannel *amqp.Channel
var clients = make(map[string]*rate.Limiter)
var mu sync.Mutex

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

    fmt.Println("Server is running on port 5001")
    
    err = http.ListenAndServe(":5001", nil)
    if err != nil {
        fmt.Printf("Error starting server: %s\n", err)
    }
}

