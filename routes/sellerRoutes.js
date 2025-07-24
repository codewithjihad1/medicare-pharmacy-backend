const express = require("express");
const router = express.Router();
const sellerController = require("../controllers/sellerController");

// Seller statistics routes
router.get("/stats/:email", sellerController.getSellerStats);
router.get("/payments/:email", sellerController.getSellerPayments);
router.get("/payment-stats/:email", sellerController.getSellerPaymentStats);

module.exports = router;
