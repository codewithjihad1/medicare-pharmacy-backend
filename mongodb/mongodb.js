const { MongoClient, ObjectId } = require("mongodb");

// mongoDB connection string
const mongoURI = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASS}@cluster0.ya0qxn8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// mongodb client
const client = new MongoClient(mongoURI);

const db = client.db("medicineShop");
const usersCollection = db.collection("users");
const medicinesCollection = db.collection("medicines");
const categoriesCollection = db.collection("categories");
const healthBlogsCollection = db.collection("health-blogs");
const companiesCollection = db.collection("companies");
const ordersCollection = db.collection("orders");
const advertiseRequestsCollection = db.collection("advertise-requests");

// export all collections
module.exports = {
    usersCollection,
    medicinesCollection,
    categoriesCollection,
    healthBlogsCollection,
    companiesCollection,
    ordersCollection,
    advertiseRequestsCollection,
};
