// api/index.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const connectDB = require('../src/config/dbConnection');
const usersRoutes = require('../src/routes/usersRoutes');
const attendanceRoutes = require('../src/routes/attendanceRoutes');
const roleRoutes = require('../src/routes/roleRoutes');
const leaveRoutes = require('../src/routes/leaveRoutes');
const taskRoutes = require("../src/routes/taskRoutes");
const projectRoutes = require('../src/routes/projectRoutes');
const dashboardRoutes = require('../src/routes/dashboardRoutes');
const authenticateUser = require('../src/middlewares/authentication');

const app = express();
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: false }));
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, '..', 'public', 'uploads')));
app.use(cookieParser(process.env.JWT_SECRET));
app.use(session({
    resave: false,
    saveUninitialized: true,
    secret: 'companyManagement',
    cookie: { secure: false }
}));

app.get("/", (_, res) => res.send({ Status: "Ok 😍" }));
app.use('/user', usersRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/role', roleRoutes);
app.use('/leave', leaveRoutes);
app.use('/task', taskRoutes);
app.use('/project', projectRoutes);
app.use('/dashboard', dashboardRoutes);
app.use(authenticateUser);

let cachedDb = null;
async function connect() {
    if (cachedDb) return cachedDb;

    if (!process.env.mongoDbUrl) {
        console.warn("⚠️ mongoDbUrl is undefined! Check your .env file.");
    } else {
        console.log("🔍 Connecting to MongoDB with URL:", process.env.mongoDbUrl);
    }

    cachedDb = await connectDB(process.env.mongoDbUrl);
    return cachedDb;
}

module.exports = async (req, res) => {
    await connect();
    return app(req, res);
};
