const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const Event = require("../models/eventModel");
const Suggestion = require("../models/suggestionModel");
const axios = require("axios");

router.post("/bot/plan", auth, async (req, res) => {
  try {
    const { eventId, message } = req.body;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    let suggestions = [];

    if (message.toLowerCase().includes("movie")) {
      const tmdb = await axios.get(`https://api.themoviedb.org/3/movie/popular?api_key=${process.env.TMDB_KEY}`);
      suggestions = tmdb.data.results.slice(0, 3).map(m => ({
        type: "movie",
        name: m.title,
        rating: m.vote_average,
        source: "TMDB"
      }));
    }

    if (message.toLowerCase().includes("restaurant") || message.toLowerCase().includes("cafe")) {
      const places = await axios.get(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=37.7749,-122.4194&radius=2000&type=restaurant&key=${process.env.PLACES_KEY}`);
      suggestions = places.data.results.slice(0, 3).map(p => ({
        type: "restaurant",
        name: p.name,
        rating: p.rating,
        location: p.vicinity,
        source: "Google Places"
      }));
    }

    const savedSuggestions = await Suggestion.insertMany(
      suggestions.map(s => ({ ...s, event: eventId, creator: req.user.id }))
    );

    res.status(200).json({ message: "PlanPal suggestions generated", suggestions: savedSuggestions });
  } catch (err) {
    res.status(500).json({ message: "Error generating PlanPal suggestions", error: err.message });
  }
});

router.get("/bot/status", auth, async (req, res) => {
  try {
    res.status(200).json({ status: "PlanPal bot service is running", timestamp: new Date() });
  } catch (err) {
    res.status(500).json({ message: "Bot service error", error: err.message });
  }
});

module.exports = router;
