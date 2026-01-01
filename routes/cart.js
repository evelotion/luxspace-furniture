const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { ensureAuthenticated } = require("../middleware/authMiddleware");

router.get("/api/my-cart", ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;

    const result = await db.query(
      `
            SELECT ci.id, p.name, p.image_url, p.price, ci.quantity, (p.price * ci.quantity) as subtotal
            FROM cart_items ci
            JOIN carts c ON ci.cart_id = c.id
            JOIN products p ON ci.product_id = p.id
            WHERE c.user_id = $1
            ORDER BY ci.id DESC
        `,
      [userId]
    );

    const totalItems = result.rows.reduce(
      (sum, item) => sum + item.quantity,
      0
    );
    const grandTotal = result.rows.reduce(
      (sum, item) => sum + Number(item.subtotal),
      0
    );

    res.json({
      success: true,
      items: result.rows,
      totalItems,
      grandTotal,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/api/add", ensureAuthenticated, async (req, res) => {
  const userId = req.session.user.id;
  const { product_id } = req.body;
  const quantity = 1;

  try {
    let cartRes = await db.query("SELECT id FROM carts WHERE user_id = $1", [
      userId,
    ]);
    let cartId;

    if (cartRes.rows.length === 0) {
      const newCart = await db.query(
        "INSERT INTO carts (user_id) VALUES ($1) RETURNING id",
        [userId]
      );
      cartId = newCart.rows[0].id;
    } else {
      cartId = cartRes.rows[0].id;
    }

    const itemCheck = await db.query(
      "SELECT id FROM cart_items WHERE cart_id = $1 AND product_id = $2",
      [cartId, product_id]
    );

    if (itemCheck.rows.length > 0) {
      await db.query(
        "UPDATE cart_items SET quantity = quantity + 1 WHERE id = $1",
        [itemCheck.rows[0].id]
      );
    } else {
      await db.query(
        "INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1, $2, $3)",
        [cartId, product_id, quantity]
      );
    }

    res.json({ success: true, message: "Item added to cart" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/", ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;

    const cartQuery = `
            SELECT ci.id, ci.quantity, p.name, p.price, p.image_url, (p.price * ci.quantity) as subtotal
            FROM cart_items ci
            JOIN carts c ON ci.cart_id = c.id
            JOIN products p ON ci.product_id = p.id
            WHERE c.user_id = $1
            ORDER BY ci.id ASC
        `;

    const result = await db.query(cartQuery, [userId]);
    const cartItems = result.rows;
    const grandTotal = cartItems.reduce(
      (sum, item) => sum + Number(item.subtotal),
      0
    );

    res.render("cart", {
      cartItems: cartItems,
      grandTotal: grandTotal,
    });
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Gagal memuat keranjang.");
    res.redirect("/");
  }
});

router.post("/delete/:id", ensureAuthenticated, async (req, res) => {
  try {
    await db.query("DELETE FROM cart_items WHERE id = $1", [req.params.id]);
    req.flash("success_msg", "Item dihapus.");
    res.redirect("/cart");
  } catch (err) {
    console.error(err);
    res.redirect("/cart");
  }
});

module.exports = router;
