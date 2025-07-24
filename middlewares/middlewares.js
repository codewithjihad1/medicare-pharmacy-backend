const admin = require("firebase-admin");

const serviceAccount = require("../firebase-adminsdk.json");
const { usersCollection } = require("../mongodb/mongodb");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

// Verify Firebase ID Token Middleware
const verifyFirebaseToken = async (req, res, next) => {
    const idToken = req.headers.authorization?.split("Bearer ")[1];
    if (!idToken) {
        return res.status(401).send({ error: "Unauthorized" });
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.decoded = decodedToken;
        next();
    } catch (error) {
        console.error("Error verifying Firebase ID token:", error);
        res.status(401).send({ error: "Unauthorized" });
    }
};

// verify user email middleware
const verifyTokenEmail = async (req, res, next) => {
    const email = req.query.email || req.params.email;

    if (email !== req.decoded.email) {
        return res.status(403).send({ error: "Forbidden" });
    }

    next();
};

// verify admin role middleware
const verifyAdmin = async (req, res, next) => {
    const email = req?.decoded?.email;
    const user = await usersCollection.findOne({
        email,
    });
    if (!user || user?.role !== "admin")
        return res
            .status(403)
            .send({ message: "Admin only Actions!", role: user?.role });

    next();
};

module.exports = {
    verifyFirebaseToken,
    verifyTokenEmail,
    verifyAdmin,
};