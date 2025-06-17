package main 


import (
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"os"
	"strings"
	"github.com/golang-jwt/jwt/v4"
)


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
            Kid string `json:"kid"`  
            Kty string `json:"kty"`
            Use string `json:"use"`  
            Alg string `json:"alg"` 
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

    var signingKey *struct {
        Kid string `json:"kid"`
        Kty string `json:"kty"`
        Use string `json:"use"`
        Alg string `json:"alg"`
        N   string `json:"n"`
        E   string `json:"e"`
    }
    
    for i := range jwks.Keys {
        key := &jwks.Keys[i]
        fmt.Printf("Found key: kid=%s, use=%s, alg=%s\n", key.Kid, key.Use, key.Alg)
        
        if key.Use == "sig" || key.Alg == "RS256" {
            signingKey = key
            fmt.Printf("Selected signing key: kid=%s\n", key.Kid)
            break
        }
    }
    
    if signingKey == nil {
        signingKey = &jwks.Keys[0]
        fmt.Printf("No signing key found, using first key: kid=%s\n", signingKey.Kid)
    }
    
    nBytes, err := base64.RawURLEncoding.DecodeString(signingKey.N)
    if err != nil {
        return nil, fmt.Errorf("error decoding n: %v", err)
    }
    
    eBytes, err := base64.RawURLEncoding.DecodeString(signingKey.E)
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
    fmt.Printf("Keycloak public key loaded successfully for kid: %s\n", signingKey.Kid)
    return publicKey, nil
}




func verifyJWT(tokenString string) (*KeycloakClaims, error) {

    if isTokenBlacklisted(tokenString) {
        fmt.Printf("Token is blacklisted - rejecting\n")
        return nil, fmt.Errorf("token blacklisted - user logged out")
    }


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

        next(w, r)
    }
}