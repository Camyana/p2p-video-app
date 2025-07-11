<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# P2P Video Calling App

This is an Electron-based P2P video calling application using WebRTC for direct peer-to-peer communication.

## Architecture
- **Electron App**: Cross-platform desktop application built with TypeScript and React
- **WebRTC**: Direct peer-to-peer video/audio communication
- **Signaling Server**: Node.js server with Socket.io for WebRTC handshake coordination
- **STUN Server**: Google's public STUN server for NAT traversal

## Key Technologies
- Electron with TypeScript
- React for UI components
- WebRTC APIs for media and peer connections
- Socket.io for real-time signaling
- Webpack for bundling

## Project Structure
- `/src/`: Main Electron app source code
- `/signaling-server/`: Node.js signaling server
- `/dist/`: Built application files

## Development Guidelines
- Use TypeScript for type safety
- Follow React functional component patterns with hooks
- Handle WebRTC connection states properly
- Implement proper error handling for media access and network issues
- Keep the UI simple and focused on core video calling functionality
