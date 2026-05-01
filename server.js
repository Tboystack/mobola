const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Session configuration
app.use(session({
  secret: 'mobola-store-secret-key-2026',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: false,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Database setup
const db = new sqlite3.Database('./mobola.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Orders table
    db.run(`CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      delivery_address TEXT NOT NULL,
      total_amount REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Order items table
    db.run(`CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    )`);
  });
}

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'mobolakitchenutensils@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'your-app-password'
  }
});

// Helper function to send emails
function sendEmail(to, subject, html) {
  return transporter.sendMail({
    from: 'mobolakitchenutensils@gmail.com',
    to,
    subject,
    html
  });
}

// Authentication Routes

// Signup
app.post('/api/auth/signup', (req, res) => {
  const { email, password, name, phone } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  db.run(
    'INSERT INTO users (email, password, name, phone) VALUES (?, ?, ?, ?)',
    [email, hashedPassword, name, phone],
    function(err) {
      if (err) {
        return res.status(400).json({ error: 'Email already exists' });
      }

      req.session.userId = this.lastID;
      req.session.userEmail = email;
      req.session.userName = name;

      res.json({ success: true, message: 'Account created successfully' });
    }
  );
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    req.session.userId = user.id;
    req.session.userEmail = user.email;
    req.session.userName = user.name;

    res.json({ success: true, message: 'Logged in successfully' });
  });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// Check auth status
app.get('/api/auth/me', (req, res) => {
  if (req.session.userId) {
    res.json({
      authenticated: true,
      userId: req.session.userId,
      email: req.session.userEmail,
      name: req.session.userName
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Order Routes

// Create order
app.post('/api/orders/create', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { items, totalAmount, customerName, customerEmail, customerPhone, deliveryAddress, notes } = req.body;
  const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  db.run(
    `INSERT INTO orders (order_number, user_id, customer_name, customer_email, customer_phone, delivery_address, total_amount, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [orderNumber, req.session.userId, customerName, customerEmail, customerPhone, deliveryAddress, totalAmount, notes],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create order' });
      }

      const orderId = this.lastID;

      // Insert order items
      items.forEach(item => {
        db.run(
          'INSERT INTO order_items (order_id, product_name, quantity, price) VALUES (?, ?, ?, ?)',
          [orderId, item.name, item.quantity, item.price]
        );
      });

      // Send confirmation email to customer
      const emailHtml = `
        <h2>Order Confirmation</h2>
        <p>Hi ${customerName},</p>
        <p>Your order has been received!</p>
        <p><strong>Order Number:</strong> ${orderNumber}</p>
        <p><strong>Total Amount:</strong> ₦${totalAmount.toLocaleString()}</p>
        <p><strong>Status:</strong> Pending</p>
        <p>We will confirm your order shortly. You can check the status in your account.</p>
        <p>Thank you for shopping with Mobola Store!</p>
      `;

      sendEmail(customerEmail, 'Order Confirmation - Mobola Store', emailHtml).catch(err => {
        console.error('Email send error:', err);
      });

      // Send notification to admin
      const adminEmailHtml = `
        <h2>New Order Received</h2>
        <p><strong>Order Number:</strong> ${orderNumber}</p>
        <p><strong>Customer:</strong> ${customerName}</p>
        <p><strong>Email:</strong> ${customerEmail}</p>
        <p><strong>Phone:</strong> ${customerPhone}</p>
        <p><strong>Delivery Address:</strong> ${deliveryAddress}</p>
        <p><strong>Total Amount:</strong> ₦${totalAmount.toLocaleString()}</p>
        <p><strong>Items:</strong></p>
        <ul>
          ${items.map(item => `<li>${item.name} x ${item.quantity} @ ₦${item.price.toLocaleString()}</li>`).join('')}
        </ul>
        <p><a href="http://localhost:3000/admin">Manage Order</a></p>
      `;

      sendEmail('mobolakitchenutensils@gmail.com', `New Order: ${orderNumber}`, adminEmailHtml).catch(err => {
        console.error('Admin email send error:', err);
      });

      res.json({ success: true, orderNumber, orderId });
    }
  );
});

