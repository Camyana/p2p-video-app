import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import cors from 'cors';

interface ExtendedSocket extends Socket {
  hostingIP?: string;
}

export class SignalingServer {
  private app: express.Application;
  private server: any;
  private io: SocketIOServer;
  private port: number;
  private isRunning: boolean = false;
  
  private hostingUsers = new Map<string, string>(); // IP -> socketId mapping
  private socketToIP = new Map<string, string>(); // socketId -> IP mapping
  private ipToSockets = new Map<string, string[]>(); // IP -> array of socketIds (for local testing)

  constructor(port: number = 3001) {
    this.port = port;
    this.app = express();
    this.server = createServer(this.app);
    
    this.app.use(cors());
    
    // Add health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({ status: 'ok', running: this.isRunning });
    });
    
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    this.setupSocketHandlers();
  }

  private cleanupSocket(socket: ExtendedSocket) {
    if (socket.hostingIP) {
      const socketsForIP = this.ipToSockets.get(socket.hostingIP);
      if (socketsForIP) {
        const index = socketsForIP.indexOf(socket.id);
        if (index > -1) {
          socketsForIP.splice(index, 1);
          console.log(`Removed socket ${socket.id} from IP ${socket.hostingIP}`);
        }
        
        // If no more sockets for this IP, clean up
        if (socketsForIP.length === 0) {
          this.ipToSockets.delete(socket.hostingIP);
          this.hostingUsers.delete(socket.hostingIP);
          console.log(`Cleaned up IP ${socket.hostingIP} - no more sockets`);
        } else {
          // Update the primary socket for this IP
          this.hostingUsers.set(socket.hostingIP, socketsForIP[0]);
          console.log(`Updated primary socket for IP ${socket.hostingIP} to ${socketsForIP[0]}`);
        }
      }
      
      this.socketToIP.delete(socket.id);
    }
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket: ExtendedSocket) => {
      console.log('User connected:', socket.id);

      socket.on('start-hosting', (data) => {
        const { ip } = data;
        console.log(`=== START HOSTING REQUEST ===`);
        console.log(`User ${socket.id} started hosting on IP: ${ip}`);
        console.log(`Current hosting users:`, Array.from(this.hostingUsers.keys()));
        console.log(`Current IP to sockets:`, Array.from(this.ipToSockets.keys()));
        
        socket.hostingIP = ip;
        this.socketToIP.set(socket.id, ip);
        
        // Handle multiple sockets per IP (for local testing)
        if (!this.ipToSockets.has(ip)) {
          this.ipToSockets.set(ip, []);
        }
        this.ipToSockets.get(ip)!.push(socket.id);
        
        // Set or update the primary hosting socket for this IP
        this.hostingUsers.set(ip, socket.id);
        
        console.log(`Updated hosting users:`, Array.from(this.hostingUsers.entries()));
        console.log(`Updated IP to sockets:`, Array.from(this.ipToSockets.entries()));
        
        socket.emit('hosting-started', { ip });
        console.log(`IP ${ip} is now hosting with primary socket ${socket.id}`);
        console.log(`=== END START HOSTING ===`);
      });

      socket.on('stop-hosting', () => {
        console.log(`User ${socket.id} stopped hosting`);
        this.cleanupSocket(socket);
      });

      socket.on('direct-call-request', (data) => {
        const { toIP, fromIP, offer } = data;
        console.log(`=== DIRECT CALL REQUEST ===`);
        console.log(`Direct call request from ${fromIP} to ${toIP}`);
        console.log(`Current hosting users:`, Array.from(this.hostingUsers.entries()));
        console.log(`Available IPs:`, Array.from(this.hostingUsers.keys()));
        
        // Find the hosting socket for the target IP
        const targetSocketId = this.hostingUsers.get(toIP);
        console.log(`Target socket ID for IP ${toIP}:`, targetSocketId);
        
        if (targetSocketId) {
          const targetSocket = this.io.sockets.sockets.get(targetSocketId);
          if (targetSocket) {
            console.log(`Forwarding call request to socket ${targetSocketId} for IP ${toIP}`);
            targetSocket.emit('direct-call-request', { fromIP, offer });
            console.log(`Call request forwarded successfully`);
          } else {
            console.log(`Target socket ${targetSocketId} not found for IP ${toIP}`);
            socket.emit('direct-call-rejected');
          }
        } else {
          console.log(`No hosting user found for IP: ${toIP}`);
          console.log(`Available hosting IPs: [${Array.from(this.hostingUsers.keys()).join(', ')}]`);
          socket.emit('direct-call-rejected');
        }
        console.log(`=== END DIRECT CALL REQUEST ===`);
      });

      socket.on('direct-call-response', (data) => {
        const { toIP, accepted } = data;
        console.log(`Call response to ${toIP}: ${accepted ? 'accepted' : 'rejected'}`);
        
        // Find all sockets for the caller IP (to handle local testing)
        const targetSockets = this.ipToSockets.get(toIP);
        
        if (targetSockets) {
          targetSockets.forEach((socketId: string) => {
            const targetSocket = this.io.sockets.sockets.get(socketId);
            if (targetSocket) {
              if (accepted) {
                targetSocket.emit('direct-call-accepted');
              } else {
                targetSocket.emit('direct-call-rejected');
              }
            }
          });
        } else {
          console.log(`No sockets found for caller IP: ${toIP}`);
        }
      });

      socket.on('offer', (data) => {
        const { offer, toIP } = data;
        console.log('=== RELAYING OFFER ===');
        console.log('To IP:', toIP);
        console.log('Offer type:', offer?.type);
        
        if (toIP) {
          // Route offer to specific IP
          const targetSocketId = this.hostingUsers.get(toIP);
          if (targetSocketId) {
            const targetSocket = this.io.sockets.sockets.get(targetSocketId);
            if (targetSocket) {
              console.log(`Routing offer to specific socket ${targetSocketId} for IP ${toIP}`);
              targetSocket.emit('offer', { offer });
            } else {
              console.log(`Target socket ${targetSocketId} not found for offer to IP ${toIP}`);
            }
          } else {
            console.log(`No hosting user found for offer to IP: ${toIP}`);
          }
        } else {
          // Fallback to broadcast if no specific target
          console.log('Broadcasting offer (no specific target)');
          socket.broadcast.emit('offer', { offer });
        }
      });

      socket.on('answer', (data) => {
        const { answer, toIP } = data;
        console.log('=== RELAYING ANSWER ===');
        console.log('To IP:', toIP);
        console.log('Answer type:', answer?.type);
        
        if (toIP) {
          // Route answer to specific IP (the original caller)
          const targetSockets = this.ipToSockets.get(toIP);
          if (targetSockets) {
            targetSockets.forEach((socketId: string) => {
              const targetSocket = this.io.sockets.sockets.get(socketId);
              if (targetSocket) {
                console.log(`Routing answer to socket ${socketId} for IP ${toIP}`);
                targetSocket.emit('answer', { answer });
              }
            });
          } else {
            console.log(`No sockets found for answer to IP: ${toIP}`);
          }
        } else {
          // Fallback to broadcast if no specific target
          console.log('Broadcasting answer (no specific target)');
          socket.broadcast.emit('answer', { answer });
        }
      });

      socket.on('ice-candidate', (data) => {
        const { candidate, toIP } = data;
        console.log('=== RELAYING ICE CANDIDATE ===');
        console.log('To IP:', toIP);
        console.log('Candidate string preview:', candidate?.candidate?.substring(0, 50) + '...');
        
        if (toIP) {
          // Route ICE candidate to specific IP
          const targetSockets = this.ipToSockets.get(toIP);
          if (targetSockets) {
            targetSockets.forEach((socketId: string) => {
              const targetSocket = this.io.sockets.sockets.get(socketId);
              if (targetSocket) {
                console.log(`Routing ICE candidate to socket ${socketId} for IP ${toIP}`);
                targetSocket.emit('ice-candidate', { candidate });
              }
            });
          } else {
            console.log(`No sockets found for ICE candidate to IP: ${toIP}`);
          }
        } else {
          // Fallback to broadcast if no specific target
          console.log('Broadcasting ICE candidate (no specific target)');
          socket.broadcast.emit('ice-candidate', { candidate });
        }
      });

      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        this.cleanupSocket(socket);
      });
    });
  }

  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isRunning) {
        console.log('Signaling server is already running');
        resolve();
        return;
      }

      // Bind to all network interfaces (0.0.0.0) so it's accessible from other machines
      this.server.listen(this.port, '0.0.0.0', () => {
        this.isRunning = true;
        console.log(`Signaling server running on port ${this.port} (accessible from network)`);
        resolve();
      }).on('error', (error: any) => {
        console.error('Failed to start signaling server:', error);
        reject(error);
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isRunning) {
        console.log('Signaling server is not running');
        resolve();
        return;
      }

      this.server.close(() => {
        this.isRunning = false;
        console.log('Signaling server stopped');
        resolve();
      });
    });
  }

  public isServerRunning(): boolean {
    return this.isRunning;
  }
}
