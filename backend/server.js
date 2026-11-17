const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

const importRoutes = require("./routes/importRoutes");
const partRoutes = require("./routes/partRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const outwardRoutes = require("./routes/outwardRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const authRoutes = require("./routes/authRoutes");
const {
    authenticateToken,
    authorizeRoles
} = require("./middleware/authMiddleware");

const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://ss-inventory.vercel.app"
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Authentication
app.use("/api/auth", authRoutes);

// ADMIN ONLY ROUTES
app.use(
    "/api/import",
    authenticateToken,
    authorizeRoles("ADMIN"),
    importRoutes
);

app.use(
    "/api/parts",
    authenticateToken,
    authorizeRoles("ADMIN"),
    partRoutes
);

app.use(
    "/api/dashboard",
    authenticateToken,
    authorizeRoles("ADMIN"),
    dashboardRoutes
);

// ADMIN + STORE MANAGER ROUTES
app.use(
    "/api/outward",
    authenticateToken,
    authorizeRoles("ADMIN", "STORE_MANAGER"),
    outwardRoutes
);

app.use(
    "/api/transactions",
    authenticateToken,
    authorizeRoles("ADMIN", "STORE_MANAGER"),
    transactionRoutes
);

// Test API
app.get("/", (req, res) => {
  res.json({
    message: "Inventory Management API is running!"
  });
});

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected Successfully!");

    const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
    
  })
  .catch((error) => {
    console.error("MongoDB Connection Error:", error.message);
    process.exit(1);
  });
