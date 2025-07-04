const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://vanshbhatt2527:S0krtUW79YXdfLys@cluster0.eaknngj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

// User schema/model
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: 'user' } // 'user' or 'admin'
});
const User = mongoose.model('User', userSchema);

// Order schema/model
const orderSchema = new mongoose.Schema({
  user: String, // user email or userId
  phone: String,
  email: String,
  name: String,
  address: String,
  pincode: String,
  city: String,
  state: String,
  payment: String,
  upi: String,
  cart: Array,
  total: Number,
  status: { type: String, default: 'pending' }
});
const Order = mongoose.model('Order', orderSchema);

// In-memory product data (replace with DB later)
let products = [
  { name: 'Himalayan Shilajit Resin', price: 999, img: '', rating: '4.3/5 (4846)', badge: '33% OFF', original: 1499 },
  { name: 'Shilajit Energy Mix', price: 999, img: '', rating: '4.5/5 (110)', badge: '9% OFF', original: 1099 },
  { name: 'Shilajit Energy Sips', price: 999, img: '', rating: '4.5/5 (53)', badge: '29% OFF', original: 1399 },
  { name: 'Shilajit Energy Capsules', price: 1199, img: '', rating: '4.3/5 (23)', badge: '14% OFF', original: 1399 }
];

// Get all products
app.get('/api/products', (req, res) => {
  res.json(products);
});

// Update all products (admin)
app.post('/api/products', (req, res) => {
  if (!Array.isArray(req.body) || req.body.length !== 4) {
    return res.status(400).json({ error: 'Invalid product data' });
  }
  products = req.body;
  res.json({ success: true });
});

// User registration
app.post('/api/register', async (req, res) => {
  const { email, password, role } = req.body;
  const hash = await bcrypt.hash(password, 10);
  try {
    const user = await User.create({ email, password: hash, role: role || 'user' });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: 'User already exists' });
  }
});

// User login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ email }, 'SECRET_KEY', { expiresIn: '1d' });
  res.json({ token });
});

// Place order
app.post('/api/orders', async (req, res) => {
  let token = req.body.token;
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  const { phone, email, name, address, pincode, city, state, payment, upi, cart, total } = req.body;
  try {
    const decoded = jwt.verify(token, 'SECRET_KEY');
    const order = await Order.create({
      user: decoded.email,
      phone,
      email,
      name,
      address,
      pincode,
      city,
      state,
      payment,
      upi,
      cart,
      total
    });
    res.json({ success: true, orderId: order._id });
  } catch (e) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

// Get orders for a user or admin
app.get('/api/orders', async (req, res) => {
  const { token } = req.query;
  try {
    const decoded = jwt.verify(token, 'SECRET_KEY');
    const user = await User.findOne({ email: decoded.email });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (user.role === 'admin') {
      // Admin: return all orders
      const orders = await Order.find();
      res.json(orders);
    } else {
      // Regular user: only their orders
      const orders = await Order.find({ user: decoded.email });
      res.json(orders);
    }
  } catch (e) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 