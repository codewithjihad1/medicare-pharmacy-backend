const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");

// Payment routes (at root API level for backward compatibility)
router.post("/create-payment-intent", orderController.createPaymentIntent);
router.post("/confirm-payment", orderController.confirmPayment);

module.exports = router;
