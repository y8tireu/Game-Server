# Socket.IO Multiplayer Server

This project implements a simple real-time multiplayer server using [Express](https://expressjs.com/) and [Socket.IO](https://socket.io/). It is configured for low latency communication by using WebSocket as the sole transport and tuning the ping interval and timeout settings.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Code Breakdown](#code-breakdown)
- [Customization](#customization)
- [License](#license)
- [Author](#author)

## Overview

The server creates an HTTP server with Express and attaches a Socket.IO instance to it. It is designed to handle real-time communication between clients, such as player updates in a multiplayer game. When a client connects, it receives a unique ID. Player data is maintained in an in-memory object and broadcast to all connected clients whenever updates occur.

## Features

- **Real-time Communication:** Uses Socket.IO for real-time event-based communication.
- **Low Latency:** Configured with a 10-second ping interval and 15-second ping timeout, and forces the use of the WebSocket transport.
- **Player Management:** Maintains and broadcasts a list of players and their data.
- **Static File Serving:** Optionally serves static files from a `public` directory.

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v10+ recommended)
- [npm](https://www.npmjs.com/)

### Steps

1. **Clone the Repository:**

   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```

2. **Install Dependencies:**

   ```bash
   npm install express socket.io
   ```

3. **Run the Server:**

   ```bash
   node server.js
   ```

   The server will start on port `3000` (or a port specified in the `PORT` environment variable).

## Usage

- **Connecting Clients:** Clients can connect via Socket.IO, and upon connection, the server sends the client's unique socket ID.
- **Player Updates:** Clients should emit `player_update` events with their data. The server updates the internal state and broadcasts the new state to all clients.
- **Disconnection Handling:** When a client disconnects, their data is removed from the server and an updated state is broadcast to the remaining clients.

## Code Breakdown

Below is the complete code for `server.js` with inline comments explaining each section:

```js
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
```

## Customization

- **Extending Events:** You can add more Socket.IO events to handle additional functionality such as chat messages or game actions.
- **Data Persistence:** For production environments, consider persisting player data using a database.
- **Static Assets:** Update the static file directory if your assets are stored elsewhere.


## Author

Sanjivram Balasubramanian
