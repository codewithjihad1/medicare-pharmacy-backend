const express = require("express");
const router = express.Router();
const miscController = require("../controllers/miscController");

// Miscellaneous routes
router.get("/health-blogs", miscController.getHealthBlogs);
router.get("/health-blogs/:id", miscController.getHealthBlogById);
router.get("/companies", miscController.getCompanies);

module.exports = router;
