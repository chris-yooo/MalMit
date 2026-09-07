const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Track connected sockets per room for awareness
const rooms = {};
const roomStrokes = {}; // roomId -> array of strokes

io.on('connection', (socket) => {
  let currentRoom = null;

  socket.on('join-room', (roomId) => {
    if (!roomId || typeof roomId !== 'string') return;
    currentRoom = roomId;
    socket.join(roomId);

    if (!rooms[roomId]) rooms[roomId] = new Set();
    rooms[roomId].add(socket.id);

    // Send current drawing state to the new participant
    const roomClients = Array.from(rooms[roomId]);
    socket.emit('room-joined', { roomId, peers: roomClients.length - 1 });

    // Replay all existing strokes to the new participant
    if (roomStrokes[roomId] && roomStrokes[roomId].length > 0) {
      socket.emit('strokes-replay', { strokes: roomStrokes[roomId] });
    }

    // Notify others
    socket.to(roomId).emit('peer-joined', { id: socket.id });

    console.log(`Socket ${socket.id} joined room: ${roomId} (${rooms[roomId].size} users)`);
  });

  // Drawing events – scoped to room
  socket.on('draw-start', (data) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('draw-start', { id: socket.id, ...data });
  });

  socket.on('draw-move', (data) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('draw-move', { id: socket.id, ...data });
  });

  socket.on('draw-end', (data) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('draw-end', { id: socket.id, ...data });
  });

  // Stroke replay for late joiners
  socket.on('stroke', (stroke) => {
    if (!currentRoom) return;
    // Store stroke in room
    if (!roomStrokes[currentRoom]) roomStrokes[currentRoom] = [];
    roomStrokes[currentRoom].push({ id: socket.id, stroke });
    // Broadcast full stroke to others
    socket.to(currentRoom).emit('stroke', { id: socket.id, stroke });
  });

  // Clear canvas
  socket.on('clear-canvas', () => {
    if (!currentRoom) return;
    // Clear stored strokes for this room
    roomStrokes[currentRoom] = [];
    socket.to(currentRoom).emit('clear-canvas', { id: socket.id });
  });

  // Undo last stroke (simple per-socket)
  socket.on('undo', (strokeId) => {
    if (!currentRoom) return;
    // Remove from roomStrokes
    if (roomStrokes[currentRoom]) {
      const idx = roomStrokes[currentRoom].findIndex(s => s.stroke.id === strokeId);
      if (idx !== -1) roomStrokes[currentRoom].splice(idx, 1);
    }
    socket.to(currentRoom).emit('undo', { id: socket.id, strokeId });
  });

  // Cursor / awareness
  socket.on('cursor', (pos) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('cursor', { id: socket.id, pos });
  });

  socket.on('disconnect', () => {
    if (currentRoom && rooms[currentRoom]) {
      rooms[currentRoom].delete(socket.id);
      socket.to(currentRoom).emit('peer-left', { id: socket.id });
      if (rooms[currentRoom].size === 0) {
        delete rooms[currentRoom];
        delete roomStrokes[currentRoom];
      }
      console.log(`Socket ${socket.id} left room: ${currentRoom}`);
    }
  });
});

// ========== AI Refine Endpoint (Local SD via Vulkan) ==========
app.post('/api/refine', async (req, res) => {
  try {
    const { image, prompt } = req.body;
    if (!image || !image.startsWith('data:image')) {
      return res.status(400).json({ error: 'Invalid image data' });
    }

    // Use local Stable Diffusion via Vulkan (sd-server on port 8080)
    const sdResponse = await fetch('http://localhost:8080/sdapi/v1/img2img', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        init_images: [image.split(',')[1]], // base64 without data URL prefix
        prompt: prompt || 'refine and enhance this drawing, keep the style but make it cleaner and more detailed',
        negative_prompt: 'blurry, distorted, ugly',
        width: 512,
        height: 512,
        steps: 20,
        cfg_scale: 7,
        denoising_strength: 0.6,
        sampler_name: 'euler'
      })
    });

    if (!sdResponse.ok) {
      const errText = await sdResponse.text();
      console.error('SD error:', errText);
      return res.status(sdResponse.status).json({ error: 'SD API error', details: errText });
    }

    const result = await sdResponse.json();
    if (result.images && result.images.length > 0) {
      res.json({ success: true, image: 'data:image/png;base64,' + result.images[0] });
    } else {
      res.status(500).json({ error: 'No image returned from SD' });
    }
  } catch (err) {
    console.error('Refine error:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3030;
server.listen(PORT, () => {
  console.log(`Whiteboard server running on http://localhost:${PORT}`);
});
