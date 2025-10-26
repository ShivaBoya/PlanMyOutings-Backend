const express = require("express");
const mongoose = require("mongoose");
const auth = require("../middleware/authMiddleware");
const Group = require("../models/groupModel");

const router = express.Router();

// ✅ List groups where the user is owner OR a member
router.get("/", auth, async (req, res) => {
  try {
    const groups = await Group.find({
      $or: [{ owner: req.user.id }, { "members.user": req.user.id }],
    })
      .populate("members.user", "name email")
      .populate("owner", "name email")
      .select("-__v");

    res.status(200).json(groups);
  } catch (err) {
    console.error("Error listing groups:", err);
    res.status(500).json({ message: "Error listing groups", error: err.message });
  }
});

// ✅ Create a new group
router.post("/", auth, async (req, res) => {
  try {
    const { name, description } = req.body;

    const newGroup = new Group({
      _id: new mongoose.Types.ObjectId(),
      name,
      description,
      owner: req.user.id,
      members: [{ user: req.user.id, role: "admin" }],
    });

    const savedGroup = await newGroup.save();

    res.status(201).json(savedGroup);
  } catch (err) {
    console.error("Error creating group:", err);
    res.status(500).json({ message: "Error creating group", error: err.message });
  }
});

// ✅ Get single group details (owner or member can view)
router.get("/:id", auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate("members.user", "name email")
      .populate("owner", "name email");

    if (!group) return res.status(404).json({ message: "Group not found" });

    // allow owner or any member
    const isOwner = group.owner && group.owner._id.toString() === req.user.id;
    const isMember = group.members.some((m) => m.user && m.user._id.toString() === req.user.id);

    if (!isOwner && !isMember) {
      return res.status(403).json({ message: "Forbidden: you are not a member of this group" });
    }

    res.status(200).json(group);
  } catch (err) {
    console.error("Error fetching group:", err);
    res.status(500).json({ message: "Error fetching group", error: err.message });
  }
});

// ✅ Update group
router.put("/:id", auth, async (req, res) => {
  try {
    const group = await Group.findOne({
      _id: req.params.id,
      owner: req.user.id,
    });

    if (!group) return res.status(404).json({ message: "Group not found" });

    const { name, description } = req.body;
    if (name) group.name = name;
    if (description) group.description = description;

    await group.save();
    res.status(200).json({ message: "Group updated", group });
  } catch (err) {
    console.error("Error updating group:", err);
    res.status(500).json({ message: "Error updating group", error: err.message });
  }
});

// ✅ Delete group
router.delete("/:id", auth, async (req, res) => {
  try {
    const group = await Group.findOneAndDelete({
      _id: req.params.id,
      owner: req.user.id,
    });

    if (!group) return res.status(404).json({ message: "Group not found" });

    res.status(200).json({ message: "Group deleted successfully" });
  } catch (err) {
    console.error("Error deleting group:", err);
    res.status(500).json({ message: "Error deleting group", error: err.message });
  }
});

// ✅ Add member
router.post("/:id/members", auth, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "userId required" });

    const group = await Group.findOne({
      _id: req.params.id,
      owner: req.user.id,
    });

    if (!group) return res.status(404).json({ message: "Group not found" });

    const alreadyMember = group.members.some(
      (m) => m.user.toString() === userId
    );
    if (alreadyMember)
      return res.status(400).json({ message: "User already a member" });

    group.members.push({ user: userId, role: "member" });
    await group.save();

    res.status(200).json({ message: "Member added", group });
  } catch (err) {
    console.error("Error adding member:", err);
    res.status(500).json({ message: "Error adding member", error: err.message });
  }
});

module.exports = router;
