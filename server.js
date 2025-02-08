const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

// Create an Express app and HTTP server.
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*" } // Adjust CORS for production as needed.
});

// Object to store player data by socket ID.
let players = {};

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    // Immediately send the client's unique ID.
    socket.emit('your_id', socket.id);
    
    // Listen for player position updates.
    socket.on('player_update', (data) => {
        players[socket.id] = data;
        io.emit('player_update', players);
    });
    
    // Listen for custom game events.
    socket.on('game_event', (data) => {
        console.log('Game event from', socket.id, data);
        // Broadcast the game event to all clients.
        io.emit('game_event', data);
    });
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        delete players[socket.id];
        io.emit('player_update', players);
    });
});

// Serve static files (e.g., the website) from the "public" folder.
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
