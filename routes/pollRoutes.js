const express = require("express");
const router = express.Router();
const auth  = require("../middleware/authMiddleware");
const Poll = require("../models/pollModel");
const Event = require("../models/eventModel");

router.post("/events/:eventId/polls", auth, async (req, res) => {
  try {
    const { question, options, type } = req.body;
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    const poll = await Poll.create({
      event: req.params.eventId,
      creator: req.user.id,
      question,
      type,
      options: options.map((opt) => ({ text: opt })),
    });
    res.status(201).json({ message: "Poll created successfully", poll });
  } catch (error) {
    res.status(500).json({ message: "Error creating poll", error: error.message });
  }
});

router.get("/events/:eventId/polls", auth, async (req, res) => {
  try {
    const polls = await Poll.find({ event: req.params.eventId }).populate("creator", "name email");
    res.status(200).json(polls);
  } catch (error) {
    res.status(500).json({ message: "Error fetching polls", error: error.message });
  }
});

router.get("/polls/:id", auth, async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id)
      .populate("creator", "name email")
      .populate("votes.user", "name email");
    if (!poll) return res.status(404).json({ message: "Poll not found" });
    res.status(200).json(poll);
  } catch (error) {
    res.status(500).json({ message: "Error fetching poll", error: error.message });
  }
});

router.put("/polls/:id", auth, async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) return res.status(404).json({ message: "Poll not found" });
    if (poll.creator.toString() !== req.user.id)
      return res.status(403).json({ message: "Only poll creator can edit" });
    const updated = await Poll.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ message: "Poll updated", poll: updated });
  } catch (error) {
    res.status(500).json({ message: "Error updating poll", error: error.message });
  }
});

router.delete("/polls/:id", auth, async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) return res.status(404).json({ message: "Poll not found" });
    if (poll.creator.toString() !== req.user.id)
      return res.status(403).json({ message: "Only poll creator can delete" });
    await poll.deleteOne();
    res.status(200).json({ message: "Poll deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting poll", error: error.message });
  }
});

router.post("/polls/:id/vote", auth, async (req, res) => {
  try {
    const { optionIds, emoji } = req.body;
    const poll = await Poll.findById(req.params.id);
    if (!poll) return res.status(404).json({ message: "Poll not found" });
    poll.options.forEach((opt) => {
      opt.votes = opt.votes.filter((v) => v.user.toString() !== req.user.id);
    });
    optionIds.forEach((id) => {
      const option = poll.options.id(id);
      if (option) option.votes.push({ user: req.user.id, emoji });
    });
    await poll.save();
    res.status(200).json({ message: "Vote submitted", poll });
  } catch (error) {
    res.status(500).json({ message: "Error voting", error: error.message });
  }
});

module.exports = router;
