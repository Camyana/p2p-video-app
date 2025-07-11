# P2P Video Calling App

A simple peer-to-peer video calling application built with Electron, React, and WebRTC.

## Features

- **Two connection modes**: Room-based and Direct IP connections
- **Direct IP calling**: Connect directly to a friend's IP address
- **Room-based connections**: Simple room codes for easy joining
- One-on-one video calls
- Cross-platform (Windows, Mac, Linux)
- Device testing staging room
- Robust error handling for missing devices
- Real-time audio and video streaming
- WebRTC for direct peer-to-peer communication

## Architecture

- **Electron App**: Main desktop application
- **Signaling Server**: Node.js server for WebRTC handshake coordination
- **WebRTC**: Direct peer-to-peer communication
- **STUN Server**: Google's public STUN server for NAT traversal

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd p2p-video
```

2. Install dependencies:
```bash
npm install
```

3. Install signaling server dependencies:
```bash
cd signaling-server
npm install
cd ..
```

### Running the Application

1. **Start the signaling server** (in one terminal):
```bash
npm run server
```

2. **Start the Electron app** (in another terminal):
```bash
npm start
```

### Development

To run in development mode:
```bash
npm run dev
```

To build the application:
```bash
npm run build
```

## How to Use

### Room-Based Connection (Original Method)

1. Start both the signaling server and the Electron app
2. Select "Room Connection" tab
3. Enter a room code (any string) and click "Join Room"
4. Share the same room code with the person you want to call
5. Once both users are in the room, either person can click "Start Call"
6. Grant camera and microphone permissions when prompted
7. Enjoy your P2P video call!

### Direct IP Connection (New Method)

1. Start both the signaling server and the Electron app
2. Select "Direct IP Connection" tab
3. **To host a call:**
   - Click "Start Hosting"
   - Share your displayed IP address with your friend
   - Wait for incoming call requests
4. **To call someone:**
   - Enter your friend's IP address
   - Click "Call IP"
   - Your friend will receive a call request popup
5. Once connected, enjoy your direct P2P video call!

### Local Testing (Same Machine)

Perfect for testing with multiple instances on the same computer:

1. Start the signaling server: `npm run server`
2. **Start multiple instances:**
   - Run `npm start` in multiple terminals, OR
   - Use the batch script: `start-instance.bat`
3. In each instance:
   - Select "Local Testing" tab
   - Each instance gets a unique User ID
4. **To test a call:**
   - **Instance 1**: Click "Start Hosting" (waits for calls)
   - **Instance 2**: Copy Instance 1's User ID → paste it → click "Call User ID"
   - Instance 1 will get a popup to accept/reject the call
5. Accept the call and enjoy testing!

**Note**: Each instance gets a unique User ID like `user_1641234567890_abc123def` for identification.

### Device Testing

1. Click "Test Camera & Audio" from the main screen
2. Test individual components (camera, microphone, or both)
3. The app will show you what's working and what isn't
4. Join a call when ready - even without working camera/mic!

## Building for Distribution

To create installers for your platform:

```bash
npm run dist
```

This will create platform-specific installers in the `release` folder.

## Project Structure

```
p2p-video/
├── src/                     # Electron app source code
│   ├── main.ts              # Electron main process
│   ├── renderer.tsx         # React app entry point
│   ├── VideoCallApp.tsx     # Main React component
│   ├── styles.css           # Application styles
│   └── index.html           # HTML template
├── signaling-server/        # Node.js signaling server
│   ├── server.js            # Server implementation
│   └── package.json         # Server dependencies
├── dist/                    # Built application files
└── release/                 # Distribution packages
```

## Technology Stack

- **Electron**: Cross-platform desktop app framework
- **React**: UI library
- **TypeScript**: Type-safe JavaScript
- **WebRTC**: Real-time communication
- **Socket.io**: Real-time signaling
- **Webpack**: Module bundler

## Troubleshooting

### Connection Issues
- Ensure the signaling server is running on port 3001
- Check that both users are using the same room code
- For NAT traversal issues, consider setting up a TURN server

### Media Access Issues
- Grant camera and microphone permissions when prompted
- Check that your camera/microphone are not being used by other applications

## Contributing

This is a personal project built for simplicity. Feel free to fork and modify as needed.

## License

ISC
