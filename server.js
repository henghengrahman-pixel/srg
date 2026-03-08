const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const slugify = require('slugify');
const methodOverride = require('method-override');
const compression = require('compression');

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const SESSION_SECRET = process.env.SESSION_SECRET || 'affiliate-web-secret';

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const ARTICLES_FILE = path.join(DATA_DIR, 'articles.json');
const CLICKS_FILE = path.join(DATA_DIR, 'clicks.json');

const PUBLIC_DIR = path.join(__dirname, 'public');
const PUBLIC_UPLOADS = path.join(PUBLIC_DIR, 'uploads');

const ADMIN_LOGIN_PATH = '/secure-admin-login-rmz9x';
const ADMIN_DASHBOARD_PATH = '/secure-admin-dashboard-rmz9x';

app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function ensureFile(file, fallback) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(fallback, null, 2), 'utf8');
  }
}

function seedProducts() {
  return [
    {
      id: crypto.randomUUID(),
      name: 'Tas Wanita Premium Korean Style',
      slug: 'tas-wanita-premium-korean-style',
      shortDesc: 'Tas wanita elegan dengan model modern, cocok untuk harian dan hangout.',
      content: '<p>Tas wanita premium dengan desain modern dan bahan yang tampak mewah. Cocok untuk kerja, kuliah, atau jalan santai.</p><ul><li>Desain elegan</li><li>Kapasitas lega</li><li>Cocok untuk hadiah</li></ul>',
      price: 189000,
      comparePrice: 259000,
      image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=80',
      gallery: [],
      category: 'Fashion Wanita',
      brand: 'DailyCharm',
      marketplace: 'Shopee',
      affiliateUrl: 'https://shopee.co.id/',
      shopeeStore: 'DailyCharm Official',
      rating: 4.8,
      sold: '2rb+',
      badge: 'BESTSELLER',
      active: true,
      featured: true,
      seoTitle: 'Tas Wanita Premium Korean Style | Rekomendasi Affiliate Shopee',
      seoDescription: 'Review tas wanita premium Korean style dengan harga terjangkau, model elegan, dan cocok untuk dipakai harian.',
      keywords: 'tas wanita premium, tas shopee bagus, tas wanita korean style',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(),
      name: 'Sepatu Running Pria Ringan Nyaman',
      slug: 'sepatu-running-pria-ringan-nyaman',
      shortDesc: 'Sepatu pria nyaman untuk olahraga, jogging, dan aktivitas harian.',
      content: '<p>Sepatu running pria yang ringan, breathable, dan nyaman dipakai dalam waktu lama.</p><p>Sol empuk membuat langkah lebih stabil dan nyaman.</p>',
      price: 229000,
      comparePrice: 299000,
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80',
      gallery: [],
      category: 'Sepatu Pria',
      brand: 'MoveFast',
      marketplace: 'Shopee',
      affiliateUrl: 'https://shopee.co.id/',
      shopeeStore: 'MoveFast Sport',
      rating: 4.9,
      sold: '5rb+',
      badge: 'HOT',
      active: true,
      featured: true,
      seoTitle: 'Sepatu Running Pria Ringan Nyaman | Affiliate Shopee Terbaik',
      seoDescription: 'Sepatu running pria ringan dan nyaman dengan harga terjangkau. Cocok untuk jogging, gym, dan aktivitas sehari-hari.',
      keywords: 'sepatu running pria, sepatu olahraga pria, sepatu pria shopee',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
}

function seedArticles() {
  return [
    {
      id: crypto.randomUUID(),
      title: '7 Rekomendasi Produk Shopee yang Worth It untuk Dibeli Tahun Ini',
      slug: 'rekomendasi-produk-shopee-worth-it',
      excerpt: 'Daftar produk affiliate Shopee yang menarik, fungsional, dan banyak dicari.',
      content: '<p>Artikel ini membahas beberapa rekomendasi produk yang layak dipertimbangkan untuk kebutuhan harian.</p><h2>Kenapa pilih produk yang sudah banyak review?</h2><p>Produk dengan review yang baik cenderung lebih aman dipilih karena pembeli sebelumnya sudah memberikan gambaran kualitas.</p>',
      image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80',
      seoTitle: '7 Rekomendasi Produk Shopee yang Worth It untuk Dibeli Tahun Ini',
      seoDescription: 'Kumpulan produk affiliate Shopee yang layak dibeli dengan tampilan premium dan harga menarik.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      active: true
    }
  ];
}

function ensureStorage() {
  ensureDir(DATA_DIR);
  ensureDir(PUBLIC_DIR);
  ensureDir(PUBLIC_UPLOADS);
  ensureFile(PRODUCTS_FILE, seedProducts());
  ensureFile(ARTICLES_FILE, seedArticles());
  ensureFile(CLICKS_FILE, []);
}

function readJson(file, fallback = []) {
  try {
    ensureStorage();
    const raw = fs.readFileSync(file, 'utf8').trim();
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  ensureStorage();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function loadProducts() {
  return readJson(PRODUCTS_FILE, seedProducts());
}

function saveProducts(items) {
  writeJson(PRODUCTS_FILE, items);
}

function loadArticles() {
  return readJson(ARTICLES_FILE, seedArticles());
}

function saveArticles(items) {
  writeJson(ARTICLES_FILE, items);
}

function loadClicks() {
  return readJson(CLICKS_FILE, []);
}

function saveClicks(items) {
  writeJson(CLICKS_FILE, items);
}

function makeSlug(input, fallback = 'item') {
  return (
    slugify(String(input || fallback), {
      lower: true,
      strict: true,
      locale: 'id'
    }) || `${fallback}-${Date.now()}`
  );
}

function formatRupiah(value) {
  return 'Rp ' + Number(value || 0).toLocaleString('id-ID');
}

function parseGallery(input) {
  return String(input || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueSlug(list, desired, currentId = null) {
  let slug = desired;
  let counter = 1;
  while (list.some((item) => item.slug === slug && item.id !== currentId)) {
    slug = `${desired}-${counter}`;
    counter += 1;
  }
  return slug;
}

function safeText(value, max = 200) {
  return String(value || '').trim().slice(0, max);
}

function buildMeta({ title, description, image, canonical, keywords, type = 'website' }) {
  return {
    title: title || 'Affiliate Web',
    description: description || 'Rekomendasi produk affiliate terbaik.',
    image: image || `${BASE_URL}/og-default.jpg`,
    canonical: canonical || BASE_URL,
    keywords: keywords || 'affiliate, shopee, produk rekomendasi',
    type
  };
}

function render404(req, res, metaTitle = 'Halaman tidak ditemukan') {
  const view404 = path.join(__dirname, 'views', '404.ejs');
  const meta = buildMeta({
    title: metaTitle,
    description: 'Halaman tidak ditemukan.',
    canonical: `${BASE_URL}${req.path}`
  });

  if (fs.existsSync(view404)) {
    return res.status(404).render('404', { meta });
  }

  return res.status(404).send(`
    <!doctype html>
    <html lang="id">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>${meta.title}</title>
      </head>
      <body style="font-family:Arial,sans-serif;padding:40px;background:#0b1020;color:#fff">
        <h1>404</h1>
        <p>Halaman tidak ditemukan.</p>
        <a href="/" style="color:#ffd66b">Kembali ke Home</a>
      </body>
    </html>
  `);
}

ensureStorage();

app.locals.formatRupiah = formatRupiah;
app.locals.BASE_URL = BASE_URL;
app.locals.ADMIN_LOGIN_PATH = ADMIN_LOGIN_PATH;

app.use(compression());
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));
app.use(methodOverride('_method'));
app.use(express.static(PUBLIC_DIR));
app.use('/public', express.static(PUBLIC_DIR));

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, PUBLIC_UPLOADS);
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function (_req, file, cb) {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(new Error('File harus berupa gambar'));
    }
    cb(null, true);
  }
});

