const {
    healthBlogsCollection,
    companiesCollection,
} = require("../mongodb/mongodb");

const miscController = {
    // Get health blogs
    getHealthBlogs: async (req, res) => {
        try {
            const blogs = await healthBlogsCollection
                .find({})
                .sort({ createdAt: -1 })
                .toArray();
            res.send(blogs);
        } catch (error) {
            res.status(500).send({
                message: "Error fetching health blogs",
                error: error.message,
            });
        }
    },

    // Get companies info
    getCompanies: async (req, res) => {
        try {
            const companies = await companiesCollection.find({}).toArray();
            res.send(companies);
        } catch (error) {
            res.status(500).send({
                message: "Error fetching companies",
                error: error.message,
            });
        }
    },
};

module.exports = miscController;
