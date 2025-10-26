const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const RSVP = require("../models/rsvpModel");

// Add or update RSVP
router.post("/events/:eventId/rsvp", auth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { status } = req.body;

    let rsvp = await RSVP.findOne({ event: eventId, user: req.user.id });
    if (rsvp) {
      rsvp.status = status;
      await rsvp.save();
      return res.status(200).json(rsvp);
    }

    const newRSVP = new RSVP({ event: eventId, user: req.user.id, status });
    await newRSVP.save();
    res.status(201).json(newRSVP);
  } catch (err) {
    res.status(500).json({ message: "Error adding RSVP", error: err.message });
  }
});

// List RSVPs for an event
router.get("/events/:eventId/rsvps", auth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const rsvps = await RSVP.find({ event: eventId }).populate("user", "name email");
    res.status(200).json(rsvps);
  } catch (err) {
    res.status(500).json({ message: "Error fetching RSVPs", error: err.message });
  }
});

// Update RSVP (same as POST)
router.put("/events/:eventId/rsvp", auth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { status } = req.body;

    let rsvp = await RSVP.findOne({ event: eventId, user: req.user.id });
    if (!rsvp) return res.status(404).json({ message: "RSVP not found" });

    rsvp.status = status;
    await rsvp.save();
    res.status(200).json(rsvp);
  } catch (err) {
    res.status(500).json({ message: "Error updating RSVP", error: err.message });
  }
});

module.exports = router;
