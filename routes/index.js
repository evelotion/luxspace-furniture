const express = require("express");
const router = express.Router();
const db = require("../config/db");


router.get("/", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM products ORDER BY id ASC");
    res.render("index", {
      products: result.rows,
      currentUser: req.session.user || null,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});


router.get("/product", async (req, res) => {
  try {
    const { category, search } = req.query;

    // Base Query
    let query = "SELECT * FROM products WHERE 1=1";
    let params = [];
    let paramIndex = 1;

    // Filter by Category
    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    // Filter by Search Keyword (Smart Search: Name OR Description)
    if (search) {
      query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      params.push(`%${search}%`); // % biar match sebagian kata (fuzzy)
      paramIndex++;
    }

    query += " ORDER BY id ASC";

    const result = await db.query(query, params);
    
    // Ambil list kategori untuk filter pills
    const categoriesRes = await db.query(
      "SELECT DISTINCT category FROM products ORDER BY category ASC"
    );

    res.render("catalog", {
      products: result.rows,
      categories: categoriesRes.rows,
      currentCategory: category || "All",
      currentSearch: search || "", // Kirim keyword balik ke view biar input gak kosong pas reload
      currentUser: req.session.user || null,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});


router.get("/product/:id", async (req, res) => {
  try {
    const productId = req.params.id;

    
    
    const productRes = await db.query("SELECT * FROM products WHERE id = $1", [
      productId,
    ]);

    if (productRes.rows.length === 0) return res.status(404).render("404");

    
    

    res.render("product", {
      product: productRes.rows[0],
      
      currentUser: req.session.user || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading product page");
  }
});


router.get("/privacy-policy", (req, res) => {
  res.render("privacy", { currentUser: req.session.user || null });
});

router.get("/terms", (req, res) => {
  res.render("terms", { currentUser: req.session.user || null });
});

router.get("/about", (req, res) => {
  res.render("about", { currentUser: req.session.user || null });
});

module.exports = router;
