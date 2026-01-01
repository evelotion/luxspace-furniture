const express = require("express");
const router = express.Router();
const db = require("../config/db");
const multer = require("multer");
const path = require("path");

// --- KONFIGURASI UPLOAD GAMBAR (MULTER) ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit naik jadi 5MB per file
});


const cpUpload = upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'gallery', maxCount: 10 }
]);

// 1. DASHBOARD (Overview)
router.get("/", async (req, res) => {
  try {
    const totalRevenue = await db.query(
      "SELECT SUM(total_amount) as val FROM orders WHERE status = 'completed'"
    );
    const totalOrders = await db.query("SELECT COUNT(*) as val FROM orders");
    const totalProducts = await db.query(
      "SELECT COUNT(*) as val FROM products"
    );
    const totalUsers = await db.query(
      "SELECT COUNT(*) as val FROM users WHERE role = 'customer'"
    );

    res.render("admin/dashboard", {
      stats: {
        totalRevenue: totalRevenue.rows[0].val || 0,
        totalOrders: totalOrders.rows[0].val || 0,
        totalProducts: totalProducts.rows[0].val || 0,
        totalUsers: totalUsers.rows[0].val || 0,
      },
      page: "dashboard",
    });
  } catch (err) {
    console.error(err);
    res.send("Error Dashboard");
  }
});

// 2. PRODUCTS PAGE
router.get("/products", async (req, res) => {
  try {
    const products = await db.query("SELECT * FROM products ORDER BY id DESC");
    res.render("admin/products", {
      products: products.rows,
      page: "products",
    });
  } catch (err) {
    console.error(err);
    res.send("Error Products");
  }
});

// 3. ORDERS PAGE
router.get("/orders", async (req, res) => {
  try {
    const orders = await db.query(`
            SELECT o.id, o.customer_name, o.total_amount, o.status, o.created_at,
                   STRING_AGG(p.name || ' (' || oi.quantity || ')', ', ') as items_summary
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            GROUP BY o.id
            ORDER BY o.created_at DESC
        `);
    res.render("admin/orders", {
      orders: orders.rows,
      page: "orders",
    });
  } catch (err) {
    console.error(err);
    res.send("Error Orders");
  }
});

// 4. USERS PAGE
router.get("/users", async (req, res) => {
  try {
    const users = await db.query(
      "SELECT id, full_name, email, role FROM users ORDER BY id ASC"
    );
    res.render("admin/users", {
      users: users.rows,
      page: "users",
    });
  } catch (err) {
    console.error(err);
    res.send("Error Users");
  }
});

// --- ACTION ROUTES (POST) ---

// 1. POST: Add Product (Support Multi Image)
router.post("/product", cpUpload, async (req, res) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const { name, category, price, stock, description } = req.body;

    // Handle Main Image
    let mainImageUrl =
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc"; // Default fallback
    if (req.files["image"]) {
      mainImageUrl = "/uploads/" + req.files["image"][0].filename;
    }

    // Insert Product Utama
    const productRes = await client.query(
      "INSERT INTO products (name, category, price, stock, description, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
      [name, category, price, stock, description || "", mainImageUrl]
    );
    const newProductId = productRes.rows[0].id;

    // Handle Gallery Images (Looping)
    if (req.files["gallery"]) {
      for (const file of req.files["gallery"]) {
        const galleryUrl = "/uploads/" + file.filename;
        await client.query(
          "INSERT INTO product_images (product_id, image_url) VALUES ($1, $2)",
          [newProductId, galleryUrl]
        );
      }
    }

    await client.query("COMMIT");
    res.redirect("/admin/products");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.send("Gagal: " + err.message);
  } finally {
    client.release();
  }
});

// 2. POST: Update Product (Support Edit Gambar & Tambah Gallery)
router.post("/product/update/:id", cpUpload, async (req, res) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const { name, category, price, stock, description } = req.body;
    const productId = req.params.id;

    // Update Info Dasar
    await client.query(
      "UPDATE products SET name=$1, category=$2, price=$3, stock=$4, description=$5 WHERE id=$6",
      [name, category, price, stock, description, productId]
    );

    // Update Main Image (Kalau ada upload baru)
    if (req.files["image"]) {
      const newMainUrl = "/uploads/" + req.files["image"][0].filename;
      await client.query("UPDATE products SET image_url=$1 WHERE id=$2", [
        newMainUrl,
        productId,
      ]);
    }

    // Tambah Gallery Images (Append / Menambahkan ke yg sudah ada)
    if (req.files["gallery"]) {
      for (const file of req.files["gallery"]) {
        const galleryUrl = "/uploads/" + file.filename;
        await client.query(
          "INSERT INTO product_images (product_id, image_url) VALUES ($1, $2)",
          [productId, galleryUrl]
        );
      }
    }

    await client.query("COMMIT");
    res.redirect("/admin/products");
  } catch (err) {
    await client.query("ROLLBACK");
    res.send("Gagal update: " + err.message);
  } finally {
    client.release();
  }
});

// 3. API: Fetch Gallery Images (Buat ditampilkan di Modal Edit via AJAX)
router.get("/api/product-gallery/:id", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM product_images WHERE product_id = $1",
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error fetching gallery" });
  }
});

// 4. POST: Delete Specific Gallery Image
router.post("/product/delete-image/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM product_images WHERE id = $1", [req.params.id]);
    res.json({ success: true }); // Kirim JSON balik biar gak reload halaman
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// 5. Delete Product (Utama)
router.post("/product/delete/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM products WHERE id = $1", [req.params.id]);
    res.redirect("/admin/products");
  } catch (err) {
    res.send("Gagal hapus produk.");
  }
});

// 6. Process Order & Cancel Order
router.post("/process/:id", async (req, res) => {
  try {
    await db.query("UPDATE orders SET status = 'completed' WHERE id = $1", [
      req.params.id,
    ]);
    res.redirect("/admin/orders");
  } catch (err) {
    res.send("Error update order");
  }
});

router.post("/cancel/:id", async (req, res) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const orderId = req.params.id;

    const items = await client.query(
      "SELECT product_id, quantity FROM order_items WHERE order_id = $1",
      [orderId]
    );
    for (let item of items.rows) {
      await client.query(
        "UPDATE products SET stock = stock + $1 WHERE id = $2",
        [item.quantity, item.product_id]
      );
    }
    await client.query("UPDATE orders SET status = 'cancelled' WHERE id = $1", [
      orderId,
    ]);

    await client.query("COMMIT");
    res.redirect("/admin/orders");
  } catch (err) {
    await client.query("ROLLBACK");
    res.send("Gagal cancel");
  } finally {
    client.release();
  }
});

module.exports = router;
