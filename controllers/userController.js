const {
    usersCollection,
    ordersCollection,
    ObjectId,
} = require("../mongodb/mongodb");

const userController = {
    // Create new user
    createUser: async (req, res) => {
        try {
            const user = req.body;
            const query = { email: user.email };
            const existingUser = await usersCollection.findOne(query);

            if (existingUser) {
                return res.status(409).send({ message: "User already exists" });
            }

            // Insert new user
            user.createAt = new Date().toISOString();
            user.role = user.role || "customer";
            const result = await usersCollection.insertOne(user);
            res.status(201).send(result);
        } catch (error) {
            res.status(500).send({
                message: "Error creating user",
                error: error.message,
            });
        }
    },

    // Get all users (admin only)
    getAllUsers: async (req, res) => {
        try {
            const email = req.decoded.email;
            const result = await usersCollection
                .find({
                    email: { $ne: email },
                })
                .toArray();
            res.send(result);
        } catch (error) {
            res.status(500).send({
                message: "Error fetching users",
                error: error.message,
            });
        }
    },

    // Get user by email
    getUserByEmail: async (req, res) => {
        try {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user) {
                res.send(user);
            } else {
                res.status(404).send({ message: "User not found" });
            }
        } catch (error) {
            res.status(500).send({
                message: "Error fetching user",
                error: error.message,
            });
        }
    },

    // Update user role (admin only)
    updateUserRole: async (req, res) => {
        try {
            const userId = req.params.id;
            const { role } = req.body;

            // Validate role
            const validRoles = ["user", "seller", "admin"];
            if (!validRoles.includes(role)) {
                return res.status(400).send({
                    message:
                        "Invalid role. Must be one of: user, seller, admin",
                });
            }

            const userObjectId = new ObjectId(userId);
            const result = await usersCollection.updateOne(
                { _id: userObjectId },
                {
                    $set: {
                        role: role,
                        updatedAt: new Date().toISOString(),
                    },
                }
            );

            if (result.modifiedCount > 0) {
                res.send({
                    message: `User role updated to ${role} successfully`,
                    modifiedCount: result.modifiedCount,
                });
            } else {
                res.status(404).send({ message: "User not found" });
            }
        } catch (error) {
            res.status(500).send({
                message: "Error updating user role",
                error: error.message,
            });
        }
    },

    // Delete user (admin only)
    deleteUser: async (req, res) => {
        try {
            const userId = req.params.id;
            const userObjectId = new ObjectId(userId);

            // Check if user exists
            const user = await usersCollection.findOne({ _id: userObjectId });
            if (!user) {
                return res.status(404).send({ message: "User not found" });
            }

            // Prevent admin from deleting themselves
            const adminEmail = req.decoded.email;
            if (user.email === adminEmail) {
                return res.status(403).send({
                    message: "Cannot delete your own account",
                });
            }

            // Delete the user
            const result = await usersCollection.deleteOne({
                _id: userObjectId,
            });

            if (result.deletedCount > 0) {
                res.send({
                    message: "User deleted successfully",
                    deletedCount: result.deletedCount,
                });
            } else {
                res.status(404).send({ message: "User not found" });
            }
        } catch (error) {
            res.status(500).send({
                message: "Error deleting user",
                error: error.message,
            });
        }
    },

    // Get user role
    getUserRole: async (req, res) => {
        try {
            const email = req.params.email;
            if (!email) {
                return res.status(400).send({ message: "Email is required" });
            }
            const user = await usersCollection.findOne({ email: email });
            if (user) {
                res.send({ role: user.role });
            } else {
                res.status(404).send({ message: "User not found" });
            }
        } catch (error) {
            res.status(500).send({
                message: "Error fetching user role",
                error: error.message,
            });
        }
    },

    // Get user profile
    getUserProfile: async (req, res) => {
        try {
            const email = req.params.email;

            if (!email) {
                return res.status(400).send({ message: "Email is required" });
            }

            const user = await usersCollection.findOne({ email: email });

            if (user) {
                res.send(user);
            } else {
                res.status(404).send({ message: "User not found" });
            }
        } catch (error) {
            res.status(500).send({
                message: "Error fetching user profile",
                error: error.message,
            });
        }
    },

    // Update user profile
    updateUserProfile: async (req, res) => {
        try {
            const { email, ...profileData } = req.body;

            if (!email) {
                return res.status(400).send({ message: "Email is required" });
            }

            // Update user profile in database
            const updateData = {
                ...profileData,
                updatedAt: new Date().toISOString(),
            };

            const result = await usersCollection.updateOne(
                { email: email },
                { $set: updateData }
            );

            if (result.modifiedCount > 0 || result.matchedCount > 0) {
                res.send({
                    message: "Profile updated successfully",
                    modifiedCount: result.modifiedCount,
                });
            } else {
                res.status(404).send({ message: "User not found" });
            }
        } catch (error) {
            res.status(500).send({
                message: "Error updating user profile",
                error: error.message,
            });
        }
    },

    // Get user statistics
    getUserStats: async (req, res) => {
        try {
            const userEmail = req.params.email;
            if (!userEmail) {
                return res.status(400).send({ message: "Email is required" });
            }

            // Get user info
            const user = await usersCollection.findOne({
                email: userEmail,
            });
            if (!user) {
                return res.status(404).send({ message: "User not found" });
            }

            // Get user's orders
            const userOrders = await ordersCollection
                .find({ "customerInfo.email": userEmail })
                .toArray();

            // Calculate statistics
            let totalOrders = userOrders.length;
            let totalSpent = 0;
            let completedOrders = 0;
            let pendingOrders = 0;
            let recentOrders = [];

            // Process orders for statistics
            userOrders.forEach((order) => {
                if (order.paymentStatus === "paid") {
                    completedOrders++;
                    totalSpent += order.orderTotal || 0;
                } else {
                    pendingOrders++;
                }
            });

            // Get recent orders (last 5)
            recentOrders = userOrders
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 5)
                .map((order) => ({
                    id: order._id,
                    orderId: order._id.toString().slice(-6).toUpperCase(),
                    itemCount: order.items?.length || 0,
                    total: order.orderTotal || 0,
                    status:
                        order.paymentStatus === "paid"
                            ? "Delivered"
                            : "Pending",
                    createdAt: order.createdAt,
                }));

            // Calculate wishlist items (not implemented yet)
            const wishlistItems = 0;

            // Calculate monthly spending for the last 6 months
            const currentDate = new Date();
            const monthlySpending = [];
            const monthNames = [
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
            ];

            // Initialize monthly spending array
            for (let i = 5; i >= 0; i--) {
                const date = new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth() - i,
                    1
                );
                const monthName = monthNames[date.getMonth()];
                monthlySpending.push({
                    month: monthName,
                    spending: 0,
                });
            }

            // Calculate monthly spending
            userOrders.forEach((order) => {
                if (order.paymentStatus === "paid" && order.createdAt) {
                    const orderDate = new Date(order.createdAt);
                    const orderMonth = orderDate.getMonth();
                    const orderYear = orderDate.getFullYear();

                    // Find matching month in the last 6 months
                    const monthIndex = monthlySpending.findIndex((m) => {
                        const mDate = new Date(
                            currentDate.getFullYear(),
                            currentDate.getMonth() -
                                (5 - monthlySpending.indexOf(m)),
                            1
                        );
                        return (
                            mDate.getMonth() === orderMonth &&
                            mDate.getFullYear() === orderYear
                        );
                    });

                    if (monthIndex !== -1) {
                        monthlySpending[monthIndex].spending +=
                            order.orderTotal || 0;
                    }
                }
            });

            // Prepare user stats response
            const userStats = {
                totalOrders: totalOrders,
                completedOrders: completedOrders,
                pendingOrders: pendingOrders,
                totalSpent: parseFloat(totalSpent.toFixed(2)),
                wishlistItems: wishlistItems,
                accountType: user.role || "customer",
                memberSince: user.createAt || user.createdAt,
                recentOrders: recentOrders,
                monthlySpending: monthlySpending.map((m) => ({
                    month: m.month,
                    spending: parseFloat(m.spending.toFixed(2)),
                })),
            };

            res.send(userStats);
        } catch (error) {
            res.status(500).send({
                message: "Error fetching user statistics",
                error: error.message,
            });
        }
    },
};

module.exports = userController;
