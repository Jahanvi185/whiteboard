const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/whiteboard";
let db;

MongoClient.connect(MONGODB_URI)
  .then((client) => {
    console.log("Connected to MongoDB");
    db = client.db("whiteboard");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
    console.log("Continuing with in-memory storage...");
  });

const rooms = new Map();
const roomDrawings = new Map();

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: " My Whiteboard server is running" });
});

app.post("/api/rooms", async (req, res) => {
  try {
    const roomId = uuidv4();
    const room = {
      id: roomId,
      name: req.body.name || `Room ${roomId.slice(0, 8)}`,
      isPrivate: req.body.isPrivate || false,
      password: req.body.password || null,
      createdAt: new Date(),
      users: [],
    };

    if (db) {
      await db.collection("rooms").insertOne(room);
    } else {
      rooms.set(roomId, room);
      roomDrawings.set(roomId, []);
    }

    res.json({ roomId, room });
  } catch (error) {
    console.error("Error creating room:", error);
    res.status(500).json({ error: "Failed to create room" });
  }
});

app.get("/api/rooms/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;
    let room;

    if (db) {
      room = await db.collection("rooms").findOne({ id: roomId });
    } else {
      room = rooms.get(roomId);
    }

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    res.json(room);
  } catch (error) {
    console.error("Error fetching room:", error);
    res.status(500).json({ error: "Failed to fetch room" });
  }
});

app.get("/api/rooms/:roomId/drawings", async (req, res) => {
  try {
    const { roomId } = req.params;
    let drawings;

    if (db) {
      const drawingsDoc = await db.collection("drawings").findOne({ roomId });
      drawings = drawingsDoc ? drawingsDoc.data : [];
    } else {
      drawings = roomDrawings.get(roomId) || [];
    }

    res.json(drawings);
  } catch (error) {
    console.error("Error fetching drawings:", error);
    res.status(500).json({ error: "Failed to fetch drawings" });
  }
});


io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", async (data) => {
    const { roomId, userName } = data;

    try {
      let room;
      if (db) {
        room = await db.collection("rooms").findOne({ id: roomId });
      } else {
        room = rooms.get(roomId);
      }

      if (!room) {
        socket.emit("error", { message: "Room not found" });
        return;
      }

      socket.join(roomId);
      socket.roomId = roomId;
      socket.userName = userName || `User ${socket.id.slice(0, 6)}`;

      const user = { id: socket.id, name: socket.userName };

      if (db) {
        await db.collection("rooms").updateOne(
          { id: roomId },
          { $addToSet: { users: user } }
        );
      } else {
        room.users.push(user);
      }

      let drawings;
      if (db) {
        const drawingsDoc = await db.collection("drawings").findOne({ roomId });
        drawings = drawingsDoc ? drawingsDoc.data : [];
      } else {
        drawings = roomDrawings.get(roomId) || [];
      }

      socket.emit("room-joined", { room, drawings });
      socket.to(roomId).emit("user-joined", user);

      console.log(`User ${socket.userName} joined room ${roomId}`);
    } catch (error) {
      console.error("Error joining room:", error);
      socket.emit("error", { message: "Failed to join room" });
    }
  });

  socket.on("drawing", async (data) => {
    if (!socket.roomId) return;

    const drawingData = {
      ...data,
      id: uuidv4(),
      userId: socket.id,
      userName: socket.userName,
      timestamp: new Date(),
    };

    try {

      if (db) {
        await db.collection("drawings").updateOne(
          { roomId: socket.roomId },
          {
            $push: { data: drawingData },
            $setOnInsert: { roomId: socket.roomId, createdAt: new Date() },
          },
          { upsert: true }
        );
      } else {
        if (!roomDrawings.has(socket.roomId)) {
          roomDrawings.set(socket.roomId, []);
        }
        roomDrawings.get(socket.roomId).push(drawingData);
      }

      socket.to(socket.roomId).emit("drawing", drawingData);
    } catch (error) {
      console.error("Error saving drawing:", error);
    }
  });

  socket.on("clear-canvas", async () => {
    if (!socket.roomId) return;

    try {
      if (db) {
        await db.collection("drawings").updateOne(
          { roomId: socket.roomId },
          { $set: { data: [] } }
        );
      } else {
        roomDrawings.set(socket.roomId, []);
      }

      io.to(socket.roomId).emit("canvas-cleared");
    } catch (error) {
      console.error("Error clearing canvas:", error);
    }
  });

  socket.on("undo", async () => {
    if (!socket.roomId) return;

    try {
      let drawings;
      if (db) {
        const drawingsDoc = await db.collection("drawings").findOne({ roomId: socket.roomId });
        drawings = drawingsDoc ? drawingsDoc.data : [];

        if (drawings.length > 0) {
          drawings.pop(); 
          await db.collection("drawings").updateOne(
            { roomId: socket.roomId },
            { $set: { data: drawings } }
          );
        }
      } else {
        drawings = roomDrawings.get(socket.roomId) || [];
        if (drawings.length > 0) {
          drawings.pop(); 
        }
      }

      io.to(socket.roomId).emit("undo", drawings);
    } catch (error) {
      console.error("Error undoing:", error);
    }
  });

  socket.on("disconnect", async () => {
    console.log("User disconnected:", socket.id);

    if (socket.roomId) {
      try {

        if (db) {
          await db.collection("rooms").updateOne(
            { id: socket.roomId },
            { $pull: { users: { id: socket.id } } }
          );
        } else {
          const room = rooms.get(socket.roomId);
          if (room) {
            room.users = room.users.filter((user) => user.id !== socket.id);
          }
        }

        socket.to(socket.roomId).emit("user-left", { id: socket.id, name: socket.userName });
      } catch (error) {
        console.error("Error handling disconnect:", error);
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

