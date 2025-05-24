CREATE DATABASE IF NOT EXISTS keycloak;
CREATE DATABASE IF NOT EXISTS posts;

USE posts;

CREATE TABLE posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(255) NOT NULL,
    district VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    description TEXT
); 

INSERT INTO posts (title, price, address, city, district, description) VALUES
('Post1', 100, 'Address 1', 'City 1', 'District 1', 'Desc 1'),
('Post2', 200, 'Address 2', 'City 2', 'District 2', 'Desc 2'),
('Post3', 300, 'Address 3', 'City 3', 'District 3', 'Desc 3'),
('Post4', 400, 'Address 4', 'City 4', 'District 4', 'Desc 4'),
('Post5', 500, 'Address 5', 'City 5', 'District 5', 'Desc 5');
