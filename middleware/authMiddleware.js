const ensureAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }

  // 🔥 UPDATE LOGIC: Cek kalau URL mengandung '/api' atau request JSON
  if (
    req.originalUrl.includes("/api") || // Cek kalo ada kata 'api' di mana aja
    req.headers.accept?.indexOf("json") > -1 ||
    req.xhr // Cek kalo request dari AJAX/Fetch (biasanya ada header X-Requested-With)
  ) {
    return res.status(401).json({
      success: false,
      message: "Sesi habis atau Anda belum login.",
    });
  }

  // Kalau akses browser biasa, baru redirect
  req.flash("error_msg", "Silakan login terlebih dahulu.");
  res.redirect("/auth/login");
};

const isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.role === "admin") {
    return next();
  }
  req.flash("error_msg", "Akses ditolak! Area khusus Admin.");
  res.redirect("/");
};

module.exports = { ensureAuthenticated, isAdmin };