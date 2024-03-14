var express = require('express');
var router = express.Router();
var productHelper = require('../helpers/product-helper');
var userHelper = require('../helpers/user-helper');
/* GET home page. */
const verifyUser = (req, res, next) => {
  if (req.session.userLoggedIn) {
    next()
  } else {
    res.redirect('/login');
  }
}
router.get('/', async function (req, res, next) {
  let user = req.session.user;
  console.log(user);
  let carCount;
  if (user) {
    userHelper.getCartCount(user._id).then((cartCount) => {
      carCount = cartCount;
      productHelper.getAllProducts().then((products) => {
        res.render('user/products', { products, user, carCount });
      })
    })
  } else {
    carCount = 0;
    productHelper.getAllProducts().then((products) => {
      res.render('user/products', { products, user, carCount });
    })
  }

});

router.get('/login', (req, res) => {
  if (req.session.userLoggedIn) {
    res.redirect('/');
  } else {
    res.render('user/login', { 'logErr': req.session.userlogErr });
    req.session.userlogErr = false;
  }
});
router.post('/login', (req, res) => {
  userHelper.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.user = response.user
      req.session.userLoggedIn = true
      res.redirect('/')
    } else {
      req.session.userlogErr = 'Invalid Password or Email';
      res.redirect('/login');
    }
  })
});
router.get('/signup', (req, res, next) => {
  res.render('user/signup');
});
router.post('/signup', async (req, res, next) => {
  userHelper.doSignup(req.body).then(() => {
    req.session.user = req.body;
    req.session.userLoggedIn = true;
    res.redirect('/');
  })
});
router.get('/logout', (req, res) => {
  req.session.user = null;
  req.session.userLoggedIn = false;
  res.redirect('/');
});

router.get('/cart', verifyUser, (req, res) => {
  let user = req.session.user;
  let carCount;
    userHelper.getCartCount(user._id).then((cartCount) => {
      carCount = cartCount;
      userHelper.getCart(user._id).then(async (cartItems) => {
        let products = cartItems;
        let totalPrice;
        if (products) {
          totalPrice = await userHelper.getTotalPrice(user._id);
        }
        res.render('user/cart', { user, products, carCount, totalPrice });
      })
    })
});
router.post('/add-to-cart', verifyUser, (req, res) => {
  let proId = req.body.proId;
  let userId = req.session.user._id;
  userHelper.addToCart(proId, userId).then((msg) => {
    console.log(msg);
    res.json({ status: true })
  })
})
router.get('/delete-product', (req, res) => {
  let proId = req.query.id;
  let userId = req.session.user._id;
  userHelper.deleteProduct(userId, proId).then((response) => {
    console.log(response);
    res.redirect('/cart');
  })
})
router.post('/change-product-quantity', (req, res) => {
  userHelper.changeQuantity(req.body).then(async (response) => {
    response.total = await userHelper.getTotalPrice(req.body.user)
    res.json(response)
  })
})
router.get('/place-order', verifyUser, async (req, res) => {
  let user = req.session.user;
  let totalPrice = await userHelper.getTotalPrice(user._id);
  res.render('user/place-order', { totalPrice, user });
})
router.post('/place-order', verifyUser, async (req, res) => {
  let products = await userHelper.getProductsList(req.body.userId);
  let totalPrice = await userHelper.getTotalPrice(req.body.userId);
  userHelper.placeOrder(req.body, products, totalPrice).then((orderId) => {
    if (req.body['payment-method'] === 'COD') {
      res.json({ codStatus: true });
    } else {
      userHelper.generateRazorpay(orderId, totalPrice).then((order) => {
        res.json(order)
      })
    }
  })
})
router.get('/order-success', (req, res) => {
  user = req.session.user
  res.render('user/order-success', { user })
})
router.get('/order-list', verifyUser, (req, res) => {
  user = req.session.user
  userHelper.getOrder(user._id).then((orderDetails) => {
    res.render('user/order-list', { user, orderDetails })
  })
})
router.get('/view-order-products', verifyUser, (req, res) => {
  let orderId = req.query.id
  let user = req.session.user
  userHelper.getOrderProducts(orderId).then((products) => {
    res.render('user/order-products', { user, products })
  })
})
router.post('/verify-payment', verifyUser, (req, res) => {
  let user = req.session.user
  userHelper.verifyPayment(req.body).then(() => {
    console.log(req.body);
    userHelper.changePaymentStatus(req.body['order[receipt]'], user._id).then(() => {
      res.json({ status: true })
    })
  }).catch((err) => {
    console.log(err);
    res.json({ status: false, errMsg: 'Payment Failed' })
  })
})
module.exports = router;
