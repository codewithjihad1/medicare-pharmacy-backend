const { medicinesCollection, ordersCollection } = require("../mongodb/mongodb");

const sellerController = {
    // Get seller stats
    getSellerStats: async (req, res) => {
        try {
            const sellerEmail = req.params.email;
            if (!sellerEmail) {
                return res.status(400).send({ message: "Email is required" });
            }

            // Get total medicines for this seller
            const totalMedicines = await medicinesCollection.countDocuments({
                "seller.email": sellerEmail,
            });

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
                    const totalSellerAmount = sellerItems.reduce(
                        (sum, item) => sum + item.pricePerUnit * item.quantity,
                        0
                    );

                    if (order.paymentStatus === "paid") {
                        totalRevenue += totalSellerAmount;
                        totalSales += sellerItems.length;

                        // Calculate monthly revenue
                        if (order.createdAt) {
                            const orderDate = new Date(order.createdAt);
                            const orderMonth = orderDate.getMonth();
                            const orderYear = orderDate.getFullYear();

                            // Find matching month in the last 6 months
                            const monthIndex = monthlyRevenue.findIndex((m) => {
                                const mDate = new Date(
                                    currentDate.getFullYear(),
                                    currentDate.getMonth() -
                                        (5 - monthlyRevenue.indexOf(m)),
                                    1
                                );
                                return (
                                    mDate.getMonth() === orderMonth &&
                                    mDate.getFullYear() === orderYear
                                );
                            });

                            if (monthIndex !== -1) {
                                monthlyRevenue[monthIndex].revenue +=
                                    totalSellerAmount;
                            }
                        }
                    } else {
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
    },

    // Get payment history for seller's medicines
    getSellerPayments: async (req, res) => {
        try {
            const sellerEmail = req.params.email;
            if (!sellerEmail) {
                return res.status(400).send({ message: "Email is required" });
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
                        (sum, item) => sum + item.pricePerUnit * item.quantity,
                        0
                    );
                    const commission = totalSellerAmount * 0.1; // 10% commission
                    const netAmount = totalSellerAmount - commission;

                    sellerPayments.push({
                        orderId: order._id,
                        orderIdShort: order._id
                            .toString()
                            .slice(-8)
                            .toUpperCase(),
                        paymentId: order.paymentIntentId || "N/A",
                        buyerName: order.customerInfo?.fullName || "N/A",
                        buyerEmail: order.customerInfo?.email || "N/A",
                        totalAmount: parseFloat(totalSellerAmount.toFixed(2)),
                        commission: parseFloat(commission.toFixed(2)),
                        netAmount: parseFloat(netAmount.toFixed(2)),
                        paymentStatus: order.paymentStatus || "pending",
                        createdAt: order.createdAt,
                        items: sellerItems.map((item) => ({
                            name: item.name,
                            quantity: item.quantity,
                            unitPrice: item.pricePerUnit,
                            totalPrice: item.quantity * item.pricePerUnit,
                        })),
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
    },

    // Get seller payment statistics
    getSellerPaymentStats: async (req, res) => {
        try {
            const sellerEmail = req.params.email;
            if (!sellerEmail) {
                return res.status(400).send({ message: "Email is required" });
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
                        (sum, item) => sum + item.pricePerUnit * item.quantity,
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
    },
};

module.exports = sellerController;
