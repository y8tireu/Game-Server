// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);

// Configure Socket.IO with low ping interval and low ping timeout,
// and force WebSocket transport for lower latency.
const io = socketIo(server, {
  cors: { origin: "*" },
  pingInterval: 10000, // send a ping every 10 seconds
  pingTimeout: 15000,  // wait 15 seconds for a pong before disconnecting
  transports: ['websocket']
});

let players = {};

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  // Optionally, send the unique id to the client.
  socket.emit('your_id', socket.id);

  socket.on('player_update', (data) => {
    // Update this player's data.
    players[socket.id] = data;
    // Broadcast the updated players object to all connected clients.
    io.emit('player_update', players);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    delete players[socket.id];
    io.emit('player_update', players);
  });
});

// (Optional) Serve static files from the "public" folder if you have one.
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
