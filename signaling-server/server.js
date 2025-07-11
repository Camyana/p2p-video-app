const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

app.use(cors());

// Add health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Signaling server is running' });
});

const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// New user-based system
const connectedUsers = new Map(); // userId -> { socketId, name, status }
const socketToUser = new Map(); // socketId -> userId
const activeRooms = new Map(); // roomId -> { users: [userId1, userId2], status: 'waiting' | 'active' }
const callRequests = new Map(); // callId -> { callerId, calleeId, roomId }

// Function to clean up socket references
function cleanupSocket(socket) {
  const userId = socketToUser.get(socket.id);
  if (userId) {
    console.log(`Cleaning up user ${userId} (socket: ${socket.id})`);
    
    // Remove from connected users
    connectedUsers.delete(userId);
    socketToUser.delete(socket.id);
    
    // Clean up any active rooms
    for (const [roomId, room] of activeRooms.entries()) {
      if (room.users.includes(userId)) {
        console.log(`Removing user ${userId} from room ${roomId}`);
        room.users = room.users.filter(id => id !== userId);
        
        // If room is empty, delete it
        if (room.users.length === 0) {
          activeRooms.delete(roomId);
          console.log(`Deleted empty room ${roomId}`);
        } else {
          // Notify other users in the room
          room.users.forEach(otherUserId => {
            const otherUser = connectedUsers.get(otherUserId);
            if (otherUser) {
              io.to(otherUser.socketId).emit('user-left-room', { userId, roomId });
            }
          });
        }
      }
    }
    
    // Clean up call requests
    for (const [callId, request] of callRequests.entries()) {
      if (request.callerId === userId || request.calleeId === userId) {
        console.log(`Cleaning up call request ${callId}`);
        callRequests.delete(callId);
      }
    }
    
    // Broadcast user list update
    broadcastUserList();
  }
}

// Function to broadcast current user list to all connected users
function broadcastUserList() {
  const userList = Array.from(connectedUsers.entries()).map(([userId, userData]) => ({
    id: userId,
    name: userData.name,
    status: userData.status
  }));
  
  console.log(`=== BROADCASTING USER LIST ===`);
  console.log(`Broadcasting user list to ${connectedUsers.size} users:`, userList);
  console.log(`Socket IDs receiving broadcast:`, Array.from(connectedUsers.values()).map(u => u.socketId));
  
  io.emit('user-list', { users: userList });
}

