const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const Message = require("../models/messageModel");
const Event = require("../models/eventModel");

router.get("/events/:eventId/messages", auth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const messages = await Message.find({ event: eventId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate("sender", "name email");
    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json({ message: "Error fetching messages", error: err.message });
  }
});

router.post("/events/:eventId/messages", auth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { text } = req.body;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    const message = await Message.create({
      event: eventId,
      sender: req.user.id,
      text
    });
    req.io.to(eventId).emit("message:create", message);
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: "Error sending message", error: err.message });
  }
});

module.exports = router;
