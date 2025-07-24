const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");

// Category CRUD routes
router.get("/", categoryController.getAllCategories);
router.post("/", categoryController.createCategory);
router.put("/:id", categoryController.updateCategory);
router.delete("/:id", categoryController.deleteCategory);
router.get("/:categoryName", categoryController.getCategoryByName);

module.exports = router;