app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.isAdmin = !!(req.session && req.session.admin);
  next();
});

function requireAdmin(req, res, next) {
  if (req.session && req.session.admin) return next();
  return res.redirect(ADMIN_LOGIN_PATH);
}

function getActiveProducts() {
  return loadProducts()
    .filter((item) => item.active)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function resolveImage(req, current = '') {
  if (req.file) return `/uploads/${req.file.filename}`;
  if (safeText(req.body.imageUrl, 500)) return safeText(req.body.imageUrl, 500);
  return current;
}

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

app.get('/', (req, res) => {
  const products = getActiveProducts();
  const featured = products.filter((item) => item.featured).slice(0, 8);
  const articles = loadArticles().filter((item) => item.active).slice(0, 6);
  const categories = [...new Set(products.map((item) => item.category).filter(Boolean))];

  return res.render('home', {
    meta: buildMeta({
      title: 'Affiliate Web Shopee Premium | Produk Rekomendasi Pilihan',
      description: 'Temukan produk affiliate Shopee pilihan dengan tampilan premium, link langsung ke Shopee, dan artikel SEO yang informatif.',
      canonical: `${BASE_URL}/`,
      keywords: 'affiliate shopee, produk shopee terbaik, rekomendasi produk shopee'
    }),
    featured,
    products,
    articles,
    categories
  });
});

app.get('/kategori/:slug', (req, res) => {
  const products = getActiveProducts();
  const categorySlug = req.params.slug;
  const filtered = products.filter((item) => makeSlug(item.category, 'kategori') === categorySlug);

  if (!filtered.length) return render404(req, res, 'Kategori tidak ditemukan');

  const categoryName = filtered[0].category;

  return res.render('category', {
    meta: buildMeta({
      title: `${categoryName} | Produk Affiliate Shopee`,
      description: `Kumpulan produk ${categoryName} pilihan dengan link affiliate Shopee.`,
      canonical: `${BASE_URL}/kategori/${categorySlug}`,
      keywords: `${categoryName}, affiliate shopee, produk rekomendasi`,
      type: 'website'
    }),
    categoryName,
    products: filtered
  });
});

app.get('/produk/:slug', (req, res) => {
  const products = getActiveProducts();
  const product = products.find((item) => item.slug === req.params.slug);

  if (!product) return render404(req, res, 'Produk tidak ditemukan');

  const related = products
    .filter((item) => item.id !== product.id && item.category === product.category)
    .slice(0, 8);

  return res.render('product-detail', {
    meta: buildMeta({
      title: product.seoTitle || `${product.name} | Affiliate Shopee`,
      description: product.seoDescription || product.shortDesc,
      canonical: `${BASE_URL}/produk/${product.slug}`,
      keywords: product.keywords,
      image: product.image,
      type: 'product'
    }),
    product,
    related
  });
});

app.get('/artikel', (req, res) => {
  const articles = loadArticles()
    .filter((item) => item.active)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return res.render('article-list', {
    meta: buildMeta({
      title: 'Artikel Affiliate Shopee | Tips Belanja dan Rekomendasi Produk',
      description: 'Artikel SEO tentang rekomendasi produk, tips belanja, dan inspirasi affiliate Shopee.',
      canonical: `${BASE_URL}/artikel`,
      keywords: 'artikel affiliate shopee, rekomendasi produk, tips belanja'
    }),
    articles
  });
});

app.get('/artikel/:slug', (req, res) => {
  const articles = loadArticles().filter((item) => item.active);
  const article = articles.find((item) => item.slug === req.params.slug);

  if (!article) return render404(req, res, 'Artikel tidak ditemukan');

  const relatedProducts = getActiveProducts().slice(0, 6);

  return res.render('article-detail', {
    meta: buildMeta({
      title: article.seoTitle || article.title,
      description: article.seoDescription || article.excerpt,
      canonical: `${BASE_URL}/artikel/${article.slug}`,
      image: article.image,
      keywords: article.title,
      type: 'article'
    }),
    article,
    relatedProducts
  });
});

app.get('/go/:id', (req, res) => {
  const products = loadProducts();
  const product = products.find((item) => item.id === req.params.id && item.active);

  if (!product || !product.affiliateUrl) {
    return res.status(404).send('Link affiliate tidak ditemukan');
  }

  const clicks = loadClicks();
  clicks.unshift({
    id: crypto.randomUUID(),
    productId: product.id,
    productName: product.name,
    productSlug: product.slug,
    referer: req.get('referer') || '',
    userAgent: req.get('user-agent') || '',
    ip: req.ip || '',
    createdAt: new Date().toISOString()
  });
  saveClicks(clicks.slice(0, 5000));

  return res.redirect(product.affiliateUrl);
});

app.get(ADMIN_LOGIN_PATH, (req, res) => {
  if (req.session && req.session.admin) return res.redirect(ADMIN_DASHBOARD_PATH);

  return res.render('admin-login', {
    meta: buildMeta({
      title: 'Admin Login',
      description: 'Login admin.',
      canonical: `${BASE_URL}${ADMIN_LOGIN_PATH}`
    }),
    error: null
  });
});

app.post(ADMIN_LOGIN_PATH, (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '').trim();

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    req.session.admin = true;
    return res.redirect(ADMIN_DASHBOARD_PATH);
  }

  return res.status(401).render('admin-login', {
    meta: buildMeta({
      title: 'Admin Login',
      description: 'Login admin.',
      canonical: `${BASE_URL}${ADMIN_LOGIN_PATH}`
    }),
    error: 'Username atau password salah.'
  });
});

