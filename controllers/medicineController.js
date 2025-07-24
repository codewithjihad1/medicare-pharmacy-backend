const { medicinesCollection, ObjectId } = require("../mongodb/mongodb");

const medicineController = {
    // Get all medicines
    getAllMedicines: async (req, res) => {
        try {
            const result = await medicinesCollection.find({}).toArray();
            res.send(result);
        } catch (error) {
            res.status(500).send({
                message: "Error fetching medicines",
                error: error.message,
            });
        }
    },

    // Create new medicine
    createMedicine: async (req, res) => {
        try {
            const medicine = req.body;
            if (!medicine.name || !medicine.pricePerUnit) {
                return res.status(400).send({
                    message: "Name and price are required",
                });
            }

            medicine.discountPrice =
                medicine.pricePerUnit -
                medicine.pricePerUnit * (medicine.discount / 100);
            medicine.reviews = 0;
            medicine.rating = 0;
            medicine.inStock = medicine.stockQuantity > 0;
            medicine.createAt = new Date().toISOString();

            const result = await medicinesCollection.insertOne(medicine);
            res.status(201).send(result);
        } catch (error) {
            res.status(500).send({
                message: "Error creating medicine",
                error: error.message,
            });
        }
    },

    // Update medicine by id
    updateMedicine: async (req, res) => {
        try {
            const id = req.params.id;
            const updatedData = req.body;
            delete updatedData._id; // Remove _id to avoid conflict
            const medicineID = new ObjectId(id);

            const result = await medicinesCollection.updateOne(
                { _id: medicineID },
                { $set: updatedData }
            );

            if (result.modifiedCount > 0) {
                res.send({ message: "Medicine updated successfully" });
            } else {
                res.status(404).send({ message: "Medicine not found" });
            }
        } catch (error) {
            res.status(500).send({
                message: "Error updating medicine",
                error: error.message,
            });
        }
    },

    // Delete medicine by id
    deleteMedicine: async (req, res) => {
        try {
            const id = req.params.id;
            const medicineID = new ObjectId(id);
            const result = await medicinesCollection.deleteOne({
                _id: medicineID,
            });

            if (result.deletedCount > 0) {
                res.send({ message: "Medicine deleted successfully" });
            } else {
                res.status(404).send({ message: "Medicine not found" });
            }
        } catch (error) {
            res.status(500).send({
                message: "Error deleting medicine",
                error: error.message,
            });
        }
    },

    // Get medicines by category
    getMedicinesByCategory: async (req, res) => {
        try {
            const category = req.params.category;
            const query = { category: category };
            const medicines = await medicinesCollection.find(query).toArray();
            res.send(medicines);
        } catch (error) {
            res.status(500).send({
                message: "Error fetching medicines by category",
                error: error.message,
            });
        }
    },

    // Get banner medicines
    getBannerMedicines: async (req, res) => {
        try {
            const query = { isInBanner: true };
            const medicines = await medicinesCollection.find(query).toArray();
            res.send(medicines);
        } catch (error) {
            res.status(500).send({
                message: "Error fetching banner medicines",
                error: error.message,
            });
        }
    },

    // Get discount products
    getDiscountProducts: async (req, res) => {
        try {
            const query = { discount: { $gt: 0 } };
            const discountProducts = await medicinesCollection
                .find(query)
                .sort({ discount: -1 })
                .limit(10)
                .toArray();
            res.send(discountProducts);
        } catch (error) {
            res.status(500).send({
                message: "Error fetching discount products",
                error: error.message,
            });
        }
    },

    // Get medicines by seller email
    getMedicinesBySeller: async (req, res) => {
        try {
            const sellerEmail = req.params.email;
            if (!sellerEmail) {
                return res.status(400).send({ message: "Email is required" });
            }
            const query = { "seller.email": sellerEmail };
            const medicines = await medicinesCollection.find(query).toArray();
            res.send(medicines);
        } catch (error) {
            res.status(500).send({
                message: "Error fetching medicines by seller",
                error: error.message,
            });
        }
    },
};

module.exports = medicineController;
