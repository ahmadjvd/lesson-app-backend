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