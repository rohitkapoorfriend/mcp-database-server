-- Seed data for the ecommerce sample database

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(100) NOT NULL,
    stock INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    total DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- Seed Users
INSERT INTO users (name, email, created_at) VALUES
('Alice Johnson', 'alice@example.com', '2024-01-15 10:30:00'),
('Bob Smith', 'bob@example.com', '2024-01-20 14:45:00'),
('Carol Williams', 'carol@example.com', '2024-02-01 09:15:00'),
('David Brown', 'david@example.com', '2024-02-10 16:20:00'),
('Eva Martinez', 'eva@example.com', '2024-02-15 11:00:00'),
('Frank Lee', 'frank@example.com', '2024-03-01 08:30:00'),
('Grace Kim', 'grace@example.com', '2024-03-05 13:45:00'),
('Henry Davis', 'henry@example.com', '2024-03-10 10:00:00'),
('Ivy Chen', 'ivy@example.com', '2024-03-15 15:30:00'),
('Jack Wilson', 'jack@example.com', '2024-03-20 12:00:00'),
('Karen Taylor', 'karen@example.com', '2024-04-01 09:00:00'),
('Leo Anderson', 'leo@example.com', '2024-04-05 14:15:00'),
('Mia Thomas', 'mia@example.com', '2024-04-10 11:30:00'),
('Noah Jackson', 'noah@example.com', '2024-04-15 16:45:00'),
('Olivia White', 'olivia@example.com', '2024-04-20 08:00:00'),
('Peter Harris', 'peter@example.com', '2024-05-01 10:30:00'),
('Quinn Martin', 'quinn@example.com', '2024-05-05 13:00:00'),
('Rachel Garcia', 'rachel@example.com', '2024-05-10 15:15:00'),
('Sam Robinson', 'sam@example.com', '2024-05-15 09:45:00'),
('Tina Clark', 'tina@example.com', '2024-05-20 12:30:00');

-- Seed Products
INSERT INTO products (name, price, category, stock, created_at) VALUES
('Wireless Mouse', 29.99, 'Electronics', 150, '2024-01-01 00:00:00'),
('Mechanical Keyboard', 89.99, 'Electronics', 75, '2024-01-01 00:00:00'),
('USB-C Hub', 49.99, 'Electronics', 200, '2024-01-05 00:00:00'),
('Monitor Stand', 39.99, 'Accessories', 100, '2024-01-10 00:00:00'),
('Desk Lamp', 34.99, 'Home Office', 120, '2024-01-15 00:00:00'),
('Webcam HD', 59.99, 'Electronics', 80, '2024-02-01 00:00:00'),
('Noise Cancelling Headphones', 199.99, 'Electronics', 45, '2024-02-05 00:00:00'),
('Laptop Sleeve 15"', 24.99, 'Accessories', 300, '2024-02-10 00:00:00'),
('Wireless Charger', 19.99, 'Electronics', 250, '2024-02-15 00:00:00'),
('Standing Desk Mat', 44.99, 'Home Office', 90, '2024-03-01 00:00:00'),
('Cable Management Kit', 14.99, 'Accessories', 400, '2024-03-05 00:00:00'),
('Portable SSD 1TB', 109.99, 'Storage', 60, '2024-03-10 00:00:00'),
('Bluetooth Speaker', 39.99, 'Electronics', 110, '2024-03-15 00:00:00'),
('Ergonomic Mouse Pad', 19.99, 'Accessories', 350, '2024-03-20 00:00:00'),
('Phone Stand', 12.99, 'Accessories', 500, '2024-04-01 00:00:00'),
('USB Microphone', 79.99, 'Electronics', 55, '2024-04-05 00:00:00'),
('Desk Organizer', 27.99, 'Home Office', 130, '2024-04-10 00:00:00'),
('HDMI Cable 6ft', 9.99, 'Accessories', 600, '2024-04-15 00:00:00'),
('Laptop Cooling Pad', 29.99, 'Accessories', 85, '2024-04-20 00:00:00'),
('Smart Power Strip', 34.99, 'Electronics', 95, '2024-05-01 00:00:00'),
('Backup Battery 20000mAh', 44.99, 'Electronics', 70, '2024-05-05 00:00:00'),
('Screen Cleaning Kit', 8.99, 'Accessories', 700, '2024-05-10 00:00:00');

-- Seed Orders
INSERT INTO orders (user_id, total, status, created_at) VALUES
(1, 119.98, 'completed', '2024-02-01 10:00:00'),
(2, 89.99, 'completed', '2024-02-05 14:30:00'),
(3, 249.97, 'completed', '2024-02-15 09:00:00'),
(1, 49.99, 'completed', '2024-03-01 11:00:00'),
(4, 34.99, 'shipped', '2024-03-10 16:00:00'),
(5, 199.99, 'shipped', '2024-03-15 10:30:00'),
(6, 69.98, 'processing', '2024-03-20 08:00:00'),
(7, 154.98, 'processing', '2024-04-01 13:00:00'),
(8, 109.99, 'pending', '2024-04-05 09:45:00'),
(2, 59.98, 'completed', '2024-04-10 15:00:00'),
(9, 44.99, 'shipped', '2024-04-15 12:00:00'),
(10, 89.99, 'pending', '2024-04-20 10:00:00'),
(3, 79.99, 'completed', '2024-05-01 14:00:00'),
(11, 29.99, 'processing', '2024-05-05 11:30:00'),
(12, 174.97, 'shipped', '2024-05-10 09:00:00'),
(5, 44.98, 'pending', '2024-05-15 16:00:00'),
(13, 34.99, 'completed', '2024-05-20 08:30:00'),
(14, 219.98, 'processing', '2024-06-01 10:00:00'),
(15, 64.98, 'pending', '2024-06-05 13:00:00'),
(1, 139.98, 'completed', '2024-06-10 11:00:00');

-- Seed Order Items
INSERT INTO order_items (order_id, product_id, quantity, price) VALUES
(1, 1, 1, 29.99),
(1, 2, 1, 89.99),
(2, 2, 1, 89.99),
(3, 7, 1, 199.99),
(3, 3, 1, 49.99),
(4, 3, 1, 49.99),
(5, 5, 1, 34.99),
(6, 7, 1, 199.99),
(7, 1, 1, 29.99),
(7, 4, 1, 39.99),
(8, 12, 1, 109.99),
(8, 10, 1, 44.99),
(9, 12, 1, 109.99),
(10, 6, 1, 59.99),
(11, 10, 1, 44.99),
(12, 2, 1, 89.99),
(13, 16, 1, 79.99),
(14, 1, 1, 29.99),
(15, 7, 1, 199.99),
(15, 8, 3, 24.99),
(16, 9, 1, 19.99),
(16, 14, 1, 19.99),
(16, 15, 1, 12.99),
(17, 5, 1, 34.99),
(18, 7, 1, 199.99),
(18, 9, 1, 19.99),
(19, 4, 1, 39.99),
(19, 8, 1, 24.99),
(20, 2, 1, 89.99),
(20, 3, 1, 49.99);
