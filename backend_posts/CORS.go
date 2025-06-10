package main

import (
    "net/http"
	// "strings"
)

func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        origin := r.Header.Get("Origin")
        allowedOrigins := []string{  
			"http://localhost:3000",    
            "http://frontend:3000",  
			
        }

		if origin == "" {
            http.Error(w, "Origin header required", http.StatusForbidden)
            return
        }
        
        originAllowed := false
        for _, allowed := range allowedOrigins {
            if origin == allowed {
                w.Header().Set("Access-Control-Allow-Origin", allowed)
                originAllowed = true
                break
            }
        }


		if !originAllowed {
            http.Error(w, "Origin not allowed", http.StatusForbidden)
            return
            
        }

        
        w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
        w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("X-Content-Type-Options", "nosniff")  
        w.Header().Set("X-Frame-Options", "DENY")  

        if r.Method == "OPTIONS" {
            w.WriteHeader(http.StatusOK)
            return
        }

        next(w, r)
    }
} 