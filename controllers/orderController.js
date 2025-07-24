// Initialize Stripe only if secret key is available
let stripe;
if (process.env.STRIPE_SECRET_KEY) {
    stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
} else {
    console.warn(
        "Stripe secret key not found, payment features will be disabled"
    );
}

const {
    ordersCollection,
    medicinesCollection,
    ObjectId,
} = require("../mongodb/mongodb");

const orderController = {
    // Get orders by customer email
    getOrdersByEmail: async (req, res) => {
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
    },

    // Get all orders (admin only)
    getAllOrders: async (req, res) => {
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
    },

    // Create payment intent
    createPaymentIntent: async (req, res) => {
        try {
            if (!stripe) {
                return res.status(503).send({
                    message:
                        "Payment service is not available. Stripe is not configured.",
                    error: "Missing STRIPE_SECRET_KEY",
                });
            }

            const {
                amount,
                currency = "usd",
                customerInfo,
                cartItems,
            } = req.body;

            // Validate required fields
            if (!amount || amount <= 0) {
                return res.status(400).send({
                    message: "Valid amount is required",
                });
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
    },

    // Confirm payment and create order
    confirmPayment: async (req, res) => {
        try {
            if (!stripe) {
                return res.status(503).send({
                    message:
                        "Payment service is not available. Stripe is not configured.",
                    error: "Missing STRIPE_SECRET_KEY",
                });
            }

            const { paymentIntentId, customerInfo, cartItems, orderTotal } =
                req.body;

            // Verify payment intent with Stripe
            const paymentIntent = await stripe.paymentIntents.retrieve(
                paymentIntentId
            );

            if (paymentIntent.status !== "succeeded") {
                return res.status(400).send({
                    message: "Payment not completed",
                });
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
    },
};

module.exports = orderController;
