// const express = require('express')
// const app = express();
// const cors = require('cors');
// app.use(express.json());
// const bodyParser = require('body-parser');
// const path = require('path');

// // ✅ Allow requests from your frontend
// // CORS config
// app.use(cors({
//     origin: "http://localhost:5173", // frontend origin
//     methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//     credentials: true
// }));

// app.options("*", cors());

// // OR allow all origins (for development only)
// // app.use(cors());

// // Setup Environment Settings
// require('dotenv').config({ path: path.join(__dirname, '.env') });

// // DataBase
// const connectDB = require('./config/dbConnection');

// // parse application/x-www-form-urlencoded
// app.use(bodyParser.urlencoded({ limit: "50mb", extended: false }));

// // parse application/json
// app.use(bodyParser.json({ limit: "50mb" }));

// // Routes
// const usersRoutes = require('./routes/usersRoutes');
// const attendanceRoutes = require('./routes/attendanceRoutes');
// const roleRoutes = require('./routes/roleRoutes');
// const leaveRoutes = require('./routes/leaveRoutes');
// const taskRoutes = require("./routes/taskRoutes");
// const projectRoutes = require('./routes/projectRoutes');
// const dashboardRoutes = require('./routes/dashboardRoutes');

// // middlewares
// const authenticateUser = require('./middlewares/authentication');

// // API Call
// app.use('/user', usersRoutes);
// app.use('/attendance', attendanceRoutes);
// app.use('/role', roleRoutes);
// app.use('/leave', leaveRoutes);
// app.use('/task', taskRoutes);
// app.use('/project', projectRoutes);
// app.use('/dashboard', dashboardRoutes);

// // Serve static files from uploads folder
// app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// const startApplication = async () => {
//     try {
//         await connectDB(process.env.mongoDbUrl);
//         const port = process.env.PORT || 6000;
//         app.listen(port, () => {
//             console.log(`Server is running at http://localhost:${port}`);
//         });
//     } catch (error) {
//         console.error("Error While Connecting The Application: ", error);
//     }
// };

// startApplication();

// const fileUpload = require('express-fileupload');
// app.use(express.static('src/public/'));
// app.use(fileUpload());



const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');

// Setup Environment Settings
// require('dotenv').config({ path: 'src/.env' });
require('dotenv').config();

// DataBase
const connectDB = require('./src/config/dbConnection');

// Routers
const usersRoutes = require('./src/routes/usersRoutes');
const attendanceRoutes = require('./src/routes/attendanceRoutes');
const roleRoutes = require('./src/routes/roleRoutes');
const leaveRoutes = require('./src/routes/leaveRoutes');
const taskRoutes = require("./src/routes/taskRoutes");
const projectRoutes = require('./src/routes/projectRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');

// middleware
const authenticateUser = require('./src/middlewares/authentication');

const app = express();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ limit: "50mb", extended: false }));

// parse application/json
app.use(bodyParser.json({ limit: "50mb" }));

app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

app.use(cookieParser(process.env.JWT_SECRET));
app.use(session({
    resave: false,
    saveUninitialized: true,
    secret: 'companyManagement',
    cookie: { secure: true }
}));

app.get("/", (_, res) => {
  let data = "Ok 😍";
  return res.send({ Status: data });
});

app.use('/user', usersRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/role', roleRoutes);
app.use('/leave', leaveRoutes);
app.use('/task', taskRoutes);
app.use('/project', projectRoutes);
app.use('/dashboard', dashboardRoutes);

app.use(authenticateUser);

const startApplication = async () => {
    try {
        console.log("process.env: ", process.env.PORT);
        await connectDB(process.env.mongoDbUrl).then((resp) => {
            if (resp) {
                const port = process.env.PORT || 6000;
                app.listen(port, () => {
                    console.log(`Server is running at http://localhost:${port}`);
                });
            }
        });
    } catch (error) {
        console.log("Error While Connecting The Application: ", error);
    }
};

startApplication();
