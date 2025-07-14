require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { MongoClient, ObjectId } = require("mongodb");
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
        app.get("/api/users/:email", async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user) {
                res.send(user);
            } else {
                res.status(404).send({ message: "User not found" });
            }
        });

        // get all medicines
        app.get("/api/medicines", async (req, res) => {
            const result = await medicinesCollection.find({}).toArray();
            res.send(result);
        });

        // get all categories
        app.get("/api/categories", async (req, res) => {
            const categories = await categoriesCollection.find({}).toArray();
            res.send(categories);
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
