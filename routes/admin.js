var express = require('express');
// const { getAllProducts } = require('../helpers/product-helper');
var router = express.Router();
var productHelper = require('../helpers/product-helper');
var adminHelper = require('../helpers/admin-helper');
/* GET users listing. */
const verifyUser = async(req, res, next) => {
  if (req.session.adminLoggedIn) {
    next();
  } else {
    res.redirect('/admin/admin-login');
  }
}
router.get('/',verifyUser, function (req, res, next) {
  productHelper.getAllProducts().then((products) => {
    res.render('admin/products', { products, admin: true });
  })
});
router.get('/admin-login', (req, res) => {
  if (req.session.adminLoggedIn) {
    res.redirect('/admin');
  } else {
    res.render('admin/login', { 'logErr': req.session.adminlogErr, admin: true});
    req.session.adminlogErr = false;
  }
});
router.post('/admin-login', (req, res) => {
  console.log(req.body);
  adminHelper.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.admin = response.user
      req.session.adminLoggedIn = true
      res.redirect('/admin')
    } else {
      console.log('incorrect pass');
      req.session.adminlogErr = 'Invalid Password or Username';
      res.redirect('/admin/admin-login');
    }
  })
})
router.get('/logout', (req, res) => {
  req.session.admin = null;
  req.session.adminLoggedIn = false;
  res.redirect('/admin');
});
router.get('/add-product',verifyUser, (req, res, next) => {
  res.render('admin/add-product', { admin: true })
});
router.post('/add-product',verifyUser, (req, res) => {
  req.body.price = parseInt(req.body.price)
  productHelper.addProduct(req.body, (id) => {
    let image = req.files.image
    image.mv('./public/product-images/' + id + '.jpg', (err, done) => {
      if (!err) res.render('admin/add-product', { admin: true });
      else console.log(err);
    });

  })
})
router.get('/delete-product',verifyUser, (req, res) => {
  let proId = req.query.id;
  productHelper.deleteProduct(proId).then((response) => {
    console.log(response);
    res.redirect('/admin');
  })
})
router.get('/edit-product',verifyUser, (req, res) => {
  let proId = req.query.id;
  productHelper.getProduct(proId).then((product) => {
    res.render('admin/edit-product', { admin: true, product });
  })
})
router.post('/update-product',verifyUser, (req, res) => {
  req.body.price = parseInt(req.body.price)
  let proId = req.query.id;
  productHelper.updateProduct(req.body, proId).then(() => {
    let image = req.files.image;
    image.mv('./public/product-images/' + proId + '.jpg', (err) => {
      if (!err) res.redirect('/admin');
      else console.log(err);
    });
  })
})
router.get('/orders', verifyUser,(req,res)=>{
  adminHelper.getOrders().then((orderDetails)=>{
    console.log(orderDetails.orderId);
    res.render('admin/orders',{admin:true,orderDetails})
  })
})
router.get('/view-odproducts', verifyUser,(req,res)=>{
  let orderId = req.query.id
  adminHelper.getOrderProducts(orderId).then((products)=>{
    res.render('admin/ordered-products',{admin:true,products})
  })
})
router.post('/mark-shipped', verifyUser,(req,res)=>{
  let orderId = req.body.orderId
  adminHelper.markShipped(orderId).then((response)=>{
    res.json({response})
  })
})
router.get('/users',(req,res)=>{
  adminHelper.getAllUsers().then((users)=>{
    res.render('admin/all-users',{admin:true,users})
  })
})
module.exports = router;
