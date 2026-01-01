const express = require("express");
const router = express.Router();
const db = require("../config/db");


router.get("/", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM products ORDER BY id ASC");

    res.render("index", {
      products: result.rows,

      currentUser: req.session.user || null 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});


router.get("/product", async (req, res) => {
  try {
    const { category } = req.query; 
    
    let query = "SELECT * FROM products";
    let params = [];


    if (category) {
      query += " WHERE category = $1";
      params.push(category);
    }

    query += " ORDER BY id ASC";


    const result = await db.query(query, params);


    const categoriesRes = await db.query("SELECT DISTINCT category FROM products ORDER BY category ASC");


    res.render("catalog", {
      products: result.rows,
      categories: categoriesRes.rows,     
      currentCategory: category || 'All', 
      currentUser: req.session.user || null
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});


router.get('/product/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        
        const productRes = await db.query("SELECT * FROM products WHERE id = $1", [productId]);

        if(productRes.rows.length === 0) return res.status(404).render('404');
      
        const galleryRes = await db.query("SELECT * FROM product_images WHERE product_id = $1", [productId]);
        
        res.render('product', {
            product: productRes.rows[0],
            gallery: galleryRes.rows, 
            currentUser: req.session.user || null 
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading product page");
    }
});

module.exports = router;