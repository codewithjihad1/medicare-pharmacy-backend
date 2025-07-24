const {
    categoriesCollection,
    medicinesCollection,
    ObjectId,
} = require("../mongodb/mongodb");

const categoryController = {
    // Get all categories
    getAllCategories: async (req, res) => {
        try {
            const categories = await categoriesCollection
                .find({})
                .sort({ medicineCount: -1 })
                .toArray();
            res.send(categories);
        } catch (error) {
            res.status(500).send({
                message: "Error fetching categories",
                error: error.message,
            });
        }
    },

    // Get single category by category name
    getCategoryByName: async (req, res) => {
        try {
            const categoryName = req.params.categoryName;
            const query = { slug: categoryName };
            const category = await categoriesCollection.findOne(query);
            if (category) {
                res.send(category);
            } else {
                res.status(404).send({ message: "Category not found" });
            }
        } catch (error) {
            res.status(500).send({
                message: "Error fetching category",
                error: error.message,
            });
        }
    },

    // Add new category
    createCategory: async (req, res) => {
        try {
            const category = req.body;

            // Validate required fields
            if (!category.name) {
                return res.status(400).send({
                    message: "Category name is required",
                });
            }

            // Check if category with same name or slug already exists
            const existingCategory = await categoriesCollection.findOne({
                $or: [{ name: category.name }, { slug: category.slug }],
            });

            if (existingCategory) {
                return res.status(409).send({
                    message: "Category with this name already exists",
                });
            }

            // Set default values
            category.medicineCount = category.medicineCount || 0;
            category.createdAt = category.createdAt || new Date().toISOString();
            category.updatedAt = new Date().toISOString();

            const result = await categoriesCollection.insertOne(category);
            res.status(201).send({
                message: "Category created successfully",
                categoryId: result.insertedId,
            });
        } catch (error) {
            res.status(500).send({
                message: "Error creating category",
                error: error.message,
            });
        }
    },

    // Update category by id
    updateCategory: async (req, res) => {
        try {
            const id = req.params.id;
            const updatedData = req.body;
            delete updatedData._id; // Remove _id to avoid conflict

            const categoryID = new ObjectId(id);
            updatedData.updatedAt = new Date().toISOString();

            // Check if updating name/slug conflicts with existing category
            if (updatedData.name || updatedData.slug) {
                const existingCategory = await categoriesCollection.findOne({
                    _id: { $ne: categoryID },
                    $or: [
                        { name: updatedData.name },
                        { slug: updatedData.slug },
                    ],
                });

                if (existingCategory) {
                    return res.status(409).send({
                        message: "Category with this name already exists",
                    });
                }
            }

            const result = await categoriesCollection.updateOne(
                { _id: categoryID },
                { $set: updatedData }
            );

            if (result.modifiedCount > 0) {
                res.send({ message: "Category updated successfully" });
            } else {
                res.status(404).send({ message: "Category not found" });
            }
        } catch (error) {
            res.status(500).send({
                message: "Error updating category",
                error: error.message,
            });
        }
    },

    // Delete category by id
    deleteCategory: async (req, res) => {
        try {
            const id = req.params.id;
            const categoryID = new ObjectId(id);

            // Check if category has associated medicines
            const medicinesInCategory =
                await medicinesCollection.countDocuments({
                    category: { $exists: true }, // You might need to adjust this query based on your medicine schema
                });

            if (medicinesInCategory > 0) {
                return res.status(400).send({
                    message:
                        "Cannot delete category with associated medicines. Please reassign or delete the medicines first.",
                });
            }

            const result = await categoriesCollection.deleteOne({
                _id: categoryID,
            });

            if (result.deletedCount > 0) {
                res.send({ message: "Category deleted successfully" });
            } else {
                res.status(404).send({ message: "Category not found" });
            }
        } catch (error) {
            res.status(500).send({
                message: "Error deleting category",
                error: error.message,
            });
        }
    },
};

module.exports = categoryController;
