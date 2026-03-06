require('dotenv').config()

const express = require('express')
const path = require('path')
const helmet = require('helmet')
const compression = require('compression')
const session = require('express-session')
const MongoStore = require('connect-mongo')

const connectDB = require('./config/db')

const publicRoutes = require('./routes/publicRoutes')
const adminRoutes = require('./routes/adminRoutes')
const authRoutes = require('./routes/authRoutes')

const app = express()

connectDB()

app.set('view engine','ejs')
app.set('views',path.join(__dirname,'views'))

app.use(express.json())
app.use(express.urlencoded({extended:true}))

app.use(express.static(path.join(__dirname,'public')))

app.use(helmet())
app.use(compression())

app.use(session({
secret:process.env.SESSION_SECRET,
resave:false,
saveUninitialized:false,
store: MongoStore.create({
mongoUrl: process.env.MONGO_URI
})
}))

app.use('/',publicRoutes)
app.use('/admin',adminRoutes)
app.use('/auth',authRoutes)

const PORT = process.env.PORT || 3000

app.listen(PORT,()=>{
console.log('TemanBelanja running')
})
