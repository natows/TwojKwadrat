
package main

import (
	"github.com/golang-jwt/jwt/v4"
)

type Post struct {
    ID              int     `json:"id"`
    Title           string  `json:"title"`
    Price           float64 `json:"price"`
    Size            int     `json:"size"`
    Street          string  `json:"street"`
    City            string  `json:"city"`
    District        string  `json:"district"`
    CreatedAt       string  `json:"created_at"`
    UpdatedAt       string  `json:"updated_at"`
    Description     string  `json:"description"`
    AvailableFrom   string  `json:"available_from"`
    MinRentalPeriod int     `json:"min_rental_period"`
    Amenities       string  `json:"amenities"`
    Roommates       int     `json:"roommates"`
    Email           string  `json:"email"`
    Phone           string  `json:"phone"`
    AuthorID        string  `json:"author_id"`
    AuthorUsername  string  `json:"author_username"`
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