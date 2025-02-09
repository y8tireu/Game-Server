// server.js
"use strict";

// ----- Import Dependencies -----
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const morgan = require('morgan'); // For logging HTTP requests

// ----- Create Express App & Configure Middleware -----
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined')); // Log incoming HTTP requests

// ----- Create HTTP Server & Configure Socket.IO -----
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*" // Allow all origins; in production, limit this as needed.
  },
  pingInterval: 10000, // Send a ping every 10 seconds.
  pingTimeout: 15000,  // Disconnect if no pong is received within 15 seconds.
  transports: ['websocket'] // Use WebSocket for low latency.
});

// ----- GameManager Class -----
// Encapsulates all player and game state management.
class GameManager {
  constructor() {
    // In-memory storage for players. Each player is stored by their socket ID.
    // Example player object: { x: 0, y: 0, score: 0, room: null }
    this.players = {};
  }

  /**
   * addPlayer
   * Adds a new player with default properties.
   * @param {string} id - The socket ID of the new player.
   */
  addPlayer(id) {
    this.players[id] = {
      x: 0,
      y: 0,
      score: 0,
      room: null // For room-based features.
    };
    console.log(`Player added: ${id}`);
  }

  /**
   * updatePlayer
   * Updates the specified player's data.
   * @param {string} id - The socket ID of the player.
   * @param {Object} data - Data containing updated properties.
   */
  updatePlayer(id, data) {
    if (this.players[id]) {
      // Update position and score if provided.
      if (data.x !== undefined) this.players[id].x = data.x;
      if (data.y !== undefined) this.players[id].y = data.y;
      if (data.score !== undefined) this.players[id].score = data.score;
    } else {
      console.warn(`Attempt to update non-existent player: ${id}`);
    }
  }

  /**
   * removePlayer
   * Removes the player from the game state.
   * @param {string} id - The socket ID of the player to remove.
   */
  removePlayer(id) {
    if (this.players[id]) {
      delete this.players[id];
      console.log(`Player removed: ${id}`);
    }
  }

  /**
   * getPlayers
   * Returns the current list of players.
   */
  getPlayers() {
    return this.players;
  }

  /**
   * getLeaderboard
   * Returns an array of players sorted by score (highest first).
   */
  getLeaderboard() {
    const leaderboard = Object.keys(this.players).map(id => ({
      id,
      score: this.players[id].score || 0
    }));
    leaderboard.sort((a, b) => b.score - a.score);
    return leaderboard;
  }

  /**
   * broadcastState
   * Emits the current players and leaderboard to all connected clients.
   * @param {object} io - The Socket.IO server instance.
   */
  broadcastState(io) {
    io.emit('player_update', this.getPlayers());
    io.emit('leaderboard_update', this.getLeaderboard());
  }
}

// Create an instance of GameManager.
const gameManager = new GameManager();

// ----- Socket.IO Connection Handling -----
io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id}`);

  // Send the unique ID back to the client.
  socket.emit('your_id', socket.id);

  // Add the new player and broadcast the updated state.
  gameManager.addPlayer(socket.id);
  gameManager.broadcastState(io);

  /**
   * Handle the "player_update" event.
   * Expected data: { x: <number>, y: <number>, score: <number> (optional) }
   */
  socket.on('player_update', (data) => {
    try {
      gameManager.updatePlayer(socket.id, data);
      gameManager.broadcastState(io);
    } catch (error) {
      console.error(`Error handling player_update from ${socket.id}:`, error);
    }
  });

  /**
   * Handle the dedicated "score_update" event.
   * Expected data: { score: <number> }
   */
  socket.on('score_update', (data) => {
    try {
      if (data && typeof data.score === 'number') {
        gameManager.updatePlayer(socket.id, { score: data.score });
        gameManager.broadcastState(io);
      }
    } catch (error) {
      console.error(`Error handling score_update from ${socket.id}:`, error);
    }
  });

  /**
   * Handle global chat messages.
   * Expected data: { message: <string> }
   */
  socket.on('chat_message', (data) => {
    try {
      if (data && typeof data.message === 'string') {
        // Broadcast the chat message to all connected clients.
        io.emit('chat_message', {
          id: socket.id,
          message: data.message,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error(`Error handling chat_message from ${socket.id}:`, error);
    }
  });

  /**
   * Handle joining a specific room.
   * Expected data: { room: <string> }
   */
  socket.on('join_room', (data) => {
    try {
      if (data && data.room) {
        socket.join(data.room);
        // Optionally update the player's room property.
        if (gameManager.players[socket.id]) {
          gameManager.players[socket.id].room = data.room;
        }
        // Notify others in the room.
        io.to(data.room).emit('room_notification', {
          message: `Player ${socket.id} has joined the room.`,
          room: data.room,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error(`Error handling join_room from ${socket.id}:`, error);
    }
  });

  /**
   * Handle room-specific chat messages.
   * Expected data: { room: <string>, message: <string> }
   */
  socket.on('room_message', (data) => {
    try {
      if (data && data.room && typeof data.message === 'string') {
        io.to(data.room).emit('room_message', {
          id: socket.id,
          room: data.room,
          message: data.message,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error(`Error handling room_message from ${socket.id}:`, error);
    }
  });

  /**
   * Handle custom player actions (e.g., shooting, jumping).
   * Expected data: { action: <string>, ...additionalData }
   */
  socket.on('player_action', (data) => {
    try {
      if (data && data.action) {
        console.log(`Player ${socket.id} performed action: ${data.action}`, data);
        // Broadcast the action to all clients except the sender.
        socket.broadcast.emit('player_action', {
          id: socket.id,
          action: data.action,
          details: data,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error(`Error handling player_action from ${socket.id}:`, error);
    }
  });

  // When a client disconnects, remove the player and update all clients.
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    gameManager.removePlayer(socket.id);
    gameManager.broadcastState(io);
  });
});

// ----- REST API Endpoints -----
// Get the list of current players.
app.get('/api/players', (req, res) => {
  res.json({
    success: true,
    players: gameManager.getPlayers()
  });
});

// Get the current leaderboard.
app.get('/api/leaderboard', (req, res) => {
  res.json({
    success: true,
    leaderboard: gameManager.getLeaderboard()
  });
});

// Serve static files from the "public" directory (if available).
app.use(express.static('public'));

// ----- Start the Server -----
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// ----- Periodic Heartbeat -----
// Broadcast a heartbeat event every 30 seconds to ensure clients are synchronized.
setInterval(() => {
  io.emit('heartbeat', { timestamp: new Date().toISOString() });
}, 30000);
