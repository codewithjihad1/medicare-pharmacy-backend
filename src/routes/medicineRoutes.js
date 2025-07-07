const express = require('express');
const router = express.Router();

// Post a new medicine
router.post('/', async (req, res) => {
    try {
        // Logic to add a new medicine
        res.status(201).json({ message: 'Medicine added successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add medicine' });
    }
});

// Get all medicines
router.get('/', async (req, res) => {
    try {
        // Logic to fetch all medicines
        const medicines = []; // Replace with actual data fetching logic
        res.status(200).json(medicines);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch medicines' });
    }
});


module.exports = router;