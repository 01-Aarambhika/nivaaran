CREATE DATABASE IF NOT EXISTS nivaaran_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE nivaaran_db;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('STUDENT','ADMIN') NOT NULL DEFAULT 'STUDENT',
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_number VARCHAR(20) NOT NULL UNIQUE,
  capacity INT NOT NULL DEFAULT 2,
  occupied INT NOT NULL DEFAULT 0,
  block_name VARCHAR(50) DEFAULT 'A',
  status ENUM('AVAILABLE','FULL','MAINTENANCE') DEFAULT 'AVAILABLE'
);

CREATE TABLE IF NOT EXISTS complaints (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  category VARCHAR(80) NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  status ENUM('PENDING','IN_PROGRESS','RESOLVED','REJECTED') DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS menu_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  day_name VARCHAR(20) NOT NULL,
  meal_type ENUM('BREAKFAST','LUNCH','DINNER') NOT NULL,
  items TEXT NOT NULL,
  available BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  description VARCHAR(150) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('PENDING','PAID') DEFAULT 'PENDING',
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT IGNORE INTO rooms (room_number, capacity, occupied, block_name, status) VALUES
('A-101',2,1,'A','AVAILABLE'),('A-102',2,2,'A','FULL'),
('A-103',3,1,'A','AVAILABLE'),('B-201',2,0,'B','AVAILABLE'),
('B-202',2,2,'B','FULL'),('C-301',1,0,'C','AVAILABLE');

INSERT INTO menu_items (day_name, meal_type, items, available)
SELECT 'Monday','BREAKFAST','Poha, tea, banana',TRUE
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE day_name='Monday' AND meal_type='BREAKFAST');
INSERT INTO menu_items (day_name, meal_type, items, available)
SELECT 'Monday','LUNCH','Rice, dal, roti, seasonal vegetable, salad',TRUE
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE day_name='Monday' AND meal_type='LUNCH');
INSERT INTO menu_items (day_name, meal_type, items, available)
SELECT 'Monday','DINNER','Roti, paneer curry, rice, salad',TRUE
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE day_name='Monday' AND meal_type='DINNER');