// Get user orders
app.get('/api/orders/my-orders', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  db.all(
    'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
    [req.session.userId],
    (err, orders) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch orders' });
      }

      // Fetch items for each order
      const ordersWithItems = orders.map(order => {
        return new Promise((resolve) => {
          db.all(
            'SELECT * FROM order_items WHERE order_id = ?',
            [order.id],
            (err, items) => {
              resolve({ ...order, items: items || [] });
            }
          );
        });
      });

      Promise.all(ordersWithItems).then(results => {
        res.json(results);
      });
    }
  );
});

// Admin Routes

// Admin login with passcode
app.post('/api/admin/login', (req, res) => {
  const { passcode } = req.body;

  if (passcode === '042010') {
    req.session.isAdmin = true;
    req.session.adminLoginTime = Date.now();
    res.json({ success: true, message: 'Admin access granted' });
  } else {
    res.status(401).json({ error: 'Invalid passcode' });
  }
});

// Check admin status
app.get('/api/admin/check', (req, res) => {
  if (req.session.isAdmin) {
    const loginTime = req.session.adminLoginTime;
    const currentTime = Date.now();
    const elapsed = currentTime - loginTime;
    const maxDuration = 24 * 60 * 60 * 1000; // 24 hours

    if (elapsed > maxDuration) {
      req.session.isAdmin = false;
      return res.json({ authenticated: false });
    }

    res.json({ authenticated: true });
  } else {
    res.json({ authenticated: false });
  }
});

// Get all orders (admin)
app.get('/api/admin/orders', (req, res) => {
  if (!req.session.isAdmin) {
    return res.status(401).json({ error: 'Not authorized' });
  }

  db.all('SELECT * FROM orders ORDER BY created_at DESC', (err, orders) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch orders' });
    }

    const ordersWithItems = orders.map(order => {
      return new Promise((resolve) => {
        db.all(
          'SELECT * FROM order_items WHERE order_id = ?',
          [order.id],
          (err, items) => {
            resolve({ ...order, items: items || [] });
          }
        );
      });
    });

    Promise.all(ordersWithItems).then(results => {
      res.json(results);
    });
  });
});

// Update order status (admin)
app.post('/api/admin/orders/:orderId/status', (req, res) => {
  if (!req.session.isAdmin) {
    return res.status(401).json({ error: 'Not authorized' });
  }

  const { orderId } = req.params;
  const { status } = req.body;

  if (!['pending', 'confirmed', 'failed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  db.get('SELECT * FROM orders WHERE id = ?', [orderId], (err, order) => {
    if (err || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    db.run('UPDATE orders SET status = ? WHERE id = ?', [status, orderId], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to update order' });
      }

      // Send status update email to customer
      const statusMessage = status === 'confirmed' ? 'confirmed' : status === 'failed' ? 'failed' : 'pending';
      const emailHtml = `
        <h2>Order Status Update</h2>
        <p>Hi ${order.customer_name},</p>
        <p>Your order status has been updated.</p>
        <p><strong>Order Number:</strong> ${order.order_number}</p>
        <p><strong>New Status:</strong> ${statusMessage.toUpperCase()}</p>
        <p>Thank you for your patience!</p>
      `;

      sendEmail(order.customer_email, `Order Status Update - ${order.order_number}`, emailHtml).catch(err => {
        console.error('Email send error:', err);
      });

      res.json({ success: true, message: 'Order status updated' });
    });
  });
});

// Get all users (admin)
app.get('/api/admin/users', (req, res) => {
  if (!req.session.isAdmin) {
    return res.status(401).json({ error: 'Not authorized' });
  }

  db.all('SELECT id, email, name, phone, created_at FROM users ORDER BY created_at DESC', (err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch users' });
    }
    res.json(users);
  });
});

// Admin logout
app.post('/api/admin/logout', (req, res) => {
  req.session.isAdmin = false;
  res.json({ success: true, message: 'Admin logged out' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Mobola Store server running on http://localhost:${PORT}`);
});
