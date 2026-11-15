
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

// Middleware
app.use(cors());
app.use(express.json());
app.use("/api/import", importRoutes);
app.use("/api/parts", partRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/outward", outwardRoutes);
app.use("/api/transactions", transactionRoutes);

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
