const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const {
    verifyFirebaseToken,
    verifyTokenEmail,
    verifyAdmin,
} = require("../middlewares/middlewares");

// User management routes (specific routes first)
router.post("/", userController.createUser);
router.get("/", verifyFirebaseToken, verifyAdmin, userController.getAllUsers);

// User profile routes (specific paths first to avoid conflicts)
router.get("/profile/:email", userController.getUserProfile);
router.put("/profile", userController.updateUserProfile);

// User statistics and role routes
router.get("/role/:email", userController.getUserRole);
router.get("/stats/:email", userController.getUserStats);

// Generic user routes (parameterized routes last)
router.get(
    "/:email",
    verifyFirebaseToken,
    verifyTokenEmail,
    userController.getUserByEmail
);
router.patch(
    "/:id/role",
    verifyFirebaseToken,
    verifyAdmin,
    userController.updateUserRole
);
router.delete(
    "/:id",
    verifyFirebaseToken,
    verifyAdmin,
    userController.deleteUser
);

module.exports = router;
