var db = require('../config/connection');
const bcrypt = require('bcrypt');
const collections = require('../config/collections');
const { ObjectId } = require('mongodb');
module.exports = {
    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false
            let response = {}
            let admin = await db.get().collection(collections.ADMIN_COLLECTION).findOne({ username: userData.username });
            let pass = await bcrypt.hash("Admin@123", 10);
            console.log(pass);
            if (admin) {
                bcrypt.compare(userData.password, admin.password).then((status) => {
                    if (status) {
                        console.log('login success');
                        response.admin = admin
                        response.status = true
                        resolve(response)
                    } else {
                        console.log('incorrect password');
                        resolve({ status: false })
                    }
                })

            } else {
                console.log('Admin not found');
                resolve({ status: false })
            }

        })
    },
    getOrders: () => {
        return new Promise(async (resolve, reject) => {
            let orderDetails = await db.get().collection(collections.ORDER_COLLECTION).aggregate([
                {
                    $lookup: {
                        from: collections.USER_COLLECTION,
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'userDetails'
                    }
                },
                {
                    $unwind: '$userDetails'
                },
                {
                    $project: {
                        _id: 0,
                        orderId: '$_id',
                        userName: '$userDetails.name',
                        date: '$date',
                        address: '$deliveryDetails.address',
                        mobile: '$deliveryDetails.mobile',
                        amount: '$total',
                        status: '$status'
                    }
                }
            ]).toArray()
            resolve(orderDetails)
        })
    },
    getOrderProducts: (orderId) => {
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection(collections.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id: ObjectId(orderId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $lookup: {
                        from: collections.PRODUCTS_COLLECTION,
                        localField: 'products.item',
                        foreignField: '_id',
                        as: 'orderProducts'
                    }
                },
                {
                    $unwind: '$orderProducts'
                },
                {
                    $project: {
                        _id: '$orderProducts._id',
                        name: '$orderProducts.name',
                        category: '$orderProducts.category',
                        description: '$orderProducts.description',
                        price: '$orderProducts.price'
                    }
                }
            ]).toArray()
            resolve(products)
        })
    },
    markShipped: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collections.ORDER_COLLECTION)
                .updateOne({ _id: ObjectId(orderId) },
                    {
                        $set: {
                            status: 'shipped'
                        }
                    }
                )
            resolve(true);
        })
    },
    getAllUsers: () => {
        return new Promise(async(resolve, reject) => {
            let users = await db.get().collection(collections.USER_COLLECTION).aggregate([
                {
                    $project: {
                        _id: 0,
                        name: '$name',
                        email: '$email'
                    }
                }
            ]).toArray()
            console.log(users);
            resolve(users)
        })
    }
}