app.post('/secure-admin-logout-rmz9x', requireAdmin, (req, res) => {
  req.session.destroy(() => res.redirect(ADMIN_LOGIN_PATH));
});

app.get(ADMIN_DASHBOARD_PATH, requireAdmin, (req, res) => {
  const products = loadProducts();
  const articles = loadArticles();
  const clicks = loadClicks();

  return res.render('admin-dashboard', {
    meta: buildMeta({
      title: 'Admin Dashboard',
      description: 'Dashboard admin.',
      canonical: `${BASE_URL}${ADMIN_DASHBOARD_PATH}`
    }),
    stats: {
      products: products.length,
      activeProducts: products.filter((item) => item.active).length,
      articles: articles.length,
      clicks: clicks.length
    },
    latestClicks: clicks.slice(0, 10)
  });
});

app.get('/secure-admin-products-rmz9x', requireAdmin, (req, res) => {
  const products = loadProducts().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return res.render('admin-products', {
    meta: buildMeta({
      title: 'Admin Produk',
      description: 'Kelola produk.',
      canonical: `${BASE_URL}/secure-admin-products-rmz9x`
    }),
    products
  });
});

app.get('/secure-admin-products-rmz9x/new', requireAdmin, (req, res) => {
  return res.render('admin-product-form', {
    meta: buildMeta({
      title: 'Tambah Produk',
      description: 'Tambah produk.',
      canonical: `${BASE_URL}/secure-admin-products-rmz9x/new`
    }),
    product: null,
    action: '/secure-admin-products-rmz9x',
    method: 'POST'
  });
});

