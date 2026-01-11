const ensureAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }

  if (
    req.originalUrl.startsWith("/api") ||
    req.headers.accept?.indexOf("json") > -1
  ) {
    return res
      .status(401)
      .json({
        success: false,
        message: "Sesi habis. Silakan refresh dan login ulang.",
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
