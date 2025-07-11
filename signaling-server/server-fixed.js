const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

app.use(cors());

const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const rooms = new Map();
const hostingUsers = new Map(); // IP -> socketId mapping
const localUsers = new Map(); // userId -> socketId mapping
const userSockets = new Map(); // socketId -> userId mapping

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('register-user', (userId) => {
    console.log(`User ${socket.id} registered as ${userId}`);
    localUsers.set(userId, socket.id);
    userSockets.set(socket.id, userId);
    socket.userId = userId;
  });

  socket.on('join-room', (roomCode) => {
    console.log(`User ${socket.id} joining room ${roomCode}`);
    
    socket.join(roomCode);
    
    if (!rooms.has(roomCode)) {
      rooms.set(roomCode, new Set());
    }
    
    rooms.get(roomCode).add(socket.id);
    
    // Notify others in the room
    socket.to(roomCode).emit('user-joined', socket.id);
  });

  socket.on('start-local-hosting', ({ userId }) => {
    console.log(`User ${socket.id} started local hosting as ${userId}`);
    // Already registered in localUsers map
  });

  socket.on('stop-local-hosting', () => {
    console.log(`User ${socket.id} stopped local hosting`);
    // Keep them in the localUsers map for potential incoming calls
  });

  socket.on('local-call-request', ({ toUserId, fromUserId, offer }) => {
    console.log(`Local call request from ${fromUserId} to ${toUserId}`);
    const targetSocketId = localUsers.get(toUserId);
    
    if (targetSocketId) {
      // Forward the call request to the target user
      io.to(targetSocketId).emit('local-call-request', { fromUserId, offer });
    } else {
      // User not found or not hosting
      socket.emit('direct-call-rejected');
    }
  });

  socket.on('local-call-response', ({ toUserId, accepted }) => {
    console.log(`Local call response to ${toUserId}: ${accepted}`);
    const targetSocketId = localUsers.get(toUserId);
    
    if (targetSocketId) {
      if (accepted) {
        io.to(targetSocketId).emit('direct-call-accepted');
      } else {
        io.to(targetSocketId).emit('direct-call-rejected');
      }
    }
  });

  socket.on('start-hosting', ({ ip }) => {
    console.log(`User ${socket.id} started hosting on IP ${ip}`);
    hostingUsers.set(ip, socket.id);
    socket.hostingIP = ip;
  });

  socket.on('stop-hosting', () => {
    if (socket.hostingIP) {
      console.log(`User ${socket.id} stopped hosting on IP ${socket.hostingIP}`);
      hostingUsers.delete(socket.hostingIP);
      delete socket.hostingIP;
    }
  });

  socket.on('direct-call-request', ({ toIP, fromIP, offer }) => {
    console.log(`Direct call request from ${fromIP} to ${toIP}`);
    const targetSocketId = hostingUsers.get(toIP);
    
    if (targetSocketId) {
      // Forward the call request to the hosting user
      io.to(targetSocketId).emit('direct-call-request', { fromIP, offer });
    } else {
      // Host not found
      socket.emit('direct-call-rejected');
    }
  });

  socket.on('direct-call-response', ({ toIP, accepted }) => {
    console.log(`Direct call response to ${toIP}: ${accepted}`);
    
    // Find the caller's socket (they should be hosting or have made the request)
    // We'll broadcast to all sockets for simplicity, but in production you'd want better tracking
    if (accepted) {
      socket.broadcast.emit('direct-call-accepted');
    } else {
      socket.broadcast.emit('direct-call-rejected');
    }
  });

  socket.on('offer', ({ offer, roomCode }) => {
    console.log(`Offer from ${socket.id} in room ${roomCode}`);
    socket.to(roomCode).emit('offer', offer);
  });

  socket.on('answer', ({ answer, roomCode }) => {
    console.log(`Answer from ${socket.id} in room ${roomCode}`);
    socket.to(roomCode).emit('answer', answer);
  });

  socket.on('ice-candidate', ({ candidate, roomCode }) => {
    console.log(`ICE candidate from ${socket.id} in room ${roomCode}`);
    socket.to(roomCode).emit('ice-candidate', candidate);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Remove from hosting users
    if (socket.hostingIP) {
      hostingUsers.delete(socket.hostingIP);
    }
    
    // Remove from local users
    if (socket.userId) {
      localUsers.delete(socket.userId);
      userSockets.delete(socket.id);
    }
    
    // Remove user from all rooms
    for (const [roomCode, users] of rooms.entries()) {
      if (users.has(socket.id)) {
        users.delete(socket.id);
        socket.to(roomCode).emit('user-left', socket.id);
        
        if (users.size === 0) {
          rooms.delete(roomCode);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});
