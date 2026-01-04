const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const db = require("../config/db");
const crypto = require("crypto");
const nodemailer = require("nodemailer"); // Pastikan sudah npm install nodemailer
require("dotenv").config();

// 🔥 SETUP NODEMAILER (GMAIL) 🔥
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Ambil dari Environment Variable
    pass: process.env.EMAIL_PASS, // Ambil dari Environment Variable
  },
});

// Fungsi Helper Kirim Email
const sendEmail = async (to, subject, text) => {
  try {
    const mailOptions = {
      from: `"LuxeSpace Team" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      text: text,
      // html: `<p>${text}</p>` // Bisa dikembangkan pake HTML kalau mau bagus
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email terkirim ke: ${to}`);
    return true;
  } catch (err) {
    console.error("❌ Gagal kirim email:", err);
    return false;
  }
};

// --- ROUTES ---

router.get("/register", (req, res) => {
  res.render("auth/register");
});

router.post("/register", async (req, res) => {
  const { full_name, email, password, confirm_password } = req.body;

  try {
    if (password !== confirm_password) {
      req.flash("error_msg", "Password dan Confirm Password tidak sama!");
      return res.redirect("/auth/register");
    }

    const check = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (check.rows.length > 0) {
      req.flash("error_msg", "Email sudah terdaftar! Silakan Login.");
      return res.redirect("/auth/login");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await db.query(
      "INSERT INTO users (full_name, email, password, is_verified, verification_token) VALUES ($1, $2, $3, $4, $5)",
      [full_name, email, hashedPassword, false, otp]
    );

    // Kirim Email OTP Beneran
    await sendEmail(
      email,
      "Verifikasi Akun LuxeSpace",
      `Selamat datang! Kode OTP Anda adalah: ${otp}`
    );

    req.flash(
      "success_msg",
      "Registrasi berhasil! Cek Email Anda untuk kode OTP."
    );
    res.render("auth/verify-otp", { email: email });
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Terjadi kesalahan sistem.");
    res.redirect("/auth/register");
  }
});

router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await db.query(
      "SELECT * FROM users WHERE email = $1 AND verification_token = $2",
      [email, otp]
    );

    if (user.rows.length === 0) {
      req.flash("error_msg", "Kode OTP salah atau Email tidak valid!");
      return res.render("auth/verify-otp", { email: email });
    }

    await db.query(
      "UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE email = $1",
      [email]
    );

    req.flash("success_msg", "Akun berhasil diverifikasi! Silakan Login.");
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

      // Cek Password Hash vs Input
      const isMatch = await bcrypt.compare(password, user.password);

      if (isMatch) {
        // Cek Status Verifikasi
        if (user.is_verified === false) {
          const newOtp = Math.floor(100000 + Math.random() * 900000).toString();

          await db.query(
            "UPDATE users SET verification_token = $1 WHERE email = $2",
            [newOtp, email]
          );

          // Kirim Email OTP Baru
          await sendEmail(
            email,
            "Verifikasi Ulang LuxeSpace",
            `Anda mencoba login tapi belum verifikasi. Kode OTP Baru: ${newOtp}`
          );

          req.flash(
            "error_msg",
            "Akun belum diverifikasi. Cek Email untuk Kode OTP baru."
          );
          return res.render("auth/verify-otp", { email: email });
        }

        // Login Sukses
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

router.get("/forgot-password", (req, res) => {
  res.render("auth/forgot-password");
});

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (user.rows.length > 0) {
      const token = crypto.randomBytes(20).toString("hex");

      await db.query("UPDATE users SET reset_token = $1 WHERE email = $2", [
        token,
        email,
      ]);

      // URL Dinamis (Bisa Localhost atau Vercel tergantung domain akses)
      // Cara aman: Ambil host dari request headers
      const host = req.get("host"); // Akan otomatis jadi luxspace...vercel.app atau localhost:3000
      const protocol = req.protocol; // http atau https
      const resetLink = `${protocol}://${host}/auth/reset-password/${token}`;

      // Kirim Link Reset ke Email
      await sendEmail(
        email,
        "Reset Password LuxeSpace",
        `Klik link ini untuk reset password Anda: ${resetLink} \n\nLink ini valid untuk sementara waktu.`
      );
    }

    // Selalu kirim pesan ini demi keamanan (biar orang gak bisa nebak email yg terdaftar)
    req.flash(
      "success_msg",
      "Jika email terdaftar, link reset telah dikirim ke Inbox/Spam."
    );
    res.redirect("/auth/login");
  } catch (err) {
    console.error(err);
    res.redirect("/auth/forgot-password");
  }
});

router.get("/reset-password/:token", async (req, res) => {
  const { token } = req.params;

  const user = await db.query(
    "SELECT email FROM users WHERE reset_token = $1",
    [token]
  );

  if (user.rows.length === 0) {
    req.flash("error_msg", "Token tidak valid atau kadaluarsa.");
    return res.redirect("/auth/login");
  }

  res.render("auth/reset-password", { email: user.rows[0].email });
});

router.post("/reset-password", async (req, res) => {
  const { email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      "UPDATE users SET password = $1, reset_token = NULL WHERE email = $2",
      [hashedPassword, email]
    );

    req.flash("success_msg", "Password berhasil diubah! Silakan login.");
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
