const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const {
    verifyFirebaseToken,
    verifyAdmin,
} = require("../middlewares/middlewares");

// Admin statistics routes
router.get(
    "/stats",
    verifyFirebaseToken,
    verifyAdmin,
    adminController.getAdminStats
);
router.get(
    "/payment-stats",
    verifyFirebaseToken,
    verifyAdmin,
    adminController.getPaymentStats
);
router.get(
    "/sales-stats",
    verifyFirebaseToken,
    verifyAdmin,
    adminController.getSalesStats
);
router.get(
    "/sales-report",
    verifyFirebaseToken,
    verifyAdmin,
    adminController.getSalesReport
);

// Payment management routes
router.get(
    "/payments",
    verifyFirebaseToken,
    verifyAdmin,
    adminController.getAllPayments
);
router.patch(
    "/payments/:id/accept",
    verifyFirebaseToken,
    verifyAdmin,
    adminController.acceptPayment
);

module.exports = router;