app.get('/secure-admin-products-rmz9x/:id/edit', requireAdmin, (req, res) => {
  const products = loadProducts();
  const product = products.find((item) => item.id === req.params.id);

  if (!product) return res.redirect('/secure-admin-products-rmz9x');

  return res.render('admin-product-form', {
    meta: buildMeta({
      title: 'Edit Produk',
      description: 'Edit produk.',
      canonical: `${BASE_URL}/secure-admin-products-rmz9x/${req.params.id}/edit`
    }),
    product,
    action: `/secure-admin-products-rmz9x/${product.id}?_method=PUT`,
    method: 'POST'
  });
});

app.post('/secure-admin-products-rmz9x', requireAdmin, upload.single('imageFile'), (req, res) => {
  const products = loadProducts();
  const name = safeText(req.body.name, 150);
  const desiredSlug = makeSlug(req.body.slug || name, 'produk');
  const slug = uniqueSlug(products, desiredSlug);
  const now = new Date().toISOString();

  const product = {
    id: crypto.randomUUID(),
    name,
    slug,
    shortDesc: safeText(req.body.shortDesc, 300),
    content: String(req.body.content || '').trim(),
    price: Number(req.body.price || 0),
    comparePrice: Number(req.body.comparePrice || 0),
    image: resolveImage(req, ''),
    gallery: parseGallery(req.body.gallery),
    category: safeText(req.body.category, 100),
    brand: safeText(req.body.brand, 100),
    marketplace: 'Shopee',
    affiliateUrl: safeText(req.body.affiliateUrl, 1000),
    shopeeStore: safeText(req.body.shopeeStore, 120),
    rating: Number(req.body.rating || 0),
    sold: safeText(req.body.sold, 20),
    badge: safeText(req.body.badge, 30),
    active: req.body.active === 'on',
    featured: req.body.featured === 'on',
    seoTitle: safeText(req.body.seoTitle, 180),
    seoDescription: safeText(req.body.seoDescription, 300),
    keywords: safeText(req.body.keywords, 250),
    createdAt: now,
    updatedAt: now
  };

  products.unshift(product);
  saveProducts(products);

  return res.redirect('/secure-admin-products-rmz9x');
});

