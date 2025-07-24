const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const {
    verifyFirebaseToken,
    verifyTokenEmail,
    verifyAdmin,
} = require("../middlewares/middlewares");

// Order routes (specific routes first to avoid parameter conflicts)
router.get("/", verifyFirebaseToken, verifyAdmin, orderController.getAllOrders);
router.get(
    "/:email",
    verifyFirebaseToken,
    verifyTokenEmail,
    orderController.getOrdersByEmail
);

module.exports = router;
