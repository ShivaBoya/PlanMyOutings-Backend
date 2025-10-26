const jwt = require("jsonwebtoken");
const Group = require("../models/groupModel");

const auth = (req, res, next) => {
  try {
    let token = req.cookies?.accessToken;

    // ✅ Also check Authorization header (Bearer or Token)
    const authHeader = req.headers["authorization"];
    if (!token && authHeader) {
      const parts = authHeader.split(" ");
      if (parts.length === 2 && (parts[0] === "Bearer" || parts[0] === "Token")) {
        token = parts[1];
      }
    }

    // ✅ Also check x-access-token
    if (!token && req.headers["x-access-token"]) {
      token = req.headers["x-access-token"];
    }

    if (!token) {
      console.warn("No token found in any location:", {
        cookies: !!req.cookies?.accessToken,
        authHeader: !!authHeader,
        xAccessToken: !!req.headers["x-access-token"]
      });
      return res.status(401).json({
        message: "Not authorized — no token found",
        help: "Send token as 'Bearer <token>' in Authorization header, or as 'x-access-token' header, or in 'accessToken' cookie"
      });
    }

    // ✅ Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) {
      return res.status(401).json({ message: "Invalid token format — missing user ID" });
    }

    // ✅ Attach decoded data
    req.user = { id: decoded.id, email: decoded.email, name: decoded.name };
    next();
  } catch (error) {
    console.error("Auth error:", error.message);
    return res.status(401).json({
      message: "Token invalid or expired",
      error: error.message,
      help: "Try logging in again to get a fresh token"
    });
  }
};


// ✅ Check if user is group owner
const isGroupOwner = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (group.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only group owner can perform this action" });
    }

    next();
  } catch (error) {
    console.error("isGroupOwner error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
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
  } catch (error) {
    console.error("isGroupAdmin error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
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
  } catch (error) {
    console.error("isGroupMember error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = auth;
module.exports.isGroupOwner = isGroupOwner;
module.exports.isGroupAdmin = isGroupAdmin;
module.exports.isGroupMember = isGroupMember;