app.put('/secure-admin-products-rmz9x/:id', requireAdmin, upload.single('imageFile'), (req, res) => {
  const products = loadProducts();
  const index = products.findIndex((item) => item.id === req.params.id);

  if (index === -1) return res.redirect('/secure-admin-products-rmz9x');

  const current = products[index];
  const desiredSlug = makeSlug(req.body.slug || req.body.name || current.name, 'produk');
  const slug = uniqueSlug(products, desiredSlug, current.id);

  products[index] = {
    ...current,
    name: safeText(req.body.name, 150),
    slug,
    shortDesc: safeText(req.body.shortDesc, 300),
    content: String(req.body.content || '').trim(),
    price: Number(req.body.price || 0),
    comparePrice: Number(req.body.comparePrice || 0),
    image: resolveImage(req, current.image),
    gallery: parseGallery(req.body.gallery),
    category: safeText(req.body.category, 100),
    brand: safeText(req.body.brand, 100),
    affiliateUrl: safeText(req.body.affiliateUrl, 1000),
    shopeeStore: safeText(req.body.shopeeStore, 120),
    rating: Number(req.body.rating || 0),
    sold: safeText(req.body.sold, 20),
    badge: safeText(req.body.badge, 30),
    active: req.body.active === 'on',
    featured: req.body.featured === 'on',
    seoTitle: safeText(req.body.seoTitle, 180),
    seoDescription: safeText(req.body.seoDescription, 300),
    keywords: safeText(req.body.keywords, 250),
    updatedAt: new Date().toISOString()
  };

  saveProducts(products);

  return res.redirect('/secure-admin-products-rmz9x');
});

app.post('/secure-admin-products-rmz9x/:id/delete', requireAdmin, (req, res) => {
  const products = loadProducts().filter((item) => item.id !== req.params.id);
  saveProducts(products);

  return res.redirect('/secure-admin-products-rmz9x');
});

app.get('/secure-admin-articles-rmz9x', requireAdmin, (req, res) => {
  const articles = loadArticles().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return res.render('admin-articles', {
    meta: buildMeta({
      title: 'Admin Artikel',
      description: 'Kelola artikel.',
      canonical: `${BASE_URL}/secure-admin-articles-rmz9x`
    }),
    articles
  });
});

app.post('/secure-admin-articles-rmz9x', requireAdmin, (req, res) => {
  const articles = loadArticles();
  const title = safeText(req.body.title, 180);
  const desiredSlug = makeSlug(req.body.slug || title, 'artikel');
  const slug = uniqueSlug(articles, desiredSlug);
  const now = new Date().toISOString();

  articles.unshift({
    id: crypto.randomUUID(),
    title,
    slug,
    excerpt: safeText(req.body.excerpt, 300),
    content: String(req.body.content || '').trim(),
    image: safeText(req.body.image, 1000),
    seoTitle: safeText(req.body.seoTitle, 180),
    seoDescription: safeText(req.body.seoDescription, 300),
    createdAt: now,
    updatedAt: now,
    active: req.body.active === 'on'
  });

  saveArticles(articles);

  return res.redirect('/secure-admin-articles-rmz9x');
});

app.post('/secure-admin-articles-rmz9x/:id/delete', requireAdmin, (req, res) => {
  const articles = loadArticles().filter((item) => item.id !== req.params.id);
  saveArticles(articles);

  return res.redirect('/secure-admin-articles-rmz9x');
});

app.get('/api/products', (_req, res) => {
  return res.json(getActiveProducts());
});

app.get('/robots.txt', (_req, res) => {
  res.type('text/plain');
  return res.send(`User-agent: *\nAllow: /\nSitemap: ${BASE_URL}/sitemap.xml`);
});

app.get('/sitemap.xml', (_req, res) => {
  const products = getActiveProducts();
  const articles = loadArticles().filter((item) => item.active);
  const categories = [...new Set(products.map((item) => item.category).filter(Boolean))];

  const urls = [
    `${BASE_URL}/`,
    `${BASE_URL}/artikel`,
    ...products.map((item) => `${BASE_URL}/produk/${item.slug}`),
    ...articles.map((item) => `${BASE_URL}/artikel/${item.slug}`),
    ...categories.map((item) => `${BASE_URL}/kategori/${makeSlug(item, 'kategori')}`)
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((url) => `  <url><loc>${url}</loc></url>`)
    .join('\n')}\n</urlset>`;

  res.type('application/xml');
  return res.send(xml);
});

app.use((err, _req, res, _next) => {
  console.error('Server error:', err);

  if (err instanceof multer.MulterError) {
    return res.status(400).send(err.message || 'Terjadi kesalahan upload file');
  }

  return res.status(400).send(err.message || 'Terjadi kesalahan pada server');
});

app.use((req, res) => {
  return render404(req, res);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
