
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

const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const db = new Database(path.join(dataDir, 'database.sqlite'));

db.prepare(`
CREATE TABLE IF NOT EXISTS products(
id INTEGER PRIMARY KEY AUTOINCREMENT,
title TEXT,
category TEXT,
price INTEGER,
image TEXT,
affiliate TEXT
)
`).run();

app.set('view engine','ejs');
app.set('views', path.join(__dirname,'views'));

app.use(express.urlencoded({extended:true}));
app.use('/public',express.static(path.join(__dirname,'public')));
app.use('/uploads',express.static(uploadsDir));

app.use(session({
secret:SESSION_SECRET,
resave:false,
saveUninitialized:false
}));

const storage = multer.diskStorage({
destination:uploadsDir,
filename:(req,file,cb)=>{
cb(null,Date.now()+"-"+file.originalname.replace(/\s+/g,"-"))
}
})

const upload = multer({storage})

app.get('/',(req,res)=>{
const products = db.prepare("SELECT * FROM products ORDER BY id DESC").all()
res.render('home',{products})
})

app.get('/admin/login',(req,res)=>{
res.render('login',{error:null})
})

app.post('/admin/login',(req,res)=>{

const {username,password} = req.body

if(username===ADMIN_USERNAME && password===ADMIN_PASSWORD){
req.session.isAdmin=true
return res.redirect('/admin')
}

res.render('login',{error:"ID atau password salah"})
})

app.get('/admin/logout',(req,res)=>{
req.session.destroy(()=>{
res.redirect('/admin/login')
})
})

app.get('/admin',isAdmin,(req,res)=>{

const products = db.prepare("SELECT * FROM products ORDER BY id DESC").all()

res.render('admin',{products})

})

app.post('/admin/product',isAdmin,upload.single('image'),(req,res)=>{

const {title,category,price,affiliate} = req.body

const image = req.file ? req.file.filename : null

db.prepare(`
INSERT INTO products(title,category,price,image,affiliate)
VALUES(?,?,?,?,?)
`).run(title,category,price,image,affiliate)

res.redirect('/admin')

})

app.listen(PORT,()=>{
console.log("TemanBelanja running on port "+PORT)
})
