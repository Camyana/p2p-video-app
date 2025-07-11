import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faVideo, 
  faVideoSlash, 
  faMicrophone, 
  faMicrophoneSlash, 
  faVolumeUp, 
  faVolumeXmark,
  faPhone,
  faPhoneSlash,
  faUser,
  faServer,
  faChevronDown,
  faCog
} from '@fortawesome/free-solid-svg-icons';

// Types
interface User {
  id: string;
  name: string;
  status: 'available' | 'calling' | 'receiving-call' | 'in-call';
}

interface VideoCallAppProps {
  // Add any props if needed
}

// Quality options
const qualityOptions = [
  { value: '720p', label: '720p HD', width: 1280, height: 720 },
  { value: '1080p', label: '1080p Full HD', width: 1920, height: 1080 },
  { value: '480p', label: '480p Standard', width: 854, height: 480 },
  { value: '360p', label: '360p Low', width: 640, height: 360 }
];

type AppMode = 'connect' | 'lobby' | 'calling' | 'in-call';

const VideoCallApp: React.FC<VideoCallAppProps> = () => {
  // Connection state
  const [mode, setMode] = useState<AppMode>('connect');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [signalingServerURL, setSignalingServerURL] = useState('localhost:3001');
  const [connectionStatus, setConnectionStatus] = useState('');
  
  // User state
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [userList, setUserList] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Call state
  const [currentRoomId, setCurrentRoomId] = useState('');
  const [incomingCall, setIncomingCall] = useState<{callId: string, caller: User, roomId: string} | null>(null);
  
  // Media state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [selectedQuality, setSelectedQuality] = useState('720p');
  
  // Media controls
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [showLocalVideo, setShowLocalVideo] = useState(true);
  
  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localPreviewRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  
  // WebRTC configuration
  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  // Initialize local media
  const startLocalVideo = async () => {
    try {
      console.log('Starting local video...');
      
      const quality = qualityOptions.find(q => q.value === selectedQuality);
      const constraints = {
        video: { 
          width: { ideal: quality?.width || 1280 }, 
          height: { ideal: quality?.height || 720 },
          frameRate: { ideal: 30 }
        }, 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };
        
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Apply mute states
      stream.getVideoTracks().forEach(track => {
        track.enabled = !isCameraOff;
      });
      stream.getAudioTracks().forEach(track => {
        track.enabled = !isMicMuted;
      });
      
      setLocalStream(stream);
      
      // Update video elements
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      if (localPreviewRef.current) localPreviewRef.current.srcObject = stream;
      
      console.log('✅ Local media started successfully');
    } catch (error) {
      console.error('❌ Error starting local media:', error);
    }
  };

  // Connect to signaling server
  const connectToServer = async () => {
    if (!signalingServerURL.trim() || !userName.trim()) {
      setConnectionStatus('Please enter server URL and your name');
      return;
    }

    try {
      setConnectionStatus('Connecting to server...');
      
      const serverURL = signalingServerURL.startsWith('http') 
        ? signalingServerURL 
        : `http://${signalingServerURL}`;
      
      const socketInstance = io(serverURL, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        autoConnect: true
      });

      setSocket(socketInstance);
      
      // Set up event listeners
      socketInstance.on('connect', () => {
        console.log('✅ Connected to signaling server');
        setIsConnected(true);
        setConnectionStatus('Connected! Registering user...');
        
        // Register user
        socketInstance.emit('register-user', { name: userName.trim() });
      });

      socketInstance.on('disconnect', () => {
        console.log('❌ Disconnected from signaling server');
        setIsConnected(false);
        setConnectionStatus('Disconnected from server');
      });

      socketInstance.on('connect_error', (error) => {
        console.error('❌ Connection error:', error);
        setIsConnected(false);
        setConnectionStatus('Failed to connect to server');
      });

      socketInstance.on('registration-success', ({ userId: newUserId, name }) => {
        console.log('✅ User registered successfully:', name);
        setUserId(newUserId);
        setConnectionStatus('');
        setMode('lobby');
        
        // Start local video
        startLocalVideo();
      });

      socketInstance.on('registration-error', ({ message }) => {
        console.error('❌ Registration error:', message);
        setConnectionStatus(`Registration failed: ${message}`);
      });

      socketInstance.on('user-list', ({ users }) => {
        console.log('📋 User list updated:', users);
        setUserList(users.filter((user: User) => user.id !== userId));
      });

      socketInstance.on('incoming-call', ({ callId, caller, roomId }) => {
        console.log('📞 Incoming call from:', caller.name);
        setIncomingCall({ callId, caller, roomId });
      });

      socketInstance.on('call-started', ({ roomId, targetUser }) => {
        console.log('📞 Call started with:', targetUser.name);
        setCurrentRoomId(roomId);
        setSelectedUser(targetUser);
        setMode('calling');
        setConnectionStatus(`Calling ${targetUser.name}...`);
      });

      socketInstance.on('call-accepted', ({ roomId }) => {
        console.log('✅ Call accepted, room:', roomId);
        setCurrentRoomId(roomId);
        setMode('in-call');
        setConnectionStatus('Connected!');
        setIncomingCall(null);
        
        // Create peer connection and start call
        createPeerConnection(roomId);
      });

      socketInstance.on('call-rejected', ({ targetUser }) => {
        console.log('❌ Call rejected by:', targetUser.name);
        setConnectionStatus(`Call rejected by ${targetUser.name}`);
        setMode('lobby');
        setSelectedUser(null);
        setTimeout(() => setConnectionStatus(''), 3000);
      });

      socketInstance.on('call-ended', ({ roomId }) => {
        console.log('📴 Call ended, room:', roomId);
        endCall();
      });

      socketInstance.on('call-error', ({ message }) => {
        console.error('❌ Call error:', message);
        setConnectionStatus(`Call error: ${message}`);
        setMode('lobby');
        setTimeout(() => setConnectionStatus(''), 3000);
      });

      // WebRTC signaling events
      socketInstance.on('offer', ({ offer, roomId }) => {
        console.log('📨 Received offer for room:', roomId);
        handleOffer(offer, roomId);
      });

      socketInstance.on('answer', ({ answer, roomId }) => {
        console.log('📨 Received answer for room:', roomId);
        handleAnswer(answer, roomId);
      });

      socketInstance.on('ice-candidate', ({ candidate, roomId }) => {
        console.log('🧊 Received ICE candidate for room:', roomId);
        handleIceCandidate(candidate, roomId);
      });

    } catch (error) {
      console.error('❌ Error connecting to server:', error);
      setConnectionStatus('Failed to connect to server');
    }
  };

  // Create peer connection
  const createPeerConnection = async (roomId: string) => {
    try {
      console.log('Creating peer connection for room:', roomId);
      
      const peerConnection = new RTCPeerConnection(configuration);
      peerConnectionRef.current = peerConnection;

      // Add local stream tracks
      if (localStream) {
        localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, localStream);
        });
      }

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        console.log('📺 Received remote stream');
        const [remoteStream] = event.streams;
        setRemoteStream(remoteStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('🧊 Sending ICE candidate');
          socket?.emit('ice-candidate', { 
            candidate: event.candidate, 
            roomId 
          });
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log('🔗 Connection state:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
          setConnectionStatus('Connected!');
        } else if (peerConnection.connectionState === 'failed') {
          setConnectionStatus('Connection failed');
        }
      };

      // Create and send offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      console.log('📤 Sending offer');
      socket?.emit('offer', { offer, roomId });

    } catch (error) {
      console.error('❌ Error creating peer connection:', error);
    }
  };

  // Handle incoming offer
  const handleOffer = async (offer: RTCSessionDescriptionInit, roomId: string) => {
    try {
      if (!peerConnectionRef.current) {
        await createPeerConnection(roomId);
      }

      const peerConnection = peerConnectionRef.current;
      if (!peerConnection) return;

      await peerConnection.setRemoteDescription(offer);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      console.log('📤 Sending answer');
      socket?.emit('answer', { answer, roomId });

    } catch (error) {
      console.error('❌ Error handling offer:', error);
    }
  };

  // Handle incoming answer
  const handleAnswer = async (answer: RTCSessionDescriptionInit, roomId: string) => {
    try {
      const peerConnection = peerConnectionRef.current;
      if (!peerConnection) return;

      await peerConnection.setRemoteDescription(answer);
      console.log('✅ Remote description set');

    } catch (error) {
      console.error('❌ Error handling answer:', error);
    }
  };

  // Handle incoming ICE candidate
  const handleIceCandidate = async (candidate: RTCIceCandidateInit, roomId: string) => {
    try {
      const peerConnection = peerConnectionRef.current;
      if (!peerConnection) return;

      await peerConnection.addIceCandidate(candidate);
      console.log('✅ ICE candidate added');

    } catch (error) {
      console.error('❌ Error handling ICE candidate:', error);
    }
  };

  // Start call with selected user
  const startCall = () => {
    if (!selectedUser) return;

    console.log('📞 Starting call with:', selectedUser.name);
    socket?.emit('start-call', { targetUserId: selectedUser.id });
  };

  // Accept incoming call
  const acceptCall = () => {
    if (!incomingCall) return;

    console.log('✅ Accepting call from:', incomingCall.caller.name);
    socket?.emit('accept-call', { callId: incomingCall.callId });
  };

  // Reject incoming call
  const rejectCall = () => {
    if (!incomingCall) return;

    console.log('❌ Rejecting call from:', incomingCall.caller.name);
    socket?.emit('reject-call', { callId: incomingCall.callId });
    setIncomingCall(null);
  };

  // End current call
  const endCall = () => {
    console.log('📴 Ending call');
    
    if (currentRoomId) {
      socket?.emit('end-call', { roomId: currentRoomId });
    }
    
    // Clean up peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    // Reset state
    setRemoteStream(null);
    setCurrentRoomId('');
    setSelectedUser(null);
    setMode('lobby');
    setConnectionStatus('');
    setIncomingCall(null);
    
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  };

  // Media controls
  const toggleMicrophone = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
    }
  };

  const toggleSpeaker = () => {
    setIsSpeakerMuted(!isSpeakerMuted);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !isSpeakerMuted;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, [socket, localStream]);

  // Render functions
  const renderConnectScreen = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8">
      <div className="bg-slate-800/50 backdrop-blur-lg rounded-xl p-8 w-full max-w-md border border-slate-700/50">
        <div className="text-center mb-8">
          <FontAwesomeIcon icon={faServer} className="text-4xl text-blue-400 mb-4" />
          <h1 className="text-2xl font-bold mb-2">P2P Video Call</h1>
          <p className="text-slate-300">Connect to a signaling server to start</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Your Name</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-400 focus:outline-none"
              placeholder="Enter your name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Server URL</label>
            <input
              type="text"
              value={signalingServerURL}
              onChange={(e) => setSignalingServerURL(e.target.value)}
              className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-400 focus:outline-none"
              placeholder="localhost:3001"
            />
          </div>
          
          <button
            onClick={connectToServer}
            disabled={!userName.trim() || !signalingServerURL.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Connect to Server
          </button>
          
          {connectionStatus && (
            <div className="text-center text-sm text-slate-300 mt-4">
              {connectionStatus}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderLobby = () => (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* User List Sidebar */}
      <div className="w-1/3 bg-slate-800/30 backdrop-blur-lg border-r border-slate-700/50 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-2">Connected Users</h2>
          <p className="text-slate-300 text-sm">Welcome, {userName}!</p>
        </div>
        
        <div className="space-y-3">
          {userList.length === 0 ? (
            <div className="text-center text-slate-400 py-8">
              <FontAwesomeIcon icon={faUser} className="text-2xl mb-2" />
              <p>No other users connected</p>
            </div>
          ) : (
            userList.map((user) => (
              <div
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className={`p-4 rounded-lg cursor-pointer transition-all ${
                  selectedUser?.id === user.id 
                    ? 'bg-blue-600/20 border-blue-400 border' 
                    : 'bg-slate-700/50 hover:bg-slate-700/70 border border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FontAwesomeIcon icon={faUser} className="text-slate-300" />
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-slate-400 capitalize">{user.status}</p>
                    </div>
                  </div>
                  
                  {user.status === 'available' && (
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        
        {selectedUser && selectedUser.status === 'available' && (
          <div className="mt-6">
            <button
              onClick={startCall}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <FontAwesomeIcon icon={faPhone} />
              <span>Call {selectedUser.name}</span>
            </button>
          </div>
        )}
      </div>
      
      {/* Device Preview */}
      <div className="flex-1 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-2">Device Preview</h2>
          <p className="text-slate-300 text-sm">Test your camera and microphone</p>
        </div>
        
        <div className="bg-slate-800/30 backdrop-blur-lg rounded-xl p-6 border border-slate-700/50">
          <div className="aspect-video bg-slate-900/50 rounded-lg overflow-hidden mb-4">
            <video
              ref={localPreviewRef}
              autoPlay
              muted
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={toggleMicrophone}
              className={`p-3 rounded-full transition-colors ${
                isMicMuted 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              <FontAwesomeIcon icon={isMicMuted ? faMicrophoneSlash : faMicrophone} />
            </button>
            
            <button
              onClick={toggleCamera}
              className={`p-3 rounded-full transition-colors ${
                isCameraOff 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              <FontAwesomeIcon icon={isCameraOff ? faVideoSlash : faVideo} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCalling = () => (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="bg-slate-800/50 backdrop-blur-lg rounded-xl p-8 text-center border border-slate-700/50">
        <div className="mb-6">
          <FontAwesomeIcon icon={faPhone} className="text-4xl text-blue-400 mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold mb-2">Calling...</h2>
          <p className="text-slate-300">{selectedUser?.name}</p>
        </div>
        
        <button
          onClick={endCall}
          className="bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2 mx-auto"
        >
          <FontAwesomeIcon icon={faPhoneSlash} />
          <span>Cancel Call</span>
        </button>
      </div>
    </div>
  );

  const renderInCall = () => (
    <div className="flex flex-col min-h-screen bg-slate-900 text-white">
      {/* Video Area */}
      <div className="flex-1 relative">
        {/* Remote Video */}
        <video
          ref={remoteVideoRef}
          autoPlay
          className="w-full h-full object-cover bg-slate-800"
        />
        
        {/* Local Video (Picture-in-Picture) */}
        {showLocalVideo && (
          <div className="absolute top-4 right-4 w-64 h-48 bg-slate-800 rounded-lg overflow-hidden border-2 border-slate-700">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>
      
      {/* Controls */}
      <div className="bg-slate-800/90 backdrop-blur-lg p-6 flex items-center justify-center space-x-6">
        <button
          onClick={toggleMicrophone}
          className={`p-4 rounded-full transition-colors ${
            isMicMuted 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-slate-700 hover:bg-slate-600'
          }`}
        >
          <FontAwesomeIcon icon={isMicMuted ? faMicrophoneSlash : faMicrophone} className="text-xl" />
        </button>
        
        <button
          onClick={toggleCamera}
          className={`p-4 rounded-full transition-colors ${
            isCameraOff 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-slate-700 hover:bg-slate-600'
          }`}
        >
          <FontAwesomeIcon icon={isCameraOff ? faVideoSlash : faVideo} className="text-xl" />
        </button>
        
        <button
          onClick={toggleSpeaker}
          className={`p-4 rounded-full transition-colors ${
            isSpeakerMuted 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-slate-700 hover:bg-slate-600'
          }`}
        >
          <FontAwesomeIcon icon={isSpeakerMuted ? faVolumeXmark : faVolumeUp} className="text-xl" />
        </button>
        
        <button
          onClick={endCall}
          className="bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          <FontAwesomeIcon icon={faPhoneSlash} />
          <span>End Call</span>
        </button>
      </div>
    </div>
  );

  // Incoming call modal
  const renderIncomingCallModal = () => {
    if (!incomingCall) return null;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-slate-800 rounded-xl p-8 text-center border border-slate-700">
          <div className="mb-6">
            <FontAwesomeIcon icon={faPhone} className="text-4xl text-green-400 mb-4 animate-pulse" />
            <h2 className="text-2xl font-bold mb-2">Incoming Call</h2>
            <p className="text-slate-300">{incomingCall.caller.name} is calling you</p>
          </div>
          
          <div className="flex space-x-4">
            <button
              onClick={acceptCall}
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <FontAwesomeIcon icon={faPhone} />
              <span>Accept</span>
            </button>
            
            <button
              onClick={rejectCall}
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <FontAwesomeIcon icon={faPhoneSlash} />
              <span>Reject</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Main render
  return (
    <div className="min-h-screen">
      {mode === 'connect' && renderConnectScreen()}
      {mode === 'lobby' && renderLobby()}
      {mode === 'calling' && renderCalling()}
      {mode === 'in-call' && renderInCall()}
      {renderIncomingCallModal()}
    </div>
  );
};

export default VideoCallApp;
