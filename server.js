// server.js
const express = require("express");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const connectDB = require("./config/Database");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const groupRoutes = require("./routes/groupRoutes");
const eventRoutes = require("./routes/eventRoutes");
const pollRoutes = require("./routes/pollRoutes");
const rsvpRoutes = require("./routes/rsvpRoutes");
const suggestionRoutes = require("./routes/suggestionRoutes");
const reactionRoutes = require("./routes/reactionRoutes");
const botRoutes = require("./routes/botRoutes");
const adminRoutes = require("./routes/adminRoutes");
const webhookRoutes = require("./routes/webhookRoutes");
const { auth } = require("./middleware/authMiddleware");

dotenv.config();

// Connect DB
connectDB();

const app = express();
const server = http.createServer(app);

// CORS
app.use(
  cors({
    origin: "http://localhost:5173", // frontend URL
    credentials: true,
  })
);

// Middleware
app.use(express.json());
app.use(cookieParser());

// Attach io to requests
const io = new Server(server, { cors: { origin: "*" } });
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use("/", authRoutes);
app.use("/", userRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api", eventRoutes);
app.use("/api", pollRoutes);
app.use("/api", rsvpRoutes);
app.use("/api", suggestionRoutes);
app.use("/api", reactionRoutes);
app.use("/api", botRoutes);
app.use("/api", adminRoutes);
app.use("/api", webhookRoutes);

// Socket.IO Events
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join:event", (eventId) => {
    socket.join(eventId);
  });

  socket.on("message:create", async ({ eventId, senderId, text }) => {
    try {
      const message = await Message.create({ event: eventId, sender: senderId, text });
      io.to(eventId).emit("message:create", message);
    } catch (err) {
      console.error(err);
    }
  });

  socket.on("message:reaction", async ({ messageId, userId, emoji }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;

      const existing = message.reactions.find((r) => r.user.toString() === userId);
      if (existing) existing.emoji = emoji;
      else message.reactions.push({ user: userId, emoji });

      await message.save();
      io.to(message.event.toString()).emit("message:reaction", message);
    } catch (err) {
      console.error(err);
    }
  });

  socket.on("typing", ({ eventId, userId }) => {
    socket.to(eventId).emit("typing", { userId });
  });

  socket.on("message:update", async ({ messageId, newText }) => {
    try {
      const message = await Message.findByIdAndUpdate(messageId, { text: newText }, { new: true });
      io.to(message.event.toString()).emit("message:update", message);
    } catch (err) {
      console.error(err);
    }
  });

  socket.on("message:delete", async ({ messageId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;
      await message.deleteOne();
      io.to(message.event.toString()).emit("message:delete", messageId);
    } catch (err) {
      console.error(err);
    }
  });
});

// Root
app.get("/", (req, res) => res.send("✅ PlanPal API Running"));

// Error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err?.stack || err);
  const status = err?.status || 500;
  const response = { message: err?.message || "Internal Server Error" };
  if (process.env.NODE_ENV !== "production") response.stack = err?.stack || null;
  res.status(status).json(response);
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running with Socket.IO on port ${PORT}`));
