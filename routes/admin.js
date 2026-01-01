const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { isAdmin } = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");


const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });


router.get("/", isAdmin, async (req, res) => {
  try {
    const products = await db.query("SELECT COUNT(*) FROM products");
    const orders = await db.query("SELECT COUNT(*) FROM orders");
    const users = await db.query("SELECT COUNT(*) FROM users");
    res.render("admin/dashboard", {
      stats: {
        products: products.rows[0].count,
        orders: orders.rows[0].count,
        users: users.rows[0].count,
      },
    });
  } catch (err) {
    res.status(500).send("Server Error");
  }
});


router.get("/products", isAdmin, async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM products ORDER BY id DESC");
    res.render("admin/products", { products: result.rows });
  } catch (err) {
    res.status(500).send("Server Error");
  }
});


router.post(
  "/products",
  isAdmin,
  upload.fields([{ name: "gallery", maxCount: 5 }]),
  async (req, res) => {
    const { name, category, price, stock, description, cover_index } = req.body;
    const gallery = req.files["gallery"]
      ? req.files["gallery"].map((f) => `/uploads/${f.filename}`)
      : [];
    const image_url = gallery[cover_index || 0] || "";

    try {
      await db.query(
        "INSERT INTO products (name, category, price, stock, description, image_url, gallery) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [
          name,
          category,
          price,
          stock,
          description,
          image_url,
          JSON.stringify(gallery),
        ]
      );
      res.redirect("/admin/products");
    } catch (err) {
      res.status(500).send(err.message);
    }
  }
);


router.post("/products/edit", isAdmin, upload.fields([{ name: "gallery", maxCount: 5 }]), async (req, res) => {
    const { id, name, category, price, stock, description, cover_index } = req.body;
    
    try {
        const oldProduct = await db.query("SELECT image_url, gallery FROM products WHERE id = $1", [id]);
        
        let image_url = oldProduct.rows[0].image_url;
        let gallery = oldProduct.rows[0].gallery;

        if (req.files && req.files["gallery"]) {
            const newGallery = req.files["gallery"].map((f) => `/uploads/${f.filename}`);
            gallery = JSON.stringify(newGallery);
            image_url = newGallery[cover_index || 0] || newGallery[0];
        }

        await db.query(
            "UPDATE products SET name=$1, category=$2, price=$3, stock=$4, description=$5, image_url=$6, gallery=$7 WHERE id=$8",
            [name, category, price, stock, description, image_url, gallery, id]
        );
        
        res.redirect("/admin/products");
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.get("/products/delete/:id", isAdmin, async (req, res) => {
  try {
    await db.query("DELETE FROM products WHERE id = $1", [req.params.id]);
    res.redirect("/admin/products");
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

router.get("/orders", isAdmin, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT orders.*, users.full_name 
      FROM orders 
      JOIN users ON orders.user_id = users.id 
      ORDER BY orders.created_at DESC
    `);
    
    res.render("admin/orders", { orders: result.rows });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});
router.get("/users", isAdmin, async (req, res) => {
  try {
    const result = await db.query("SELECT id, full_name, email, role, created_at FROM users ORDER BY created_at DESC");
    
    res.render("admin/users", { users: result.rows });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});
module.exports = router;
