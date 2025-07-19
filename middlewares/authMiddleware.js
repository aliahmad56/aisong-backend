const jwt = require("jsonwebtoken");
require("dotenv").config();

const userVerifyToken = (req, res, next) => {
  try {
    const token = req.header("Authorization");

    if (!token) {
      return res.status(401).json({
        status: false,
        message: "Access denied. No token provided.",
      });
    }
    console.log("Here reach at token", token);

    const decoded = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET);

    req.email = decoded.email;
    req.userId = decoded.id;

    next();
  } catch (error) {
    console.log(error);
    return res.status(401).json({ message: "Invalid token. Login Again" });
  }
};

// Alak alak jwt function define ko user aur admin bchan wrna error throw koriko no bos tu admin no re.
const adminVerifyToken = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({
      status: false,
      message: "Access denied. No token provided.",
    });
  }
  console.log("Here reach at admin token", token);

  try {
    const decoded = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET);

    // Check if the request is from an admin
    console.log("decoded.isAdmin", decoded.isAdmin);
    if (decoded.isAdmin == true) {
      req.isAdmin = decoded.isAdmin;
      req.adminId = decoded.adminId;
      next();
    } else {
      return res.status(401).json({
        status: false,
        message: "You are not admin",
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(401).json({
      message: "Invalid token.",
    });
  }
};
module.exports = {
  userVerifyToken,
  adminVerifyToken,
};
