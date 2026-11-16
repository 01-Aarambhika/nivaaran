const jwt = require("jsonwebtoken");

function getUserFromRequest(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(header.slice(7), process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "Authentication required" });
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "Authentication required" });
  if (user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });
  req.user = user;
  next();
}

module.exports = { getUserFromRequest, requireAuth, requireAdmin };
