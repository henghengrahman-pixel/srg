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

const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, 'data');

const uploadsDir = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, 'uploads');

if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
  throw new Error('ADMIN_USERNAME atau ADMIN_PASSWORD belum diisi');
}

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const db = new Database(path.join(dataDir, 'database.sqlite'));
db.pragma('journal_mode = WAL');

db.prepare(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    category TEXT DEFAULT '',
    price INTEGER DEFAULT 0,
    old_price INTEGER DEFAULT 0,
    short_description TEXT DEFAULT '',
    description TEXT DEFAULT '',
    size_info TEXT DEFAULT '',
    color_info TEXT DEFAULT '',
    material TEXT DEFAULT '',
    weight TEXT DEFAULT '',
    image TEXT,
    image_url TEXT DEFAULT '',
    video TEXT,
    video_url TEXT DEFAULT '',
    affiliate TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    thumbnail TEXT,
    thumbnail_url TEXT DEFAULT '',
    excerpt TEXT DEFAULT '',
    content TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`).run();

function slugify(text = '') {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\\s-]/g, '')
    .replace(/\\s+/g, '-')
    .replace(/-+/g, '-');
}

function ensureUniqueSlug(table, title, currentId = null) {
  let base = slugify(title) || 'item';
  let slug = base;
  let count = 1;

  while (true) {
    let row;
    if (currentId) {
      row = db.prepare(`SELECT id FROM ${table} WHERE slug = ? AND id != ?`).get(slug, currentId);
    } else {
      row = db.prepare(`SELECT id FROM ${table} WHERE slug = ?`).get(slug);
    }
    if (!row) return slug;
    slug = `${base}-${count++}`;
  }
}

app.locals.siteName = 'TemanBelanja';
app.locals.categories = ['Skincare', 'Baju Wanita', 'Baju Pria', 'Parfum', 'Celana Cowok', 'Celana Cewek', 'Aksesoris', 'Lainnya'];

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));
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
    const safeName = Date.now() + '-' + file.originalname.replace(/\\s+/g, '-');
    cb(null, safeName);
  }
});

const upload = multer({ storage });

app.get('/', (req, res) => {
  const featured = db.prepare('SELECT * FROM products ORDER BY id DESC LIMIT 8').all();
  const latestArticles = db.prepare('SELECT * FROM articles ORDER BY id DESC LIMIT 3').all();
  res.render('home', { featured, latestArticles });
});

app.get('/product/:slug', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE slug = ?').get(req.params.slug);
  if (!product) return res.status(404).send('Produk tidak ditemukan');
  const related = db.prepare('SELECT * FROM products WHERE category = ? AND id != ? ORDER BY id DESC LIMIT 4').all(product.category, product.id);
  res.render('product-detail', { product, related });
});

app.get('/articles', (req, res) => {
  const articles = db.prepare('SELECT * FROM articles ORDER BY id DESC').all();
  res.render('article-list', { articles });
});

app.get('/articles/:slug', (req, res) => {
  const article = db.prepare('SELECT * FROM articles WHERE slug = ?').get(req.params.slug);
  if (!article) return res.status(404).send('Artikel tidak ditemukan');
  const latest = db.prepare('SELECT * FROM articles WHERE id != ? ORDER BY id DESC LIMIT 4').all(article.id);
  res.render('article-detail', { article, latest });
});

app.get('/admin/login', (req, res) => {
  if (req.session.isAdmin) return res.redirect('/admin');
  res.render('login', { error: null });
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    req.session.adminUsername = username;
    return res.redirect('/admin');
  }
  res.status(401).render('login', { error: 'ID atau password salah' });
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

app.get('/admin', isAdmin, (req, res) => {
  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  const articleCount = db.prepare('SELECT COUNT(*) as count FROM articles').get().count;
  const latestProducts = db.prepare('SELECT * FROM products ORDER BY id DESC LIMIT 5').all();
  const latestArticles = db.prepare('SELECT * FROM articles ORDER BY id DESC LIMIT 5').all();
  res.render('admin', { productCount, articleCount, latestProducts, latestArticles, adminUsername: req.session.adminUsername || ADMIN_USERNAME });
});

app.get('/admin/products', isAdmin, (req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY id DESC').all();
  res.render('admin-products', { products });
});

app.get('/admin/products/new', isAdmin, (req, res) => {
  res.render('admin-product-form', { product: null, mode: 'create' });
});

app.get('/admin/products/edit/:id', isAdmin, (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).send('Produk tidak ditemukan');
  res.render('admin-product-form', { product, mode: 'edit' });
});

app.post('/admin/products', isAdmin, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]), (req, res) => {
  const body = req.body;
  if (!body.title || !body.affiliate) return res.status(400).send('Nama produk dan link tujuan wajib diisi');

  const image = req.files && req.files.image ? req.files.image[0].filename : null;
  const video = req.files && req.files.video ? req.files.video[0].filename : null;
  const slug = ensureUniqueSlug('products', body.title);

  db.prepare(`
    INSERT INTO products (
      title, slug, category, price, old_price, short_description, description,
      size_info, color_info, material, weight, image, image_url, video, video_url, affiliate
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    body.title.trim(),
    slug,
    (body.category || '').trim(),
    Number(body.price || 0),
    Number(body.old_price || 0),
    (body.short_description || '').trim(),
    (body.description || '').trim(),
    (body.size_info || '').trim(),
    (body.color_info || '').trim(),
    (body.material || '').trim(),
    (body.weight || '').trim(),
    image,
    (body.image_url || '').trim(),
    video,
    (body.video_url || '').trim(),
    body.affiliate.trim()
  );

  res.redirect('/admin/products');
});

