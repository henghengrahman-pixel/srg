const express = require('express')

const router = express.Router()

const Product = require('../models/Product')

router.get('/',async(req,res)=>{

const products = await Product.find().limit(12)

res.render('public/home',{

products

})

})

router.get('/kategori/:category',async(req,res)=>{

const products = await Product.find({category:req.params.category})

res.render('public/category',{

products

})

})

router.get('/produk/:slug',async(req,res)=>{

const product = await Product.findOne({slug:req.params.slug})

res.render('public/product',{

product

})

})

module.exports = router
