const jwt = require("jsonwebtoken");

module.exports = function(req, res, next) {
const authHeader = req.headers.authorization || req.headers.Authorization;
const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: decoded.id || decoded.email
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
