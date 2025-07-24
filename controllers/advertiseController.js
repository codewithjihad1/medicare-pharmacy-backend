const { advertiseRequestsCollection, ObjectId } = require("../mongodb/mongodb");

const advertiseController = {
    // Get advertisement requests by seller email
    getAdvertiseRequestsBySeller: async (req, res) => {
        try {
            const sellerEmail = req.params.email;
            if (!sellerEmail) {
                return res.status(400).send({ message: "Email is required" });
            }
            const query = { sellerEmail: sellerEmail };
            const requests = await advertiseRequestsCollection
                .find(query)
                .sort({ submittedAt: -1 })
                .toArray();
            res.send(requests);
        } catch (error) {
            res.status(500).send({
                message: "Error fetching advertisement requests",
                error: error.message,
            });
        }
    },

    // Create new advertisement request
    createAdvertiseRequest: async (req, res) => {
        try {
            const request = req.body;

            // Validate required fields
            if (!request.medicineId || !request.title || !request.sellerEmail) {
                return res.status(400).send({
                    message:
                        "Medicine ID, title, and seller email are required",
                });
            }

            // Set default values
            request.submittedAt = new Date().toISOString();
            request.status = request.status || "pending";
            request.clicks = request.clicks || 0;
            request.impressions = request.impressions || 0;
            request.conversions = request.conversions || 0;
            request.cost = request.cost || 0;

            const result = await advertiseRequestsCollection.insertOne(request);
            res.status(201).send({
                message: "Advertisement request created successfully",
                requestId: result.insertedId,
            });
        } catch (error) {
            res.status(500).send({
                message: "Error creating advertisement request",
                error: error.message,
            });
        }
    },

    // Update advertisement request by id
    updateAdvertiseRequest: async (req, res) => {
        try {
            const id = req.params.id;
            const updatedData = req.body;
            delete updatedData._id; // Remove _id to avoid conflict

            const requestID = new ObjectId(id);
            updatedData.updatedAt = new Date().toISOString();

            const result = await advertiseRequestsCollection.updateOne(
                { _id: requestID },
                { $set: updatedData }
            );

            if (result.modifiedCount > 0) {
                res.send({
                    message: "Advertisement request updated successfully",
                });
            } else {
                res.status(404).send({
                    message: "Advertisement request not found",
                });
            }
        } catch (error) {
            res.status(500).send({
                message: "Error updating advertisement request",
                error: error.message,
            });
        }
    },

    // Delete advertisement request by id
    deleteAdvertiseRequest: async (req, res) => {
        try {
            const id = req.params.id;
            const requestID = new ObjectId(id);

            const result = await advertiseRequestsCollection.deleteOne({
                _id: requestID,
            });

            if (result.deletedCount > 0) {
                res.send({
                    message: "Advertisement request deleted successfully",
                });
            } else {
                res.status(404).send({
                    message: "Advertisement request not found",
                });
            }
        } catch (error) {
            res.status(500).send({
                message: "Error deleting advertisement request",
                error: error.message,
            });
        }
    },

    // Get all advertisement requests (admin only)
    getAllAdvertiseRequests: async (req, res) => {
        try {
            const requests = await advertiseRequestsCollection
                .find({})
                .sort({ submittedAt: -1 })
                .toArray();
            res.send(requests);
        } catch (error) {
            res.status(500).send({
                message: "Error fetching advertisement requests",
                error: error.message,
            });
        }
    },

    // Update advertisement request status (admin only)
    updateAdvertiseStatus: async (req, res) => {
        try {
            const id = req.params.id;
            const { status } = req.body;

            // Validate status
            const validStatuses = ["pending", "approved", "rejected"];
            if (!validStatuses.includes(status)) {
                return res.status(400).send({
                    message:
                        "Invalid status. Must be one of: pending, approved, rejected",
                });
            }

            const requestID = new ObjectId(id);
            const result = await advertiseRequestsCollection.updateOne(
                { _id: requestID },
                {
                    $set: {
                        status: status,
                        updatedAt: new Date().toISOString(),
                        reviewedAt: new Date().toISOString(),
                    },
                }
            );

            if (result.modifiedCount > 0) {
                res.send({
                    message: `Advertisement request ${status} successfully`,
                    modifiedCount: result.modifiedCount,
                });
            } else {
                res.status(404).send({
                    message: "Advertisement request not found",
                });
            }
        } catch (error) {
            res.status(500).send({
                message: "Error updating advertisement status",
                error: error.message,
            });
        }
    },

    // Get approved/active advertisement requests for slider
    getActiveAdvertiseRequests: async (req, res) => {
        try {
            const activeRequests = await advertiseRequestsCollection
                .find({ status: "approved" })
                .sort({ submittedAt: -1 })
                .toArray();
            res.send(activeRequests);
        } catch (error) {
            res.status(500).send({
                message: "Error fetching active advertisement requests",
                error: error.message,
            });
        }
    },
};

module.exports = advertiseController;