// Function to generate unique room ID
function generateRoomId() {
  return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Check for dead connections and clean them up
  setInterval(() => {
    if (!socket.connected) {
      console.log(`Socket ${socket.id} is disconnected, cleaning up...`);
      cleanupSocket(socket);
    }
  }, 30000); // Check every 30 seconds

  // User registration
  socket.on('register-user', ({ name }) => {
    console.log(`=== USER REGISTRATION ===`);
    console.log(`Name: ${name}`);
    console.log(`Socket ID: ${socket.id}`);
    
    if (!name || name.trim() === '') {
      socket.emit('registration-error', { message: 'Name is required' });
      return;
    }
    
    // Check if name is already taken
    const existingUser = Array.from(connectedUsers.values()).find(user => user.name === name);
    if (existingUser) {
      console.log(`Name ${name} is already taken by user ${existingUser.socketId}`);
      socket.emit('registration-error', { message: 'Name is already taken' });
      return;
    }
    
    // Generate unique user ID using socket ID and timestamp
    const userId = `user_${socket.id}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    console.log(`Generated user ID: ${userId}`);
    
    // Store user data
    connectedUsers.set(userId, {
      socketId: socket.id,
      name: name.trim(),
      status: 'available'
    });
    socketToUser.set(socket.id, userId);
    
    console.log(`User registered: ${name} (${userId}) on socket ${socket.id}`);
    console.log(`Total connected users: ${connectedUsers.size}`);
    console.log(`All connected users:`, Array.from(connectedUsers.entries()).map(([id, user]) => ({
      id,
      name: user.name,
      socketId: user.socketId,
      status: user.status
    })));
    
    // Send registration success
    socket.emit('registration-success', { userId, name });
    
    // Broadcast updated user list
    broadcastUserList();
  });

  // Get user list
  socket.on('get-user-list', () => {
    const userList = Array.from(connectedUsers.entries()).map(([userId, userData]) => ({
      id: userId,
      name: userData.name,
      status: userData.status
    }));
    
    socket.emit('user-list', { users: userList });
  });

  // Start call request
  socket.on('start-call', ({ targetUserId }) => {
    const callerId = socketToUser.get(socket.id);
    const caller = connectedUsers.get(callerId);
    const callee = connectedUsers.get(targetUserId);
    
    if (!caller || !callee) {
      socket.emit('call-error', { message: 'User not found' });
      return;
    }
    
    if (callee.status !== 'available') {
      socket.emit('call-error', { message: 'User is not available' });
      return;
    }
    
    // Generate room ID and call ID
    const roomId = generateRoomId();
    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store call request
    callRequests.set(callId, { callerId, calleeId: targetUserId, roomId });
    
    // Create room
    activeRooms.set(roomId, {
      users: [callerId, targetUserId],
      status: 'waiting'
    });
    
    // Update user statuses
    caller.status = 'calling';
    callee.status = 'receiving-call';
    
    console.log(`Call started: ${caller.name} calling ${callee.name} (room: ${roomId})`);
    
    // Notify both users
    socket.emit('call-started', { roomId, targetUser: { id: targetUserId, name: callee.name } });
    io.to(callee.socketId).emit('incoming-call', { 
      callId, 
      roomId, 
      caller: { id: callerId, name: caller.name } 
    });
    
    // Broadcast updated user list
    broadcastUserList();
  });

  // Accept call
  socket.on('accept-call', ({ callId }) => {
    const callRequest = callRequests.get(callId);
    if (!callRequest) {
      socket.emit('call-error', { message: 'Call not found' });
      return;
    }
    
    const caller = connectedUsers.get(callRequest.callerId);
    const callee = connectedUsers.get(callRequest.calleeId);
    
    if (!caller || !callee) {
      socket.emit('call-error', { message: 'User not found' });
      return;
    }
    
    // Update room status
    const room = activeRooms.get(callRequest.roomId);
    if (room) {
      room.status = 'active';
    }
    
    // Update user statuses
    caller.status = 'in-call';
    callee.status = 'in-call';
    
    console.log(`Call accepted: ${caller.name} <-> ${callee.name} (room: ${callRequest.roomId})`);
    
    // Notify both users
    io.to(caller.socketId).emit('call-accepted', { roomId: callRequest.roomId });
    socket.emit('call-accepted', { roomId: callRequest.roomId });
    
    // Clean up call request
    callRequests.delete(callId);
    
    // Broadcast updated user list
    broadcastUserList();
  });

  // Reject call
  socket.on('reject-call', ({ callId }) => {
    const callRequest = callRequests.get(callId);
    if (!callRequest) {
      socket.emit('call-error', { message: 'Call not found' });
      return;
    }
    
    const caller = connectedUsers.get(callRequest.callerId);
    const callee = connectedUsers.get(callRequest.calleeId);
    
    if (caller && callee) {
      // Update user statuses
      caller.status = 'available';
      callee.status = 'available';
      
      console.log(`Call rejected: ${caller.name} -> ${callee.name}`);
      
      // Notify caller
      io.to(caller.socketId).emit('call-rejected', { targetUser: { id: callee.id, name: callee.name } });
    }
    
    // Clean up
    activeRooms.delete(callRequest.roomId);
    callRequests.delete(callId);
    
    // Broadcast updated user list
    broadcastUserList();
  });

  // End call
  socket.on('end-call', ({ roomId }) => {
    const userId = socketToUser.get(socket.id);
    const room = activeRooms.get(roomId);
    
    if (!room || !userId) {
      return;
    }
    
    console.log(`Call ended in room ${roomId} by user ${userId}`);
    
    // Update all users in the room
    room.users.forEach(roomUserId => {
      const user = connectedUsers.get(roomUserId);
      if (user) {
        user.status = 'available';
        io.to(user.socketId).emit('call-ended', { roomId });
      }
    });
    
    // Clean up room
    activeRooms.delete(roomId);
    
    // Broadcast updated user list
    broadcastUserList();
  });

  // WebRTC signaling events
  socket.on('offer', ({ offer, roomId }) => {
    console.log(`Offer received for room ${roomId}:`, offer?.type);
    console.log(`Current active rooms:`, Array.from(activeRooms.keys()));
    
    // Forward offer to other user in the room
    const room = activeRooms.get(roomId);
    if (room) {
      console.log(`Room found for ${roomId}, users:`, room.users);
      const senderId = socketToUser.get(socket.id);
      console.log(`Sender ID: ${senderId}`);
      const targetUserId = room.users.find(userId => userId !== senderId);
      console.log(`Target user ID: ${targetUserId}`);
      
      if (targetUserId) {
        const targetUser = connectedUsers.get(targetUserId);
        console.log(`Target user found:`, targetUser ? targetUser.name : 'NOT FOUND');
        if (targetUser) {
          io.to(targetUser.socketId).emit('offer', { offer, roomId });
          console.log(`Forwarded offer to user ${targetUserId} in room ${roomId}`);
        }
      }
    } else {
      console.log(`Room NOT found for ${roomId}`);
    }
  });

  socket.on('answer', ({ answer, roomId }) => {
    console.log(`Answer received for room ${roomId}:`, answer?.type);
    console.log(`Current active rooms:`, Array.from(activeRooms.keys()));
    
    // Forward answer to other user in the room
    const room = activeRooms.get(roomId);
    if (room) {
      console.log(`Room found for ${roomId}, users:`, room.users);
      const senderId = socketToUser.get(socket.id);
      console.log(`Sender ID: ${senderId}`);
      const targetUserId = room.users.find(userId => userId !== senderId);
      console.log(`Target user ID: ${targetUserId}`);
      
      if (targetUserId) {
        const targetUser = connectedUsers.get(targetUserId);
        console.log(`Target user found:`, targetUser ? targetUser.name : 'NOT FOUND');
        if (targetUser) {
          io.to(targetUser.socketId).emit('answer', { answer, roomId });
          console.log(`Forwarded answer to user ${targetUserId} in room ${roomId}`);
        }
      }
    } else {
      console.log(`Room NOT found for ${roomId}`);
    }
  });

  socket.on('ice-candidate', ({ candidate, roomId }) => {
    console.log(`ICE candidate received for room ${roomId}`);
    
    // Forward ICE candidate to other user in the room
    const room = activeRooms.get(roomId);
    if (room) {
      const senderId = socketToUser.get(socket.id);
      const targetUserId = room.users.find(userId => userId !== senderId);
      
      if (targetUserId) {
        const targetUser = connectedUsers.get(targetUserId);
        if (targetUser) {
          io.to(targetUser.socketId).emit('ice-candidate', { candidate, roomId });
          console.log(`Forwarded ICE candidate to user ${targetUserId} in room ${roomId}`);
        }
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    cleanupSocket(socket);
  });
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`Signaling server running on http://${HOST}:${PORT}`);
  console.log(`Server is accessible from other machines on the network`);
});
