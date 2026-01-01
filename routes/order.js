const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { ensureAuthenticated } = require("../middleware/authMiddleware");

router.get("/", ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;

    const query = `
            SELECT 
                o.id, 
                o.total_amount, 
                o.status, 
                o.created_at,
                json_agg(
                    json_build_object(
                        'name', p.name, 
                        'qty', oi.quantity, 
                        'price', p.price, 
                        'image', p.image_url
                    )
                ) as items
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            WHERE o.user_id = $1
            GROUP BY o.id
            ORDER BY o.created_at DESC
        `;

    const result = await db.query(query, [userId]);

    const safeOrders = result.rows.map((order) => ({
      ...order,
      items: Array.isArray(order.items) ? order.items : [],
    }));

    res.render("order", {
      orders: safeOrders,
      user: req.session.user,
    });
  } catch (err) {
    console.error("Error My Order:", err);
    res.redirect("/");
  }
});

module.exports = router;
