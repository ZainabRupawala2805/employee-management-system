const mongoose = require('mongoose');

const connectDB = (mongoDbUrl) => {
    return new Promise((resolve, reject) => {
        mongoose.connect(mongoDbUrl, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        mongoose.connection.on("connected", () => {
            console.log("✅ MongoDB connected:", mongoDbUrl);
            resolve(true);
        });

        mongoose.connection.on("error", (err) => {
            console.error("❌ MongoDB connection error:", err);
            reject(err);
        });
    });
};

module.exports = connectDB;
