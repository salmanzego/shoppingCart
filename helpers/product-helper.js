var db = require('../config/connection');
const collections = require('../config/collections');
var objectId = require('mongodb').ObjectId;
module.exports = {

    addProduct: (product, callback) => {
        db.get().collection(collections.PRODUCTS_COLLECTION).insertOne(product).then((data) => {
            callback(data.insertedId.toString());
        })
    },
    getAllProducts: () => {
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection(collections.PRODUCTS_COLLECTION).find().toArray();
            resolve(products);
        })
    },
    deleteProduct: (proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collections.PRODUCTS_COLLECTION).deleteOne({ _id: objectId(proId) }).then((response) => {
                resolve(response);
            })
        })
    },
    getProduct: (proId) => {
        return new Promise(async (resolve, reject) => {
            let product = await db.get().collection(collections.PRODUCTS_COLLECTION).findOne({ _id: objectId(proId) });
            resolve(product);
        })
    },
    updateProduct: (proDetails, proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collections.PRODUCTS_COLLECTION)
                .updateOne({ _id: objectId(proId) },
                    {
                        $set: {
                            name: proDetails.name,
                            category: proDetails.category,
                            description: proDetails.description,
                            price: proDetails.price
                        }
                    }
                ).then(() => {
                    resolve();
                })
        })
    }
}