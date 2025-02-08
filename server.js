// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);

// Configure Socket.IO with custom ping settings.
const io = socketIo(server, {
  cors: { origin: "*" },
  pingInterval: 20000, // send a ping every 20 seconds
  pingTimeout: 60000   // if no pong is received in 60 seconds, disconnect
});

let players = {};

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  // Optionally, send back the unique id to the client.
  socket.emit('your_id', socket.id);

  socket.on('player_update', (data) => {
    // Store this player's latest data.
    players[socket.id] = data;
    // Broadcast the full players object to all connected clients.
    io.emit('player_update', players);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    delete players[socket.id];
    io.emit('player_update', players);
  });
});

// Serve static files (if you have an index.html or dashboard) from the "public" folder.
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
