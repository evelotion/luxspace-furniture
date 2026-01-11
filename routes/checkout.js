const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { ensureAuthenticated } = require("../middleware/authMiddleware");

router.get("/", ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;

    const cartQuery = `
            SELECT ci.*, p.name, p.price, p.image_url, (p.price * ci.quantity) as subtotal
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            JOIN carts c ON ci.cart_id = c.id
            WHERE c.user_id = $1
        `;
    const cartItems = await db.query(cartQuery, [userId]);

    if (cartItems.rows.length === 0) {
      req.flash("error_msg", "Keranjang Anda kosong.");
      return res.redirect("/cart");
    }

    const grandTotal = cartItems.rows.reduce(
      (sum, item) => sum + Number(item.subtotal),
      0
    );

    const userRes = await db.query("SELECT * FROM users WHERE id = $1", [
      userId,
    ]);
    const userData = userRes.rows[0];

    res.render("checkout", {
      cartItems: cartItems.rows,
      grandTotal: grandTotal,
      user: userData,
    });
  } catch (err) {
    console.error(err);
    res.redirect("/cart");
  }
});

router.post("/process", ensureAuthenticated, async (req, res) => {
  const client = await db.connect();
  const userId = req.session.user.id;
  const { address, payment_method } = req.body;

  try {
    await client.query("BEGIN");

    const cartRes = await client.query(
      "SELECT id FROM carts WHERE user_id = $1",
      [userId]
    );
    const cartId = cartRes.rows[0].id;

    const itemsRes = await client.query(
      `
            SELECT ci.*, p.price, p.stock 
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            WHERE ci.cart_id = $1
        `,
      [cartId]
    );

    const cartItems = itemsRes.rows;
    if (cartItems.length === 0) throw new Error("Keranjang kosong!");

    let totalAmount = 0;
    for (let item of cartItems) {
      if (item.stock < item.quantity) {
        throw new Error(`Stok produk ID ${item.product_id} tidak mencukupi!`);
      }
      totalAmount += item.price * item.quantity;
    }

    const orderRes = await client.query(
      `
            INSERT INTO orders (user_id, customer_name, total_amount, status, created_at)
            VALUES ($1, $2, $3, 'pending', NOW())
            RETURNING id
        `,
      [userId, req.session.user.full_name, totalAmount]
    );

    const orderId = orderRes.rows[0].id;

    for (let item of cartItems) {
      await client.query(
        `
                INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase)
                VALUES ($1, $2, $3, $4)
            `,
        [orderId, item.product_id, item.quantity, item.price]
      );

      await client.query(
        `
                UPDATE products SET stock = stock - $1 WHERE id = $2
            `,
        [item.quantity, item.product_id]
      );
    }

    await client.query("DELETE FROM cart_items WHERE cart_id = $1", [cartId]);

    await client.query("COMMIT");

    req.flash(
      "success_msg",
      "Pembayaran Berhasil! Pesanan #" + orderId + " sedang diproses."
    );

    res.redirect("/orders");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Checkout Error:", err);
    req.flash("error_msg", "Transaksi Gagal: " + err.message);
    res.redirect("/cart");
  } finally {
    client.release();
  }
});

module.exports = router;
