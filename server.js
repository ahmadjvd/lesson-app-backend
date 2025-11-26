const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const logger = require("./logger");

const MongoClient = require("mongodb").MongoClient;
const ObjectId = require("mongodb").ObjectId;

let db;

// ============================================
// MONGODB CONNECTION
// ============================================
MongoClient.connect(
  "mongodb+srv://ahmadjavaid230903_db_user:wednesday@cluster0.vglny5z.mongodb.net",
  (err, client) => {
    if (err) {
      console.error("MongoDB connection error:", err);
      return;
    }
    db = client.db("webstore");
    console.log("✓ Connected to MongoDB");
  }
);

app.use(express.json());
app.use(logger);

// CORS - Must be before routes
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT,DELETE");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Access-Control-Allow-Headers, Origin, Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers"
  );
  next();
});
app.get("/", (req, res) => {
  res.send("After School Activities API - Server Running");
});
app.get("/search", async (req, res) => {
  console.log("→ Search request:", req.query.query);
  
  const query = req.query.query;

  if (!query || query.trim() === "") {
    console.log("✗ Empty search query");
    return res.status(400).json({ msg: "Search query required" });
  }

  try {
    const productsCollection = db.collection("products");

    // Check if query is numeric
    const isNumeric = !isNaN(query) && query.trim() !== "";
    const numericQuery = isNumeric ? parseFloat(query) : null;

    // Build search conditions
    const searchConditions = [
      { subject: { $regex: query, $options: "i" } },
      { location: { $regex: query, $options: "i" } }
    ];

    // Add numeric search if applicable
    if (isNumeric) {
      searchConditions.push({ price: numericQuery });
      searchConditions.push({ Spaces: numericQuery });
    }

    // Execute search
    const results = await productsCollection.find({
      $or: searchConditions
    }).toArray();

    console.log(`✓ Found ${results.length} results`);
    res.json(results);

  } catch (err) {
    console.error("✗ Search error:", err);
    res.status(500).json({ msg: "Search failed", error: err.message });
  }
});