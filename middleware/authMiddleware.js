const jwt = require("jsonwebtoken");
const Group = require("../models/groupModel");

// ✅ Auth middleware
const auth = (req, res, next) => {
  try {
    let token;

    // 1️⃣ Check cookie first
    if (req.cookies?.accessToken) token = req.cookies.accessToken;

    // 2️⃣ Check Authorization header
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(" ");
      if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
        token = parts[1];
      }
    }

    // 3️⃣ Check x-access-token header
    if (!token && req.headers["x-access-token"]) {
      token = req.headers["x-access-token"];
    }

    if (!token) {
      return res.status(401).json({
        message: "Not authorized — no token found",
        help: "Send token in 'Authorization: Bearer <token>', 'x-access-token', or 'accessToken' cookie",
      });
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.id) {
      return res.status(401).json({ message: "Invalid token format — missing user ID" });
    }

    // Attach user to request
    req.user = { id: decoded.id, email: decoded.email || null, name: decoded.name || null };
    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({
      message: "Token invalid or expired",
      error: err.message,
      help: "Try logging in again to get a fresh token",
    });
  }
};

// ✅ Check if user is the group owner
const isGroupOwner = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (group.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only group owner can perform this action" });
    }

    next();
  } catch (err) {
    console.error("isGroupOwner error:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ Check if user is admin or owner
const isGroupAdmin = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const isOwner = group.owner.toString() === req.user.id;
    const isAdmin = group.members?.some(
      (m) => m.user?.toString() === req.user.id && m.role === "admin"
    );

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Only group admin or owner can perform this action" });
    }

    next();
  } catch (err) {
    console.error("isGroupAdmin error:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ Check if user is group member
const isGroupMember = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const isMember =
      group.owner.toString() === req.user.id ||
      group.members?.some((m) => m.user?.toString() === req.user.id);

    if (!isMember) {
      return res.status(403).json({ message: "Only group members can access this" });
    }

    next();
  } catch (err) {
    console.error("isGroupMember error:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ Export all middlewares
module.exports = {
  auth,
  isGroupOwner,
  isGroupAdmin,
  isGroupMember,
};
