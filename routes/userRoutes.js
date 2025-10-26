const express = require("express");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

router.get("/User/:id", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.put("/UpdateUser/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.id !== req.params.id)
      return res.status(403).json({ message: "Unauthorized action" });

    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select("-password");
    res.json({ message: "Profile updated", updatedUser });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/:id/availability", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("availability");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user.availability);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
