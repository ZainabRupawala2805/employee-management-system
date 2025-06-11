const mongoose = require('mongoose');

const connectDB = (mongoDbUrl) => {
    return new Promise((resolve, reject) => {
        mongoose.connect(mongoDbUrl);
        mongoose.connection.on("connected", () => {
            resolve(true);
            console.log("Connected", mongoDbUrl);
        });
        mongoose.connection.on("error", (err) => {
            reject(false);
            console.log(err)
        });
    })
};

module.exports = connectDB;