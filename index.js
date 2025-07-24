require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/", (req, res) => {
    res.send({
        message: "Medicine E-commerce API Server is running!",
        version: "2.0.0",
        timestamp: new Date().toISOString(),
        availableRoutes: [
            "/api/users",
            "/api/medicines",
            "/api/categories",
            "/api/orders",
            "/api/admin",
            "/api/advertise-requests",
            "/api/seller",
            "/api/health-blogs",
            "/api/companies",
        ],
    });
});

// Import and mount route modules
const userRoutes = require("./routes/userRoutes");
const medicineRoutes = require("./routes/medicineRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const orderRoutes = require("./routes/orderRoutes");
const adminRoutes = require("./routes/adminRoutes");
const advertiseRoutes = require("./routes/advertiseRoutes");
const sellerRoutes = require("./routes/sellerRoutes");
const miscRoutes = require("./routes/miscRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

// Mount routes
app.use("/api/users", userRoutes);
app.use("/api/medicines", medicineRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/advertise-requests", advertiseRoutes);
app.use("/api/seller", sellerRoutes);
app.use("/api", miscRoutes);
app.use("/api", paymentRoutes);

// 404 handler for undefined routes
app.use((req, res) => {
    res.status(404).send({
        message: "Route not found",
        requestedRoute: req.originalUrl,
        method: req.method,
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error("Global error handler:", error);
    res.status(500).send({
        message: "Internal server error",
        error:
            process.env.NODE_ENV === "development"
                ? error.message
                : "Something went wrong",
    });
});

// Start the server
const port = 5000;
app.listen(port, () => {
    console.log(
        `🚀 Medicine E-commerce API Server running at http://localhost:${port}`
    );
    console.log(`📚 API Documentation available at http://localhost:${port}/`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || "development"}`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
    console.error("Unhandled Promise Rejection:", err);
    process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
    process.exit(1);
});

// Graceful shutdown
process.on("SIGINT", () => {
    console.log("\n🛑 Received SIGINT. Graceful shutdown initiated...");
    process.exit(0);
});

process.on("SIGTERM", () => {
    console.log("\n🛑 Received SIGTERM. Graceful shutdown initiated...");
    process.exit(0);
});
