require("dotenv").config();
const express = require("express");
const cors = require("cors");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const { MongoClient, ObjectId } = require("mongodb");
const {
    verifyFirebaseToken,
    verifyTokenEmail,
} = require("./middlewares/middlewares");

const port = 5000;

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// mongoDB connection string
const mongoURI = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASS}@cluster0.ya0qxn8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// mongodb client
const client = new MongoClient(mongoURI);

async function run() {
    try {
        const db = client.db("medicineShop");
        const usersCollection = db.collection("users");
        const medicinesCollection = db.collection("medicines");
        const categoriesCollection = db.collection("categories");
        const healthBlogsCollection = db.collection("health-blogs");
        const companiesCollection = db.collection("companies");
        const ordersCollection = db.collection("orders");
        const advertiseRequestsCollection = db.collection("advertise-requests");

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
        app.get("/api/users", async (req, res) => {
            const result = await usersCollection.find({}).toArray();
            res.send(result);
        });

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
        app.get("/api/seller/stats", async (req, res) => {
            try {
                // Get total medicines count
                const totalMedicines = await medicinesCollection.countDocuments(
                    {}
                );

                // Get total categories count (can be used as additional metric)
                const totalCategories =
                    await categoriesCollection.countDocuments({});

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

                for (let i = 5; i >= 0; i--) {
                    const date = new Date(
                        currentDate.getFullYear(),
                        currentDate.getMonth() - i,
                        1
                    );
                    const monthName = monthNames[date.getMonth()];

                    // Generate dynamic revenue based on medicines count and some randomization
                    // In a real app, this would come from actual sales/orders data
                    const baseRevenue = totalMedicines * 50; // Base calculation
                    const randomFactor = Math.random() * 0.5 + 0.75; // Random factor between 0.75-1.25
                    const revenue = Math.round(baseRevenue * randomFactor);

                    monthlyRevenue.push({
                        month: monthName,
                        revenue: revenue,
                    });
                }

                // Calculate totals based on monthly revenue
                const totalRevenue = monthlyRevenue.reduce(
                    (sum, month) => sum + month.revenue,
                    0
                );
                const paidTotal = Math.round(totalRevenue * 0.79); // 79% paid
                const pendingTotal = totalRevenue - paidTotal;

                // Calculate other metrics based on medicines
                const totalSales = Math.round(totalMedicines * 6.5); // Approximate sales
                const pendingOrders = Math.round(totalMedicines * 0.5); // Approximate pending orders

                const sellerStats = {
                    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
                    paidTotal: parseFloat(paidTotal.toFixed(2)),
                    pendingTotal: parseFloat(pendingTotal.toFixed(2)),
                    totalMedicines: totalMedicines,
                    totalSales: totalSales,
                    pendingOrders: pendingOrders,
                    monthlyRevenue: monthlyRevenue,
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
        app.get("/api/orders", async (req, res) => {
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
        });

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
                    status: { $in: ["approved", "active"] },
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

                // Get seller's medicines first
                const sellerMedicines = await medicinesCollection
                    .find({ "seller.email": sellerEmail })
                    .toArray();

                const medicineIds = sellerMedicines.map((med) =>
                    med._id.toString()
                );

                // Get all orders (both paid and pending)
                const allOrders = await ordersCollection
                    .find({})
                    .sort({ createdAt: -1 })
                    .toArray();

                // Filter orders that contain seller's medicines and calculate payments
                const sellerPayments = [];

                allOrders.forEach((order) => {
                    const sellerItems =
                        order.items?.filter(
                            (item) =>
                                medicineIds.includes(
                                    item.medicineId?.toString()
                                ) || medicineIds.includes(item._id?.toString())
                        ) || [];

                    if (sellerItems.length > 0) {
                        const totalSellerAmount = sellerItems.reduce(
                            (sum, item) => sum + item.price * item.quantity,
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

                // Get seller's medicines
                const sellerMedicines = await medicinesCollection
                    .find({ "seller.email": sellerEmail })
                    .toArray();

                const medicineIds = sellerMedicines.map((med) =>
                    med._id.toString()
                );

                // Get all orders (paid and pending)
                const allOrders = await ordersCollection.find({}).toArray();

                let totalEarnings = 0;
                let totalCommissions = 0;
                let completedPayments = 0;
                let pendingPayments = 0;

                allOrders.forEach((order) => {
                    const sellerItems =
                        order.items?.filter(
                            (item) =>
                                medicineIds.includes(
                                    item.medicineId?.toString()
                                ) || medicineIds.includes(item._id?.toString())
                        ) || [];

                    if (sellerItems.length > 0) {
                        const totalSellerAmount = sellerItems.reduce(
                            (sum, item) => sum + item.price * item.quantity,
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
