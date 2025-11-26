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
// Use environment variable for MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI || 
  "mongodb+srv://ahmadjavaid230903_db_user:wednesday@cluster0.vglny5z.mongodb.net";

MongoClient.connect(
  MONGODB_URI,
  { useNewUrlParser: true, useUnifiedTopology: true },
  (err, client) => {
    if (err) {
      console.error("MongoDB connection error:", err);
      return;
    }
    db = client.db("webstore");
    console.log("✓ Connected to MongoDB");
  }
);

// ============================================
// MIDDLEWARE
// ============================================
app.use(express.json());
app.use(logger);

// CORS - Updated for production
app.use((req, res, next) => {
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8080",
    "https://ahmadjvd.github.io"
  ];

  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT,DELETE");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});


// ============================================
// SPECIFIC ROUTES - MUST COME FIRST
// ============================================

// Root endpoint with API info
app.get("/", (req, res) => {
  res.json({
    message: "After School Activities API",
    status: "Running",
    version: "1.0.0",
    endpoints: {
      products: "GET /collection/products",
      search: "GET /search?query=YOUR_QUERY",
      placeOrder: "POST /placeorder",
      updateSpaces: "PUT /update-spaces"
    }
  });
});

// Health check endpoint (important for Render)
app.get("/health", (req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: "OK",
    timestamp: Date.now(),
    database: db ? "connected" : "disconnected"
  };
  res.status(200).json(healthcheck);
});

// SEARCH ENDPOINT - Critical: Must be BEFORE param middleware
app.get("/search", async (req, res) => {
  console.log("→ Search request:", req.query.query);
  
  const query = req.query.query;

  if (!query || query.trim() === "") {
    console.log("✗ Empty search query");
    return res.status(400).json({ msg: "Search query required" });
  }

  // Check if database is connected
  if (!db) {
    return res.status(503).json({ msg: "Database not connected" });
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

// PLACE ORDER ENDPOINT
app.post("/placeorder", (req, res) => {
  console.log("→ Place order request");
  
  const { name, phone, cart } = req.body;

  if (!name || !phone || !cart || cart.length === 0) {
    console.log("✗ Invalid order data");
    return res.status(400).json({ msg: "Invalid order data" });
  }

  // Check if database is connected
  if (!db) {
    return res.status(503).json({ msg: "Database not connected" });
  }

  const ordersCollection = db.collection("orders");

  ordersCollection.insertOne(
    {
      name: name,
      phone: phone,
      cart: cart,
      createdAt: new Date(),
    },
    (err, result) => {
      if (err) {
        console.error("✗ Error saving order:", err);
        return res.status(500).json({ msg: "Error placing order" });
      }
      console.log("✓ Order placed:", result.insertedId);
      res.json({
        msg: "Order placed successfully",
        orderId: result.insertedId,
      });
    }
  );
});

// UPDATE SPACES ENDPOINT
app.put("/update-spaces", async (req, res) => {
  console.log("→ Update spaces request");
  
  const { cart } = req.body;

  if (!cart || cart.length === 0) {
    console.log("✗ Cart is empty");
    return res.status(400).json({ msg: "Cart is empty" });
  }

  // Check if database is connected
  if (!db) {
    return res.status(503).json({ msg: "Database not connected" });
  }

  const productsCollection = db.collection("products");

  try {
    for (let item of cart) {
      await productsCollection.updateOne(
        { id: item.id },
        { $inc: { Spaces: -item.quantity } }
      );
    }

    console.log("✓ Spaces updated successfully");
    res.json({ msg: "Spaces updated successfully" });

  } catch (err) {
    console.error("✗ Error updating spaces:", err);
    res.status(500).json({ msg: "Failed to update spaces", error: err.message });
  }
});

// ============================================
// STATIC FILES - AFTER SPECIFIC ROUTES
// ============================================
app.use("/images", express.static(path.join(__dirname, "images")));

// ============================================
// COLLECTION ROUTES - MUST COME AFTER SPECIFIC ROUTES
// ============================================

// Collection parameter middleware
app.param("collectionName", (req, res, next, collectionName) => {
  if (!db) {
    return res.status(503).json({ msg: "Database not connected" });
  }
  req.collection = db.collection(collectionName);
  return next();
});

// Get all documents from collection
app.get("/collection/:collectionName", (req, res, next) => {
  req.collection.find({}).toArray((e, results) => {
    if (e) return next(e);
    res.send(results);
  });
});

// Get single document by ID
app.get("/collection/:collectionName/:id", (req, res, next) => {
  req.collection.findOne({ _id: new ObjectId(req.params.id) }, (e, result) => {
    if (e) return next(e);
    res.send(result);
  });
});

// Update document by ID
app.put("/collection/:collectionName/:id", (req, res, next) => {
  req.collection.update(
    { _id: new ObjectId(req.params.id) },
    { $set: req.body },
    { safe: true, multi: false },
    (e, result) => {
      if (e) return next(e);
      res.send(result.result.n === 1 ? { msg: "success" } : { msg: "error" });
    }
  );
});

// ============================================
// ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
  console.error("✗ Server Error:", err);
  res.status(500).json({ error: err.message });
});

// ============================================
// START SERVER
// ============================================
// Use environment variable for PORT (Render assigns this)
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("=".repeat(50));
  console.log(`✓ Server started on port ${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log("=".repeat(50));
  console.log("Available endpoints:");
  console.log("  GET  /");
  console.log("  GET  /health");
  console.log("  GET  /collection/products");
  console.log("  GET  /search?query=YOUR_QUERY");
  console.log("  POST /placeorder");
  console.log("  PUT  /update-spaces");
  console.log("=".repeat(50));
});