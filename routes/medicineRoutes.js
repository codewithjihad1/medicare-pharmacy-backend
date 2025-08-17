const express = require("express");
const router = express.Router();
const medicineController = require("../controllers/medicineController");

// Medicine CRUD routes
router.get("/", medicineController.getAllMedicines);
router.get("/:id", medicineController.getMedicineById);
router.post("/", medicineController.createMedicine);
router.put("/:id", medicineController.updateMedicine);
router.delete("/:id", medicineController.deleteMedicine);

// Medicine query routes (specific routes first)
router.get("/banner", medicineController.getBannerMedicines);
router.get("/discount-products", medicineController.getDiscountProducts);
router.get("/category/:category", medicineController.getMedicinesByCategory);

// Seller-specific medicines (more specific route)
router.get("/seller/:email", medicineController.getMedicinesBySeller);

module.exports = router;
