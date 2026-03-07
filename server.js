require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Database = require('better-sqlite3');
const { isAdmin } = require('./middleware/auth');

const app = express();

const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'temanbelanja_secret';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Bisa dipakai untuk Railway Volume
const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, 'data');

const uploadsDir = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, 'uploads');

// Validasi env penting
if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
  throw new Error('ADMIN_USERNAME atau ADMIN_PASSWORD belum diisi di Railway Variables');
}

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'database.sqlite');
const db = new Database(dbPath);

// Tabel produk
db.prepare(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT DEFAULT '',
    price INTEGER DEFAULT 0,
    image TEXT,
    affiliate TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`).run();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadsDir));

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24
  }
}));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const safeName = Date.now() + '-' + file.originalname.replace(/\s+/g, '-');
    cb(null, safeName);
  }
});

const upload = multer({ storage });

// Homepage
app.get('/', (req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY id DESC').all();
  res.render('home', { products });
});

// Login admin
app.get('/admin/login', (req, res) => {
  if (req.session.isAdmin) {
    return res.redirect('/admin');
  }
  res.render('login', { error: null });
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    req.session.adminUsername = username;
    return res.redirect('/admin');
  }

  return res.status(401).render('login', { error: 'ID atau password salah' });
});

// Logout
app.get('/admin/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});

// Dashboard admin
app.get('/admin', isAdmin, (req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY id DESC').all();
  res.render('admin', {
    products,
    adminUsername: req.session.adminUsername || ADMIN_USERNAME
  });
});

// Tambah produk
app.post('/admin/product', isAdmin, upload.single('image'), (req, res) => {
  const { title, category, price, affiliate } = req.body;

  if (!title || !affiliate) {
    return res.status(400).send('Nama produk dan link affiliate wajib diisi');
  }

  const image = req.file ? req.file.filename : null;
  const finalPrice = Number(price || 0);

  db.prepare(`
    INSERT INTO products (title, category, price, image, affiliate)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    title.trim(),
    (category || '').trim(),
    Number.isNaN(finalPrice) ? 0 : finalPrice,
    image,
    affiliate.trim()
  );

  res.redirect('/admin');
});

// Hapus produk
app.post('/admin/product/delete/:id', isAdmin, (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);

  if (product && product.image) {
    const imagePath = path.join(uploadsDir, product.image);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  }

  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.redirect('/admin');
});

// Health check untuk Railway
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// 404 sederhana
app.use((req, res) => {
  res.status(404).send('Halaman tidak ditemukan');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`TemanBelanja running on port ${PORT}`);
  console.log(`Database path: ${dbPath}`);
  console.log(`Uploads path: ${uploadsDir}`);
});