app.post('/admin/products/update/:id', isAdmin, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]), (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).send('Produk tidak ditemukan');

  const body = req.body;
  const image = req.files && req.files.image ? req.files.image[0].filename : product.image;
  const video = req.files && req.files.video ? req.files.video[0].filename : product.video;
  const slug = ensureUniqueSlug('products', body.title || product.title, product.id);

  db.prepare(`
    UPDATE products SET
      title = ?, slug = ?, category = ?, price = ?, old_price = ?, short_description = ?,
      description = ?, size_info = ?, color_info = ?, material = ?, weight = ?,
      image = ?, image_url = ?, video = ?, video_url = ?, affiliate = ?
    WHERE id = ?
  `).run(
    (body.title || product.title).trim(),
    slug,
    (body.category || '').trim(),
    Number(body.price || 0),
    Number(body.old_price || 0),
    (body.short_description || '').trim(),
    (body.description || '').trim(),
    (body.size_info || '').trim(),
    (body.color_info || '').trim(),
    (body.material || '').trim(),
    (body.weight || '').trim(),
    image,
    (body.image_url || '').trim(),
    video,
    (body.video_url || '').trim(),
    (body.affiliate || '').trim(),
    product.id
  );

  res.redirect('/admin/products');
});

app.post('/admin/products/delete/:id', isAdmin, (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.redirect('/admin/products');

  [product.image, product.video].forEach(file => {
    if (file) {
      const filePath = path.join(uploadsDir, file);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  });

  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.redirect('/admin/products');
});

app.get('/admin/articles', isAdmin, (req, res) => {
  const articles = db.prepare('SELECT * FROM articles ORDER BY id DESC').all();
  res.render('admin-articles', { articles });
});

app.get('/admin/articles/new', isAdmin, (req, res) => {
  res.render('admin-article-form', { article: null, mode: 'create' });
});

app.get('/admin/articles/edit/:id', isAdmin, (req, res) => {
  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
  if (!article) return res.status(404).send('Artikel tidak ditemukan');
  res.render('admin-article-form', { article, mode: 'edit' });
});

app.post('/admin/articles', isAdmin, upload.single('thumbnail'), (req, res) => {
  const body = req.body;
  if (!body.title || !body.content) return res.status(400).send('Judul dan isi artikel wajib diisi');
  const thumb = req.file ? req.file.filename : null;
  const slug = ensureUniqueSlug('articles', body.title);

  db.prepare(`
    INSERT INTO articles (title, slug, thumbnail, thumbnail_url, excerpt, content)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    body.title.trim(),
    slug,
    thumb,
    (body.thumbnail_url || '').trim(),
    (body.excerpt || '').trim(),
    (body.content || '').trim()
  );

  res.redirect('/admin/articles');
});

app.post('/admin/articles/update/:id', isAdmin, upload.single('thumbnail'), (req, res) => {
  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
  if (!article) return res.status(404).send('Artikel tidak ditemukan');
  const body = req.body;
  const thumb = req.file ? req.file.filename : article.thumbnail;
  const slug = ensureUniqueSlug('articles', body.title || article.title, article.id);

  db.prepare(`
    UPDATE articles SET title = ?, slug = ?, thumbnail = ?, thumbnail_url = ?, excerpt = ?, content = ?
    WHERE id = ?
  `).run(
    (body.title || article.title).trim(),
    slug,
    thumb,
    (body.thumbnail_url || '').trim(),
    (body.excerpt || '').trim(),
    (body.content || '').trim(),
    article.id
  );

  res.redirect('/admin/articles');
});

app.post('/admin/articles/delete/:id', isAdmin, (req, res) => {
  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
  if (article && article.thumbnail) {
    const filePath = path.join(uploadsDir, article.thumbnail);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  db.prepare('DELETE FROM articles WHERE id = ?').run(req.params.id);
  res.redirect('/admin/articles');
});

app.get('/health', (req, res) => res.status(200).send('OK'));

app.use((req, res) => {
  res.status(404).send('Halaman tidak ditemukan');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`TemanBelanja running on port ${PORT}`);
});
