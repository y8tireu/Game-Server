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

// In-memory storage of players.
// Each player will have at least: { x, y, score }
let players = {};

/**
 * getLeaderboard
 * Returns a sorted array of players by score (highest first)
 */
function getLeaderboard() {
  // Map the players object to an array of objects with id and score.
  let leaderboard = Object.keys(players).map(id => {
    return { id, score: players[id].score || 0 };
  });
  leaderboard.sort((a, b) => b.score - a.score);
  return leaderboard;
}

/**
 * broadcastLeaderboard
 * Emits the leaderboard to all connected clients.
 */
function broadcastLeaderboard() {
  io.emit('leaderboard_update', getLeaderboard());
}

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  // Send the unique id to the client.
  socket.emit('your_id', socket.id);

  // Initialize the player's data with a default score.
  players[socket.id] = { x: 0, y: 0, score: 0 };

  /**
   * player_update event:
   * Expect data such as { x: <number>, y: <number>, score: <number> (optional) }
   * Update the player's data and broadcast both the players and leaderboard.
   */
  socket.on('player_update', (data) => {
    players[socket.id] = {
      x: data.x,
      y: data.y,
      // If the client sends a score, update it; otherwise, keep the existing score.
      score: (data.score !== undefined) ? data.score : (players[socket.id].score || 0)
    };

    // Broadcast updated players to all clients.
    io.emit('player_update', players);
    // Broadcast the updated leaderboard.
    broadcastLeaderboard();
  });

  /**
   * (Optional) Dedicated score update event.
   * If you prefer separating movement from scoring, the client
   * can emit a "score_update" event with { score: <number> }.
   */
  socket.on('score_update', (data) => {
    if (players[socket.id]) {
      players[socket.id].score = data.score;
      io.emit('player_update', players);
      broadcastLeaderboard();
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    delete players[socket.id];
    io.emit('player_update', players);
    broadcastLeaderboard();
  });
});

// (Optional) Serve static files from the "public" folder if you have one.
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
