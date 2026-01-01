const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const db = require("../config/db");

router.get("/register", (req, res) => {
  res.render("auth/register");
});

router.post("/register", async (req, res) => {
  const { full_name, email, password } = req.body;
  try {
    const check = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (check.rows.length > 0) {
      req.flash("error_msg", "Email sudah terdaftar!");
      return res.redirect("/auth/register");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      "INSERT INTO users (full_name, email, password) VALUES ($1, $2, $3)",
      [full_name, email, hashedPassword]
    );

    req.flash("success_msg", "Registrasi berhasil! Silakan login.");
    res.redirect("/auth/login");
  } catch (err) {
    console.error(err);
    res.redirect("/auth/register");
  }
});

router.get("/login", (req, res) => {
  res.render("auth/login");
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const userRes = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (userRes.rows.length > 0) {
      const user = userRes.rows[0];

      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        req.session.user = {
          id: user.id,
          full_name: user.full_name,
          role: user.role,
        };

        req.flash("success_msg", "Welcome back, " + user.full_name);

        if (user.role === "admin") return res.redirect("/admin");
        return res.redirect("/");
      }
    }

    req.flash("error_msg", "Email atau Password salah!");
    res.redirect("/auth/login");
  } catch (err) {
    console.error(err);
    res.redirect("/auth/login");
  }
});

router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/auth/login");
  });
});

module.exports = router;
