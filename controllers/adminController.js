const {
    usersCollection,
    medicinesCollection,
    ordersCollection,
    advertiseRequestsCollection,
    ObjectId,
} = require("../mongodb/mongodb");

const adminController = {
    // Get comprehensive admin statistics
    getAdminStats: async (req, res) => {
        try {
            // Get order statistics
            const totalOrders = await ordersCollection.countDocuments({});
            const paidOrders = await ordersCollection.countDocuments({
                paymentStatus: "paid",
            });
            const pendingOrders = await ordersCollection.countDocuments({
                paymentStatus: { $ne: "paid" },
            });

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
            const totalMedicines = await medicinesCollection.countDocuments({});
            const inStockMedicines = await medicinesCollection.countDocuments({
                inStock: true,
            });
            const outOfStockMedicines =
                await medicinesCollection.countDocuments({
                    inStock: false,
                });

            // Get advertisement statistics
            const totalAds = await advertiseRequestsCollection.countDocuments(
                {}
            );
            const approvedAds =
                await advertiseRequestsCollection.countDocuments({
                    status: "approved",
                });
            const pendingAds = await advertiseRequestsCollection.countDocuments(
                {
                    status: "pending",
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

            const currentMonthOrders = await ordersCollection.countDocuments({
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
                        ? ((inStockMedicines / totalMedicines) * 100).toFixed(1)
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
                        customer: order.customerInfo?.fullName || "Anonymous",
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
    },

    // Get payment statistics (legacy endpoint for backward compatibility)
    getPaymentStats: async (req, res) => {
        try {
            // Get payment statistics
            const totalOrders = await ordersCollection.countDocuments({});
            const paidOrders = await ordersCollection.countDocuments({
                paymentStatus: "paid",
            });
            const pendingOrders = await ordersCollection.countDocuments({
                paymentStatus: { $ne: "paid" },
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
                    month: `${item._id.year}-${String(item._id.month).padStart(
                        2,
                        "0"
                    )}`,
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
    },

    // Get all payments with pagination and filtering
    getAllPayments: async (req, res) => {
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
    },

    // Accept payment (update payment status to paid)
    acceptPayment: async (req, res) => {
        try {
            const orderId = req.params.id;
            const orderObjectId = new ObjectId(orderId);

            // Check if order exists
            const order = await ordersCollection.findOne({
                _id: orderObjectId,
            });
            if (!order) {
                return res.status(404).send({ message: "Order not found" });
            }

            // Check if payment is already accepted
            if (order.paymentStatus === "paid") {
                return res.status(400).send({
                    message: "Payment already accepted",
                });
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
    },

    // Get sales statistics summary
    getSalesStats: async (req, res) => {
        try {
            const { period = "month" } = req.query;

            // Calculate date range based on period
            const now = new Date();
            let startDate;

            switch (period) {
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
                            topSellers: { $push: "$items.seller.email" },
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
    },

    // Get sales report
    getSalesReport: async (req, res) => {
        try {
            const { page = 1, limit = 10, startDate, endDate } = req.query;
            const skip = (parseInt(page) - 1) * parseInt(limit);

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
                                                            $strLenCP: "$$str",
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
            const totalCountPipeline = [...pipeline, { $count: "total" }];
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
                    id: item._id || Math.random().toString(36).substring(2, 11),
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
    },
};

module.exports = adminController;
