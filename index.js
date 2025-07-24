require("dotenv").config();
const express = require("express");
const cors = require("cors");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const {
    verifyFirebaseToken,
    verifyTokenEmail,
    verifyAdmin,
} = require("./middlewares/middlewares");
const {
    usersCollection,
    medicinesCollection,
    categoriesCollection,
    healthBlogsCollection,
    companiesCollection,
    ordersCollection,
    advertiseRequestsCollection,
    ObjectId,
} = require("./mongodb/mongodb");

const port = 5000;

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

async function run() {
    try {
        // post user data
        app.post("/api/users", async (req, res) => {
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
        });

        // Get all users
        app.get(
            "/api/users",
            verifyFirebaseToken,
            verifyAdmin,
            async (req, res) => {
                const email = req.decoded.email;
                const result = await usersCollection
                    .find({
                        email: { $ne: email },
                    })
                    .toArray();
                res.send(result);
            }
        );

        // Update user role (admin only)
        app.patch(
            "/api/users/:id/role",
            verifyFirebaseToken,
            verifyAdmin,
            async (req, res) => {
                try {
                    const userId = req.params.id;
                    const { role } = req.body;

                    // Validate role
                    const validRoles = ["customer", "seller", "admin"];
                    if (!validRoles.includes(role)) {
                        return res.status(400).send({
                            message:
                                "Invalid role. Must be one of: customer, seller, admin",
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
            }
        );

        // Delete user (admin only)
        app.delete(
            "/api/users/:id",
            verifyFirebaseToken,
            verifyAdmin,
            async (req, res) => {
                try {
                    const userId = req.params.id;
                    const userObjectId = new ObjectId(userId);

                    // Check if user exists
                    const user = await usersCollection.findOne({
                        _id: userObjectId,
                    });
                    if (!user) {
                        return res
                            .status(404)
                            .send({ message: "User not found" });
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
            }
        );

        // get user by email
        app.get(
            "/api/users/:email",
            verifyFirebaseToken,
            verifyTokenEmail,
            async (req, res) => {
                const email = req.params.email;
                const query = { email: email };
                const user = await usersCollection.findOne(query);
                if (user) {
                    res.send(user);
                } else {
                    res.status(404).send({ message: "User not found" });
                }
            }
        );

        // get all medicines
        app.get("/api/medicines", async (req, res) => {
            const result = await medicinesCollection.find({}).toArray();
            res.send(result);
        });

        // get all categories
        app.get("/api/categories", async (req, res) => {
            const categories = await categoriesCollection
                .find({})
                .sort({ medicineCount: -1 })
                .toArray();
            res.send(categories);
        });

        // get medicines by category
        app.get("/api/medicines/category/:category", async (req, res) => {
            const category = req.params.category;
            const query = { category: category };
            const medicines = await medicinesCollection.find(query).toArray();
            res.send(medicines);
        });

        // get single category by category name
        app.get("/api/categories/:categoryName", async (req, res) => {
            const categoryName = req.params.categoryName;
            const query = { slug: categoryName };
            const category = await categoriesCollection.findOne(query);
            if (category) {
                res.send(category);
            } else {
                res.status(404).send({ message: "Category not found" });
            }
        });

        // =================== CATEGORY MANAGEMENT ENDPOINTS ===================

        // add new category
        app.post("/api/categories", async (req, res) => {
            try {
                const category = req.body;

                // Validate required fields
                if (!category.name) {
                    return res
                        .status(400)
                        .send({ message: "Category name is required" });
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
                category.createdAt =
                    category.createdAt || new Date().toISOString();
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
        });

        // update category by id
        app.put("/api/categories/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const updatedData = req.body;
                delete updatedData._id; // Remove _id to avoid conflict

                const categoryID = new ObjectId(id);
                updatedData.updatedAt = new Date().toISOString();

                // Check if updating name/slug conflicts with existing category
                if (updatedData.name || updatedData.slug) {
                    const existingCategory = await categoriesCollection.findOne(
                        {
                            _id: { $ne: categoryID },
                            $or: [
                                { name: updatedData.name },
                                { slug: updatedData.slug },
                            ],
                        }
                    );

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
        });

        // delete category by id
        app.delete("/api/categories/:id", async (req, res) => {
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
        });

        // get medicine by banner status
        app.get("/api/medicines/banner", async (req, res) => {
            const query = { isInBanner: true };
            const medicines = await medicinesCollection.find(query).toArray();
            res.send(medicines);
        });

        // get discount products
        app.get("/api/discount-products", async (req, res) => {
            const query = { discount: { $gt: 0 } };
            const discountProducts = await medicinesCollection
                .find(query)
                .sort({ discount: -1 })
                .limit(10)
                .toArray();
            res.send(discountProducts);
        });

        // get health blogs
        app.get("/api/health-blogs", async (req, res) => {
            const blogs = await healthBlogsCollection
                .find({})
                .sort({ createdAt: -1 })
                .toArray();
            res.send(blogs);
        });

        // get seller stats
        app.get("/api/seller/stats/:email", async (req, res) => {
            try {
                const sellerEmail = req.params.email;
                if (!sellerEmail) {
                    return res
                        .status(400)
                        .send({ message: "Email is required" });
                }

                // Get total medicines for this seller
                const totalMedicines = await medicinesCollection.countDocuments(
                    {
                        "seller.email": sellerEmail,
                    }
                );

                // Get all orders and filter for seller's items
                const allOrders = await ordersCollection.find({}).toArray();

                let totalRevenue = 0;
                let totalSales = 0;
                let pendingOrders = 0;

                // Calculate monthly revenue for the last 6 months
                const currentDate = new Date();
                const monthlyRevenue = [];
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

                // Initialize monthly revenue array
                for (let i = 5; i >= 0; i--) {
                    const date = new Date(
                        currentDate.getFullYear(),
                        currentDate.getMonth() - i,
                        1
                    );
                    const monthName = monthNames[date.getMonth()];
                    monthlyRevenue.push({
                        month: monthName,
                        revenue: 0,
                    });
                }

                // Process each order
                allOrders.forEach((order) => {
                    // Filter items that belong to this seller
                    const sellerItems =
                        order.items?.filter(
                            (item) => item.seller?.email === sellerEmail
                        ) || [];

                    if (sellerItems.length > 0) {
                        // Calculate total amount for seller's items in this order
                        const sellerOrderTotal = sellerItems.reduce(
                            (sum, item) =>
                                sum + item.pricePerUnit * item.quantity,
                            0
                        );

                        // Add to total revenue if payment is completed
                        if (order.paymentStatus === "paid") {
                            totalRevenue += sellerOrderTotal;
                            totalSales++;

                            // Add to monthly revenue
                            const orderDate = new Date(order.createdAt);
                            const orderMonth = orderDate.getMonth();
                            const orderYear = orderDate.getFullYear();

                            // Find matching month in the last 6 months
                            const monthIndex = monthlyRevenue.findIndex((m) => {
                                const currentYear = currentDate.getFullYear();
                                const currentMonth = currentDate.getMonth();

                                for (let i = 5; i >= 0; i--) {
                                    const targetDate = new Date(
                                        currentYear,
                                        currentMonth - i,
                                        1
                                    );
                                    if (
                                        targetDate.getMonth() === orderMonth &&
                                        targetDate.getFullYear() === orderYear
                                    ) {
                                        return (
                                            monthNames[orderMonth] === m.month
                                        );
                                    }
                                }
                                return false;
                            });

                            if (monthIndex !== -1) {
                                monthlyRevenue[monthIndex].revenue +=
                                    sellerOrderTotal;
                            }
                        } else {
                            // Count as pending order
                            pendingOrders++;
                        }
                    }
                });

                // Calculate platform commission (10%) and net amounts
                const totalCommission = totalRevenue * 0.1;
                const paidTotal = totalRevenue - totalCommission;
                const pendingTotal = 0; // No pending total since we only count paid orders

                const sellerStats = {
                    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
                    paidTotal: parseFloat(paidTotal.toFixed(2)),
                    pendingTotal: parseFloat(pendingTotal.toFixed(2)),
                    totalMedicines: totalMedicines,
                    totalSales: totalSales,
                    pendingOrders: pendingOrders,
                    monthlyRevenue: monthlyRevenue.map((m) => ({
                        month: m.month,
                        revenue: parseFloat(m.revenue.toFixed(2)),
                    })),
                };

                res.send(sellerStats);
            } catch (error) {
                res.status(500).send({
                    message: "Error fetching seller stats",
                    error: error.message,
                });
            }
        });

        // get user role
        app.get("/api/role/:email", async (req, res) => {
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
        });

        // get user statistics
        app.get("/api/user-stats/:email", async (req, res) => {
            try {
                const userEmail = req.params.email;
                if (!userEmail) {
                    return res
                        .status(400)
                        .send({ message: "Email is required" });
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
                        totalSpent += order.orderTotal || 0;
                        completedOrders++;
                    } else {
                        pendingOrders++;
                    }
                });

                // Get recent orders (last 5)
                recentOrders = userOrders
                    .sort(
                        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
                    )
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

                // Calculate wishlist items (placeholder - would need wishlist collection)
                const wishlistItems = 0; // TODO: Implement wishlist functionality

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
                            const currentYear = currentDate.getFullYear();
                            const currentMonth = currentDate.getMonth();

                            for (let i = 5; i >= 0; i--) {
                                const targetDate = new Date(
                                    currentYear,
                                    currentMonth - i,
                                    1
                                );
                                if (
                                    targetDate.getMonth() === orderMonth &&
                                    targetDate.getFullYear() === orderYear
                                ) {
                                    return monthNames[orderMonth] === m.month;
                                }
                            }
                            return false;
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
        });

        // get user profile by email
        app.get("/api/user/profile/:email", async (req, res) => {
            const email = req.params.email;
            if (!email) {
                return res.status(400).send({ message: "Email is required" });
            }
            const userProfile = await usersCollection.findOne({ email: email });
            if (!userProfile) {
                return res.status(404).send({ message: "User not found" });
            }
            res.send(userProfile);
        });

        // update user profile
        app.put("/api/user/profile", async (req, res) => {
            try {
                const { email, ...profileData } = req.body;

                if (!email) {
                    return res
                        .status(400)
                        .send({ message: "Email is required" });
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
        });

        // get user profile by email
        app.get("/api/user/profile/:email", async (req, res) => {
            try {
                const email = req.params.email;

                if (!email) {
                    return res
                        .status(400)
                        .send({ message: "Email is required" });
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
        });

        // get medicines by seller email
        app.get("/api/medicines/:email", async (req, res) => {
            const sellerEmail = req.params.email;
            if (!sellerEmail) {
                return res.status(400).send({ message: "Email is required" });
            }
            const query = { "seller.email": sellerEmail };
            const medicines = await medicinesCollection.find(query).toArray();
            res.send(medicines);
        });

        // get companies info
        app.get("/api/companies", async (req, res) => {
            const companies = await companiesCollection.find({}).toArray();
            res.send(companies);
        });

        // create payment intent
        app.post("/api/create-payment-intent", async (req, res) => {
            try {
                const {
                    amount,
                    currency = "usd",
                    customerInfo,
                    cartItems,
                } = req.body;

                // Validate required fields
                if (!amount || amount <= 0) {
                    return res
                        .status(400)
                        .send({ message: "Valid amount is required" });
                }

                // Calculate the amount in cents (Stripe expects amount in smallest currency unit)
                const amountInCents = Math.round(amount * 100);

                // Create a PaymentIntent with the order amount and currency
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: amountInCents,
                    currency: currency,
                    metadata: {
                        customerEmail: customerInfo?.email || "",
                        customerName: customerInfo?.fullName || "",
                        itemCount: cartItems?.length || 0,
                        orderType: "medicine_purchase",
                    },
                    automatic_payment_methods: {
                        enabled: true,
                    },
                });

                res.send({
                    clientSecret: paymentIntent.client_secret,
                    paymentIntentId: paymentIntent.id,
                });
            } catch (error) {
                console.error("Error creating payment intent:", error);
                res.status(500).send({
                    message: "Error creating payment intent",
                    error: error.message,
                });
            }
        });

        // confirm payment and create order
        app.post("/api/confirm-payment", async (req, res) => {
            try {
                const { paymentIntentId, customerInfo, cartItems, orderTotal } =
                    req.body;

                // Verify payment intent with Stripe
                const paymentIntent = await stripe.paymentIntents.retrieve(
                    paymentIntentId
                );

                if (paymentIntent.status !== "succeeded") {
                    return res
                        .status(400)
                        .send({ message: "Payment not completed" });
                }

                // Create order in database
                const order = {
                    paymentIntentId: paymentIntentId,
                    customerInfo: customerInfo,
                    items: cartItems,
                    orderTotal: orderTotal,
                    paymentStatus: "paid",
                    orderStatus: "confirmed",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };

                const result = await ordersCollection.insertOne(order);

                // Update stock quantities for ordered medicines
                for (const item of cartItems) {
                    const medicineId = new ObjectId(item._id);
                    const quantityOrdered = item.quantity;

                    // Decrease stock quantity
                    await medicinesCollection.updateOne(
                        { _id: medicineId },
                        {
                            $inc: { stockQuantity: -quantityOrdered },
                            $set: {
                                inStock: true,
                                updatedAt: new Date().toISOString(),
                            },
                        }
                    );

                    // Check if stock is now zero and update inStock status
                    const updatedMedicine = await medicinesCollection.findOne({
                        _id: medicineId,
                    });
                    if (updatedMedicine && updatedMedicine.stockQuantity <= 0) {
                        await medicinesCollection.updateOne(
                            { _id: medicineId },
                            { $set: { inStock: false, stockQuantity: 0 } }
                        );
                    }
                }

                res.status(201).send({
                    message: "Order created successfully",
                    orderId: result.insertedId,
                    order: order,
                });
            } catch (error) {
                console.error("Error confirming payment:", error);
                res.status(500).send({
                    message: "Error confirming payment",
                    error: error.message,
                });
            }
        });

        // get orders by customer email
        app.get(
            "/api/orders/:email",
            verifyFirebaseToken,
            verifyTokenEmail,
            async (req, res) => {
                try {
                    const email = req.params.email;
                    const query = { "customerInfo.email": email };
                    const orders = await ordersCollection
                        .find(query)
                        .sort({ createdAt: -1 })
                        .toArray();
                    res.send(orders);
                } catch (error) {
                    res.status(500).send({
                        message: "Error fetching orders",
                        error: error.message,
                    });
                }
            }
        );

        // get all orders (admin only)
        app.get(
            "/api/orders",
            verifyFirebaseToken,
            verifyAdmin,
            async (req, res) => {
                try {
                    const orders = await ordersCollection
                        .find({})
                        .sort({ createdAt: -1 })
                        .toArray();
                    res.send(orders);
                } catch (error) {
                    res.status(500).send({
                        message: "Error fetching orders",
                        error: error.message,
                    });
                }
            }
        );

        // =================== PAYMENT MANAGEMENT ENDPOINTS ===================

        // get all payments with pagination and filtering (admin only)
        app.get(
            "/api/admin/payments",
            verifyFirebaseToken,
            verifyAdmin,
            async (req, res) => {
                try {
                    const { page = 1, limit = 10, status = "all" } = req.query;
                    const skip = (parseInt(page) - 1) * parseInt(limit);

                    // Build filter query
                    let filterQuery = {};
                    if (status !== "all") {
                        filterQuery.paymentStatus = status;
                    }

                    // Get total count for pagination
                    const totalCount = await ordersCollection.countDocuments(
                        filterQuery
                    );

                    // Get orders with payment information
                    const orders = await ordersCollection
                        .find(filterQuery)
                        .sort({ createdAt: -1 })
                        .skip(skip)
                        .limit(parseInt(limit))
                        .toArray();

                    // Transform orders to payment format
                    const payments = orders.map((order) => ({
                        id: order._id,
                        orderId: order._id.toString().slice(-8).toUpperCase(),
                        buyerName:
                            order.customerInfo?.fullName ||
                            order.customerInfo?.name ||
                            "N/A",
                        buyerEmail: order.customerInfo?.email || "N/A",
                        amount: order.orderTotal || 0,
                        paymentMethod: "Stripe",
                        status: order.paymentStatus || "pending",
                        createdAt: order.createdAt,
                        paidAt:
                            order.paymentStatus === "paid"
                                ? order.updatedAt || order.createdAt
                                : null,
                        medicines: order.items
                            ? `${order.items.length} item(s)`
                            : "N/A",
                        items: order.items || [],
                        sellerEmails: order.items
                            ? [
                                  ...new Set(
                                      order.items
                                          .map((item) => item.seller?.email)
                                          .filter(Boolean)
                                  ),
                              ]
                            : [],
                        sellerNames: order.items
                            ? [
                                  ...new Set(
                                      order.items
                                          .map((item) => item.seller?.name)
                                          .filter(Boolean)
                                  ),
                              ]
                            : [],
                    }));

                    // Calculate statistics
                    const totalAmount = await ordersCollection
                        .aggregate([
                            { $match: {} },
                            {
                                $group: {
                                    _id: null,
                                    total: { $sum: "$orderTotal" },
                                },
                            },
                        ])
                        .toArray();

                    const paidAmount = await ordersCollection
                        .aggregate([
                            { $match: { paymentStatus: "paid" } },
                            {
                                $group: {
                                    _id: null,
                                    total: { $sum: "$orderTotal" },
                                },
                            },
                        ])
                        .toArray();

                    const pendingAmount = await ordersCollection
                        .aggregate([
                            { $match: { paymentStatus: { $ne: "paid" } } },
                            {
                                $group: {
                                    _id: null,
                                    total: { $sum: "$orderTotal" },
                                },
                            },
                        ])
                        .toArray();

                    const stats = {
                        totalAmount: totalAmount[0]?.total || 0,
                        paidAmount: paidAmount[0]?.total || 0,
                        pendingAmount: pendingAmount[0]?.total || 0,
                        totalCount: totalCount,
                        paidCount: await ordersCollection.countDocuments({
                            paymentStatus: "paid",
                        }),
                        pendingCount: await ordersCollection.countDocuments({
                            paymentStatus: { $ne: "paid" },
                        }),
                    };

                    res.send({
                        payments,
                        stats,
                        pagination: {
                            currentPage: parseInt(page),
                            totalPages: Math.ceil(totalCount / parseInt(limit)),
                            totalCount,
                            hasNext: skip + parseInt(limit) < totalCount,
                            hasPrev: parseInt(page) > 1,
                        },
                    });
                } catch (error) {
                    res.status(500).send({
                        message: "Error fetching payments",
                        error: error.message,
                    });
                }
            }
        );

        // accept payment (update payment status to paid)
        app.patch(
            "/api/admin/payments/:id/accept",
            verifyFirebaseToken,
            verifyAdmin,
            async (req, res) => {
                try {
                    const orderId = req.params.id;
                    const orderObjectId = new ObjectId(orderId);

                    // Check if order exists
                    const order = await ordersCollection.findOne({
                        _id: orderObjectId,
                    });
                    if (!order) {
                        return res
                            .status(404)
                            .send({ message: "Order not found" });
                    }

                    // Check if payment is already accepted
                    if (order.paymentStatus === "paid") {
                        return res
                            .status(400)
                            .send({ message: "Payment already accepted" });
                    }

                    // Update payment status to paid
                    const result = await ordersCollection.updateOne(
                        { _id: orderObjectId },
                        {
                            $set: {
                                paymentStatus: "paid",
                                orderStatus: "confirmed",
                                updatedAt: new Date().toISOString(),
                            },
                        }
                    );

                    if (result.modifiedCount > 0) {
                        // Get updated order
                        const updatedOrder = await ordersCollection.findOne({
                            _id: orderObjectId,
                        });

                        res.send({
                            message: "Payment accepted successfully",
                            order: updatedOrder,
                        });
                    } else {
                        res.status(400).send({
                            message: "Failed to accept payment",
                        });
                    }
                } catch (error) {
                    res.status(500).send({
                        message: "Error accepting payment",
                        error: error.message,
                    });
                }
            }
        );

        // get comprehensive admin statistics
        app.get(
            "/api/admin/stats",
            verifyFirebaseToken,
            verifyAdmin,
            async (req, res) => {
                try {
                    // Get order statistics
                    const totalOrders = await ordersCollection.countDocuments(
                        {}
                    );
                    const paidOrders = await ordersCollection.countDocuments({
                        paymentStatus: "paid",
                    });
                    const pendingOrders = await ordersCollection.countDocuments(
                        {
                            paymentStatus: { $ne: "paid" },
                        }
                    );

                    // Get user statistics
                    const totalUsers = await usersCollection.countDocuments({});
                    const adminUsers = await usersCollection.countDocuments({
                        role: "admin",
                    });
                    const sellerUsers = await usersCollection.countDocuments({
                        role: "seller",
                    });
                    const regularUsers = await usersCollection.countDocuments({
                        $or: [{ role: "customer" }, { role: { $exists: false } }],
                    });

                    // Get medicine statistics
                    const totalMedicines =
                        await medicinesCollection.countDocuments({});
                    const inStockMedicines =
                        await medicinesCollection.countDocuments({
                            inStock: true,
                        });
                    const outOfStockMedicines =
                        await medicinesCollection.countDocuments({
                            inStock: false,
                        });

                    // Get advertisement statistics
                    const totalAds =
                        await advertiseRequestsCollection.countDocuments({});
                    const approvedAds =
                        await advertiseRequestsCollection.countDocuments({
                            status: "approved",
                        });
                    const pendingAds =
                        await advertiseRequestsCollection.countDocuments({
                            status: "pending",
                        });

                    // Calculate revenue statistics
                    const totalRevenue = await ordersCollection
                        .aggregate([
                            {
                                $group: {
                                    _id: null,
                                    total: { $sum: "$orderTotal" },
                                },
                            },
                        ])
                        .toArray();

                    const paidRevenue = await ordersCollection
                        .aggregate([
                            { $match: { paymentStatus: "paid" } },
                            {
                                $group: {
                                    _id: null,
                                    total: { $sum: "$orderTotal" },
                                },
                            },
                        ])
                        .toArray();

                    const pendingRevenue = await ordersCollection
                        .aggregate([
                            { $match: { paymentStatus: { $ne: "paid" } } },
                            {
                                $group: {
                                    _id: null,
                                    total: { $sum: "$orderTotal" },
                                },
                            },
                        ])
                        .toArray();

                    // Get recent activities (last 5 orders)
                    const recentOrders = await ordersCollection
                        .find({})
                        .sort({ createdAt: -1 })
                        .limit(5)
                        .toArray();

                    // Get growth statistics (compared to last month)
                    const lastMonth = new Date();
                    lastMonth.setMonth(lastMonth.getMonth() - 1);
                    const lastMonthISO = lastMonth.toISOString();

                    const currentMonthOrders =
                        await ordersCollection.countDocuments({
                            createdAt: { $gte: lastMonthISO },
                        });

                    const currentMonthRevenue = await ordersCollection
                        .aggregate([
                            {
                                $match: {
                                    createdAt: { $gte: lastMonthISO },
                                    paymentStatus: "paid",
                                },
                            },
                            {
                                $group: {
                                    _id: null,
                                    total: { $sum: "$orderTotal" },
                                },
                            },
                        ])
                        .toArray();

                    const stats = {
                        // Revenue Statistics
                        totalRevenue: totalRevenue[0]?.total || 0,
                        paidTotal: paidRevenue[0]?.total || 0,
                        pendingTotal: pendingRevenue[0]?.total || 0,

                        // Order Statistics
                        totalOrders,
                        completedOrders: paidOrders,
                        pendingOrders,

                        // User Statistics
                        totalUsers,
                        adminUsers,
                        sellerUsers,
                        regularUsers,

                        // Medicine Statistics
                        totalMedicines,
                        inStockMedicines,
                        outOfStockMedicines,

                        // Advertisement Statistics
                        totalAds,
                        approvedAds,
                        pendingAds,

                        // Growth Statistics
                        currentMonthOrders,
                        currentMonthRevenue: currentMonthRevenue[0]?.total || 0,

                        // Success Rate
                        orderSuccessRate:
                            totalOrders > 0
                                ? ((paidOrders / totalOrders) * 100).toFixed(1)
                                : 0,
                        medicineStockRate:
                            totalMedicines > 0
                                ? (
                                      (inStockMedicines / totalMedicines) *
                                      100
                                  ).toFixed(1)
                                : 0,

                        // Recent Activities
                        recentActivities: recentOrders
                            .map((order) => ({
                                type: "order",
                                message: `New ${
                                    order.paymentStatus === "paid"
                                        ? "payment received"
                                        : "order placed"
                                }: $${order.orderTotal?.toFixed(2) || "0.00"}`,
                                amount: order.orderTotal,
                                status: order.paymentStatus,
                                date: order.createdAt,
                                customer:
                                    order.customerInfo?.fullName || "Anonymous",
                            }))
                            .slice(0, 3),
                    };

                    res.send(stats);
                } catch (error) {
                    res.status(500).send({
                        message: "Error fetching admin statistics",
                        error: error.message,
                    });
                }
            }
        );

        // get payment statistics (admin only) - Legacy endpoint for backward compatibility
        app.get(
            "/api/admin/payment-stats",
            verifyFirebaseToken,
            verifyAdmin,
            async (req, res) => {
                try {
                    // Get payment statistics
                    const totalOrders = await ordersCollection.countDocuments(
                        {}
                    );
                    const paidOrders = await ordersCollection.countDocuments({
                        paymentStatus: "paid",
                    });
                    const pendingOrders = await ordersCollection.countDocuments(
                        {
                            paymentStatus: { $ne: "paid" },
                        }
                    );

                    // Calculate revenue statistics
                    const totalRevenue = await ordersCollection
                        .aggregate([
                            {
                                $group: {
                                    _id: null,
                                    total: { $sum: "$orderTotal" },
                                },
                            },
                        ])
                        .toArray();

                    const paidRevenue = await ordersCollection
                        .aggregate([
                            { $match: { paymentStatus: "paid" } },
                            {
                                $group: {
                                    _id: null,
                                    total: { $sum: "$orderTotal" },
                                },
                            },
                        ])
                        .toArray();

                    const pendingRevenue = await ordersCollection
                        .aggregate([
                            { $match: { paymentStatus: { $ne: "paid" } } },
                            {
                                $group: {
                                    _id: null,
                                    total: { $sum: "$orderTotal" },
                                },
                            },
                        ])
                        .toArray();

                    // Get monthly revenue for last 6 months
                    const sixMonthsAgo = new Date();
                    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

                    const monthlyRevenue = await ordersCollection
                        .aggregate([
                            {
                                $match: {
                                    createdAt: {
                                        $gte: sixMonthsAgo.toISOString(),
                                    },
                                    paymentStatus: "paid",
                                },
                            },
                            {
                                $group: {
                                    _id: {
                                        year: {
                                            $year: {
                                                $dateFromString: {
                                                    dateString: "$createdAt",
                                                },
                                            },
                                        },
                                        month: {
                                            $month: {
                                                $dateFromString: {
                                                    dateString: "$createdAt",
                                                },
                                            },
                                        },
                                    },
                                    revenue: { $sum: "$orderTotal" },
                                    count: { $sum: 1 },
                                },
                            },
                            { $sort: { "_id.year": 1, "_id.month": 1 } },
                        ])
                        .toArray();

                    const stats = {
                        totalOrders,
                        paidOrders,
                        pendingOrders,
                        totalRevenue: totalRevenue[0]?.total || 0,
                        paidRevenue: paidRevenue[0]?.total || 0,
                        pendingRevenue: pendingRevenue[0]?.total || 0,
                        successRate:
                            totalOrders > 0
                                ? ((paidOrders / totalOrders) * 100).toFixed(1)
                                : 0,
                        monthlyRevenue: monthlyRevenue.map((item) => ({
                            month: `${item._id.year}-${String(
                                item._id.month
                            ).padStart(2, "0")}`,
                            revenue: item.revenue,
                            count: item.count,
                        })),
                    };

                    res.send(stats);
                } catch (error) {
                    res.status(500).send({
                        message: "Error fetching payment statistics",
                        error: error.message,
                    });
                }
            }
        );

        // add new medicine
        app.post("/api/medicines", async (req, res) => {
            const medicine = req.body;
            if (!medicine.name || !medicine.pricePerUnit) {
                return res
                    .status(400)
                    .send({ message: "Name and price are required" });
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
        });

        // update medicine by id
        app.put("/api/medicines/:id", async (req, res) => {
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
        });

        // delete medicine by id
        app.delete("/api/medicines/:id", async (req, res) => {
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
        });

        // =================== ADVERTISEMENT REQUEST ENDPOINTS ===================

        // get advertisement requests by seller email
        app.get("/api/advertise-requests/:email", async (req, res) => {
            try {
                const sellerEmail = req.params.email;
                if (!sellerEmail) {
                    return res
                        .status(400)
                        .send({ message: "Email is required" });
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
        });

        // create new advertisement request
        app.post("/api/advertise-requests", async (req, res) => {
            try {
                const request = req.body;

                // Validate required fields
                if (
                    !request.medicineId ||
                    !request.title ||
                    !request.sellerEmail
                ) {
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

                const result = await advertiseRequestsCollection.insertOne(
                    request
                );
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
        });

        // update advertisement request by id
        app.put("/api/advertise-requests/:id", async (req, res) => {
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
        });

        // delete advertisement request by id
        app.delete("/api/advertise-requests/:id", async (req, res) => {
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
        });

        // get all advertisement requests (admin only)
        app.get("/api/advertise-requests", async (req, res) => {
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
        });

        // update advertisement request status (admin only)
        app.patch("/api/advertise-requests/:id/status", async (req, res) => {
            try {
                const id = req.params.id;
                const { status, adminNote } = req.body;

                if (!status) {
                    return res
                        .status(400)
                        .send({ message: "Status is required" });
                }

                const requestID = new ObjectId(id);
                const updateData = {
                    status: status,
                    reviewedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };

                if (adminNote) {
                    updateData.adminNote = adminNote;
                }

                const result = await advertiseRequestsCollection.updateOne(
                    { _id: requestID },
                    { $set: updateData }
                );

                if (result.modifiedCount > 0) {
                    res.send({
                        message:
                            "Advertisement request status updated successfully",
                    });
                } else {
                    res.status(404).send({
                        message: "Advertisement request not found",
                    });
                }
            } catch (error) {
                res.status(500).send({
                    message: "Error updating advertisement request status",
                    error: error.message,
                });
            }
        });

        // get approved/active advertisement requests for slider
        app.get("/api/advertise-requests/active/slider", async (req, res) => {
            try {
                const query = {
                    status: "approved",
                    startDate: { $lte: new Date().toISOString().split("T")[0] },
                    endDate: { $gte: new Date().toISOString().split("T")[0] },
                };

                const activeAds = await advertiseRequestsCollection
                    .find(query)
                    .sort({ submittedAt: -1 })
                    .toArray();

                res.send(activeAds);
            } catch (error) {
                res.status(500).send({
                    message: "Error fetching active advertisements",
                    error: error.message,
                });
            }
        });

        // =================== SALES REPORT ENDPOINTS ===================

        // get sales report (admin only)
        app.get(
            "/api/admin/sales-report",
            verifyFirebaseToken,
            verifyAdmin,
            async (req, res) => {
                try {
                    const {
                        startDate,
                        endDate,
                        page = 1,
                        limit = 50,
                    } = req.query;
                    const skip = (parseInt(page) - 1) * parseInt(limit);

                    // Build filter query
                    let matchQuery = { paymentStatus: "paid" };

                    if (startDate && endDate) {
                        matchQuery.createdAt = {
                            $gte: startDate,
                            $lte: endDate,
                        };
                    }

                    // Aggregate pipeline to get detailed sales data
                    const pipeline = [
                        { $match: matchQuery },
                        { $unwind: "$items" },
                        {
                            $project: {
                                orderId: {
                                    $let: {
                                        vars: {
                                            str: { $toString: "$_id" },
                                        },
                                        in: {
                                            $substr: [
                                                "$$str",
                                                {
                                                    $max: [
                                                        0,
                                                        {
                                                            $subtract: [
                                                                {
                                                                    $strLenCP:
                                                                        "$$str",
                                                                },
                                                                8,
                                                            ],
                                                        },
                                                    ],
                                                },
                                                8,
                                            ],
                                        },
                                    },
                                },
                                buyerName: "$customerInfo.fullName",
                                buyerEmail: "$customerInfo.email",
                                medicineName: "$items.name",
                                medicineCategory: "$items.category",
                                sellerName: "$items.seller.name",
                                sellerEmail: "$items.seller.email",
                                quantity: "$items.quantity",
                                unitPrice: "$items.pricePerUnit",
                                totalPrice: {
                                    $multiply: [
                                        "$items.quantity",
                                        "$items.pricePerUnit",
                                    ],
                                },
                                saleDate: "$createdAt",
                                status: {
                                    $cond: [
                                        { $eq: ["$paymentStatus", "paid"] },
                                        "completed",
                                        "pending",
                                    ],
                                },
                            },
                        },
                        { $sort: { saleDate: -1 } },
                    ];

                    // Get total count for pagination
                    const totalCountPipeline = [
                        ...pipeline,
                        { $count: "total" },
                    ];
                    const totalCountResult = await ordersCollection
                        .aggregate(totalCountPipeline)
                        .toArray();
                    const totalCount = totalCountResult[0]?.total || 0;

                    // Add pagination to main pipeline
                    pipeline.push({ $skip: skip });
                    pipeline.push({ $limit: parseInt(limit) });

                    // Execute aggregation
                    const salesData = await ordersCollection
                        .aggregate(pipeline)
                        .toArray();

                    // Calculate statistics
                    const statsPipeline = [
                        { $match: matchQuery },
                        { $unwind: "$items" },
                        {
                            $group: {
                                _id: null,
                                totalRevenue: {
                                    $sum: {
                                        $multiply: [
                                            "$items.quantity",
                                            "$items.pricePerUnit",
                                        ],
                                    },
                                },
                                totalOrders: { $addToSet: "$_id" },
                                totalQuantity: { $sum: "$items.quantity" },
                                avgOrderValue: {
                                    $avg: {
                                        $multiply: [
                                            "$items.quantity",
                                            "$items.pricePerUnit",
                                        ],
                                    },
                                },
                            },
                        },
                    ];

                    const statsResult = await ordersCollection
                        .aggregate(statsPipeline)
                        .toArray();
                    const stats = statsResult[0] || {
                        totalRevenue: 0,
                        totalOrders: 0,
                        totalQuantity: 0,
                        avgOrderValue: 0,
                    };

                    res.send({
                        salesData: salesData.map((item) => ({
                            ...item,
                            orderId: item.orderId.toUpperCase(),
                            id:
                                item._id ||
                                Math.random().toString(36).substring(2, 11),
                        })),
                        stats,
                        pagination: {
                            currentPage: parseInt(page),
                            totalPages: Math.ceil(totalCount / parseInt(limit)),
                            totalCount,
                            hasNext: skip + parseInt(limit) < totalCount,
                            hasPrev: parseInt(page) > 1,
                        },
                    });
                } catch (error) {
                    res.status(500).send({
                        message: "Error fetching sales report",
                        error: error.message,
                    });
                }
            }
        );

        // get sales statistics summary (admin only)
        app.get(
            "/api/admin/sales-stats",
            verifyFirebaseToken,
            verifyAdmin,
            async (req, res) => {
                try {
                    const { period = "month" } = req.query;

                    // Calculate date range based on period
                    const now = new Date();
                    let startDate;

                    switch (period) {
                        case "week":
                            startDate = new Date(
                                now.getTime() - 7 * 24 * 60 * 60 * 1000
                            );
                            break;
                        case "month":
                            startDate = new Date(
                                now.getTime() - 30 * 24 * 60 * 60 * 1000
                            );
                            break;
                        case "year":
                            startDate = new Date(
                                now.getTime() - 365 * 24 * 60 * 60 * 1000
                            );
                            break;
                        default:
                            startDate = new Date(
                                now.getTime() - 30 * 24 * 60 * 60 * 1000
                            );
                    }

                    const matchQuery = {
                        paymentStatus: "paid",
                        createdAt: { $gte: startDate.toISOString() },
                    };

                    // Get detailed statistics
                    const statsResult = await ordersCollection
                        .aggregate([
                            { $match: matchQuery },
                            { $unwind: "$items" },
                            {
                                $group: {
                                    _id: null,
                                    totalRevenue: {
                                        $sum: {
                                            $multiply: [
                                                "$items.quantity",
                                                "$items.pricePerUnit",
                                            ],
                                        },
                                    },
                                    totalOrders: { $addToSet: "$_id" },
                                    totalItems: { $sum: 1 },
                                    totalQuantity: { $sum: "$items.quantity" },
                                    avgOrderValue: {
                                        $avg: {
                                            $multiply: [
                                                "$items.quantity",
                                                "$items.pricePerUnit",
                                            ],
                                        },
                                    },
                                    topCategories: { $push: "$items.category" },
                                    topSellers: {
                                        $push: "$items.seller.email",
                                    },
                                },
                            },
                            {
                                $project: {
                                    totalRevenue: 1,
                                    totalOrders: { $size: "$totalOrders" },
                                    totalItems: 1,
                                    totalQuantity: 1,
                                    avgOrderValue: 1,
                                    topCategories: 1,
                                    topSellers: 1,
                                },
                            },
                        ])
                        .toArray();

                    const stats = statsResult[0] || {
                        totalRevenue: 0,
                        totalOrders: 0,
                        totalItems: 0,
                        totalQuantity: 0,
                        avgOrderValue: 0,
                        topCategories: [],
                        topSellers: [],
                    };

                    // Process top categories and sellers
                    const categoryCount = {};
                    stats.topCategories.forEach((cat) => {
                        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
                    });

                    const sellerCount = {};
                    stats.topSellers.forEach((seller) => {
                        sellerCount[seller] = (sellerCount[seller] || 0) + 1;
                    });

                    const topCategories = Object.entries(categoryCount)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 5)
                        .map(([category, count]) => ({ category, count }));

                    const topSellers = Object.entries(sellerCount)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 5)
                        .map(([seller, count]) => ({ seller, count }));

                    res.send({
                        ...stats,
                        topCategories,
                        topSellers,
                        period,
                        dateRange: {
                            from: startDate.toISOString(),
                            to: now.toISOString(),
                        },
                    });
                } catch (error) {
                    res.status(500).send({
                        message: "Error fetching sales statistics",
                        error: error.message,
                    });
                }
            }
        );

        // =================== SELLER PAYMENT HISTORY ENDPOINTS ===================

        // get payment history for seller's medicines
        app.get("/api/seller/payments/:email", async (req, res) => {
            try {
                const sellerEmail = req.params.email;
                if (!sellerEmail) {
                    return res
                        .status(400)
                        .send({ message: "Email is required" });
                }

                // Get all orders
                const allOrders = await ordersCollection
                    .find({})
                    .sort({ createdAt: -1 })
                    .toArray();

                // Filter orders that contain seller's medicines and calculate payments
                const sellerPayments = [];

                allOrders.forEach((order) => {
                    // Filter items that belong to this seller
                    const sellerItems =
                        order.items?.filter(
                            (item) => item.seller?.email === sellerEmail
                        ) || [];

                    if (sellerItems.length > 0) {
                        const totalSellerAmount = sellerItems.reduce(
                            (sum, item) =>
                                sum + item.pricePerUnit * item.quantity,
                            0
                        );
                        const commission = totalSellerAmount * 0.1; // 10% platform commission
                        const netAmount = totalSellerAmount - commission;

                        // Determine payment status
                        let paymentStatus = "pending"; // default
                        if (order.paymentStatus === "paid") {
                            paymentStatus = "completed";
                        } else if (
                            order.orderStatus === "cancelled" ||
                            order.orderStatus === "failed"
                        ) {
                            paymentStatus = "failed";
                        }

                        sellerPayments.push({
                            _id: order._id,
                            orderId: order._id,
                            paymentIntentId: order.paymentIntentId,
                            amount: totalSellerAmount,
                            commission: commission,
                            netAmount: netAmount,
                            status: paymentStatus,
                            customerInfo: order.customerInfo,
                            sellerItems: sellerItems,
                            createdAt: order.createdAt,
                            completedAt:
                                order.paymentStatus === "paid"
                                    ? order.updatedAt
                                    : null,
                        });
                    }
                });

                res.send(sellerPayments);
            } catch (error) {
                res.status(500).send({
                    message: "Error fetching seller payment history",
                    error: error.message,
                });
            }
        });

        // get seller payment statistics
        app.get("/api/seller/payment-stats/:email", async (req, res) => {
            try {
                const sellerEmail = req.params.email;
                if (!sellerEmail) {
                    return res
                        .status(400)
                        .send({ message: "Email is required" });
                }

                // Get all orders
                const allOrders = await ordersCollection.find({}).toArray();

                let totalEarnings = 0;
                let totalCommissions = 0;
                let completedPayments = 0;
                let pendingPayments = 0;

                allOrders.forEach((order) => {
                    // Filter items that belong to this seller
                    const sellerItems =
                        order.items?.filter(
                            (item) => item.seller?.email === sellerEmail
                        ) || [];

                    if (sellerItems.length > 0) {
                        const totalSellerAmount = sellerItems.reduce(
                            (sum, item) =>
                                sum + item.pricePerUnit * item.quantity,
                            0
                        );
                        const commission = totalSellerAmount * 0.1;
                        const netAmount = totalSellerAmount - commission;

                        if (order.paymentStatus === "paid") {
                            totalEarnings += netAmount;
                            totalCommissions += commission;
                            completedPayments++;
                        } else {
                            pendingPayments++;
                        }
                    }
                });

                const stats = {
                    totalEarnings: parseFloat(totalEarnings.toFixed(2)),
                    totalCommissions: parseFloat(totalCommissions.toFixed(2)),
                    completedPayments,
                    pendingPayments,
                    totalPayments: completedPayments + pendingPayments,
                };

                res.send(stats);
            } catch (error) {
                res.status(500).send({
                    message: "Error fetching seller payment statistics",
                    error: error.message,
                });
            }
        });

        // Start the server
        app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}`);
        });
    } catch (error) {
        console.log(`Error connecting to MongoDB: ${error.message}`);
    }
}

run().catch((err) => {
    console.dir(err);
});
