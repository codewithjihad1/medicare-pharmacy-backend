const express = require("express");
const cors = require("cors");

// Import routes
const medicineRoutes = require("./routes/medicineRoutes");

// Create an Express application
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes

app.use("/api/medicines", medicineRoutes);

module.exports = app;
