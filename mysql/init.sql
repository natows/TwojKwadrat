CREATE DATABASE IF NOT EXISTS keycloak;
CREATE DATABASE IF NOT EXISTS posts;

CREATE USER IF NOT EXISTS 'keycloak'@'%' IDENTIFIED BY 'keycloak';
GRANT ALL PRIVILEGES ON keycloak.* TO 'keycloak'@'%';
FLUSH PRIVILEGES;

USE posts;

CREATE TABLE posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    size INT NOT NULL DEFAULT 0,
    street VARCHAR(255) NOT NULL,
    city VARCHAR(255) NOT NULL,
    district VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    description TEXT,
    available_from DATE NOT NULL,
    min_rental_period INT NOT NULL DEFAULT 1 COMMENT 'Minimalny okres wynajmu w miesiącach',
    amenities VARCHAR(255),
    roommates INT NOT NULL DEFAULT 0,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    author_id VARCHAR(255) NOT NULL,
    author_username VARCHAR(255) NOT NULL
);

CREATE TABLE post_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);


-- CREATE TABLE favorites {
--     id INT AUTO_INCREMENT PRIMARY KEY,
--     post_id INT NOT NULL,
--     user_id VARCHAR(255) NOT NULL,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
-- }


