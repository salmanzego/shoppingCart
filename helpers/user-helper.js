var db = require('../config/connection');
const bcrypt = require('bcrypt');
const collections = require('../config/collections');
var objectId = require('mongodb').ObjectId;
const { Collection } = require('mongodb');
const Razorpay = require('razorpay');
var instance = new Razorpay({
    key_id: 'rzp_test_fqRS6r7VaQ2snr',
    key_secret: 'Y0daCeqGUoLAYlT4pGbVKxXi'
});
module.exports = {
    doSignup: (userData) => {
        return new Promise(async (resolve, reject) => {
            userData.password = await bcrypt.hash(userData.password, 10);
            db.get().collection(collections.USER_COLLECTION).insertOne(userData).then(() => {
                resolve();
            })
        })
    },
    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false
            let response = {}
            let user = await db.get().collection(collections.USER_COLLECTION).findOne({ email: userData.email });
            if (user) {
                bcrypt.compare(userData.password, user.password).then((status) => {
                    if (status) {
                        console.log('login success');
                        response.user = user
                        response.status = true
                        resolve(response)
                    } else {
                        console.log('incorrect password');
                        resolve({ status: false })
                    }
                })

            } else {
                console.log('User not found');
                resolve({ status: false })
            }

        })
    },
    addToCart: (proId, userId) => {
        let proObj = {
            item: objectId(proId),
            quantity: 1
        }
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collections.CART_COLLECTION).findOne({ user: objectId(userId) });
            if (userCart) {
                let proExist = userCart.products.findIndex(product => product.item == proId);
                if (proExist != -1) {
                    db.get().collection(collections.CART_COLLECTION)
                        .updateOne({ user: objectId(userId), 'products.item': objectId(proId) },
                            {
                                $inc: { 'products.$.quantity': 1 }
                            }
                        ).then(() => {
                            resolve();
                        })
                } else {
                    db.get().collection(collections.CART_COLLECTION)
                        .updateOne({ user: objectId(userId) },
                            {
                                $push: { products: proObj }
                            }
                        ).then(() => {
                            resolve('product added');
                        })
                }
            } else {
                let cartObj = {
                    user: objectId(userId),
                    products: [proObj]
                }
                db.get().collection(collections.CART_COLLECTION).insertOne(cartObj).then(() => {
                    resolve('cart added');
                })
            }
        })
    },
    getCart: (userId) => {
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collections.CART_COLLECTION).findOne({ user: objectId(userId) });

            if (userCart) {
                let cartItems = await db.get().collection(collections.CART_COLLECTION).aggregate([
                    {
                        $match: { user: objectId(userId) }
                    },
                    {
                        $unwind: '$products'
                    },
                    {
                        $project: {
                            item: '$products.item',
                            quantity: '$products.quantity'
                        }
                    },
                    {
                        $lookup: {
                            from: collections.PRODUCTS_COLLECTION,
                            localField: 'item',
                            foreignField: '_id',
                            as: 'proDetails'
                        }
                    }
                ]).toArray()
                resolve(cartItems);
            } else {
                resolve(false)
            }



            //         {
            //             $match: { user: objectId(userId) }
            //         },
            //         {
            //             $lookup: {
            //                 from: collections.PRODUCTS_COLLECTION,
            //                 let: { prodList: '$products' },
            //                 pipeline: [
            //                     {
            //                         $match: {
            //                             $expr: {
            //                                 $in: ["$_id", "$$prodList"]
            //                             }
            //                         }
            //                     }
            //                 ],
            //                 as: 'cartItems'
            //             }
            //         }

            //     ]).toArray();
            //     resolve(cartItems[0].cartItems);
            // }else{
            //     resolve(false);
            // }

        });
    },
    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collections.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (userCart) {
                let prodCount = await db.get().collection(collections.CART_COLLECTION).aggregate([
                    {
                        $match: { user: objectId(userId) }
                    },
                    {
                        $project: {
                            _id: 0,
                            qTotal: { $sum: '$products.quantity' }
                        }
                    }
                ]).toArray()
                resolve(prodCount[0].qTotal);
            } else {
                resolve(0)
            }
        })
    },
    changeQuantity: (details) => {
        let count = parseInt(details.count)
        let quantity = parseInt(details.quantity)
        return new Promise((resolve, reject) => {
            if (quantity === 1 && count === -1) {
                db.get().collection(collections.CART_COLLECTION)
                    .updateOne({ user: objectId(details.user) },
                        {
                            $pull: { 'products': { item: objectId(details.proId) } }
                        }
                    ).then((response) => {
                        resolve({ removeProduct: true });
                        console.log('removed');
                    })
            } else {
                db.get().collection(collections.CART_COLLECTION)
                    .updateOne({ user: objectId(details.user), 'products.item': objectId(details.proId) },
                        {
                            $inc: { 'products.$.quantity': count }
                        }
                    ).then((response) => {
                        resolve({ status: true });
                    })
            }
        })
    },
    deleteProduct: (userId, proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collections.CART_COLLECTION)
                .updateOne({ user: objectId(userId) },
                    {
                        $pull: { 'products': { item: objectId(proId) } }
                    }
                ).then((response) => {
                    resolve(response);
                })
        })
    },
    getTotalPrice: (userId) => {
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collections.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (userCart.products.length != 0) {
                let total = await db.get().collection(collections.CART_COLLECTION).aggregate([
                    {
                        $match: { user: objectId(userId) }
                    },
                    {
                        $unwind: '$products'
                    },
                    {
                        $project: {
                            item: '$products.item',
                            quantity: '$products.quantity'
                        }
                    },
                    {
                        $lookup: {
                            from: collections.PRODUCTS_COLLECTION,
                            localField: 'item',
                            foreignField: '_id',
                            as: 'proDetails'
                        }
                    },
                    {
                        $project: {
                            item: 1,
                            quantity: 1,
                            proDetails: { $arrayElemAt: ["$proDetails", 0] }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: { $multiply: ['$quantity', '$proDetails.price'] } }
                        }
                    }
                ]).toArray()
                resolve(total[0].total);
            } else {
                resolve(0);
            }
        })
    },
    getProductsList: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collections.CART_COLLECTION).findOne({ user: objectId(userId) })
            resolve(cart.products)
        })
    },
    placeOrder: (order, products, total) => {
        let status = order['payment-method'] === 'COD' ? 'placed' : 'pending'
        let orderObj = {
            deliveryDetails: {
                mobile: order.mobile,
                pincode: order.pincode,
                address: order.address
            },
            userId: objectId(order.userId),
            paymentMethod: order['payment-method'],
            products: products,
            total: total,
            status: status,
            date: new Date
        }
        return new Promise((resolve, reject) => {
            db.get().collection(collections.ORDER_COLLECTION).insertOne(orderObj).then((response) => {
                if (orderObj.status == 'placed') {
                    db.get().collection(collections.CART_COLLECTION).deleteOne({ user: objectId(order.userId) })
                    resolve(response.insertedId)
                }else{
                    resolve(response.insertedId)
                }
            })
        })

    },
    cartExist: (userId) => {
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collections.CART_COLLECTION).findOne({ user: objectId(userId) });
            if (userCart) {
                resolve(true)
            } else {
                resolve(false)
            }
        })
    },
    getOrder: (userId) => {
        return new Promise(async (resolve, reject) => {
            let orderDetails = await db.get().collection(collections.ORDER_COLLECTION).aggregate([
                {
                    $match: { userId: objectId(userId) }
                },
                {
                    $project: {
                        date: '$date',
                        address: '$deliveryDetails.address',
                        pincode: '$deliveryDetails.pincode',
                        mobile: '$deliveryDetails.mobile',
                        amount: '$total',
                        payment: '$paymentMethod',
                        status: '$status'
                    }
                }
            ]).toArray()
            console.log(orderDetails);
            resolve(orderDetails)
        })
    },
    getOrderProducts: (orderId) => {
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection(collections.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id: objectId(orderId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $lookup: {
                        from: collections.PRODUCTS_COLLECTION,
                        localField: 'products.item',
                        foreignField: '_id',
                        as: 'proDetails'
                    }
                },
                {
                    $unwind: '$proDetails'
                },
                {
                    $project: {
                        proId: '$proDetails._id',
                        name: '$proDetails.name',
                        category: '$proDetails.category',
                        description: '$proDetails.description',
                        price: '$proDetails.price',
                        quantity: '$products.quantity',
                        total: { $multiply: ['$proDetails.price', '$products.quantity'] }
                    }
                }
            ]).toArray()
            console.log(products);
            resolve(products)
        })
    },
    generateRazorpay: (orderId, totalPrice) => {
        orderId = orderId.toString()
        return new Promise((resolve, reject) => {
            var options = {
                amount: totalPrice*100,
                currency: "INR",
                receipt: orderId,
            }
            instance.orders.create(options, (err, order) => {
                if (err) {
                    console.log(err);
                    resolve()
                } else {
                    resolve(order)
                }

            })
        })
    },
    verifyPayment: (details) => {
        return new Promise(async (resolve, reject) => {
            const {
                createHmac
            } = await import('node:crypto');
            let hmac = createHmac('sha256', 'Y0daCeqGUoLAYlT4pGbVKxXi');
            hmac.update(details['payment[razorpay_order_id]'] + '|' + details['payment[razorpay_payment_id]']);
            hmac = hmac.digest('hex')
            if (hmac == details['payment[razorpay_signature]']) {
                console.log('true');
                resolve()
            } else {
                console.log('false');
                reject()
            }
        })
    },
    changePaymentStatus: (orderId,userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collections.ORDER_COLLECTION)
                .updateOne({ _id: objectId(orderId) },
                    {
                        $set: {
                            status: 'placed'
                        }
                    }
                ).then(() => {
                    db.get().collection(collections.CART_COLLECTION).deleteOne({ user: objectId(userId) })
                    resolve()
                })
        })
    }
}
