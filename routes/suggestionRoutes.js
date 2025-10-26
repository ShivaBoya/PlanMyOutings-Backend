const express = require("express");
const router = express.Router();
const axios = require("axios");
const auth = require("../middleware/authMiddleware"); // make sure this reads token from cookies
const Event = require("../models/eventModel");
const Suggestion = require("../models/suggestionModel");
const Group = require("../models/groupModel");

// Generate suggestions for an event
router.post("/events/:eventId/suggestions/generate", auth, async (req, res) => {
  try {
    const { type } = req.body;
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    let suggestions = [];

    if (type === "movie") {
      const tmdb = await axios.get(`https://api.themoviedb.org/3/movie/popular?api_key=${process.env.TMDB_KEY}`);
      suggestions = tmdb.data.results.slice(0, 5).map((m) => ({
        type: "movie",
        name: m.title,
        rating: m.vote_average,
        source: "TMDB"
      }));
    }

    if (type === "restaurant" || type === "cafe") {
      const places = await axios.get(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=37.7749,-122.4194&radius=2000&type=${type}&key=${process.env.PLACES_KEY}`);
      suggestions = places.data.results.slice(0, 5).map((p) => ({
        type,
        name: p.name,
        rating: p.rating,
        location: p.vicinity,
        source: "Google Places"
      }));
    }

    const savedSuggestions = await Suggestion.insertMany(
      suggestions.map((s) => ({ ...s, event: req.params.eventId, creator: req.user.id }))
    );

    res.status(201).json({ message: "Suggestions generated", suggestions: savedSuggestions });
  } catch (err) {
    res.status(500).json({ message: "Error generating suggestions", error: err.message });
  }
});

// Get suggestion by ID
router.get("/suggestions/:id", auth, async (req, res) => {
  try {
    const suggestion = await Suggestion.findById(req.params.id).populate("creator", "name email");
    if (!suggestion) return res.status(404).json({ message: "Suggestion not found" });
    res.status(200).json(suggestion);
  } catch (err) {
    res.status(500).json({ message: "Error fetching suggestion", error: err.message });
  }
});

// Accept a suggestion and apply to event
router.post("/suggestions/:id/accept", auth, async (req, res) => {
  try {
    const suggestion = await Suggestion.findById(req.params.id);
    if (!suggestion) return res.status(404).json({ message: "Suggestion not found" });

    const event = await Event.findById(suggestion.event);
    event.location = suggestion.location || event.location;
    event.title = suggestion.name || event.title;
    await event.save();

    suggestion.status = "accepted";
    await suggestion.save();

    res.status(200).json({ message: "Suggestion accepted and applied to event", event, suggestion });
  } catch (err) {
    res.status(500).json({ message: "Error accepting suggestion", error: err.message });
  }
});

// Vote on a suggestion
router.post("/suggestions/:id/vote", auth, async (req, res) => {
  try {
    const { emoji } = req.body;
    const suggestion = await Suggestion.findById(req.params.id);
    if (!suggestion) return res.status(404).json({ message: "Suggestion not found" });

    // Remove previous vote by this user
    suggestion.votes = suggestion.votes.filter((v) => v.user.toString() !== req.user.id);
    suggestion.votes.push({ user: req.user.id, emoji });
    await suggestion.save();

    res.status(200).json({ message: "Vote submitted", suggestion });
  } catch (err) {
    res.status(500).json({ message: "Error voting on suggestion", error: err.message });
  }
});

// Nearby suggestions for an event
router.get("/events/:eventId/suggestions/nearby", auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId).populate("group");
    if (!event) return res.status(404).json({ message: "Event not found" });

    const members = await Group.findById(event.group).populate("members", "location");
    const avgLat = 37.7749;
    const avgLng = -122.4194;

    const places = await axios.get(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${avgLat},${avgLng}&radius=2000&type=cafe&key=${process.env.PLACES_KEY}`);

    const suggestions = places.data.results
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5)
      .map((p) => ({
        type: "cafe",
        name: p.name,
        rating: p.rating,
        location: p.vicinity,
        source: "Google Places"
      }));

    res.status(200).json({ message: "Nearby suggestions", suggestions });
  } catch (err) {
    res.status(500).json({ message: "Error fetching nearby suggestions", error: err.message });
  }
});

module.exports = router;
