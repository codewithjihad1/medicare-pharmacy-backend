const express = require("express");
const router = express.Router();
const advertiseController = require("../controllers/advertiseController");

// Advertisement request routes (specific routes first)
router.get("/active/slider", advertiseController.getActiveAdvertiseRequests);
router.get("/seller/:email", advertiseController.getAdvertiseRequestsBySeller);
router.get("/", advertiseController.getAllAdvertiseRequests);
router.post("/", advertiseController.createAdvertiseRequest);
router.put("/:id", advertiseController.updateAdvertiseRequest);
router.delete("/:id", advertiseController.deleteAdvertiseRequest);
router.patch("/:id/status", advertiseController.updateAdvertiseStatus);

module.exports = router;
