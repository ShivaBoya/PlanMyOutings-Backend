const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const Event = require("../models/eventModel");
const Group = require("../models/groupModel");

//  POST /groups/:groupId/events — create event
router.post("/groups/:groupId/events", auth, async (req, res) => {
  try {
    const { title, description, date, location } = req.body;
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const newEvent = await Event.create({
      group: req.params.groupId,
      title,
      description,
      date,
      location,
      creator: req.user.id,
    });

    res.status(201).json({ message: "Event created successfully", event: newEvent });
  } catch (error) {
    res.status(500).json({ message: "Error creating event", error: error.message });
  }
});

//  GET /groups/:groupId/events — list events
router.get("/groups/:groupId/events", auth, async (req, res) => {
  try {
    const events = await Event.find({ group: req.params.groupId }).populate("creator", "name email");
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: "Error fetching events", error: error.message });
  }
});

//  GET /events/:id — get event details
router.get("/events/:id", auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate("group", "name")
      .populate("creator", "name email");
    if (!event) return res.status(404).json({ message: "Event not found" });

    res.status(200).json(event);
  } catch (error) {
    res.status(500).json({ message: "Error fetching event", error: error.message });
  }
});

//  PUT /events/:id — update event (creator/admin)
router.put("/events/:id", auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate("group");
    if (!event) return res.status(404).json({ message: "Event not found" });

    const group = await Group.findById(event.group._id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const isAdmin = group.members.some(
      (m) => m.user.toString() === req.user.id && m.role === "admin"
    );
    const isCreator = event.creator.toString() === req.user.id;

    if (!isAdmin && !isCreator)
      return res.status(403).json({ message: "Only creator or admin can update event" });

    const updatedEvent = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ message: "Event updated successfully", event: updatedEvent });
  } catch (error) {
    res.status(500).json({ message: "Error updating event", error: error.message });
  }
});

//  DELETE /events/:id — delete event (creator/admin)
router.delete("/events/:id", auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate("group");
    if (!event) return res.status(404).json({ message: "Event not found" });

    const group = await Group.findById(event.group._id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const isAdmin = group.members.some(
      (m) => m.user.toString() === req.user.id && m.role === "admin"
    );
    const isCreator = event.creator.toString() === req.user.id;

    if (!isAdmin && !isCreator)
      return res.status(403).json({ message: "Only creator or admin can delete event" });

    await event.deleteOne();
    res.status(200).json({ message: "Event deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting event", error: error.message });
  }
});

//  GET /events/:id/suggestions — list suggestions
router.get("/events/:id/suggestions", auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    // Mock suggestions
    const suggestions = [
      { type: "movie", name: "Inception", source: "TMDB" },
      { type: "restaurant", name: "Café Mocha", source: "Google Places" },
      { type: "hangout", name: "Central Park", source: "Google Maps" },
    ];

    res.status(200).json({ message: "Suggestions generated", suggestions });
  } catch (error) {
    res.status(500).json({ message: "Error fetching suggestions", error: error.message });
  }
});

//  POST /events/:id/schedule-reminder — schedule reminder
router.post("/events/:id/schedule-reminder", auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    // Mock scheduler
    res.status(200).json({
      message: `Reminder scheduled for event "${event.title}" on ${event.date}`,
    });
  } catch (error) {
    res.status(500).json({ message: "Error scheduling reminder", error: error.message });
  }
});

module.exports = router;
