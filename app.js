const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const dotenv = require("dotenv");
const session = require("express-session");
const flash = require("connect-flash");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// 🔥🔥🔥 BAGIAN PENTING YANG DIUBAH 🔥🔥🔥
// 1. Set Folder Views pake process.cwd() (Biar Vercel gak nyasar)
app.set("views", path.join(process.cwd(), "views")); 
app.set("view engine", "ejs");

// 2. Set Folder Public juga pake process.cwd()
app.use(express.static(path.join(process.cwd(), "public"))); 
// 🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(
  session({
    secret: "rahasia_negara_luxe_space",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 },
  })
);

app.use(flash());

app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.currentUser = req.session.user || null;
  next();
});

const indexRoutes = require("./routes/index");
const adminRoutes = require("./routes/admin");
const chatRoutes = require("./routes/chat");
const authRoutes = require("./routes/auth");
const cartRoutes = require("./routes/cart");
const checkoutRoutes = require("./routes/checkout");
const orderRoutes = require('./routes/order');
const profileRoutes = require('./routes/profile');


app.use("/", indexRoutes);
app.use("/auth", authRoutes);
app.use("/cart", cartRoutes);
app.use("/checkout", checkoutRoutes);
app.use("/orders", orderRoutes);
app.use("/api/chat", chatRoutes);
app.use('/profile', profileRoutes);

const { isAdmin } = require("./middleware/authMiddleware");
app.use("/admin", isAdmin, adminRoutes);

app.use((req, res, next) => {
  res.status(404).render("404");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;