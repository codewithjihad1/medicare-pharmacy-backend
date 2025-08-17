const {
    healthBlogsCollection,
    companiesCollection,
} = require("../mongodb/mongodb");
const { ObjectId } = require("mongodb");

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

    // Get health blog by ID
    getHealthBlogById: async (req, res) => {
        const { id } = req.params;
        try {
            const blog = await healthBlogsCollection.findOne({
                _id: new ObjectId(id),
            });
            if (!blog) {
                return res.status(404).send({ message: "Blog not found" });
            }
            res.send(blog);
        } catch (error) {
            res.status(500).send({
                message: "Error fetching health blog",
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
