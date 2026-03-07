
function isAdmin(req,res,next){
if(!req.session || !req.session.isAdmin){
return res.redirect('/admin/login')
}
next()
}

module.exports = { isAdmin }
