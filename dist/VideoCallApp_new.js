"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const socket_io_client_1 = require("socket.io-client");
const VideoCallApp = () => {
    const [localStream, setLocalStream] = (0, react_1.useState)(null);
    const [remoteStream, setRemoteStream] = (0, react_1.useState)(null);
    const [isConnected, setIsConnected] = (0, react_1.useState)(false);
    const [targetIP, setTargetIP] = (0, react_1.useState)('');
    const [myIP, setMyIP] = (0, react_1.useState)('');
    const [signalingServerURL, setSignalingServerURL] = (0, react_1.useState)('http://localhost:3001');
    const [detectedIPs, setDetectedIPs] = (0, react_1.useState)({});
    const [isHosting, setIsHosting] = (0, react_1.useState)(false);
    const [mode, setMode] = (0, react_1.useState)('hosting'); // Start directly in hosting mode
    const [socket, setSocket] = (0, react_1.useState)(null);
    const [devicePermissions, setDevicePermissions] = (0, react_1.useState)({
        camera: false,
        microphone: false,
        hasCamera: true,
        hasMicrophone: true
    });
    const [mediaError, setMediaError] = (0, react_1.useState)('');
    const [connectionStatus, setConnectionStatus] = (0, react_1.useState)('');
    const [waitingUsers, setWaitingUsers] = (0, react_1.useState)([]);
    const [devicesTested, setDevicesTested] = (0, react_1.useState)(true); // Skip device testing by default
    const [pendingRequests, setPendingRequests] = (0, react_1.useState)([]);
    // Signaling server status
    const [signalingServerStatus, setSignalingServerStatus] = (0, react_1.useState)('starting');
    const [signalingServerError, setSignalingServerError] = (0, react_1.useState)('');
    // Media control states
    const [isMicMuted, setIsMicMuted] = (0, react_1.useState)(false);
    const [isCameraOff, setIsCameraOff] = (0, react_1.useState)(false);
    const [isSpeakerMuted, setIsSpeakerMuted] = (0, react_1.useState)(false);
    const [micVolume, setMicVolume] = (0, react_1.useState)(50);
    const [speakerVolume, setSpeakerVolume] = (0, react_1.useState)(50);
    // UI control states
    const [showLocalVideo, setShowLocalVideo] = (0, react_1.useState)(true);
    const [isFullscreen, setIsFullscreen] = (0, react_1.useState)(false);
    const [fullscreenVideo, setFullscreenVideo] = (0, react_1.useState)(null);
    // Device selection states
    const [availableDevices, setAvailableDevices] = (0, react_1.useState)({ cameras: [], microphones: [], speakers: [] });
    const [selectedDevices, setSelectedDevices] = (0, react_1.useState)({ camera: '', microphone: '', speaker: '' });
    const [showDeviceDropdowns, setShowDeviceDropdowns] = (0, react_1.useState)({ camera: false, microphone: false, speaker: false, quality: false });
    // Video quality settings
    const [selectedQuality, setSelectedQuality] = (0, react_1.useState)('1080p');
    const qualityOptions = [
        {
            label: '1080p HD',
            value: '1080p',
            width: 1920,
            height: 1080,
            description: 'Best quality (1920x1080)'
        },
        {
            label: '720p HD',
            value: '720p',
            width: 1280,
            height: 720,
            description: 'High quality (1280x720)'
        },
        {
            label: '480p',
            value: '480p',
            width: 854,
            height: 480,
            description: 'Standard quality (854x480)'
        },
        {
            label: '360p',
            value: '360p',
            width: 640,
            height: 360,
            description: 'Low quality (640x360)'
        }
    ];
    // Video refs
    const localVideoRef = (0, react_1.useRef)(null);
    const remoteVideoRef = (0, react_1.useRef)(null);
    const localPreviewRef = (0, react_1.useRef)(null);
    const localHostingRef = (0, react_1.useRef)(null);
    const peerConnectionRef = (0, react_1.useRef)(null);
    // WebRTC configuration
    const configuration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    };
    // Startup effects
    (0, react_1.useEffect)(() => {
        console.log('=== VideoCallApp MOUNTED ===');
        initializeApp();
        return () => {
            console.log('=== VideoCallApp UNMOUNTING ===');
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
            }
            socket?.disconnect();
        };
    }, []);
    const initializeApp = async () => {
        console.log('Initializing app...');
        // Start signaling server if we're in Electron
        if (window.electronAPI) {
            console.log('Electron environment detected, starting signaling server...');
            const serverStarted = await startSignalingServer();
            if (!serverStarted) {
                console.error('Failed to start signaling server');
            }
        }
        else {
            console.log('Browser environment, assuming signaling server is running...');
            setSignalingServerStatus('running');
        }
        // Get IP address
        await getMyIP();
        // Start local video
        await startLocalVideo();
        // Load devices
        await loadAvailableDevices();
    };
    const startSignalingServer = async () => {
        try {
            setSignalingServerStatus('starting');
            console.log('Starting signaling server...');
            const result = await window.electronAPI.startSignalingServer();
            console.log('Signaling server start result:', result);
            if (result && result.success) {
                console.log('✅ Signaling server started successfully');
                setSignalingServerStatus('running');
                return true;
            }
            else {
                console.error('❌ Failed to start signaling server:', result?.error);
                setSignalingServerStatus('error');
                setSignalingServerError(result?.error || 'Unknown error');
                return false;
            }
        }
        catch (error) {
            console.error('❌ Error starting signaling server:', error);
            setSignalingServerStatus('error');
            setSignalingServerError(error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    };
    const getMyIP = async () => {
        setMyIP('Loading...');
        const ips = {};
        try {
            // Try to get external IP (if not blocked)
            try {
                const response = await fetch('https://api.ipify.org?format=json', {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' }
                });
                const data = await response.json();
                if (data.ip) {
                    ips.external = data.ip;
                }
            }
            catch (e) {
                console.log('External IP detection failed:', e);
            }
            // Get local network IP using WebRTC
            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });
            pc.createDataChannel('');
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            const localIPPromise = new Promise((resolve) => {
                let resolved = false;
                pc.onicecandidate = (ice) => {
                    if (ice && ice.candidate && ice.candidate.candidate && !resolved) {
                        const candidate = ice.candidate.candidate;
                        const match = candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
                        if (match && !match[1].startsWith('127.') && !match[1].startsWith('169.254.')) {
                            resolved = true;
                            resolve(match[1]);
                            pc.close();
                        }
                    }
                };
                // Fallback after 3 seconds
                setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        resolve(null);
                        pc.close();
                    }
                }, 3000);
            });
            const localIP = await localIPPromise;
            if (localIP) {
                ips.local = localIP;
            }
            setDetectedIPs(ips);
            // PRIORITIZE EXTERNAL IP for hosting (enables cross-network calls)
            if (ips.external) {
                setMyIP(ips.external);
                setConnectionStatus(`Ready to host on external IP ${ips.external}. This allows calls from anywhere!`);
            }
            else if (ips.local) {
                setMyIP(ips.local);
                setConnectionStatus(`Ready to host on local network IP ${ips.local}. Only works for local network calls.`);
            }
            else {
                setMyIP('127.0.0.1'); // Fallback
                setConnectionStatus('Using fallback IP. May not work for remote calls.');
            }
        }
        catch (error) {
            console.error('Error getting IP:', error);
            setMyIP('192.168.1.100'); // Fallback to common local IP
        }
    };
    const createPeerConnection = () => {
        const peerConnection = new RTCPeerConnection(configuration);
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('Sending ICE candidate:', event.candidate.candidate);
                socket?.emit('ice-candidate', { candidate: event.candidate });
            }
        };
        peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE connection state:', peerConnection.iceConnectionState);
            if (peerConnection.iceConnectionState === 'connected') {
                setConnectionStatus('Media connection established!');
                // If we're still in waiting mode, transition to call mode
                if (mode === 'waiting') {
                    console.log('ICE connected while in waiting mode - transitioning to call');
                    setMode('call');
                }
            }
            else if (peerConnection.iceConnectionState === 'failed') {
                console.log('ICE connection failed, attempting to restart');
                try {
                    peerConnection.restartIce();
                }
                catch (error) {
                    console.error('Error restarting ICE:', error);
                }
            }
        };
        peerConnection.onconnectionstatechange = () => {
            console.log('Connection state:', peerConnection.connectionState);
            if (peerConnection.connectionState === 'connected') {
                setConnectionStatus('Connected successfully!');
            }
            else if (peerConnection.connectionState === 'failed') {
                setConnectionStatus('Connection failed');
            }
        };
        peerConnection.ontrack = (event) => {
            console.log('Received remote track:', event.track.kind, event.streams.length);
            if (event.streams && event.streams[0]) {
                console.log('Setting remote stream');
                setRemoteStream(event.streams[0]);
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = event.streams[0];
                }
            }
        };
        peerConnectionRef.current = peerConnection;
    };
    // Event handlers (using useCallback to prevent re-registration)
    const handleDirectCallRequest = (0, react_1.useCallback)((data) => {
        console.log('=== INCOMING CALL REQUEST ===');
        console.log('From IP:', data.fromIP);
        console.log('Current mode:', mode);
        console.log('Is hosting:', isHosting);
        if (mode === 'hosting' && isHosting) {
            console.log('Adding to waiting users...');
            const newUsers = [...waitingUsers, {
                    fromIP: data.fromIP,
                    joinTime: new Date(),
                    offer: data.offer
                }];
            setWaitingUsers(newUsers);
            console.log('Updated waiting users:', newUsers);
            console.log('Should show UI:', isHosting && newUsers.length > 0 && mode === 'hosting');
        }
        else {
            console.log('Not in hosting mode or not hosting, rejecting call');
            socket?.emit('direct-call-response', {
                toIP: data.fromIP,
                accepted: false
            });
        }
    }, [waitingUsers, mode, isHosting, socket]);
    const handleDirectCallAccepted = (0, react_1.useCallback)(() => {
        console.log('=== DIRECT CALL ACCEPTED RECEIVED ===');
        console.log('Current mode:', mode);
        console.log('LocalStream available:', !!localStream);
        setConnectionStatus('Call accepted! Starting connection...');
        // Force immediate transition to call mode
        setMode('call');
        setIsConnected(true);
        // Ensure local video is showing when call is accepted
        console.log('Call accepted, ensuring local video is visible');
        console.log('LocalStream available:', !!localStream);
        // Force update of local video element
        if (localStream && localVideoRef.current) {
            console.log('Manually setting local video stream after call accepted');
            localVideoRef.current.srcObject = localStream;
        }
        console.log('Mode set to call, forcing re-render');
        // Force a re-render by updating a state that triggers UI changes
        setTimeout(() => {
            setConnectionStatus('Connected! Call in progress...');
        }, 100);
    }, [localStream, mode]);
    const handleDirectCallRejected = (0, react_1.useCallback)(() => {
        console.log('Call rejected by remote peer');
        setConnectionStatus('Call was rejected');
        setMode('hosting');
        // Reset signaling server URL to localhost when returning to hosting
        setSignalingServerURL('http://localhost:3001');
        setTimeout(() => setConnectionStatus(''), 3000);
    }, []);
    const handleOffer = (0, react_1.useCallback)(async (offer) => {
        console.log('Received offer:', offer);
        if (!peerConnectionRef.current) {
            createPeerConnection();
        }
        try {
            await peerConnectionRef.current.setRemoteDescription(offer);
            console.log('Set remote description');
            // Add local stream tracks if available
            if (localStream) {
                const existingTracks = peerConnectionRef.current.getSenders().map(sender => sender.track);
                localStream.getTracks().forEach((track) => {
                    if (!existingTracks.includes(track)) {
                        console.log('Adding track to peer connection:', track.kind);
                        peerConnectionRef.current.addTrack(track, localStream);
                    }
                });
            }
            const answer = await peerConnectionRef.current.createAnswer();
            await peerConnectionRef.current.setLocalDescription(answer);
            console.log('Created answer');
            socket?.emit('answer', answer);
        }
        catch (error) {
            console.error('Error handling offer:', error);
        }
    }, [localStream, socket]);
    const handleAnswer = (0, react_1.useCallback)(async (answer) => {
        console.log('Received answer:', answer);
        if (peerConnectionRef.current) {
            try {
                await peerConnectionRef.current.setRemoteDescription(answer);
                console.log('Set remote description from answer');
            }
            catch (error) {
                console.error('Error setting remote description:', error);
            }
        }
    }, []);
    const handleIceCandidate = (0, react_1.useCallback)(async (data) => {
        console.log('Received ICE candidate:', data.candidate.candidate);
        if (peerConnectionRef.current && data.candidate) {
            try {
                await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
                console.log('Added ICE candidate');
            }
            catch (error) {
                console.error('Error adding ICE candidate:', error);
            }
        }
    }, []);
    // Socket connection management
    (0, react_1.useEffect)(() => {
        console.log('Setting up socket connection to:', signalingServerURL);
        const socketInstance = (0, socket_io_client_1.io)(signalingServerURL, {
            transports: ['websocket', 'polling'],
            timeout: 10000,
            autoConnect: true
        });
        socketInstance.on('connect', () => {
            console.log('✅ Connected to signaling server at:', signalingServerURL);
            setIsConnected(true);
        });
        socketInstance.on('disconnect', () => {
            console.log('❌ Disconnected from signaling server');
            setIsConnected(false);
        });
        socketInstance.on('connect_error', (error) => {
            console.error('❌ Socket connection error:', error);
            setIsConnected(false);
        });
        setSocket(socketInstance);
        // Click outside handler for dropdowns
        const handleClickOutside = (event) => {
            setShowDeviceDropdowns({ camera: false, microphone: false, speaker: false, quality: false });
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            console.log('Cleaning up socket connection...');
            socketInstance.disconnect();
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [signalingServerURL]);
    // Register event handlers whenever the handlers or socket changes
    (0, react_1.useEffect)(() => {
        if (!socket)
            return;
        console.log('Registering/updating socket event handlers...');
        // Remove old listeners first
        socket.off('direct-call-request');
        socket.off('direct-call-accepted');
        socket.off('direct-call-rejected');
        socket.off('offer');
        socket.off('answer');
        socket.off('ice-candidate');
        // Add new listeners
        socket.on('direct-call-request', handleDirectCallRequest);
        socket.on('direct-call-accepted', (data) => {
            console.log('🎉 RAW direct-call-accepted event received!', data);
            handleDirectCallAccepted();
        });
        socket.on('direct-call-rejected', handleDirectCallRejected);
        socket.on('offer', handleOffer);
        socket.on('answer', handleAnswer);
        socket.on('ice-candidate', handleIceCandidate);
        console.log('Socket event handlers registered/updated');
        return () => {
            socket.off('direct-call-request', handleDirectCallRequest);
            socket.off('direct-call-accepted', handleDirectCallAccepted);
            socket.off('direct-call-rejected', handleDirectCallRejected);
            socket.off('offer', handleOffer);
            socket.off('answer', handleAnswer);
            socket.off('ice-candidate', handleIceCandidate);
        };
    }, [socket, handleDirectCallRequest, handleDirectCallAccepted, handleDirectCallRejected, handleOffer, handleAnswer, handleIceCandidate]);
    // Rest of functions (shortened for brevity - would include all media functions, device loading, etc.)
    const startLocalVideo = async () => {
        try {
            console.log('Starting local video...');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720 },
                audio: true
            });
            setLocalStream(stream);
            // Update all video elements
            if (localVideoRef.current)
                localVideoRef.current.srcObject = stream;
            if (localPreviewRef.current)
                localPreviewRef.current.srcObject = stream;
            if (localHostingRef.current)
                localHostingRef.current.srcObject = stream;
            console.log('✅ Local video started');
        }
        catch (error) {
            console.error('❌ Error starting local video:', error);
            setMediaError('Camera/microphone access denied');
        }
    };
    const loadAvailableDevices = async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            setAvailableDevices({
                cameras: devices.filter(device => device.kind === 'videoinput'),
                microphones: devices.filter(device => device.kind === 'audioinput'),
                speakers: devices.filter(device => device.kind === 'audiooutput')
            });
        }
        catch (error) {
            console.error('Error loading devices:', error);
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
    const updateMicVolume = (volume) => {
        setMicVolume(volume);
        // Note: Actual volume control would require more complex audio processing
    };
    const updateSpeakerVolume = (volume) => {
        setSpeakerVolume(volume);
        if (remoteVideoRef.current) {
            remoteVideoRef.current.volume = volume / 100;
        }
    };
    const switchQuality = async (qualityValue) => {
        const quality = qualityOptions.find(q => q.value === qualityValue);
        if (quality) {
            setSelectedQuality(qualityValue);
            setShowDeviceDropdowns(prev => ({ ...prev, quality: false }));
            // Would restart video with new constraints
        }
    };
    const switchCamera = async (deviceId) => {
        setSelectedDevices(prev => ({ ...prev, camera: deviceId }));
        setShowDeviceDropdowns(prev => ({ ...prev, camera: false }));
    };
    const switchMicrophone = async (deviceId) => {
        setSelectedDevices(prev => ({ ...prev, microphone: deviceId }));
        setShowDeviceDropdowns(prev => ({ ...prev, microphone: false }));
    };
    const switchSpeaker = async (deviceId) => {
        setSelectedDevices(prev => ({ ...prev, speaker: deviceId }));
        setShowDeviceDropdowns(prev => ({ ...prev, speaker: false }));
    };
    const toggleFullscreen = (videoType) => {
        // Fullscreen implementation
    };
    const toggleLocalVideoVisibility = () => {
        setShowLocalVideo(!showLocalVideo);
    };
    // Main functions
    const startHosting = async () => {
        console.log('=== STARTING HOSTING ===');
        setIsHosting(true);
        setConnectionStatus(`Hosting on IP: ${myIP}. Share this IP with your friend.`);
        socket?.emit('start-hosting', { ip: myIP });
        console.log('✅ Started hosting on IP:', myIP);
    };
    const connectToIP = async () => {
        if (!targetIP.trim())
            return;
        const isLocalTesting = targetIP === myIP ||
            targetIP === 'localhost' ||
            targetIP === '127.0.0.1' ||
            signalingServerURL === 'http://localhost:3001';
        const targetSignalingURL = isLocalTesting ? 'http://localhost:3001' : `http://${targetIP}:3001`;
        console.log('=== CONNECTION LOGIC ===');
        console.log('Target IP:', targetIP);
        console.log('My IP:', myIP);
        console.log('Is local testing:', isLocalTesting);
        console.log('Will connect to:', targetSignalingURL);
        setConnectionStatus(`Connecting to signaling server at ${isLocalTesting ? 'localhost (local testing)' : targetIP}...`);
        setSignalingServerURL(targetSignalingURL);
        setTimeout(async () => {
            let retries = 0;
            const maxRetries = 10;
            while ((!socket || !socket.connected) && retries < maxRetries) {
                console.log(`Waiting for socket connection... retry ${retries + 1}/${maxRetries}`);
                await new Promise(resolve => setTimeout(resolve, 500));
                retries++;
            }
            if (!socket || !socket.connected) {
                setConnectionStatus('Failed to connect to signaling server');
                return;
            }
            setConnectionStatus(`Calling ${targetIP}...`);
            setMode('waiting');
            if (!localStream) {
                await startLocalVideo();
            }
            createPeerConnection();
            if (localStream && peerConnectionRef.current) {
                localStream.getTracks().forEach((track) => {
                    peerConnectionRef.current.addTrack(track, localStream);
                });
            }
            const offer = await peerConnectionRef.current.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            await peerConnectionRef.current.setLocalDescription(offer);
            console.log('=== SENDING DIRECT CALL REQUEST ===');
            socket?.emit('direct-call-request', {
                toIP: targetIP,
                fromIP: myIP,
                offer
            });
        }, 2000);
    };
    const stopHosting = async () => {
        setIsHosting(false);
        setWaitingUsers([]);
        setConnectionStatus('');
        socket?.emit('stop-hosting');
    };
    const acceptCall = async (fromIP) => {
        const request = waitingUsers.find(user => user.fromIP === fromIP);
        if (!request)
            return;
        setWaitingUsers(prev => prev.filter(user => user.fromIP !== fromIP));
        socket?.emit('direct-call-response', {
            toIP: fromIP,
            accepted: true
        });
        if (!localStream) {
            await startLocalVideo();
        }
        createPeerConnection();
        if (request.offer) {
            await handleOffer(request.offer);
        }
        setMode('call');
        setConnectionStatus(`Connected to ${fromIP}`);
    };
    const rejectCall = (fromIP) => {
        setWaitingUsers(prev => prev.filter(user => user.fromIP !== fromIP));
        socket?.emit('direct-call-response', {
            toIP: fromIP,
            accepted: false
        });
        setConnectionStatus(`Rejected call from ${fromIP}`);
        setTimeout(() => setConnectionStatus(isHosting ? `Hosting on IP: ${myIP}` : ''), 3000);
    };
    const endCall = async () => {
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
        setRemoteStream(null);
        setMode('hosting');
        setSignalingServerURL('http://localhost:3001');
        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
        }
        try {
            await startLocalVideo();
            setConnectionStatus('Call ended. Ready to host or make another call.');
        }
        catch (error) {
            console.error('Error restarting local video after call ended:', error);
            setConnectionStatus('Call ended. Ready to host or make another call.');
        }
    };
    const isLocalTesting = (callerIP, hostIP) => {
        return callerIP === hostIP || hostIP === 'localhost' || hostIP === '127.0.0.1';
    };
    // Sync localStream with all video elements
    (0, react_1.useEffect)(() => {
        if (localStream) {
            if (localVideoRef.current)
                localVideoRef.current.srcObject = localStream;
            if (localPreviewRef.current)
                localPreviewRef.current.srcObject = localStream;
            if (localHostingRef.current)
                localHostingRef.current.srcObject = localStream;
        }
        else {
            if (localVideoRef.current)
                localVideoRef.current.srcObject = null;
            if (localPreviewRef.current)
                localPreviewRef.current.srcObject = null;
            if (localHostingRef.current)
                localHostingRef.current.srcObject = null;
        }
    }, [localStream]);
    // Ensure local video is properly set when entering call mode
    (0, react_1.useEffect)(() => {
        if (mode === 'call' && localStream) {
            console.log('Mode changed to call, ensuring local video is set');
            setTimeout(() => {
                if (localVideoRef.current && localStream) {
                    console.log('Setting local video stream on mode change to call');
                    localVideoRef.current.srcObject = localStream;
                }
            }, 100);
        }
    }, [mode, localStream]);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "h-screen flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white", children: [(0, jsx_runtime_1.jsxs)("header", { className: "bg-slate-800/30 backdrop-blur-lg border-b border-slate-700/50 p-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between items-center mb-2", children: [(0, jsx_runtime_1.jsx)("h1", { className: "text-2xl font-light", children: "P2P Video Call" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-4", children: [(0, jsx_runtime_1.jsx)("div", { className: `status-dot ${signalingServerStatus}`, title: `Signaling Server: ${signalingServerStatus}` }), (0, jsx_runtime_1.jsxs)("div", { className: "text-sm text-slate-300", children: [(0, jsx_runtime_1.jsxs)("span", { children: ["Status: ", isConnected ? 'Connected' : 'Disconnected'] }), isHosting && mode === 'hosting' && (0, jsx_runtime_1.jsx)("span", { className: "text-green-400 font-semibold", children: " | Hosting" })] })] })] }), myIP && myIP !== 'Loading...' && ((0, jsx_runtime_1.jsxs)("div", { className: "flex justify-center items-center gap-2 bg-blue-500/20 border border-blue-500/30 rounded-full px-4 py-2 max-w-sm mx-auto", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-sm", children: "Your IP:" }), (0, jsx_runtime_1.jsx)("code", { className: "bg-slate-700/50 px-2 py-1 rounded text-sm font-mono text-white", children: myIP }), (0, jsx_runtime_1.jsx)("button", { onClick: () => navigator.clipboard?.writeText(myIP), className: "text-white hover:bg-slate-700/50 p-1 rounded transition-colors", title: "Copy to clipboard", children: "\uD83D\uDCCB" })] }))] }), (0, jsx_runtime_1.jsxs)("main", { className: "flex-1 flex items-center justify-center p-5", children: [mode === 'hosting' && ((0, jsx_runtime_1.jsxs)("div", { className: "bg-slate-800/20 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-8 max-w-4xl w-full", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-center mb-8", children: (0, jsx_runtime_1.jsx)("h2", { className: "text-3xl font-light text-white", children: "Ready to Connect" }) }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-8 items-start", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex justify-center", children: (0, jsx_runtime_1.jsxs)("div", { className: "relative rounded-2xl overflow-hidden bg-slate-900/30 border-2 border-slate-700/30", children: [(0, jsx_runtime_1.jsx)("video", { ref: localHostingRef, autoPlay: true, muted: true, playsInline: true, className: "w-80 h-60 object-cover block" }), !localStream && ((0, jsx_runtime_1.jsx)("div", { className: "w-80 h-60 flex items-center justify-center text-slate-400", children: (0, jsx_runtime_1.jsx)("p", { children: "\uD83D\uDCF9 Camera preview will appear here" }) })), (0, jsx_runtime_1.jsx)("div", { className: "absolute bottom-3 left-3 bg-black/70 text-white px-2 py-1 rounded text-sm", children: "Your Camera" })] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-6", children: [(0, jsx_runtime_1.jsx)("div", { children: !isHosting ? ((0, jsx_runtime_1.jsx)("button", { onClick: startHosting, className: "w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-all transform hover:-translate-y-0.5", children: signalingServerStatus === 'running' ? 'Start Hosting (Wait for Calls)' : 'Start Server & Host' })) : ((0, jsx_runtime_1.jsx)("button", { onClick: stopHosting, className: "w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-all transform hover:-translate-y-0.5", children: "Stop Hosting" })) }), (0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsxs)("button", { onClick: () => setShowDeviceDropdowns(prev => ({ ...prev, quality: !prev.quality })), className: "w-full bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/50 text-white py-3 px-4 rounded-lg transition-colors text-left flex items-center justify-between", children: [(0, jsx_runtime_1.jsxs)("span", { children: ["\uD83C\uDFA5 ", qualityOptions.find(q => q.value === selectedQuality)?.label] }), (0, jsx_runtime_1.jsx)("span", { className: "text-slate-400", children: "\u25BC" })] }), showDeviceDropdowns.quality && ((0, jsx_runtime_1.jsx)("div", { className: "absolute top-full left-0 right-0 mt-1 bg-slate-800/90 backdrop-blur-lg border border-slate-600/50 rounded-lg z-50 max-h-48 overflow-y-auto", children: qualityOptions.map(option => ((0, jsx_runtime_1.jsxs)("button", { onClick: () => switchQuality(option.value), className: `w-full p-3 text-left hover:bg-slate-700/50 transition-colors ${selectedQuality === option.value ? 'bg-blue-600/30 border-l-2 border-blue-500' : ''}`, children: [(0, jsx_runtime_1.jsx)("div", { className: "font-medium", children: option.label }), (0, jsx_runtime_1.jsx)("div", { className: "text-sm text-slate-400", children: option.description })] }, option.value))) }))] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-8 text-center border-t border-slate-700/50 pt-8", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-xl font-light text-white mb-4", children: "Or Call Someone" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col sm:flex-row gap-3 justify-center items-center max-w-md mx-auto", children: [(0, jsx_runtime_1.jsx)("input", { type: "text", placeholder: "Enter friend's IP address", value: targetIP, onChange: (e) => setTargetIP(e.target.value), className: "flex-1 w-full sm:w-auto bg-slate-700/50 border border-slate-600/50 text-white py-3 px-4 rounded-lg placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-slate-600/50 transition-all" }), (0, jsx_runtime_1.jsx)("button", { onClick: connectToIP, className: "w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all transform hover:-translate-y-0.5", children: "Call" })] }), targetIP && isLocalTesting(myIP, targetIP) && ((0, jsx_runtime_1.jsx)("div", { className: "mt-3 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 py-2 px-4 rounded-lg text-sm", children: "\uD83D\uDD2C Local testing mode detected - calling same IP address" }))] }), connectionStatus && ((0, jsx_runtime_1.jsx)("div", { className: "mt-6 text-center", children: (0, jsx_runtime_1.jsx)("p", { className: "text-slate-300", children: connectionStatus }) }))] })), mode === 'waiting' && ((0, jsx_runtime_1.jsxs)("div", { className: "bg-slate-800/20 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-8 max-w-md w-full text-center", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-6", children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-3xl font-light text-white mb-4", children: "Calling..." }), (0, jsx_runtime_1.jsx)("button", { onClick: () => {
                                            setMode('hosting');
                                            setSignalingServerURL('http://localhost:3001');
                                        }, className: "bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors", children: "\u2190 Cancel Call" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "text-slate-300", children: [(0, jsx_runtime_1.jsxs)("p", { children: ["Calling ", (0, jsx_runtime_1.jsx)("strong", { className: "text-white", children: targetIP })] }), (0, jsx_runtime_1.jsx)("p", { children: "Waiting for them to accept..." })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex justify-center", children: (0, jsx_runtime_1.jsx)("div", { className: "spinner" }) }), connectionStatus && ((0, jsx_runtime_1.jsx)("div", { className: "text-slate-300 text-sm", children: (0, jsx_runtime_1.jsx)("p", { children: connectionStatus }) }))] })] })), mode === 'call' && ((0, jsx_runtime_1.jsxs)("div", { className: "w-full h-full flex flex-col gap-5", children: [(0, jsx_runtime_1.jsxs)("div", { className: `flex-1 grid gap-5 min-h-96 ${!showLocalVideo ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`, children: [showLocalVideo && ((0, jsx_runtime_1.jsxs)("div", { className: "relative rounded-2xl overflow-hidden bg-slate-900/30 border-2 border-slate-700/30", children: [(0, jsx_runtime_1.jsx)("video", { ref: localVideoRef, autoPlay: true, muted: true, playsInline: true, className: "w-full h-full object-cover" }), (0, jsx_runtime_1.jsx)("div", { className: "absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded-md text-sm font-medium", children: "You" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => toggleFullscreen('local'), className: "absolute top-4 right-4 bg-black/70 hover:bg-black/90 text-white p-2 rounded-md transition-colors", title: "Toggle fullscreen", children: "\u26F6" }), !localStream && ((0, jsx_runtime_1.jsx)("div", { className: "absolute inset-0 flex items-center justify-center bg-black/50 text-slate-300", children: (0, jsx_runtime_1.jsx)("p", { children: "No local video" }) }))] })), (0, jsx_runtime_1.jsxs)("div", { className: "relative rounded-2xl overflow-hidden bg-slate-900/30 border-2 border-slate-700/30", children: [(0, jsx_runtime_1.jsx)("video", { ref: remoteVideoRef, autoPlay: true, playsInline: true, className: "w-full h-full object-cover" }), (0, jsx_runtime_1.jsx)("div", { className: "absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded-md text-sm font-medium", children: "Remote" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => toggleFullscreen('remote'), className: "absolute top-4 right-4 bg-black/70 hover:bg-black/90 text-white p-2 rounded-md transition-colors", title: "Toggle fullscreen", children: "\u26F6" }), !remoteStream && ((0, jsx_runtime_1.jsx)("div", { className: "absolute inset-0 flex items-center justify-center bg-black/50 text-slate-300", children: (0, jsx_runtime_1.jsx)("p", { children: "Waiting for remote video..." }) }))] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "bg-slate-800/20 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center justify-between gap-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3 flex-wrap", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 bg-slate-700/30 rounded-lg px-3 py-2", children: [(0, jsx_runtime_1.jsx)("button", { onClick: toggleMicrophone, className: `text-lg ${isMicMuted ? 'text-red-400' : 'text-white'} hover:scale-110 transition-transform`, title: isMicMuted ? 'Unmute microphone' : 'Mute microphone', children: "\uD83C\uDFA4" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1", children: [(0, jsx_runtime_1.jsx)("input", { type: "range", min: "0", max: "100", value: micVolume, onChange: (e) => updateMicVolume(Number(e.target.value)), className: "volume-slider", title: "Microphone volume" }), (0, jsx_runtime_1.jsxs)("span", { className: "text-xs text-slate-400 w-8", children: [micVolume, "%"] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => setShowDeviceDropdowns(prev => ({ ...prev, microphone: !prev.microphone })), className: "text-slate-400 hover:text-white text-sm", title: "Select microphone", children: "\u25BC" }), showDeviceDropdowns.microphone && ((0, jsx_runtime_1.jsx)("div", { className: "absolute bottom-full left-0 mb-1 bg-slate-800/90 backdrop-blur-lg border border-slate-600/50 rounded-lg z-50 min-w-48 max-h-32 overflow-y-auto", children: availableDevices.microphones.map(device => ((0, jsx_runtime_1.jsx)("button", { onClick: () => switchMicrophone(device.deviceId), className: `w-full p-2 text-left text-sm hover:bg-slate-700/50 transition-colors ${selectedDevices.microphone === device.deviceId ? 'bg-blue-600/30 border-l-2 border-blue-500' : ''}`, children: device.label || `Microphone ${device.deviceId.slice(0, 8)}` }, device.deviceId))) }))] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 bg-slate-700/30 rounded-lg px-3 py-2", children: [(0, jsx_runtime_1.jsx)("button", { onClick: toggleCamera, className: `text-lg ${isCameraOff ? 'text-red-400' : 'text-white'} hover:scale-110 transition-transform`, title: isCameraOff ? 'Turn camera on' : 'Turn camera off', children: "\uD83D\uDCF9" }), (0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => setShowDeviceDropdowns(prev => ({ ...prev, camera: !prev.camera })), className: "text-slate-400 hover:text-white text-sm", title: "Select camera", children: "\u25BC" }), showDeviceDropdowns.camera && ((0, jsx_runtime_1.jsx)("div", { className: "absolute bottom-full left-0 mb-1 bg-slate-800/90 backdrop-blur-lg border border-slate-600/50 rounded-lg z-50 min-w-48 max-h-32 overflow-y-auto", children: availableDevices.cameras.map(device => ((0, jsx_runtime_1.jsx)("button", { onClick: () => switchCamera(device.deviceId), className: `w-full p-2 text-left text-sm hover:bg-slate-700/50 transition-colors ${selectedDevices.camera === device.deviceId ? 'bg-blue-600/30 border-l-2 border-blue-500' : ''}`, children: device.label || `Camera ${device.deviceId.slice(0, 8)}` }, device.deviceId))) }))] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 bg-slate-700/30 rounded-lg px-3 py-2", children: [(0, jsx_runtime_1.jsx)("button", { onClick: toggleSpeaker, className: `text-lg ${isSpeakerMuted ? 'text-red-400' : 'text-white'} hover:scale-110 transition-transform`, title: isSpeakerMuted ? 'Unmute speaker' : 'Mute speaker', children: "\uD83D\uDD0A" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1", children: [(0, jsx_runtime_1.jsx)("input", { type: "range", min: "0", max: "100", value: speakerVolume, onChange: (e) => updateSpeakerVolume(Number(e.target.value)), className: "volume-slider", title: "Speaker volume" }), (0, jsx_runtime_1.jsxs)("span", { className: "text-xs text-slate-400 w-8", children: [speakerVolume, "%"] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => setShowDeviceDropdowns(prev => ({ ...prev, speaker: !prev.speaker })), className: "text-slate-400 hover:text-white text-sm", title: "Select speaker", children: "\u25BC" }), showDeviceDropdowns.speaker && ((0, jsx_runtime_1.jsx)("div", { className: "absolute bottom-full left-0 mb-1 bg-slate-800/90 backdrop-blur-lg border border-slate-600/50 rounded-lg z-50 min-w-48 max-h-32 overflow-y-auto", children: availableDevices.speakers.map(device => ((0, jsx_runtime_1.jsx)("button", { onClick: () => switchSpeaker(device.deviceId), className: `w-full p-2 text-left text-sm hover:bg-slate-700/50 transition-colors ${selectedDevices.speaker === device.deviceId ? 'bg-blue-600/30 border-l-2 border-blue-500' : ''}`, children: device.label || `Speaker ${device.deviceId.slice(0, 8)}` }, device.deviceId))) }))] })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex items-center gap-2 bg-slate-700/30 rounded-lg px-3 py-2", children: (0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsxs)("button", { onClick: () => setShowDeviceDropdowns(prev => ({ ...prev, quality: !prev.quality })), className: "flex items-center gap-2 text-sm text-white hover:text-blue-400 transition-colors", title: "Select video quality", children: [(0, jsx_runtime_1.jsx)("span", { children: "\u2699\uFE0F" }), (0, jsx_runtime_1.jsx)("span", { children: qualityOptions.find(q => q.value === selectedQuality)?.label }), (0, jsx_runtime_1.jsx)("span", { className: "text-slate-400", children: "\u25BC" })] }), showDeviceDropdowns.quality && ((0, jsx_runtime_1.jsx)("div", { className: "absolute bottom-full left-0 mb-1 bg-slate-800/90 backdrop-blur-lg border border-slate-600/50 rounded-lg z-50 min-w-48 max-h-32 overflow-y-auto", children: qualityOptions.map(option => ((0, jsx_runtime_1.jsxs)("button", { onClick: () => switchQuality(option.value), className: `w-full p-3 text-left hover:bg-slate-700/50 transition-colors ${selectedQuality === option.value ? 'bg-blue-600/30 border-l-2 border-blue-500' : ''}`, children: [(0, jsx_runtime_1.jsx)("div", { className: "font-medium text-sm", children: option.label }), (0, jsx_runtime_1.jsx)("div", { className: "text-xs text-slate-400", children: option.description })] }, option.value))) }))] }) }), (0, jsx_runtime_1.jsx)("div", { className: "flex items-center gap-2 bg-slate-700/30 rounded-lg px-3 py-2", children: (0, jsx_runtime_1.jsx)("button", { onClick: toggleLocalVideoVisibility, className: `text-lg ${!showLocalVideo ? 'text-slate-500' : 'text-white'} hover:scale-110 transition-transform`, title: showLocalVideo ? 'Hide your video preview' : 'Show your video preview', children: "\uD83D\uDC41\uFE0F" }) })] }), (0, jsx_runtime_1.jsx)("button", { onClick: endCall, className: "bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition-all transform hover:-translate-y-0.5", children: "\uD83D\uDCDE End Call" })] }), connectionStatus && ((0, jsx_runtime_1.jsx)("div", { className: "mt-3 text-center text-slate-300 text-sm", children: connectionStatus }))] })] })), isHosting && waitingUsers.length > 0 && mode === 'hosting' && ((0, jsx_runtime_1.jsx)("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50", children: (0, jsx_runtime_1.jsxs)("div", { className: "bg-slate-800/90 backdrop-blur-lg border border-slate-600/50 rounded-2xl p-6 min-w-96 max-w-md", children: [(0, jsx_runtime_1.jsxs)("h3", { className: "text-xl font-semibold text-white mb-4 text-center", children: ["Incoming Calls (", waitingUsers.length, ")"] }), (0, jsx_runtime_1.jsx)("div", { className: "space-y-3", children: waitingUsers.map((user, index) => ((0, jsx_runtime_1.jsxs)("div", { className: "bg-slate-700/50 rounded-lg p-4 flex justify-between items-center", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { className: "text-white font-medium", children: user.fromIP }), (0, jsx_runtime_1.jsx)("div", { className: "text-slate-400 text-sm", children: new Date(user.joinTime).toLocaleTimeString() })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2", children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => acceptCall(user.fromIP), className: "bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors", children: "\u2705 Accept" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => rejectCall(user.fromIP), className: "bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors", children: "\u274C Reject" })] })] }, user.fromIP))) })] }) }))] })] }));
};
exports.default = VideoCallApp;
