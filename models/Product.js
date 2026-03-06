const mongoose = require('mongoose')

const ProductSchema = new mongoose.Schema({

 title:String,
 slug:String,

 category:String,

 description:String,

 price:Number,

 affiliateUrl:String,

 images:[String],

 videos:[String],

 rating:Number,

 createdAt:{
 type:Date,
 default:Date.now
 }

})

module.exports = mongoose.model('Product',ProductSchema)
