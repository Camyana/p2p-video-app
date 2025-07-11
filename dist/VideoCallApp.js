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
    const [isFullscreen, setIsFullscreen] = (0, react_1.useState)(false);
    // Refs
    const localVideoRef = (0, react_1.useRef)(null);
    const remoteVideoRef = (0, react_1.useRef)(null);
    const localPreviewRef = (0, react_1.useRef)(null);
    const peerConnectionRef = (0, react_1.useRef)(null);
    const userIdRef = (0, react_1.useRef)(''); // Add ref for userId to avoid timing issues
    const socketRef = (0, react_1.useRef)(null); // Add ref for socket to avoid timing issues
    const iceCandidatesQueue = (0, react_1.useRef)([]); // Queue for ICE candidates
    // WebRTC configuration
    const configuration = {
        iceServers: [
            // Multiple STUN servers for better connectivity
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            // Additional public STUN servers
            { urls: 'stun:stun.stunprotocol.org:3478' },
            { urls: 'stun:stun.voiparound.com' },
            { urls: 'stun:stun.voipbuster.com' },
            { urls: 'stun:stun.voipstunt.com' },
            { urls: 'stun:stun.voxgratia.org' },
            // Public TURN servers (for when STUN fails)
            {
                urls: 'turn:openrelay.metered.ca:80',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            },
            {
                urls: 'turn:openrelay.metered.ca:443',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            },
            {
                urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            }
        ],
        iceCandidatePoolSize: 10,
        iceTransportPolicy: 'all'
    };
    // Initialize local media
    const startLocalVideo = async (requireMedia = true) => {
        try {
            console.log('Starting local video...', requireMedia ? '(required)' : '(optional)');
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
            return stream;
        }
        catch (error) {
            console.error('❌ Error starting local media:', error);
            if (requireMedia) {
                console.log('⚠️ Media required but failed - will continue without media');
            }
            else {
                console.log('⚠️ Media optional and failed - continuing as viewer only');
            }
            return null;
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
                autoConnect: true,
                forceNew: true, // Force new connection
                reconnection: true, // Enable reconnection
                reconnectionAttempts: 5,
                reconnectionDelay: 1000
            });
            setSocket(socketInstance);
            socketRef.current = socketInstance; // Store in ref for immediate access
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
                // Don't reset mode to 'connect' immediately - user might want to reconnect
            });
            socketInstance.on('connect_error', (error) => {
                console.error('❌ Connection error:', error);
                setIsConnected(false);
                setConnectionStatus('Failed to connect to server');
            });
            socketInstance.on('registration-success', ({ userId: newUserId, name }) => {
                console.log('✅ User registered successfully:', name);
                setUserId(newUserId);
                userIdRef.current = newUserId; // Store in ref for immediate access
                setConnectionStatus('');
                setMode('lobby');
                // Start local video (optional - don't require it for registration)
                startLocalVideo(false);
                // Request user list immediately after registration
                socketInstance.emit('get-user-list');
            });
            socketInstance.on('registration-error', ({ message }) => {
                console.error('❌ Registration error:', message);
                setConnectionStatus(`Registration failed: ${message}`);
            });
            socketInstance.on('user-list', ({ users }) => {
                console.log('📋 User list updated:', users);
                console.log('📋 Current userId (state):', userId);
                console.log('📋 Current userId (ref):', userIdRef.current);
                console.log('📋 Current userName:', userName);
                console.log('📋 All users:', users.map((u) => ({ id: u.id, name: u.name })));
                // Filter out current user using ref for immediate access
                const currentUserId = userIdRef.current || userId;
                const currentUserName = userName.trim();
                const filteredUsers = users.filter((user) => {
                    const isCurrentUser = user.id === currentUserId || user.name === currentUserName;
                    console.log(`📋 User ${user.name} (${user.id}) - isCurrentUser: ${isCurrentUser}`);
                    return !isCurrentUser;
                });
                console.log('📋 Filtered users:', filteredUsers.map((u) => ({ id: u.id, name: u.name })));
                setUserList(filteredUsers);
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
                // Create peer connection (startLocalVideo will be called inside if needed)
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
                console.log('📨 Current room ID:', currentRoomId);
                handleOffer(offer, roomId);
            });
            socketInstance.on('answer', ({ answer, roomId }) => {
                console.log('📨 Received answer for room:', roomId);
                console.log('📨 Current room ID:', currentRoomId);
                handleAnswer(answer, roomId);
            });
            socketInstance.on('ice-candidate', ({ candidate, roomId }) => {
                console.log('🧊 Received ICE candidate for room:', roomId);
                console.log('🧊 Current room ID:', currentRoomId);
                handleIceCandidate(candidate, roomId);
            });
        }
        catch (error) {
            console.error('❌ Error connecting to server:', error);
            setConnectionStatus('Failed to connect to server');
        }
    };
    // Create peer connection without sending offer (for answering)
    const createPeerConnectionForAnswer = async (roomId) => {
        try {
            console.log('🔄 Creating peer connection for answer, room:', roomId, '(ANSWERER - will send answer)');
            // Try to get local media, but don't require it (viewer mode)
            let currentLocalStream = localStream;
            console.log('📺 ANSWERER: Current local stream:', currentLocalStream ? 'available' : 'not available');
            if (!currentLocalStream) {
                console.log('⚠️ No local stream, trying to start local video...');
                currentLocalStream = await startLocalVideo(false); // Optional media
                console.log('📺 ANSWERER: After startLocalVideo:', currentLocalStream ? 'available' : 'failed');
            }
            const peerConnection = new RTCPeerConnection(configuration);
            peerConnectionRef.current = peerConnection;
            // Add local stream tracks if available
            if (currentLocalStream) {
                console.log('📤 Adding local stream tracks to peer connection (ANSWERER)');
                console.log('📤 Available tracks:', currentLocalStream.getTracks().map(t => `${t.kind}:${t.enabled}`));
                currentLocalStream.getTracks().forEach(track => {
                    console.log('📤 Adding track:', track.kind, 'enabled:', track.enabled);
                    peerConnection.addTrack(track, currentLocalStream);
                });
                // Update local stream state if we just got it
                if (currentLocalStream !== localStream) {
                    console.log('📺 ANSWERER: Updating local stream state');
                    setLocalStream(currentLocalStream);
                }
            }
            else {
                console.log('📺 ANSWERER: No local media - joining as viewer only');
            }
            // Handle remote stream
            peerConnection.ontrack = (event) => {
                console.log('📺 ANSWERER: Received remote stream tracks:', event.track.kind);
                console.log('📺 ANSWERER: Track details:', {
                    kind: event.track.kind,
                    enabled: event.track.enabled,
                    muted: event.track.muted,
                    readyState: event.track.readyState,
                    id: event.track.id
                });
                const [remoteStream] = event.streams;
                console.log('📺 ANSWERER: Remote stream details:', {
                    id: remoteStream.id,
                    active: remoteStream.active,
                    tracks: remoteStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState }))
                });
                setRemoteStream(remoteStream);
                // Set video element immediately
                if (remoteVideoRef.current) {
                    console.log('📺 ANSWERER: Setting srcObject on video element');
                    remoteVideoRef.current.srcObject = remoteStream;
                    // Force play attempt
                    setTimeout(() => {
                        if (remoteVideoRef.current) {
                            console.log('📺 ANSWERER: Attempting to play video');
                            remoteVideoRef.current.play().then(() => {
                                console.log('📺 ANSWERER: Video play successful');
                            }).catch(err => {
                                console.error('📺 ANSWERER: Error playing remote video:', err);
                            });
                        }
                    }, 100);
                }
            };
            // Handle ICE candidates
            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    console.log('🧊 ANSWERER: Sending ICE candidate');
                    console.log('🧊 ANSWERER: Candidate details:', {
                        candidate: event.candidate.candidate,
                        sdpMLineIndex: event.candidate.sdpMLineIndex,
                        sdpMid: event.candidate.sdpMid,
                        usernameFragment: event.candidate.usernameFragment
                    });
                    console.log('🧊 ANSWERER: Socket connected:', socketRef.current?.connected);
                    if (socketRef.current?.connected) {
                        socketRef.current.emit('ice-candidate', {
                            candidate: {
                                candidate: event.candidate.candidate,
                                sdpMLineIndex: event.candidate.sdpMLineIndex,
                                sdpMid: event.candidate.sdpMid,
                                usernameFragment: event.candidate.usernameFragment
                            },
                            roomId
                        });
                        console.log('🧊 ANSWERER: ICE candidate sent successfully');
                    }
                    else {
                        console.error('🧊 ANSWERER: Socket not connected, cannot send ICE candidate');
                    }
                }
                else {
                    console.log('🧊 ANSWERER: ICE gathering completed (null candidate)');
                }
            };
            // Handle connection state changes
            peerConnection.onconnectionstatechange = () => {
                console.log('🔗 ANSWERER: Connection state:', peerConnection.connectionState);
                if (peerConnection.connectionState === 'connected') {
                    setConnectionStatus('Connected!');
                }
                else if (peerConnection.connectionState === 'failed') {
                    setConnectionStatus('Connection failed');
                }
            };
            // Add ICE connection state debugging
            peerConnection.oniceconnectionstatechange = () => {
                console.log('🧊 ANSWERER: ICE connection state:', peerConnection.iceConnectionState);
                // Add debugging for connection states
                if (peerConnection.iceConnectionState === 'connected') {
                    console.log('🎉 ANSWERER: ICE connection established successfully!');
                    // Check if we have senders (our outgoing media)
                    const senders = peerConnection.getSenders();
                    console.log('📤 ANSWERER: Outgoing senders:', senders.map(s => ({
                        track: s.track ? s.track.kind : 'no track',
                        enabled: s.track ? s.track.enabled : false
                    })));
                    // Check if we have receivers (incoming media)
                    const receivers = peerConnection.getReceivers();
                    console.log('📥 ANSWERER: Incoming receivers:', receivers.map(r => ({
                        track: r.track ? r.track.kind : 'no track',
                        enabled: r.track ? r.track.enabled : false
                    })));
                }
            };
            peerConnection.onicegatheringstatechange = () => {
                console.log('🧊 ANSWERER: ICE gathering state:', peerConnection.iceGatheringState);
            };
            // Don't create and send offer - this is for answering
            console.log('✅ ANSWERER: Peer connection created, ready to receive offer');
        }
        catch (error) {
            console.error('❌ Error creating peer connection for answer:', error);
        }
    };
    // Create peer connection
    const createPeerConnection = async (roomId) => {
        try {
            console.log('🔄 Creating peer connection for room:', roomId, '(CALLER - will send offer)');
            // Try to get local media, but don't require it
            let currentLocalStream = localStream;
            console.log('📺 CALLER: Current local stream:', currentLocalStream ? 'available' : 'not available');
            if (!currentLocalStream) {
                console.log('⚠️ No local stream, trying to start local video...');
                currentLocalStream = await startLocalVideo(false); // Optional media
                console.log('📺 CALLER: After startLocalVideo:', currentLocalStream ? 'available' : 'failed');
            }
            const peerConnection = new RTCPeerConnection(configuration);
            peerConnectionRef.current = peerConnection;
            // Add local stream tracks if available
            if (currentLocalStream) {
                console.log('📤 Adding local stream tracks to peer connection (CALLER)');
                console.log('📤 Available tracks:', currentLocalStream.getTracks().map(t => `${t.kind}:${t.enabled}`));
                currentLocalStream.getTracks().forEach(track => {
                    console.log('📤 Adding track:', track.kind, 'enabled:', track.enabled);
                    peerConnection.addTrack(track, currentLocalStream);
                });
                // Update local stream state if we just got it
                if (currentLocalStream !== localStream) {
                    console.log('📺 CALLER: Updating local stream state');
                    setLocalStream(currentLocalStream);
                }
            }
            else {
                console.log('📺 CALLER: No local media - joining as viewer only');
            }
            // Handle remote stream
            peerConnection.ontrack = (event) => {
                console.log('📺 CALLER: Received remote stream tracks:', event.track.kind);
                console.log('📺 CALLER: Track details:', {
                    kind: event.track.kind,
                    enabled: event.track.enabled,
                    muted: event.track.muted,
                    readyState: event.track.readyState,
                    id: event.track.id
                });
                const [remoteStream] = event.streams;
                console.log('📺 CALLER: Remote stream details:', {
                    id: remoteStream.id,
                    active: remoteStream.active,
                    tracks: remoteStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState }))
                });
                setRemoteStream(remoteStream);
                // Set video element immediately
                if (remoteVideoRef.current) {
                    console.log('📺 CALLER: Setting srcObject on video element');
                    remoteVideoRef.current.srcObject = remoteStream;
                    // Force play attempt
                    setTimeout(() => {
                        if (remoteVideoRef.current) {
                            console.log('📺 CALLER: Attempting to play video');
                            remoteVideoRef.current.play().then(() => {
                                console.log('📺 CALLER: Video play successful');
                            }).catch(err => {
                                console.error('📺 CALLER: Error playing remote video:', err);
                            });
                        }
                    }, 100);
                }
            };
            // Handle ICE candidates
            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    console.log('🧊 CALLER: Sending ICE candidate');
                    console.log('🧊 CALLER: Candidate details:', {
                        type: event.candidate.type,
                        protocol: event.candidate.protocol,
                        address: event.candidate.address,
                        port: event.candidate.port,
                        candidate: event.candidate.candidate?.substring(0, 50) + '...',
                        foundation: event.candidate.foundation,
                        component: event.candidate.component,
                        priority: event.candidate.priority,
                        relatedAddress: event.candidate.relatedAddress,
                        relatedPort: event.candidate.relatedPort
                    });
                    console.log('🧊 CALLER: Socket connected:', socketRef.current?.connected);
                    if (socketRef.current?.connected) {
                        socketRef.current.emit('ice-candidate', {
                            candidate: {
                                candidate: event.candidate.candidate,
                                sdpMLineIndex: event.candidate.sdpMLineIndex,
                                sdpMid: event.candidate.sdpMid,
                                usernameFragment: event.candidate.usernameFragment
                            },
                            roomId
                        });
                        console.log('🧊 CALLER: ICE candidate sent successfully');
                    }
                    else {
                        console.error('🧊 CALLER: Socket not connected, cannot send ICE candidate');
                    }
                }
                else {
                    console.log('🧊 CALLER: ICE gathering completed (null candidate)');
                }
            };
            // Handle connection state changes
            peerConnection.onconnectionstatechange = () => {
                console.log('🔗 CALLER: Connection state:', peerConnection.connectionState);
                if (peerConnection.connectionState === 'connected') {
                    setConnectionStatus('Connected!');
                }
                else if (peerConnection.connectionState === 'failed') {
                    setConnectionStatus('Connection failed');
                }
            };
            // Add ICE connection state debugging
            peerConnection.oniceconnectionstatechange = () => {
                console.log('🧊 CALLER: ICE connection state:', peerConnection.iceConnectionState);
                // Add debugging for connection states
                if (peerConnection.iceConnectionState === 'connected') {
                    console.log('🎉 CALLER: ICE connection established successfully!');
                    // Check if we have senders (our outgoing media)
                    const senders = peerConnection.getSenders();
                    console.log('📤 CALLER: Outgoing senders:', senders.map(s => ({
                        track: s.track ? s.track.kind : 'no track',
                        enabled: s.track ? s.track.enabled : false
                    })));
                    // Check if we have receivers (incoming media)
                    const receivers = peerConnection.getReceivers();
                    console.log('📥 CALLER: Incoming receivers:', receivers.map(r => ({
                        track: r.track ? r.track.kind : 'no track',
                        enabled: r.track ? r.track.enabled : false
                    })));
                }
                else if (peerConnection.iceConnectionState === 'failed') {
                    console.log('❌ CALLER: ICE connection failed, attempting restart...');
                    // Try to restart ICE
                    peerConnection.restartIce();
                }
                else if (peerConnection.iceConnectionState === 'disconnected') {
                    console.log('⚠️ CALLER: ICE connection disconnected, monitoring for recovery...');
                    // Give it some time to reconnect before restarting
                    setTimeout(() => {
                        if (peerConnection.iceConnectionState === 'disconnected' ||
                            peerConnection.iceConnectionState === 'failed') {
                            console.log('🔄 CALLER: Attempting ICE restart after timeout...');
                            peerConnection.restartIce();
                        }
                    }, 5000);
                }
            };
            peerConnection.onicegatheringstatechange = () => {
                console.log('🧊 CALLER: ICE gathering state:', peerConnection.iceGatheringState);
            };
            // Create and send offer
            console.log('📤 CALLER: Creating offer...');
            const offer = await peerConnection.createOffer();
            console.log('📤 CALLER: Offer SDP includes media:', {
                hasVideo: offer.sdp?.includes('m=video'),
                hasAudio: offer.sdp?.includes('m=audio'),
                senders: peerConnection.getSenders().length,
                sendersWithTracks: peerConnection.getSenders().filter(s => s.track).length
            });
            await peerConnection.setLocalDescription(offer);
            console.log('📤 CALLER: Sending offer to room:', roomId);
            console.log('📤 CALLER: Socket connected:', socketRef.current?.connected);
            console.log('📤 CALLER: Offer details:', { type: offer.type, sdp: offer.sdp?.substring(0, 100) + '...' });
            if (socketRef.current?.connected) {
                socketRef.current.emit('offer', { offer, roomId });
                console.log('📤 CALLER: Offer sent successfully');
            }
            else {
                console.error('📤 CALLER: Socket not connected, cannot send offer');
            }
        }
        catch (error) {
            console.error('❌ Error creating peer connection (CALLER):', error);
        }
    };
    // Handle incoming offer
    const handleOffer = async (offer, roomId) => {
        try {
            console.log('📨 ANSWERER: Handling offer for room:', roomId);
            console.log('📨 ANSWERER: Current room ID:', currentRoomId);
            // Set mode to in-call if not already
            if (mode !== 'in-call') {
                console.log('📨 ANSWERER: Setting mode to in-call');
                setMode('in-call');
                setCurrentRoomId(roomId);
            }
            // Create peer connection SYNCHRONOUSLY if not exists
            let peerConnection = peerConnectionRef.current;
            if (!peerConnection) {
                console.log('📨 ANSWERER: Creating peer connection synchronously');
                // Create peer connection immediately (synchronously)
                peerConnection = new RTCPeerConnection(configuration);
                peerConnectionRef.current = peerConnection;
                // Set up all event handlers immediately
                peerConnection.ontrack = (event) => {
                    console.log('� ANSWERER: Received remote stream tracks:', event.track.kind);
                    console.log('📺 ANSWERER: Track details:', {
                        kind: event.track.kind,
                        enabled: event.track.enabled,
                        muted: event.track.muted,
                        readyState: event.track.readyState,
                        id: event.track.id
                    });
                    const [remoteStream] = event.streams;
                    console.log('📺 ANSWERER: Remote stream details:', {
                        id: remoteStream.id,
                        active: remoteStream.active,
                        tracks: remoteStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState }))
                    });
                    setRemoteStream(remoteStream);
                    // Set video element immediately
                    if (remoteVideoRef.current) {
                        console.log('📺 ANSWERER: Setting srcObject on video element');
                        remoteVideoRef.current.srcObject = remoteStream;
                        // Force play attempt
                        setTimeout(() => {
                            if (remoteVideoRef.current) {
                                console.log('📺 ANSWERER: Attempting to play video');
                                remoteVideoRef.current.play().then(() => {
                                    console.log('📺 ANSWERER: Video play successful');
                                }).catch(err => {
                                    console.error('📺 ANSWERER: Error playing remote video:', err);
                                });
                            }
                        }, 100);
                    }
                }; // Handle ICE candidates
                peerConnection.onicecandidate = (event) => {
                    if (event.candidate) {
                        console.log('🧊 ANSWERER: Sending ICE candidate');
                        console.log('🧊 ANSWERER: Candidate details:', {
                            type: event.candidate.type,
                            protocol: event.candidate.protocol,
                            address: event.candidate.address,
                            port: event.candidate.port,
                            candidate: event.candidate.candidate?.substring(0, 50) + '...',
                            foundation: event.candidate.foundation,
                            component: event.candidate.component,
                            priority: event.candidate.priority,
                            relatedAddress: event.candidate.relatedAddress,
                            relatedPort: event.candidate.relatedPort
                        });
                        if (socketRef.current?.connected) {
                            socketRef.current.emit('ice-candidate', {
                                candidate: event.candidate,
                                roomId
                            });
                            console.log('🧊 ANSWERER: ICE candidate sent successfully');
                        }
                        else {
                            console.error('🧊 ANSWERER: Socket not connected, cannot send ICE candidate');
                        }
                    }
                    else {
                        console.log('🧊 ANSWERER: ICE gathering completed (null candidate)');
                    }
                };
                // Handle connection state changes
                peerConnection.onconnectionstatechange = () => {
                    if (peerConnection) {
                        console.log('🔗 ANSWERER: Connection state:', peerConnection.connectionState);
                        if (peerConnection.connectionState === 'connected') {
                            setConnectionStatus('Connected!');
                        }
                        else if (peerConnection.connectionState === 'failed') {
                            setConnectionStatus('Connection failed');
                        }
                    }
                };
                // Add ICE connection state debugging
                peerConnection.oniceconnectionstatechange = () => {
                    if (peerConnection) {
                        console.log('🧊 ANSWERER: ICE connection state:', peerConnection.iceConnectionState);
                        if (peerConnection.iceConnectionState === 'connected') {
                            console.log('🎉 ANSWERER: ICE connection established successfully!');
                        }
                        else if (peerConnection.iceConnectionState === 'failed') {
                            console.log('❌ ANSWERER: ICE connection failed, attempting restart...');
                            peerConnection.restartIce();
                        }
                        else if (peerConnection.iceConnectionState === 'disconnected') {
                            console.log('⚠️ ANSWERER: ICE connection disconnected, monitoring for recovery...');
                            setTimeout(() => {
                                if (peerConnection && (peerConnection.iceConnectionState === 'disconnected' ||
                                    peerConnection.iceConnectionState === 'failed')) {
                                    console.log('🔄 ANSWERER: Attempting ICE restart after timeout...');
                                    peerConnection.restartIce();
                                }
                            }, 5000);
                        }
                    }
                };
                peerConnection.onicegatheringstatechange = () => {
                    if (peerConnection) {
                        console.log('🧊 ANSWERER: ICE gathering state:', peerConnection.iceGatheringState);
                    }
                };
                console.log('✅ ANSWERER: Peer connection created synchronously');
                // Try to get local media AFTER peer connection is ready (but don't wait for it)
                (async () => {
                    let currentLocalStream = localStream;
                    console.log('📺 ANSWERER: Current local stream:', currentLocalStream ? 'available' : 'not available');
                    if (!currentLocalStream) {
                        console.log('⚠️ No local stream, trying to start local video...');
                        currentLocalStream = await startLocalVideo(false); // Optional media
                        console.log('📺 ANSWERER: After startLocalVideo:', currentLocalStream ? 'available' : 'failed');
                    }
                    // Add local stream tracks if available
                    if (currentLocalStream && peerConnection && peerConnection.signalingState !== 'closed') {
                        console.log('📤 Adding local stream tracks to peer connection (ANSWERER)');
                        console.log('📤 Available tracks:', currentLocalStream.getTracks().map(t => `${t.kind}:${t.enabled}`));
                        currentLocalStream.getTracks().forEach(track => {
                            console.log('📤 Adding track:', track.kind, 'enabled:', track.enabled);
                            if (peerConnection) {
                                peerConnection.addTrack(track, currentLocalStream);
                            }
                        });
                        // Update local stream state if we just got it
                        if (currentLocalStream !== localStream) {
                            console.log('📺 ANSWERER: Updating local stream state');
                            setLocalStream(currentLocalStream);
                        }
                    }
                    else if (!currentLocalStream) {
                        console.log('📺 ANSWERER: No local media - joining as viewer only');
                    }
                })();
            }
            console.log('📨 ANSWERER: Setting remote description (offer)');
            await peerConnection.setRemoteDescription(offer);
            // Process any queued ICE candidates after a short delay
            setTimeout(async () => {
                await processQueuedIceCandidates();
            }, 100);
            console.log('📨 ANSWERER: Creating answer');
            const answer = await peerConnection.createAnswer();
            console.log('📨 ANSWERER: Answer SDP includes media:', {
                hasVideo: answer.sdp?.includes('m=video'),
                hasAudio: answer.sdp?.includes('m=audio'),
                senders: peerConnection.getSenders().length,
                sendersWithTracks: peerConnection.getSenders().filter(s => s.track).length
            });
            await peerConnection.setLocalDescription(answer);
            console.log('📤 ANSWERER: Sending answer to room:', roomId);
            console.log('📤 ANSWERER: Socket connected:', socketRef.current?.connected);
            console.log('📤 ANSWERER: Answer details:', { type: answer.type, sdp: answer.sdp?.substring(0, 100) + '...' });
            if (socketRef.current?.connected) {
                socketRef.current.emit('answer', { answer, roomId });
                console.log('📤 ANSWERER: Answer sent successfully');
            }
            else {
                console.error('📤 ANSWERER: Socket not connected, cannot send answer');
            }
        }
        catch (error) {
            console.error('❌ Error handling offer:', error);
        }
    };
    // Handle incoming answer
    const handleAnswer = async (answer, roomId) => {
        try {
            console.log('📨 CALLER: Handling answer for room:', roomId);
            console.log('📨 CALLER: Current room ID:', currentRoomId);
            const peerConnection = peerConnectionRef.current;
            if (!peerConnection) {
                console.error('❌ CALLER: No peer connection available');
                return;
            }
            // Check if we're in the right room
            if (currentRoomId && roomId !== currentRoomId) {
                console.warn('📨 CALLER: Answer for different room, ignoring');
                return;
            }
            console.log('📨 CALLER: Setting remote description (answer)');
            await peerConnection.setRemoteDescription(answer);
            // Process any queued ICE candidates after a short delay
            setTimeout(async () => {
                await processQueuedIceCandidates();
            }, 100);
            console.log('✅ CALLER: Remote description set successfully');
        }
        catch (error) {
            console.error('❌ Error handling answer:', error);
        }
    };
    // Handle incoming ICE candidate
    const handleIceCandidate = async (candidate, roomId) => {
        try {
            console.log('🧊 Processing ICE candidate for room:', roomId);
            console.log('🧊 Current room ID:', currentRoomId);
            console.log('🧊 Candidate details:', {
                candidate: candidate.candidate,
                sdpMLineIndex: candidate.sdpMLineIndex,
                sdpMid: candidate.sdpMid,
                usernameFragment: candidate.usernameFragment
            });
            const peerConnection = peerConnectionRef.current;
            if (!peerConnection) {
                console.error('🧊 No peer connection available for ICE candidate');
                return;
            }
            // Check if we're in the right room
            if (currentRoomId && roomId !== currentRoomId) {
                console.warn('🧊 ICE candidate for different room, ignoring');
                return;
            }
            // Check connection state
            console.log('🧊 Connection state:', peerConnection.connectionState);
            console.log('🧊 ICE connection state:', peerConnection.iceConnectionState);
            console.log('🧊 Remote description set:', !!peerConnection.remoteDescription);
            console.log('🧊 Local description set:', !!peerConnection.localDescription);
            // Check if remote description is set
            if (!peerConnection.remoteDescription) {
                console.log('🧊 Remote description not set yet, queuing ICE candidate');
                iceCandidatesQueue.current.push(candidate);
                return;
            }
            // Validate candidate before adding
            if (!candidate.candidate || candidate.candidate.trim() === '') {
                console.log('🧊 Empty or invalid candidate, skipping');
                return;
            }
            // Check if connection is closed
            if (peerConnection.connectionState === 'closed') {
                console.warn('🧊 Connection is closed, not adding ICE candidate');
                return;
            }
            console.log('🧊 Adding ICE candidate to peer connection');
            await peerConnection.addIceCandidate(candidate);
            console.log('✅ ICE candidate added successfully');
        }
        catch (error) {
            console.error('❌ Error handling ICE candidate:', error);
            console.error('❌ Candidate that failed:', candidate);
            // Don't throw the error, just log it to prevent breaking the call
            // Some ICE candidates might fail but the connection can still work
        }
    };
    // Process queued ICE candidates
    const processQueuedIceCandidates = async () => {
        const peerConnection = peerConnectionRef.current;
        if (!peerConnection || !peerConnection.remoteDescription) {
            console.log('🧊 Cannot process queued candidates: no peer connection or remote description');
            return;
        }
        console.log('🧊 Processing queued ICE candidates:', iceCandidatesQueue.current.length);
        const candidates = [...iceCandidatesQueue.current]; // Make a copy
        iceCandidatesQueue.current = []; // Clear the queue
        for (const candidate of candidates) {
            try {
                // Validate candidate
                if (!candidate.candidate || candidate.candidate.trim() === '') {
                    console.log('🧊 Skipping empty queued candidate');
                    continue;
                }
                // Check if connection is still valid
                if (peerConnection.connectionState === 'closed') {
                    console.warn('🧊 Connection closed, stopping candidate processing');
                    break;
                }
                console.log('🧊 Processing queued candidate:', {
                    candidate: candidate.candidate.substring(0, 50) + '...',
                    sdpMLineIndex: candidate.sdpMLineIndex
                });
                await peerConnection.addIceCandidate(candidate);
                console.log('✅ Queued ICE candidate added successfully');
            }
            catch (error) {
                console.error('❌ Error adding queued ICE candidate:', error);
                console.error('❌ Failed candidate:', candidate);
                // Continue processing other candidates
            }
        }
        console.log('🧊 Finished processing queued ICE candidates');
    };
    // Start call with selected user
    const startCall = async () => {
        if (!selectedUser)
            return;
        console.log('📞 Starting call with:', selectedUser.name);
        // Try to start local media if not already started (optional)
        if (!localStream) {
            await startLocalVideo(false);
        }
        socketRef.current?.emit('start-call', { targetUserId: selectedUser.id });
    };
    // Accept incoming call
    const acceptCall = async () => {
        if (!incomingCall)
            return;
        console.log('✅ Accepting call from:', incomingCall.caller.name);
        // Try to start local media if not already started (optional)
        if (!localStream) {
            await startLocalVideo(false);
        }
        socketRef.current?.emit('accept-call', { callId: incomingCall.callId });
    };
    // Reject incoming call
    const rejectCall = () => {
        if (!incomingCall)
            return;
        console.log('❌ Rejecting call from:', incomingCall.caller.name);
        socketRef.current?.emit('reject-call', { callId: incomingCall.callId });
        setIncomingCall(null);
    };
    // End current call
    const endCall = () => {
        console.log('📴 Ending call');
        if (currentRoomId) {
            socketRef.current?.emit('end-call', { roomId: currentRoomId });
        }
        // Clean up peer connection
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
        // Clear ICE candidates queue
        iceCandidatesQueue.current = [];
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
    // Update video elements when streams change
    (0, react_1.useEffect)(() => {
        if (localStream) {
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = localStream;
                console.log('📺 Local video element updated in call');
            }
            if (localPreviewRef.current) {
                localPreviewRef.current.srcObject = localStream;
                console.log('📺 Local preview element updated');
            }
        }
    }, [localStream]);
    (0, react_1.useEffect)(() => {
        console.log('📺 useEffect: remoteStream changed:', remoteStream ? 'has stream' : 'no stream');
        if (remoteStream && remoteVideoRef.current) {
            console.log('📺 useEffect: Setting remote video srcObject');
            const video = remoteVideoRef.current;
            video.srcObject = remoteStream;
            // Force play the video
            video.play().then(() => {
                console.log('📺 useEffect: Remote video play successful');
            }).catch(err => {
                console.error('📺 useEffect: Error playing remote video:', err);
            });
        }
        else if (!remoteStream && remoteVideoRef.current) {
            console.log('📺 useEffect: Clearing remote video srcObject');
            remoteVideoRef.current.srcObject = null;
        }
    }, [remoteStream]);
    // Cleanup on unmount
    (0, react_1.useEffect)(() => {
        return () => {
            // Only cleanup on actual unmount, not on re-renders
            if (socketRef.current) {
                console.log('Component unmounting, cleaning up socket...');
                socketRef.current.disconnect();
                socketRef.current = null;
            }
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
    }, []); // Empty dependency array - only run on mount/unmount
    // Render functions
    const renderConnectScreen = () => ((0, jsx_runtime_1.jsx)("div", { className: "flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8", children: (0, jsx_runtime_1.jsxs)("div", { className: "bg-slate-800/50 backdrop-blur-lg rounded-xl p-8 w-full max-w-md border border-slate-700/50", children: [(0, jsx_runtime_1.jsxs)("div", { className: "text-center mb-8", children: [(0, jsx_runtime_1.jsx)(react_fontawesome_1.FontAwesomeIcon, { icon: free_solid_svg_icons_1.faServer, className: "text-4xl text-blue-400 mb-4" }), (0, jsx_runtime_1.jsx)("h1", { className: "text-2xl font-bold mb-2", children: "P2P Video Call" }), (0, jsx_runtime_1.jsx)("p", { className: "text-slate-300", children: "Connect to a signaling server to start" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-sm font-medium mb-2", children: "Your Name" }), (0, jsx_runtime_1.jsx)("input", { type: "text", value: userName, onChange: (e) => setUserName(e.target.value), className: "w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-400 focus:outline-none", placeholder: "Enter your name" })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-sm font-medium mb-2", children: "Server URL" }), (0, jsx_runtime_1.jsx)("input", { type: "text", value: signalingServerURL, onChange: (e) => setSignalingServerURL(e.target.value), className: "w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-400 focus:outline-none", placeholder: "localhost:3001" })] }), (0, jsx_runtime_1.jsx)("button", { onClick: connectToServer, disabled: !userName.trim() || !signalingServerURL.trim(), className: "w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors", children: "Connect to Server" }), connectionStatus && ((0, jsx_runtime_1.jsx)("div", { className: "text-center text-sm text-slate-300 mt-4", children: connectionStatus }))] })] }) }));
    const renderLobby = () => ((0, jsx_runtime_1.jsxs)("div", { className: "flex min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white", children: [(0, jsx_runtime_1.jsxs)("div", { className: "w-1/3 bg-slate-800/30 backdrop-blur-lg border-r border-slate-700/50 p-6", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-6", children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-xl font-bold mb-2", children: "Connected Users" }), (0, jsx_runtime_1.jsxs)("p", { className: "text-slate-300 text-sm", children: ["Welcome, ", userName, "!"] })] }), (0, jsx_runtime_1.jsx)("div", { className: "space-y-3", children: userList.length === 0 ? ((0, jsx_runtime_1.jsxs)("div", { className: "text-center text-slate-400 py-8", children: [(0, jsx_runtime_1.jsx)(react_fontawesome_1.FontAwesomeIcon, { icon: free_solid_svg_icons_1.faUser, className: "text-2xl mb-2" }), (0, jsx_runtime_1.jsx)("p", { children: "No other users connected" })] })) : (userList.map((user) => ((0, jsx_runtime_1.jsx)("div", { onClick: () => setSelectedUser(user), className: `p-4 rounded-lg cursor-pointer transition-all ${selectedUser?.id === user.id
                                ? 'bg-blue-600/20 border-blue-400 border'
                                : 'bg-slate-700/50 hover:bg-slate-700/70 border border-slate-600'}`, children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center space-x-3", children: [(0, jsx_runtime_1.jsx)(react_fontawesome_1.FontAwesomeIcon, { icon: free_solid_svg_icons_1.faUser, className: "text-slate-300" }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "font-medium", children: user.name }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm text-slate-400 capitalize", children: user.status })] })] }), user.status === 'available' && ((0, jsx_runtime_1.jsx)("div", { className: "w-3 h-3 bg-green-400 rounded-full" }))] }) }, user.id)))) }), selectedUser && selectedUser.status === 'available' && ((0, jsx_runtime_1.jsx)("div", { className: "mt-6", children: (0, jsx_runtime_1.jsxs)("button", { onClick: startCall, className: "w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2", children: [(0, jsx_runtime_1.jsx)(react_fontawesome_1.FontAwesomeIcon, { icon: free_solid_svg_icons_1.faPhone }), (0, jsx_runtime_1.jsxs)("span", { children: ["Call ", selectedUser.name] })] }) }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex-1 p-6", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-6", children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-xl font-bold mb-2", children: "Device Preview" }), (0, jsx_runtime_1.jsx)("p", { className: "text-slate-300 text-sm", children: "Test your camera and microphone" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "bg-slate-800/30 backdrop-blur-lg rounded-xl p-6 border border-slate-700/50", children: [(0, jsx_runtime_1.jsx)("div", { className: "aspect-video bg-slate-900/50 rounded-lg overflow-hidden mb-4 relative", children: localStream ? ((0, jsx_runtime_1.jsx)("video", { ref: localPreviewRef, autoPlay: true, muted: true, className: "w-full h-full object-cover" })) : ((0, jsx_runtime_1.jsx)("div", { className: "w-full h-full flex items-center justify-center text-slate-400", children: (0, jsx_runtime_1.jsxs)("div", { className: "text-center", children: [(0, jsx_runtime_1.jsx)(react_fontawesome_1.FontAwesomeIcon, { icon: free_solid_svg_icons_1.faVideoSlash, className: "text-4xl mb-2" }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm", children: "No camera access" }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs", children: "You can still join calls as a viewer" })] }) })) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-center space-x-4", children: [(0, jsx_runtime_1.jsx)("button", { onClick: toggleMicrophone, disabled: !localStream, className: `p-3 rounded-full transition-colors ${!localStream
                                            ? 'bg-slate-600 cursor-not-allowed opacity-50'
                                            : isMicMuted
                                                ? 'bg-red-600 hover:bg-red-700'
                                                : 'bg-slate-700 hover:bg-slate-600'}`, title: !localStream ? 'No microphone available' : '', children: (0, jsx_runtime_1.jsx)(react_fontawesome_1.FontAwesomeIcon, { icon: isMicMuted ? free_solid_svg_icons_1.faMicrophoneSlash : free_solid_svg_icons_1.faMicrophone }) }), (0, jsx_runtime_1.jsx)("button", { onClick: toggleCamera, disabled: !localStream, className: `p-3 rounded-full transition-colors ${!localStream
                                            ? 'bg-slate-600 cursor-not-allowed opacity-50'
                                            : isCameraOff
                                                ? 'bg-red-600 hover:bg-red-700'
                                                : 'bg-slate-700 hover:bg-slate-600'}`, title: !localStream ? 'No camera available' : '', children: (0, jsx_runtime_1.jsx)(react_fontawesome_1.FontAwesomeIcon, { icon: isCameraOff ? free_solid_svg_icons_1.faVideoSlash : free_solid_svg_icons_1.faVideo }) }), !localStream && ((0, jsx_runtime_1.jsx)("button", { onClick: () => startLocalVideo(false), className: "p-3 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors", title: "Try to enable camera/microphone", children: (0, jsx_runtime_1.jsx)(react_fontawesome_1.FontAwesomeIcon, { icon: free_solid_svg_icons_1.faCog }) }))] })] })] })] }));
    const renderCalling = () => ((0, jsx_runtime_1.jsx)("div", { className: "flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white", children: (0, jsx_runtime_1.jsxs)("div", { className: "bg-slate-800/50 backdrop-blur-lg rounded-xl p-8 text-center border border-slate-700/50", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-6", children: [(0, jsx_runtime_1.jsx)(react_fontawesome_1.FontAwesomeIcon, { icon: free_solid_svg_icons_1.faPhone, className: "text-4xl text-blue-400 mb-4 animate-pulse" }), (0, jsx_runtime_1.jsx)("h2", { className: "text-2xl font-bold mb-2", children: "Calling..." }), (0, jsx_runtime_1.jsx)("p", { className: "text-slate-300", children: selectedUser?.name })] }), (0, jsx_runtime_1.jsxs)("button", { onClick: endCall, className: "bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2 mx-auto", children: [(0, jsx_runtime_1.jsx)(react_fontawesome_1.FontAwesomeIcon, { icon: free_solid_svg_icons_1.faPhoneSlash }), (0, jsx_runtime_1.jsx)("span", { children: "Cancel Call" })] })] }) }));
    const renderInCall = () => ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col min-h-screen bg-slate-900 text-white", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex-1 relative flex items-center justify-center", children: [(0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsx)("video", { ref: remoteVideoRef, autoPlay: true, playsInline: true, controls: false, className: `bg-slate-800 ${isFullscreen
                                    ? 'w-screen h-screen object-cover'
                                    : 'max-h-[75vh] max-w-full object-contain'}`, onLoadedMetadata: () => console.log('📺 Video metadata loaded'), onCanPlay: () => console.log('📺 Video can play'), onPlay: () => console.log('📺 Video started playing'), onError: (e) => console.error('📺 Video error:', e) }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setIsFullscreen(!isFullscreen), className: "absolute top-4 left-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-lg transition-colors", children: (0, jsx_runtime_1.jsx)(react_fontawesome_1.FontAwesomeIcon, { icon: isFullscreen ? free_solid_svg_icons_1.faCompress : free_solid_svg_icons_1.faExpand, className: "text-lg" }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "absolute bottom-4 left-4 bg-black/70 text-white p-2 rounded text-sm", children: [(0, jsx_runtime_1.jsxs)("div", { children: ["Remote Stream: ", remoteStream ? 'Active' : 'None'] }), remoteStream && ((0, jsx_runtime_1.jsxs)("div", { children: ["Tracks: ", remoteStream.getTracks().map(t => `${t.kind}:${t.enabled ? 'on' : 'off'}`).join(', ')] }))] }), showLocalVideo && localStream && !isFullscreen && ((0, jsx_runtime_1.jsx)("div", { className: "absolute top-4 right-4 w-64 h-48 bg-slate-800 rounded-lg overflow-hidden border-2 border-slate-700", children: (0, jsx_runtime_1.jsx)("video", { ref: localVideoRef, autoPlay: true, muted: true, className: "w-full h-full object-cover" }) })), !localStream && !isFullscreen && ((0, jsx_runtime_1.jsx)("div", { className: "absolute top-4 right-4 bg-slate-800/90 backdrop-blur-lg rounded-lg p-3 border border-slate-700", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center space-x-2 text-slate-300", children: [(0, jsx_runtime_1.jsx)(react_fontawesome_1.FontAwesomeIcon, { icon: free_solid_svg_icons_1.faUser, className: "text-blue-400" }), (0, jsx_runtime_1.jsx)("span", { className: "text-sm", children: "Viewer Mode" })] }) }))] }), isFullscreen ? ((0, jsx_runtime_1.jsxs)("div", { className: "fixed bottom-0 left-0 right-0 z-50 group", children: [(0, jsx_runtime_1.jsx)("div", { className: "h-24 w-full" }), (0, jsx_runtime_1.jsxs)("div", { className: "bg-slate-800/90 backdrop-blur-lg p-6 flex items-center justify-center space-x-6 transition-all duration-300 opacity-0 group-hover:opacity-100 translate-y-full group-hover:translate-y-0", children: [(0, jsx_runtime_1.jsx)("button", { onClick: toggleMicrophone, disabled: !localStream, className: `p-4 rounded-full transition-colors ${!localStream
                                    ? 'bg-slate-600 cursor-not-allowed opacity-50'
                                    : isMicMuted
                                        ? 'bg-red-600 hover:bg-red-700'
                                        : 'bg-slate-700 hover:bg-slate-600'}`, title: !localStream ? 'No microphone available' : '', children: (0, jsx_runtime_1.jsx)(react_fontawesome_1.FontAwesomeIcon, { icon: isMicMuted ? free_solid_svg_icons_1.faMicrophoneSlash : free_solid_svg_icons_1.faMicrophone, className: "text-xl" }) }), (0, jsx_runtime_1.jsx)("button", { onClick: toggleCamera, disabled: !localStream, className: `p-4 rounded-full transition-colors ${!localStream
                                    ? 'bg-slate-600 cursor-not-allowed opacity-50'
                                    : isCameraOff
                                        ? 'bg-red-600 hover:bg-red-700'
                                        : 'bg-slate-700 hover:bg-slate-600'}`, title: !localStream ? 'No camera available' : '', children: (0, jsx_runtime_1.jsx)(react_fontawesome_1.FontAwesomeIcon, { icon: isCameraOff ? free_solid_svg_icons_1.faVideoSlash : free_solid_svg_icons_1.faVideo, className: "text-xl" }) }), (0, jsx_runtime_1.jsx)("button", { onClick: toggleSpeaker, className: `p-4 rounded-full transition-colors ${isSpeakerMuted
                                    ? 'bg-red-600 hover:bg-red-700'
                                    : 'bg-slate-700 hover:bg-slate-600'}`, children: (0, jsx_runtime_1.jsx)(react_fontawesome_1.FontAwesomeIcon, { icon: isSpeakerMuted ? free_solid_svg_icons_1.faVolumeXmark : free_solid_svg_icons_1.faVolumeUp, className: "text-xl" }) }), (0, jsx_runtime_1.jsxs)("button", { onClick: endCall, className: "bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2", children: [(0, jsx_runtime_1.jsx)(react_fontawesome_1.FontAwesomeIcon, { icon: free_solid_svg_icons_1.faPhoneSlash }), (0, jsx_runtime_1.jsx)("span", { children: "End Call" })] })] })] })) : ((0, jsx_runtime_1.jsxs)("div", { className: "bg-slate-800/90 backdrop-blur-lg p-6 flex items-center justify-center space-x-6", children: [(0, jsx_runtime_1.jsx)("button", { onClick: toggleMicrophone, disabled: !localStream, className: `p-4 rounded-full transition-colors ${!localStream
                            ? 'bg-slate-600 cursor-not-allowed opacity-50'
                            : isMicMuted
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-slate-700 hover:bg-slate-600'}`, title: !localStream ? 'No microphone available' : '', children: (0, jsx_runtime_1.jsx)(react_fontawesome_1.FontAwesomeIcon, { icon: isMicMuted ? free_solid_svg_icons_1.faMicrophoneSlash : free_solid_svg_icons_1.faMicrophone, className: "text-xl" }) }), (0, jsx_runtime_1.jsx)("button", { onClick: toggleCamera, disabled: !localStream, className: `p-4 rounded-full transition-colors ${!localStream
                            ? 'bg-slate-600 cursor-not-allowed opacity-50'
                            : isCameraOff
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-slate-700 hover:bg-slate-600'}`, title: !localStream ? 'No camera available' : '', children: (0, jsx_runtime_1.jsx)(react_fontawesome_1.FontAwesomeIcon, { icon: isCameraOff ? free_solid_svg_icons_1.faVideoSlash : free_solid_svg_icons_1.faVideo, className: "text-xl" }) }), (0, jsx_runtime_1.jsx)("button", { onClick: toggleSpeaker, className: `p-4 rounded-full transition-colors ${isSpeakerMuted
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-slate-700 hover:bg-slate-600'}`, children: (0, jsx_runtime_1.jsx)(react_fontawesome_1.FontAwesomeIcon, { icon: isSpeakerMuted ? free_solid_svg_icons_1.faVolumeXmark : free_solid_svg_icons_1.faVolumeUp, className: "text-xl" }) }), (0, jsx_runtime_1.jsxs)("button", { onClick: endCall, className: "bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2", children: [(0, jsx_runtime_1.jsx)(react_fontawesome_1.FontAwesomeIcon, { icon: free_solid_svg_icons_1.faPhoneSlash }), (0, jsx_runtime_1.jsx)("span", { children: "End Call" })] })] }))] }));
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
