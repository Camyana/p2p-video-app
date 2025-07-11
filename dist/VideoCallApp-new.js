"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const socket_io_client_1 = require("socket.io-client");
const react_fontawesome_1 = require("@fortawesome/react-fontawesome");
const free_solid_svg_icons_1 = require("@fortawesome/free-solid-svg-icons");
// Quality options
const qualityOptions = [
    { value: '720p', label: '720p HD', width: 1280, height: 720 },
    { value: '1080p', label: '1080p Full HD', width: 1920, height: 1080 },
    { value: '480p', label: '480p Standard', width: 854, height: 480 },
    { value: '360p', label: '360p Low', width: 640, height: 360 }
];
const VideoCallApp = () => {
    // Connection state
    const [mode, setMode] = (0, react_1.useState)('connect');
    const [socket, setSocket] = (0, react_1.useState)(null);
    const [isConnected, setIsConnected] = (0, react_1.useState)(false);
    const [signalingServerURL, setSignalingServerURL] = (0, react_1.useState)('localhost:3001');
    const [connectionStatus, setConnectionStatus] = (0, react_1.useState)('');
    // User state
    const [userName, setUserName] = (0, react_1.useState)('');
    const [userId, setUserId] = (0, react_1.useState)('');
    const [userList, setUserList] = (0, react_1.useState)([]);
    const [selectedUser, setSelectedUser] = (0, react_1.useState)(null);
    // Call state
    const [currentRoomId, setCurrentRoomId] = (0, react_1.useState)('');
    const [incomingCall, setIncomingCall] = (0, react_1.useState)(null);
    // Media state
    const [localStream, setLocalStream] = (0, react_1.useState)(null);
    const [remoteStream, setRemoteStream] = (0, react_1.useState)(null);
    const [selectedQuality, setSelectedQuality] = (0, react_1.useState)('720p');
    // Media controls
    const [isMicMuted, setIsMicMuted] = (0, react_1.useState)(false);
    const [isCameraOff, setIsCameraOff] = (0, react_1.useState)(false);
    const [isSpeakerMuted, setIsSpeakerMuted] = (0, react_1.useState)(false);
    const [showLocalVideo, setShowLocalVideo] = (0, react_1.useState)(true);
    // Refs
    const localVideoRef = (0, react_1.useRef)(null);
    const remoteVideoRef = (0, react_1.useRef)(null);
    const localPreviewRef = (0, react_1.useRef)(null);
    const peerConnectionRef = (0, react_1.useRef)(null);
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
            if (localVideoRef.current)
                localVideoRef.current.srcObject = stream;
            if (localPreviewRef.current)
                localPreviewRef.current.srcObject = stream;
            console.log('✅ Local media started successfully');
        }
        catch (error) {
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
            const socketInstance = (0, socket_io_client_1.io)(serverURL, {
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
                setUserList(users.filter((user) => user.id !== userId));
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
        }
        catch (error) {
            console.error('❌ Error connecting to server:', error);
            setConnectionStatus('Failed to connect to server');
        }
    };
    // Create peer connection
    const createPeerConnection = async (roomId) => {
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
                }
                else if (peerConnection.connectionState === 'failed') {
                    setConnectionStatus('Connection failed');
                }
            };
            // Create and send offer
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            console.log('📤 Sending offer');
            socket?.emit('offer', { offer, roomId });
        }
        catch (error) {
            console.error('❌ Error creating peer connection:', error);
        }
    };
    // Handle incoming offer
    const handleOffer = async (offer, roomId) => {
        try {
            if (!peerConnectionRef.current) {
                await createPeerConnection(roomId);
            }
            const peerConnection = peerConnectionRef.current;
            if (!peerConnection)
                return;
            await peerConnection.setRemoteDescription(offer);
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            console.log('📤 Sending answer');
            socket?.emit('answer', { answer, roomId });
        }
        catch (error) {
            console.error('❌ Error handling offer:', error);
        }
    };
    // Handle incoming answer
    const handleAnswer = async (answer, roomId) => {
        try {
            const peerConnection = peerConnectionRef.current;
            if (!peerConnection)
                return;
            await peerConnection.setRemoteDescription(answer);
            console.log('✅ Remote description set');
        }
        catch (error) {
            console.error('❌ Error handling answer:', error);
        }
    };
    // Handle incoming ICE candidate
    const handleIceCandidate = async (candidate, roomId) => {
        try {
            const peerConnection = peerConnectionRef.current;
            if (!peerConnection)
                return;
            await peerConnection.addIceCandidate(candidate);
            console.log('✅ ICE candidate added');
        }
        catch (error) {
            console.error('❌ Error handling ICE candidate:', error);
        }
    };
    // Start call with selected user
    const startCall = () => {
        if (!selectedUser)
            return;
        console.log('📞 Starting call with:', selectedUser.name);
        socket?.emit('start-call', { targetUserId: selectedUser.id });
    };
    // Accept incoming call
    const acceptCall = () => {
        if (!incomingCall)
            return;
        console.log('✅ Accepting call from:', incomingCall.caller.name);
        socket?.emit('accept-call', { callId: incomingCall.callId });
    };
    // Reject incoming call
    const rejectCall = () => {
        if (!incomingCall)
            return;
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
    (0, react_1.useEffect)(() => {
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
    const renderConnectScreen = () => ((0, jsx_runtime_1.jsx)("div", { className: "flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8", children: (0, jsx_runtime_1.jsxs)("div", { className: "bg-slate-800/50 backdrop-blur-lg rounded-xl p-8 w-full max-w-md border border-slate-700/50", children: [(0, jsx_runtime_1.jsxs)("div", { className: "text-center mb-8", children: [(0, jsx_runtime_1.jsx)(react_fontawesome_1.FontAwesomeIcon, { icon: free_solid_svg_icons_1.faServer, className: "text-4xl text-blue-400 mb-4" }), (0, jsx_runtime_1.jsx)("h1", { className: "text-2xl font-bold mb-2", children: "P2P Video Call" }), (0, jsx_runtime_1.jsx)("p", { className: "text-slate-300", children: "Connect to a signaling server to start" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-sm font-medium mb-2", children: "Your Name" }), (0, jsx_runtime_1.jsx)("input", { type: "text", value: userName, onChange: (e) => setUserName(e.target.value), className: "w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-400 focus:outline-none", placeholder: "Enter your name" })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-sm font-medium mb-2", children: "Server URL" }), (0, jsx_runtime_1.jsx)("input", { type: "text", value: signalingServerURL, onChange: (e) => setSignalingServerURL(e.target.value), className: "w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-400 focus:outline-none", placeholder: "localhost:3001" })] }), (0, jsx_runtime_1.jsx)("button", { onClick: connectToServer, disabled: !userName.trim() || !signalingServerURL.trim(), className: "w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors", children: "Connect to Server" }), connectionStatus && ((0, jsx_runtime_1.jsx)("div", { className: "text-center text-sm text-slate-300 mt-4", children: connectionStatus }))] })] }) }));
    const renderLobby = () => ((0, jsx_runtime_1.jsxs)("div", { className: "flex min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white", children: [(0, jsx_runtime_1.jsxs)("div", { className: "w-1/3 bg-slate-800/30 backdrop-blur-lg border-r border-slate-700/50 p-6", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-6", children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-xl font-bold mb-2", children: "Connected Users" }), (0, jsx_runtime_1.jsxs)("p", { className: "text-slate-300 text-sm", children: ["Welcome, ", userName, "!"] })] }), (0, jsx_runtime_1.jsx)("div", { className: "space-y-3", children: userList.length === 0 ? ((0, jsx_runtime_1.jsxs)("div", { className: "text-center text-slate-400 py-8", children: [(0, jsx_runtime_1.jsx)(react_fontawesome_1.FontAwesomeIcon, { icon: free_solid_svg_icons_1.faUser, className: "text-2xl mb-2" }), (0, jsx_runtime_1.jsx)("p", { children: "No other users connected" })] })) : (userList.map((user) => ((0, jsx_runtime_1.jsx)("div", { onClick: () => setSelectedUser(user), className: `p-4 rounded-lg cursor-pointer transition-all ${selectedUser?.id === user.id
                                ? 'bg-blue-600/20 border-blue-400 border'
                                : 'bg-slate-700/50 hover:bg-slate-700/70 border border-slate-600'}`, children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center space-x-3", children: [(0, jsx_runtime_1.jsx)(react_fontawesome_1.FontAwesomeIcon, { icon: free_solid_svg_icons_1.faUser, className: "text-slate-300" }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "font-medium", children: user.name }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm text-slate-400 capitalize", children: user.status })] })] }), user.status === 'available' && ((0, jsx_runtime_1.jsx)("div", { className: "w-3 h-3 bg-green-400 rounded-full" }))] }) }, user.id)))) }), selectedUser && selectedUser.status === 'available' && ((0, jsx_runtime_1.jsx)("div", { className: "mt-6", children: (0, jsx_runtime_1.jsxs)("button", { onClick: startCall, className: "w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2", children: [(0, jsx_runtime_1.jsx)(react_fontawesome_1.FontAwesomeIcon, { icon: free_solid_svg_icons_1.faPhone }), (0, jsx_runtime_1.jsxs)("span", { children: ["Call ", selectedUser.name] })] }) }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex-1 p-6", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-6", children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-xl font-bold mb-2", children: "Device Preview" }), (0, jsx_runtime_1.jsx)("p", { className: "text-slate-300 text-sm", children: "Test your camera and microphone" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "bg-slate-800/30 backdrop-blur-lg rounded-xl p-6 border border-slate-700/50", children: [(0, jsx_runtime_1.jsx)("div", { className: "aspect-video bg-slate-900/50 rounded-lg overflow-hidden mb-4", children: (0, jsx_runtime_1.jsx)("video", { ref: localPreviewRef, autoPlay: true, muted: true, className: "w-full h-full object-cover" }) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-center space-x-4", children: [(0, jsx_runtime_1.jsx)("button", { onClick: toggleMicrophone, className: `p-3 rounded-full transition-colors ${isMicMuted
                                            ? 'bg-red-600 hover:bg-red-700'
                                            : 'bg-slate-700 hover:bg-slate-600'}`, children: (0, jsx_runtime_1.jsx)(react_fontawesome_1.FontAwesomeIcon, { icon: isMicMuted ? free_solid_svg_icons_1.faMicrophoneSlash : free_solid_svg_icons_1.faMicrophone }) }), (0, jsx_runtime_1.jsx)("button", { onClick: toggleCamera, className: `p-3 rounded-full transition-colors ${isCameraOff
                                            ? 'bg-red-600 hover:bg-red-700'
                                            : 'bg-slate-700 hover:bg-slate-600'}`, children: (0, jsx_runtime_1.jsx)(react_fontawesome_1.FontAwesomeIcon, { icon: isCameraOff ? free_solid_svg_icons_1.faVideoSlash : free_solid_svg_icons_1.faVideo }) })] })] })] })] }));
    const renderCalling = () => ((0, jsx_runtime_1.jsx)("div", { className: "flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white", children: (0, jsx_runtime_1.jsxs)("div", { className: "bg-slate-800/50 backdrop-blur-lg rounded-xl p-8 text-center border border-slate-700/50", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-6", children: [(0, jsx_runtime_1.jsx)(react_fontawesome_1.FontAwesomeIcon, { icon: free_solid_svg_icons_1.faPhone, className: "text-4xl text-blue-400 mb-4 animate-pulse" }), (0, jsx_runtime_1.jsx)("h2", { className: "text-2xl font-bold mb-2", children: "Calling..." }), (0, jsx_runtime_1.jsx)("p", { className: "text-slate-300", children: selectedUser?.name })] }), (0, jsx_runtime_1.jsxs)("button", { onClick: endCall, className: "bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2 mx-auto", children: [(0, jsx_runtime_1.jsx)(react_fontawesome_1.FontAwesomeIcon, { icon: free_solid_svg_icons_1.faPhoneSlash }), (0, jsx_runtime_1.jsx)("span", { children: "Cancel Call" })] })] }) }));
    const renderInCall = () => ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col min-h-screen bg-slate-900 text-white", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex-1 relative", children: [(0, jsx_runtime_1.jsx)("video", { ref: remoteVideoRef, autoPlay: true, className: "w-full h-full object-cover bg-slate-800" }), showLocalVideo && ((0, jsx_runtime_1.jsx)("div", { className: "absolute top-4 right-4 w-64 h-48 bg-slate-800 rounded-lg overflow-hidden border-2 border-slate-700", children: (0, jsx_runtime_1.jsx)("video", { ref: localVideoRef, autoPlay: true, muted: true, className: "w-full h-full object-cover" }) }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "bg-slate-800/90 backdrop-blur-lg p-6 flex items-center justify-center space-x-6", children: [(0, jsx_runtime_1.jsx)("button", { onClick: toggleMicrophone, className: `p-4 rounded-full transition-colors ${isMicMuted
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-slate-700 hover:bg-slate-600'}`, children: (0, jsx_runtime_1.jsx)(react_fontawesome_1.FontAwesomeIcon, { icon: isMicMuted ? free_solid_svg_icons_1.faMicrophoneSlash : free_solid_svg_icons_1.faMicrophone, className: "text-xl" }) }), (0, jsx_runtime_1.jsx)("button", { onClick: toggleCamera, className: `p-4 rounded-full transition-colors ${isCameraOff
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-slate-700 hover:bg-slate-600'}`, children: (0, jsx_runtime_1.jsx)(react_fontawesome_1.FontAwesomeIcon, { icon: isCameraOff ? free_solid_svg_icons_1.faVideoSlash : free_solid_svg_icons_1.faVideo, className: "text-xl" }) }), (0, jsx_runtime_1.jsx)("button", { onClick: toggleSpeaker, className: `p-4 rounded-full transition-colors ${isSpeakerMuted
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-slate-700 hover:bg-slate-600'}`, children: (0, jsx_runtime_1.jsx)(react_fontawesome_1.FontAwesomeIcon, { icon: isSpeakerMuted ? free_solid_svg_icons_1.faVolumeXmark : free_solid_svg_icons_1.faVolumeUp, className: "text-xl" }) }), (0, jsx_runtime_1.jsxs)("button", { onClick: endCall, className: "bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2", children: [(0, jsx_runtime_1.jsx)(react_fontawesome_1.FontAwesomeIcon, { icon: free_solid_svg_icons_1.faPhoneSlash }), (0, jsx_runtime_1.jsx)("span", { children: "End Call" })] })] })] }));
    // Incoming call modal
    const renderIncomingCallModal = () => {
        if (!incomingCall)
            return null;
        return ((0, jsx_runtime_1.jsx)("div", { className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50", children: (0, jsx_runtime_1.jsxs)("div", { className: "bg-slate-800 rounded-xl p-8 text-center border border-slate-700", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-6", children: [(0, jsx_runtime_1.jsx)(react_fontawesome_1.FontAwesomeIcon, { icon: free_solid_svg_icons_1.faPhone, className: "text-4xl text-green-400 mb-4 animate-pulse" }), (0, jsx_runtime_1.jsx)("h2", { className: "text-2xl font-bold mb-2", children: "Incoming Call" }), (0, jsx_runtime_1.jsxs)("p", { className: "text-slate-300", children: [incomingCall.caller.name, " is calling you"] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex space-x-4", children: [(0, jsx_runtime_1.jsxs)("button", { onClick: acceptCall, className: "bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2", children: [(0, jsx_runtime_1.jsx)(react_fontawesome_1.FontAwesomeIcon, { icon: free_solid_svg_icons_1.faPhone }), (0, jsx_runtime_1.jsx)("span", { children: "Accept" })] }), (0, jsx_runtime_1.jsxs)("button", { onClick: rejectCall, className: "bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2", children: [(0, jsx_runtime_1.jsx)(react_fontawesome_1.FontAwesomeIcon, { icon: free_solid_svg_icons_1.faPhoneSlash }), (0, jsx_runtime_1.jsx)("span", { children: "Reject" })] })] })] }) }));
    };
    // Main render
    return ((0, jsx_runtime_1.jsxs)("div", { className: "min-h-screen", children: [mode === 'connect' && renderConnectScreen(), mode === 'lobby' && renderLobby(), mode === 'calling' && renderCalling(), mode === 'in-call' && renderInCall(), renderIncomingCallModal()] }));
};
exports.default = VideoCallApp;
