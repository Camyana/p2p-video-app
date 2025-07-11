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
    const localVideoRef = (0, react_1.useRef)(null);
    const localPreviewRef = (0, react_1.useRef)(null);
    const localHostingRef = (0, react_1.useRef)(null);
    const remoteVideoRef = (0, react_1.useRef)(null);
    const peerConnectionRef = (0, react_1.useRef)(null);
    const configuration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ],
        iceCandidatePoolSize: 10,
        bundlePolicy: 'balanced',
        rtcpMuxPolicy: 'require'
    };
    (0, react_1.useEffect)(() => {
        console.log('isHosting state changed to:', isHosting);
    }, [isHosting]);
    (0, react_1.useEffect)(() => {
        console.log('=== WAITING USERS CHANGED ===');
        console.log('Waiting users:', waitingUsers);
        console.log('Waiting users length:', waitingUsers.length);
        console.log('Current state - isHosting:', isHosting, 'mode:', mode);
        console.log('Should show UI:', isHosting && waitingUsers.length > 0 && mode === 'hosting');
    }, [waitingUsers, isHosting, mode]);
    // Device enumeration function
    const enumerateDevices = async () => {
        try {
            // Request permissions first to get device labels
            await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            const devices = await navigator.mediaDevices.enumerateDevices();
            const cameras = devices.filter(device => device.kind === 'videoinput');
            const microphones = devices.filter(device => device.kind === 'audioinput');
            const speakers = devices.filter(device => device.kind === 'audiooutput');
            setAvailableDevices({ cameras, microphones, speakers });
            // Set default devices (first available or default)
            if (cameras.length > 0 && !selectedDevices.camera) {
                const defaultCamera = cameras.find(device => device.deviceId === 'default') || cameras[0];
                setSelectedDevices(prev => ({ ...prev, camera: defaultCamera.deviceId }));
            }
            if (microphones.length > 0 && !selectedDevices.microphone) {
                const defaultMic = microphones.find(device => device.deviceId === 'default') || microphones[0];
                setSelectedDevices(prev => ({ ...prev, microphone: defaultMic.deviceId }));
            }
            if (speakers.length > 0 && !selectedDevices.speaker) {
                const defaultSpeaker = speakers.find(device => device.deviceId === 'default') || speakers[0];
                setSelectedDevices(prev => ({ ...prev, speaker: defaultSpeaker.deviceId }));
            }
            console.log('Devices enumerated:', { cameras: cameras.length, microphones: microphones.length, speakers: speakers.length });
        }
        catch (error) {
            console.error('Error enumerating devices:', error);
        }
    };
    // Function to detect camera capabilities
    const getCameraCapabilities = async (deviceId) => {
        try {
            // Get a temporary stream to access the camera's capabilities
            const tempStream = await navigator.mediaDevices.getUserMedia({
                video: deviceId ? { deviceId: { exact: deviceId } } : true,
                audio: false
            });
            const videoTrack = tempStream.getVideoTracks()[0];
            const capabilities = videoTrack.getCapabilities();
            console.log('Camera capabilities:', capabilities);
            // Clean up the temporary stream
            tempStream.getTracks().forEach(track => track.stop());
            return {
                maxWidth: capabilities.width?.max || 1920,
                maxHeight: capabilities.height?.max || 1080,
                maxFrameRate: capabilities.frameRate?.max || 30,
                supportedResolutions: [
                    { width: capabilities.width?.max || 1920, height: capabilities.height?.max || 1080 },
                    { width: 1920, height: 1080 }, // 1080p
                    { width: 1280, height: 720 }, // 720p
                    { width: 854, height: 480 }, // 480p (16:9)
                    { width: 640, height: 360 } // 360p (16:9)
                ].filter((res, index, arr) => arr.findIndex(r => r.width === res.width && r.height === res.height) === index)
            };
        }
        catch (error) {
            console.error('Error getting camera capabilities:', error);
            return {
                maxWidth: 1920,
                maxHeight: 1080,
                maxFrameRate: 30,
                supportedResolutions: [
                    { width: 1920, height: 1080 }, // 1080p
                    { width: 1280, height: 720 }, // 720p
                    { width: 854, height: 480 }, // 480p (16:9)
                    { width: 640, height: 360 } // 360p (16:9)
                ]
            };
        }
    };
    // Function to get optimal video constraints based on camera capabilities and selected quality
    const getOptimalVideoConstraints = async (deviceId, quality) => {
        const selectedQualityOption = qualityOptions.find(q => q.value === (quality || selectedQuality));
        const targetResolution = selectedQualityOption || qualityOptions[0]; // Default to 1080p
        console.log('Using selected quality:', targetResolution);
        const constraints = {
            deviceId: deviceId ? { exact: deviceId } : undefined,
            width: { ideal: targetResolution.width, min: 320 },
            height: { ideal: targetResolution.height, min: 240 },
            frameRate: { ideal: 30, min: 15 },
            aspectRatio: { ideal: 16 / 9 }
        };
        return constraints;
    };
    const isElectron = () => {
        return typeof window !== 'undefined' && window.process && window.process.type;
    };
    // Auto-start signaling server on app launch
    const autoStartSignalingServer = async () => {
        console.log('=== AUTO-STARTING SIGNALING SERVER ===');
        setSignalingServerStatus('starting');
        setSignalingServerError('');
        if (!window.electronAPI) {
            console.error('❌ Electron API not available');
            setSignalingServerStatus('error');
            setSignalingServerError('Not running in Electron environment');
            return false;
        }
        try {
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
        // Don't automatically add local tracks here - they'll be added explicitly when needed
        peerConnectionRef.current = peerConnection;
    };
    // Move event handlers outside useEffect and wrap with useCallback
    const handleDirectCallRequest = (0, react_1.useCallback)((data) => {
        console.log('=== DIRECT CALL REQUEST RECEIVED ===');
        console.log('Received direct call request from:', data.fromIP);
        console.log('Current mode:', mode);
        console.log('Is hosting:', isHosting);
        console.log('Socket connected:', socket?.connected);
        console.log('My IP:', myIP);
        console.log('Offer data:', data.offer ? 'Present' : 'Missing');
        console.log('Signaling server URL:', signalingServerURL);
        if (mode === 'hosting' && isHosting) {
            console.log('✅ ACCEPTING CALL REQUEST - Adding user to waiting list:', data.fromIP);
            // Store the offer data with the waiting user
            setWaitingUsers(prev => {
                const newUsers = [...prev, { fromIP: data.fromIP, joinTime: new Date(), offer: data.offer }];
                console.log('Updated waiting users list:', newUsers);
                console.log('Waiting users length:', newUsers.length);
                console.log('Should show UI:', isHosting && newUsers.length > 0 && mode === 'hosting');
                return newUsers;
            });
            setConnectionStatus(`Incoming call from ${data.fromIP} - Added to waiting list`);
        }
        else {
            console.log('❌ REJECTING CALL REQUEST - Not in hosting mode');
            console.log('Current mode:', mode, 'Is hosting:', isHosting);
            // Send rejection back to caller
            socket?.emit('direct-call-response', { toIP: data.fromIP, accepted: false });
        }
    }, [mode, isHosting, socket, myIP, signalingServerURL]);
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
        setConnectionStatus('Call was rejected.');
        setTimeout(() => setConnectionStatus(''), 3000);
    }, []);
    const handleOffer = (0, react_1.useCallback)(async (offer) => {
        console.log('Received offer');
        if (!peerConnectionRef.current) {
            createPeerConnection();
        }
        try {
            // Add local tracks before setting remote description (check if they're not already added)
            if (localStream && peerConnectionRef.current) {
                const existingSenders = peerConnectionRef.current.getSenders();
                localStream.getTracks().forEach(track => {
                    // Check if this track is already added
                    const existingSender = existingSenders.find(sender => sender.track && sender.track.id === track.id);
                    if (!existingSender) {
                        console.log('Adding track to peer connection before answer:', track.kind);
                        peerConnectionRef.current.addTrack(track, localStream);
                    }
                    else {
                        console.log('Track already exists in peer connection before answer:', track.kind);
                    }
                });
            }
            await peerConnectionRef.current.setRemoteDescription(offer);
            const answer = await peerConnectionRef.current.createAnswer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            await peerConnectionRef.current.setLocalDescription(answer);
            console.log('Created answer with tracks:', answer.sdp?.includes('m=video'), answer.sdp?.includes('m=audio'));
            socket?.emit('answer', { answer });
        }
        catch (error) {
            console.error('Error handling offer:', error);
        }
    }, [localStream, socket]);
    const handleAnswer = (0, react_1.useCallback)(async (answer) => {
        console.log('Received answer');
        try {
            if (!peerConnectionRef.current) {
                console.error('Peer connection is null when trying to handle answer');
                return;
            }
            await peerConnectionRef.current.setRemoteDescription(answer);
        }
        catch (error) {
            console.error('Error handling answer:', error);
        }
    }, []);
    const handleIceCandidate = (0, react_1.useCallback)((candidate) => {
        console.log('Received ICE candidate');
        if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
            try {
                peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            }
            catch (error) {
                console.error('Error adding ICE candidate:', error);
            }
        }
    }, []);
    (0, react_1.useEffect)(() => {
        console.log('=== SOCKET CONNECTION useEffect TRIGGERED ===');
        console.log('Signaling server URL changed to:', signalingServerURL);
        // Initialize socket connection
        const socketInstance = (0, socket_io_client_1.io)(signalingServerURL);
        console.log('Created new socket instance for:', signalingServerURL);
        setSocket(socketInstance);
        socketInstance.on('connect', () => {
            console.log('✅ Connected to signaling server at:', signalingServerURL);
            setIsConnected(true);
        });
        socketInstance.on('disconnect', () => {
            console.log('❌ Disconnected from signaling server');
            setIsConnected(false);
        });
        socketInstance.on('connect_error', (error) => {
            console.error('❌ Connection error to signaling server:', error);
            console.error('Error details:', error.message);
            setIsConnected(false);
        });
        socketInstance.on('hosting-started', (data) => {
            console.log('✅ Hosting started confirmation received:', data);
        });
        // Enumerate devices on startup
        enumerateDevices();
        // Only auto-initialize on first load (when URL is localhost:3001)
        if (signalingServerURL === 'http://localhost:3001') {
            // Auto-start signaling server first
            const initializeApp = async () => {
                console.log('🚀 Initializing app...');
                // Start signaling server
                const serverStarted = await autoStartSignalingServer();
                if (serverStarted) {
                    // Wait a moment for server to be ready
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    // Initialize media
                    try {
                        console.log('Attempting auto-initialization of media...');
                        await startLocalVideo();
                        setConnectionStatus('Ready to host or call. Your camera and microphone are active.');
                    }
                    catch (error) {
                        console.log('Auto-initialization failed:', error);
                        setConnectionStatus('Camera and microphone are ready to use.');
                        setMediaError('Auto-start failed. You can manually test your devices or start calling.');
                    }
                }
                else {
                    setConnectionStatus('Signaling server failed to start. Some features may not work.');
                }
                // Get user's IP address
                getMyIP();
            };
            // Delay to let everything initialize
            setTimeout(initializeApp, 1000);
        }
        // Close dropdowns when clicking outside
        const handleClickOutside = (event) => {
            const target = event.target;
            if (!target.closest('.media-control-group')) {
                setShowDeviceDropdowns({ camera: false, microphone: false, speaker: false, quality: false });
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            console.log('🔄 Cleaning up socket connection to:', signalingServerURL);
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
    const startLocalVideo = async (constraints) => {
        try {
            setMediaError('');
            let videoConstraints;
            if (constraints?.video) {
                // Use provided constraints if specified
                videoConstraints = constraints.video;
            }
            else {
                // Get optimal constraints based on camera capabilities
                videoConstraints = await getOptimalVideoConstraints(selectedDevices.camera);
            }
            // Build the final constraints
            const finalConstraints = {
                video: videoConstraints,
                audio: selectedDevices.microphone ? {
                    deviceId: { exact: selectedDevices.microphone },
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: { ideal: 48000 },
                    channelCount: { ideal: 2 }
                } : {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: { ideal: 48000 },
                    channelCount: { ideal: 2 }
                }
            };
            // Stop existing stream first to avoid "NotReadableError"
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
                setLocalStream(null);
            }
            console.log('Requesting stream with optimal constraints:', finalConstraints);
            const stream = await navigator.mediaDevices.getUserMedia(finalConstraints);
            setLocalStream(stream);
            // Update all local video elements
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }
            if (localPreviewRef.current) {
                localPreviewRef.current.srcObject = stream;
            }
            if (localHostingRef.current) {
                localHostingRef.current.srcObject = stream;
            }
            // Update permissions based on what we got
            const videoTrack = stream.getVideoTracks()[0];
            const audioTrack = stream.getAudioTracks()[0];
            setDevicePermissions(prev => ({
                ...prev,
                camera: !!videoTrack,
                microphone: !!audioTrack
            }));
            // Log the actual settings we got
            if (videoTrack) {
                const settings = videoTrack.getSettings();
                console.log('Actual video settings:', settings);
                setMediaError(`Video: ${settings.width}x${settings.height} @ ${settings.frameRate}fps`);
            }
            return stream;
        }
        catch (error) {
            console.error('Error accessing media devices:', error);
            // Handle specific error types with progressive fallback
            if (error.name === 'OverconstrainedError') {
                console.log('Optimal constraints failed, trying fallback resolutions...');
                // Try a series of fallback resolutions (all 16:9)
                const fallbackResolutions = [
                    { width: 1920, height: 1080 }, // 1080p
                    { width: 1280, height: 720 }, // 720p
                    { width: 854, height: 480 }, // 480p (16:9)
                    { width: 640, height: 360 } // 360p (16:9)
                ];
                for (const resolution of fallbackResolutions) {
                    try {
                        if (localStream) {
                            localStream.getTracks().forEach(track => track.stop());
                            setLocalStream(null);
                        }
                        console.log(`Trying fallback resolution: ${resolution.width}x${resolution.height}`);
                        const fallbackStream = await navigator.mediaDevices.getUserMedia({
                            video: selectedDevices.camera ? {
                                deviceId: { exact: selectedDevices.camera },
                                width: { ideal: resolution.width },
                                height: { ideal: resolution.height },
                                frameRate: { ideal: 30, min: 15 },
                                aspectRatio: { ideal: 16 / 9 }
                            } : {
                                width: { ideal: resolution.width },
                                height: { ideal: resolution.height },
                                frameRate: { ideal: 30, min: 15 },
                                aspectRatio: { ideal: 16 / 9 }
                            },
                            audio: true
                        });
                        setLocalStream(fallbackStream);
                        if (localVideoRef.current) {
                            localVideoRef.current.srcObject = fallbackStream;
                        }
                        if (localPreviewRef.current) {
                            localPreviewRef.current.srcObject = fallbackStream;
                        }
                        if (localHostingRef.current) {
                            localHostingRef.current.srcObject = fallbackStream;
                        }
                        const videoTrack = fallbackStream.getVideoTracks()[0];
                        const audioTrack = fallbackStream.getAudioTracks()[0];
                        setDevicePermissions(prev => ({
                            ...prev,
                            camera: !!videoTrack,
                            microphone: !!audioTrack
                        }));
                        if (videoTrack) {
                            const settings = videoTrack.getSettings();
                            console.log(`Fallback successful with settings:`, settings);
                            setMediaError(`Fallback: ${settings.width}x${settings.height} @ ${settings.frameRate}fps`);
                        }
                        return fallbackStream;
                    }
                    catch (fallbackError) {
                        console.log(`Fallback ${resolution.width}x${resolution.height} failed:`, fallbackError);
                        continue;
                    }
                }
                setMediaError('Camera resolution not supported. Using basic settings.');
            }
            else if (error.name === 'NotFoundError') {
                setMediaError('No camera or microphone found. You can still join audio-only or as a viewer.');
                setDevicePermissions(prev => ({
                    ...prev,
                    hasCamera: !error.message.includes('video'),
                    hasMicrophone: !error.message.includes('audio')
                }));
            }
            else if (error.name === 'NotAllowedError') {
                setMediaError('Camera/microphone access denied. Please allow permissions and try again.');
            }
            else if (error.name === 'NotReadableError') {
                setMediaError('Camera is in use by another application. Please close other video apps and try again.');
            }
            else {
                setMediaError(`Media error: ${error.message}. You can still join as a viewer.`);
            }
            // Try to get audio only if video fails
            if (constraints && constraints.video) {
                try {
                    return await startLocalVideo({ video: false, audio: true });
                }
                catch {
                    // If audio also fails, continue without media
                    setDevicePermissions(prev => ({
                        ...prev,
                        hasCamera: false,
                        hasMicrophone: false
                    }));
                }
            }
            return null;
        }
    };
    // Media control functions
    const toggleMicrophone = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMicMuted(!audioTrack.enabled);
                console.log('Microphone', audioTrack.enabled ? 'unmuted' : 'muted');
            }
        }
    };
    const toggleCamera = () => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsCameraOff(!videoTrack.enabled);
                console.log('Camera', videoTrack.enabled ? 'on' : 'off');
            }
        }
    };
    const toggleSpeaker = () => {
        if (remoteVideoRef.current) {
            remoteVideoRef.current.muted = !remoteVideoRef.current.muted;
            setIsSpeakerMuted(remoteVideoRef.current.muted);
            console.log('Speaker', remoteVideoRef.current.muted ? 'muted' : 'unmuted');
        }
    };
    // Volume control functions
    const updateMicVolume = (volume) => {
        setMicVolume(volume);
        // Note: True microphone volume control requires Web Audio API
        // For now, this is mainly UI feedback
        console.log('Microphone volume set to:', volume);
    };
    const updateSpeakerVolume = (volume) => {
        setSpeakerVolume(volume);
        if (remoteVideoRef.current) {
            remoteVideoRef.current.volume = volume / 100;
        }
    };
    // Device switching functions
    const switchCamera = async (deviceId) => {
        setSelectedDevices(prev => ({ ...prev, camera: deviceId }));
        setShowDeviceDropdowns(prev => ({ ...prev, camera: false }));
        if (localStream) {
            // Stop current video track
            localStream.getVideoTracks().forEach(track => track.stop());
            // Get optimal constraints for the new camera
            try {
                const optimalVideoConstraints = await getOptimalVideoConstraints(deviceId);
                const newStream = await navigator.mediaDevices.getUserMedia({
                    video: optimalVideoConstraints,
                    audio: selectedDevices.microphone ? {
                        deviceId: { exact: selectedDevices.microphone },
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                        sampleRate: { ideal: 48000 },
                        channelCount: { ideal: 2 }
                    } : {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                        sampleRate: { ideal: 48000 },
                        channelCount: { ideal: 2 }
                    }
                });
                setLocalStream(newStream);
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = newStream;
                }
                if (localPreviewRef.current) {
                    localPreviewRef.current.srcObject = newStream;
                }
                if (localHostingRef.current) {
                    localHostingRef.current.srcObject = newStream;
                }
                // Log the new camera settings
                const videoTrack = newStream.getVideoTracks()[0];
                if (videoTrack) {
                    const settings = videoTrack.getSettings();
                    console.log('New camera settings:', settings);
                    setMediaError(`Camera switched: ${settings.width}x${settings.height} @ ${settings.frameRate}fps`);
                }
                // Replace tracks in peer connection if active
                if (peerConnectionRef.current) {
                    const sender = peerConnectionRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
                    if (sender && videoTrack) {
                        await sender.replaceTrack(videoTrack);
                    }
                }
            }
            catch (error) {
                console.error('Error switching camera:', error);
                setMediaError('Failed to switch camera. Please try again.');
            }
        }
    };
    const switchMicrophone = async (deviceId) => {
        setSelectedDevices(prev => ({ ...prev, microphone: deviceId }));
        setShowDeviceDropdowns(prev => ({ ...prev, microphone: false }));
        if (localStream) {
            // Stop current audio track
            localStream.getAudioTracks().forEach(track => track.stop());
            // Get new stream with selected microphone and optimal video settings
            try {
                const optimalVideoConstraints = await getOptimalVideoConstraints(selectedDevices.camera);
                const newStream = await navigator.mediaDevices.getUserMedia({
                    video: optimalVideoConstraints,
                    audio: {
                        deviceId: { exact: deviceId },
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                        sampleRate: { ideal: 48000 },
                        channelCount: { ideal: 2 }
                    }
                });
                setLocalStream(newStream);
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = newStream;
                }
                if (localPreviewRef.current) {
                    localPreviewRef.current.srcObject = newStream;
                }
                if (localHostingRef.current) {
                    localHostingRef.current.srcObject = newStream;
                }
                // Replace tracks in peer connection if active
                if (peerConnectionRef.current) {
                    const audioTrack = newStream.getAudioTracks()[0];
                    const sender = peerConnectionRef.current.getSenders().find(s => s.track && s.track.kind === 'audio');
                    if (sender && audioTrack) {
                        await sender.replaceTrack(audioTrack);
                    }
                }
            }
            catch (error) {
                console.error('Error switching microphone:', error);
                setMediaError('Failed to switch microphone. Please try again.');
            }
        }
    };
    const switchSpeaker = async (deviceId) => {
        setSelectedDevices(prev => ({ ...prev, speaker: deviceId }));
        setShowDeviceDropdowns(prev => ({ ...prev, speaker: false }));
        if (remoteVideoRef.current && 'setSinkId' in remoteVideoRef.current) {
            try {
                await remoteVideoRef.current.setSinkId(deviceId);
                console.log('Speaker switched to:', deviceId);
            }
            catch (error) {
                console.error('Error switching speaker:', error);
            }
        }
    };
    // Quality switching function
    const switchQuality = async (qualityValue) => {
        setSelectedQuality(qualityValue);
        setShowDeviceDropdowns(prev => ({ ...prev, quality: false }));
        if (localStream) {
            console.log('Switching video quality to:', qualityValue);
            try {
                // Stop current video track
                localStream.getVideoTracks().forEach(track => track.stop());
                // Get new stream with selected quality and current camera
                const optimalVideoConstraints = await getOptimalVideoConstraints(selectedDevices.camera, qualityValue);
                const newStream = await navigator.mediaDevices.getUserMedia({
                    video: optimalVideoConstraints,
                    audio: selectedDevices.microphone ? {
                        deviceId: { exact: selectedDevices.microphone },
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                        sampleRate: { ideal: 48000 },
                        channelCount: { ideal: 2 }
                    } : {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                        sampleRate: { ideal: 48000 },
                        channelCount: { ideal: 2 }
                    }
                });
                setLocalStream(newStream);
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = newStream;
                }
                if (localPreviewRef.current) {
                    localPreviewRef.current.srcObject = newStream;
                }
                if (localHostingRef.current) {
                    localHostingRef.current.srcObject = newStream;
                }
                // Log the new quality settings
                const videoTrack = newStream.getVideoTracks()[0];
                if (videoTrack) {
                    const settings = videoTrack.getSettings();
                    console.log('New quality settings:', settings);
                    setMediaError(`Quality changed: ${settings.width}x${settings.height} @ ${settings.frameRate}fps`);
                }
                // Replace tracks in peer connection if active
                if (peerConnectionRef.current) {
                    const sender = peerConnectionRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
                    if (sender && videoTrack) {
                        await sender.replaceTrack(videoTrack);
                    }
                }
            }
            catch (error) {
                console.error('Error switching quality:', error);
                setMediaError(`Failed to switch to ${qualityValue}. Using current quality.`);
            }
        }
    };
    // Fullscreen functionality
    const toggleFullscreen = (videoType) => {
        if (isFullscreen && fullscreenVideo === videoType) {
            // Exit fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
            setIsFullscreen(false);
            setFullscreenVideo(null);
        }
        else {
            // Enter fullscreen
            const videoElement = videoType === 'local' ? localVideoRef.current : remoteVideoRef.current;
            if (videoElement && videoElement.requestFullscreen) {
                videoElement.requestFullscreen();
                setIsFullscreen(true);
                setFullscreenVideo(videoType);
            }
        }
    };
    // Listen for fullscreen changes
    (0, react_1.useEffect)(() => {
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                setIsFullscreen(false);
                setFullscreenVideo(null);
            }
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);
    // Toggle local video visibility
    const toggleLocalVideoVisibility = () => {
        const newShowLocalVideo = !showLocalVideo;
        setShowLocalVideo(newShowLocalVideo);
        // If showing local video again and we have a stream, ensure it's properly set
        if (newShowLocalVideo && localStream && localVideoRef.current) {
            console.log('Re-enabling local video display');
            localVideoRef.current.srcObject = localStream;
        }
    };
    const startHosting = async () => {
        console.log('=== STARTING HOSTING ===');
        console.log('Signaling server status:', signalingServerStatus);
        console.log('Socket connected:', socket?.connected);
        console.log('My IP:', myIP);
        if (signalingServerStatus !== 'running') {
            setConnectionStatus('Signaling server is not running. Please restart the app.');
            return;
        }
        if (!socket?.connected) {
            setConnectionStatus('Not connected to signaling server. Please wait...');
            return;
        }
        setIsHosting(true);
        setConnectionStatus(`Hosting on IP: ${myIP}. Share this IP with your friend.`);
        // Notify the signaling server that we're hosting
        socket.emit('start-hosting', { ip: myIP });
        console.log('✅ Started hosting on IP:', myIP);
    };
    const connectToIP = async () => {
        if (!targetIP.trim()) {
            alert('Please enter an IP address');
            return;
        }
        // Check if this is local testing (same IP) or if target is localhost/127.0.0.1
        // For local testing on same machine, always use localhost signaling server
        const isLocalTesting = targetIP === myIP ||
            targetIP === 'localhost' ||
            targetIP === '127.0.0.1' ||
            // If we're currently connected to localhost server, assume local testing
            signalingServerURL === 'http://localhost:3001';
        // Check if this is a cross-network connection and provide guidance
        const isTargetLocal = targetIP.startsWith('192.168.') || targetIP.startsWith('10.') || targetIP.startsWith('172.');
        const myIsExternal = !myIP.startsWith('192.168.') && !myIP.startsWith('10.') && !myIP.startsWith('172.') && myIP !== '127.0.0.1' && myIP !== 'localhost';
        if (isTargetLocal && myIsExternal) {
            const proceed = confirm(`⚠️ Network Compatibility Warning\n\n` +
                `You're trying to call a local IP (${targetIP}) from an external network.\n\n` +
                `This requires the host to:\n` +
                `• Use their external/public IP instead, OR\n` +
                `• Set up port forwarding on their router for port 3001\n\n` +
                `Continue anyway?`);
            if (!proceed)
                return;
        }
        // For local testing, use localhost signaling server, otherwise use target's server
        const targetSignalingURL = isLocalTesting ? 'http://localhost:3001' : `http://${targetIP}:3001`;
        console.log('=== CONNECTION LOGIC ===');
        console.log('Target IP:', targetIP);
        console.log('My IP:', myIP);
        console.log('Current signaling server:', signalingServerURL);
        console.log('Is local testing:', isLocalTesting);
        console.log('Will connect to:', targetSignalingURL);
        setConnectionStatus(`Connecting to signaling server at ${isLocalTesting ? 'localhost (local testing)' : targetIP}...`);
        console.log(`${isLocalTesting ? 'Local testing detected - c' : 'C'}onnecting to signaling server at: ${targetSignalingURL}`);
        setSignalingServerURL(targetSignalingURL);
        // The useEffect will handle reconnecting to the new server
        // Wait a moment for the connection to establish
        setTimeout(async () => {
            // Wait for socket to be connected before proceeding
            let retries = 0;
            const maxRetries = 10; // 5 seconds max wait
            while ((!socket || !socket.connected) && retries < maxRetries) {
                console.log(`Waiting for socket connection... retry ${retries + 1}/${maxRetries}`);
                await new Promise(resolve => setTimeout(resolve, 500));
                retries++;
            }
            if (!socket || !socket.connected) {
                setConnectionStatus('❌ Failed to connect to signaling server. Please try again.');
                setMode('hosting');
                return;
            }
            setConnectionStatus(`Calling ${targetIP}...`);
            setMode('waiting');
            // Start local media first
            if (!localStream) {
                await startLocalVideo();
            }
            createPeerConnection();
            // Add tracks before creating offer (check if they're not already added)
            if (localStream && peerConnectionRef.current) {
                const existingSenders = peerConnectionRef.current.getSenders();
                localStream.getTracks().forEach(track => {
                    // Check if this track is already added
                    const existingSender = existingSenders.find(sender => sender.track && sender.track.id === track.id);
                    if (!existingSender) {
                        console.log('Adding track to peer connection:', track.kind);
                        peerConnectionRef.current.addTrack(track, localStream);
                    }
                    else {
                        console.log('Track already exists in peer connection:', track.kind);
                    }
                });
            }
            const offer = await peerConnectionRef.current.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            await peerConnectionRef.current.setLocalDescription(offer);
            console.log('Created offer with tracks:', offer.sdp?.includes('m=video'), offer.sdp?.includes('m=audio'));
            // Send direct call request
            console.log('=== SENDING DIRECT CALL REQUEST ===');
            console.log(`From: ${myIP}`);
            console.log(`To: ${targetIP}`);
            console.log(`Connected to signaling server: ${socket?.connected}`);
            console.log(`Signaling server URL: ${signalingServerURL}`);
            console.log(`Is local testing: ${targetIP === myIP}`);
            socket?.emit('direct-call-request', {
                toIP: targetIP,
                fromIP: myIP,
                offer
            });
        }, 2000); // Wait 2 seconds for socket connection
    };
    const stopHosting = async () => {
        setIsHosting(false);
        setWaitingUsers([]);
        setConnectionStatus('');
        socket?.emit('stop-hosting');
        // Stop signaling server if we're in Electron environment
        if (window.electronAPI) {
            try {
                await window.electronAPI.stopSignalingServer();
                console.log('Signaling server stopped');
            }
            catch (error) {
                console.error('Error stopping signaling server:', error);
            }
        }
    };
    const acceptCall = async (fromIP) => {
        // Find the request for this IP
        const request = waitingUsers.find(user => user.fromIP === fromIP);
        if (!request)
            return;
        // Remove from waiting list
        setWaitingUsers(prev => prev.filter(user => user.fromIP !== fromIP));
        // Accept the call
        socket?.emit('direct-call-response', {
            toIP: fromIP,
            accepted: true
        });
        // Start local media and create peer connection
        if (!localStream) {
            try {
                await startLocalVideo();
            }
            catch (error) {
                console.log('Failed to start local video for call, continuing anyway');
                setMediaError('Failed to start camera for call. The call will continue audio-only.');
            }
        }
        createPeerConnection();
        // Handle the offer if we have it
        if (request.offer) {
            await handleOffer(request.offer);
        }
        setMode('call');
        // Ensure local video is showing when entering call mode
        console.log('Entering call mode, ensuring local video is visible');
        console.log('LocalStream available:', !!localStream);
        console.log('ShowLocalVideo state:', showLocalVideo);
        // Force update of local video element
        if (localStream && localVideoRef.current) {
            console.log('Manually setting local video stream in call mode');
            localVideoRef.current.srcObject = localStream;
        }
        setConnectionStatus(`Connected to ${fromIP}`);
    };
    const rejectCall = (fromIP) => {
        // Remove from waiting list
        setWaitingUsers(prev => prev.filter(user => user.fromIP !== fromIP));
        // Reject the call
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
        setMode('hosting'); // Go back to hosting mode instead of staging
        // Reset signaling server URL to localhost when returning to hosting
        setSignalingServerURL('http://localhost:3001');
        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
        }
        // Restart local video for hosting mode
        try {
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
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
    // Sync localStream with all video elements whenever it changes
    (0, react_1.useEffect)(() => {
        if (localStream) {
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = localStream;
            }
            if (localPreviewRef.current) {
                localPreviewRef.current.srcObject = localStream;
            }
            if (localHostingRef.current) {
                localHostingRef.current.srcObject = localStream;
            }
        }
        else {
            // Clear all video elements when stream is null
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = null;
            }
            if (localPreviewRef.current) {
                localPreviewRef.current.srcObject = null;
            }
            if (localHostingRef.current) {
                localHostingRef.current.srcObject = null;
            }
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
            }, 100); // Small delay to ensure DOM is ready
        }
    }, [mode, localStream]);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "h-screen flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white", children: [(0, jsx_runtime_1.jsxs)("header", { className: "bg-slate-800/30 backdrop-blur-lg border-b border-slate-700/50 p-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between items-center mb-2", children: [(0, jsx_runtime_1.jsx)("h1", { className: "text-2xl font-light", children: "P2P Video Call" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-4", children: [(0, jsx_runtime_1.jsx)("div", { className: `status-dot ${signalingServerStatus}`, title: `Signaling Server: ${signalingServerStatus}` }), (0, jsx_runtime_1.jsxs)("div", { className: "text-sm text-slate-300", children: [(0, jsx_runtime_1.jsxs)("span", { children: ["Status: ", isConnected ? 'Connected' : 'Disconnected'] }), isHosting && mode === 'hosting' && (0, jsx_runtime_1.jsx)("span", { className: "text-green-400 font-semibold", children: " | Hosting" })] })] })] }), myIP && myIP !== 'Loading...' && ((0, jsx_runtime_1.jsxs)("div", { className: "flex justify-center items-center gap-2 bg-blue-500/20 border border-blue-500/30 rounded-full px-4 py-2 max-w-sm mx-auto", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-sm", children: "Your IP:" }), (0, jsx_runtime_1.jsx)("code", { className: "bg-slate-700/50 px-2 py-1 rounded text-sm font-mono text-white", children: myIP }), (0, jsx_runtime_1.jsx)("button", { onClick: () => navigator.clipboard?.writeText(myIP), className: "text-white hover:bg-slate-700/50 p-1 rounded transition-colors", title: "Copy to clipboard", children: "\uD83D\uDCCB" })] }))] }), (0, jsx_runtime_1.jsxs)("main", { className: "flex-1 flex items-center justify-center p-5", children: [mode === 'hosting' && ((0, jsx_runtime_1.jsxs)("div", { className: "bg-slate-800/20 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-8 max-w-4xl w-full", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-center mb-8", children: (0, jsx_runtime_1.jsx)("h2", { className: "text-3xl font-light text-white", children: "Ready to Connect" }) }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-8 items-start", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex justify-center", children: (0, jsx_runtime_1.jsxs)("div", { className: "relative rounded-2xl overflow-hidden bg-slate-900/30 border-2 border-slate-700/30", children: [(0, jsx_runtime_1.jsx)("video", { ref: localHostingRef, autoPlay: true, muted: true, playsInline: true, className: "w-80 h-60 object-cover block" }), !localStream && ((0, jsx_runtime_1.jsx)("div", { className: "w-80 h-60 flex items-center justify-center text-slate-400", children: (0, jsx_runtime_1.jsx)("p", { children: "\uD83D\uDCF9 Camera preview will appear here" }) })), (0, jsx_runtime_1.jsx)("div", { className: "absolute bottom-3 left-3 bg-black/70 text-white px-2 py-1 rounded text-sm", children: "Your Camera" })] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-6", children: [(0, jsx_runtime_1.jsx)("div", { children: !isHosting ? ((0, jsx_runtime_1.jsx)("button", { onClick: startHosting, className: "w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-all transform hover:-translate-y-0.5", children: signalingServerStatus === 'running' ? 'Start Hosting (Wait for Calls)' : 'Start Server & Host' })) : ((0, jsx_runtime_1.jsx)("button", { onClick: stopHosting, className: "w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-all transform hover:-translate-y-0.5", children: "Stop Hosting" })) }), (0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsxs)("button", { onClick: () => setShowDeviceDropdowns(prev => ({ ...prev, quality: !prev.quality })), className: "w-full bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/50 text-white py-3 px-4 rounded-lg transition-colors text-left flex items-center justify-between", children: [(0, jsx_runtime_1.jsxs)("span", { children: ["\uD83C\uDFA5 ", qualityOptions.find(q => q.value === selectedQuality)?.label] }), (0, jsx_runtime_1.jsx)("span", { className: "text-slate-400", children: "\u25BC" })] }), showDeviceDropdowns.quality && ((0, jsx_runtime_1.jsx)("div", { className: "absolute top-full left-0 right-0 mt-1 bg-slate-800/90 backdrop-blur-lg border border-slate-600/50 rounded-lg z-50 max-h-48 overflow-y-auto", children: qualityOptions.map(option => ((0, jsx_runtime_1.jsxs)("button", { onClick: () => switchQuality(option.value), className: `w-full p-3 text-left hover:bg-slate-700/50 transition-colors ${selectedQuality === option.value ? 'bg-blue-600/30 border-l-2 border-blue-500' : ''}`, children: [(0, jsx_runtime_1.jsx)("div", { className: "font-medium", children: option.label }), (0, jsx_runtime_1.jsx)("div", { className: "text-sm text-slate-400", children: option.description })] }, option.value))) }))] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-8 text-center border-t border-slate-700/50 pt-8", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-xl font-light text-white mb-4", children: "Or Call Someone" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col sm:flex-row gap-3 justify-center items-center max-w-md mx-auto", children: [(0, jsx_runtime_1.jsx)("input", { type: "text", placeholder: "Enter friend's IP address", value: targetIP, onChange: (e) => setTargetIP(e.target.value), className: "flex-1 w-full sm:w-auto bg-slate-700/50 border border-slate-600/50 text-white py-3 px-4 rounded-lg placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-slate-600/50 transition-all" }), (0, jsx_runtime_1.jsx)("button", { onClick: connectToIP, className: "w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all transform hover:-translate-y-0.5", children: "Call" })] }), targetIP && isLocalTesting(myIP, targetIP) && ((0, jsx_runtime_1.jsx)("div", { className: "mt-3 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 py-2 px-4 rounded-lg text-sm", children: "\uD83D\uDD2C Local testing mode detected - calling same IP address" }))] }), connectionStatus && ((0, jsx_runtime_1.jsx)("div", { className: "mt-6 text-center", children: (0, jsx_runtime_1.jsx)("p", { className: "text-slate-300", children: connectionStatus }) }))] })), isHosting && waitingUsers.length > 0 && mode === 'hosting' && ((0, jsx_runtime_1.jsx)("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50", children: (0, jsx_runtime_1.jsxs)("div", { className: "bg-slate-800/90 backdrop-blur-lg border border-slate-600/50 rounded-2xl p-6 min-w-96 max-w-md", children: [(0, jsx_runtime_1.jsxs)("h3", { className: "text-xl font-semibold text-white mb-4 text-center", children: ["Incoming Calls (", waitingUsers.length, ")"] }), (0, jsx_runtime_1.jsx)("div", { className: "space-y-3", children: waitingUsers.map((user, index) => ((0, jsx_runtime_1.jsxs)("div", { className: "bg-slate-700/50 rounded-lg p-4 flex justify-between items-center", children: [(0, jsx_runtime_1.jsxs)("div", { className: "text-white", children: [(0, jsx_runtime_1.jsx)("div", { className: "font-medium", children: user.fromIP }), (0, jsx_runtime_1.jsx)("div", { className: "text-sm text-slate-400", children: new Date(user.joinTime).toLocaleTimeString() })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2", children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => acceptCall(user.fromIP), className: "bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md transition-colors text-sm font-medium", children: "\u2705 Accept" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => rejectCall(user.fromIP), className: "bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md transition-colors text-sm font-medium", children: "\u274C Reject" })] })] }, user.fromIP))) })] }) })), mode === 'waiting' && ((0, jsx_runtime_1.jsxs)("div", { className: "bg-slate-800/20 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-8 max-w-md w-full text-center", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-6", children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-3xl font-light text-white mb-4", children: "Calling..." }), (0, jsx_runtime_1.jsx)("button", { onClick: () => {
                                            setMode('hosting');
                                            setSignalingServerURL('http://localhost:3001');
                                        }, className: "bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors", children: "\u2190 Cancel Call" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "text-slate-300", children: [(0, jsx_runtime_1.jsxs)("p", { children: ["Calling ", (0, jsx_runtime_1.jsx)("strong", { className: "text-white", children: targetIP })] }), (0, jsx_runtime_1.jsx)("p", { children: "Waiting for them to accept..." })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex justify-center", children: (0, jsx_runtime_1.jsx)("div", { className: "spinner" }) }), connectionStatus && ((0, jsx_runtime_1.jsx)("div", { className: "text-slate-300 text-sm", children: (0, jsx_runtime_1.jsx)("p", { children: connectionStatus }) }))] })] })), mode === 'call' && ((0, jsx_runtime_1.jsxs)("div", { className: "w-full h-full flex flex-col gap-5", children: [(0, jsx_runtime_1.jsxs)("div", { className: `flex-1 grid gap-5 min-h-96 ${!showLocalVideo ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`, children: [showLocalVideo && ((0, jsx_runtime_1.jsxs)("div", { className: "relative rounded-2xl overflow-hidden bg-slate-900/30 border-2 border-slate-700/30", children: [(0, jsx_runtime_1.jsx)("video", { ref: localVideoRef, autoPlay: true, muted: true, playsInline: true, className: "w-full h-full object-cover" }), (0, jsx_runtime_1.jsx)("div", { className: "absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded-md text-sm font-medium", children: "You" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => toggleFullscreen('local'), className: "absolute top-4 right-4 bg-black/70 hover:bg-black/90 text-white p-2 rounded-md transition-colors", title: "Toggle fullscreen", children: "\u26F6" }), !localStream && ((0, jsx_runtime_1.jsx)("div", { className: "absolute inset-0 flex items-center justify-center bg-black/50 text-slate-300", children: (0, jsx_runtime_1.jsx)("p", { children: "No local video" }) }))] })), (0, jsx_runtime_1.jsxs)("div", { className: "relative rounded-2xl overflow-hidden bg-slate-900/30 border-2 border-slate-700/30", children: [(0, jsx_runtime_1.jsx)("video", { ref: remoteVideoRef, autoPlay: true, playsInline: true, className: "w-full h-full object-cover" }), (0, jsx_runtime_1.jsx)("div", { className: "absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded-md text-sm font-medium", children: "Remote" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => toggleFullscreen('remote'), className: "absolute top-4 right-4 bg-black/70 hover:bg-black/90 text-white p-2 rounded-md transition-colors", title: "Toggle fullscreen", children: "\u26F6" }), !remoteStream && ((0, jsx_runtime_1.jsx)("div", { className: "absolute inset-0 flex items-center justify-center bg-black/50 text-slate-300", children: (0, jsx_runtime_1.jsx)("p", { children: "Waiting for remote video..." }) }))] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "bg-slate-800/20 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center justify-between gap-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 bg-slate-700/30 rounded-lg px-3 py-2", children: [(0, jsx_runtime_1.jsx)("button", { onClick: toggleMicrophone, className: `text-lg ${isMicMuted ? 'text-red-400' : 'text-white'} hover:scale-110 transition-transform`, title: isMicMuted ? 'Unmute microphone' : 'Mute microphone', children: "\uD83C\uDFA4" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1", children: [(0, jsx_runtime_1.jsx)("input", { type: "range", min: "0", max: "100", value: micVolume, onChange: (e) => updateMicVolume(Number(e.target.value)), className: "volume-slider", title: "Microphone volume" }), (0, jsx_runtime_1.jsxs)("span", { className: "text-xs text-slate-400 w-8", children: [micVolume, "%"] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => setShowDeviceDropdowns(prev => ({ ...prev, microphone: !prev.microphone })), className: "text-slate-400 hover:text-white text-sm", title: "Select microphone", children: "\u25BC" }), showDeviceDropdowns.microphone && ((0, jsx_runtime_1.jsx)("div", { className: "absolute bottom-full left-0 mb-1 bg-slate-800/90 backdrop-blur-lg border border-slate-600/50 rounded-lg z-50 min-w-48 max-h-32 overflow-y-auto", children: availableDevices.microphones.map(device => ((0, jsx_runtime_1.jsx)("button", { onClick: () => switchMicrophone(device.deviceId), className: `w-full p-2 text-left text-sm hover:bg-slate-700/50 transition-colors ${selectedDevices.microphone === device.deviceId ? 'bg-blue-600/30 border-l-2 border-blue-500' : ''}`, children: device.label || `Microphone ${device.deviceId.slice(0, 8)}` }, device.deviceId))) }))] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 bg-slate-700/30 rounded-lg px-3 py-2", children: [(0, jsx_runtime_1.jsx)("button", { onClick: toggleCamera, className: `text-lg ${isCameraOff ? 'text-red-400' : 'text-white'} hover:scale-110 transition-transform`, title: isCameraOff ? 'Turn camera on' : 'Turn camera off', children: "\uD83D\uDCF9" }), (0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => setShowDeviceDropdowns(prev => ({ ...prev, camera: !prev.camera })), className: "text-slate-400 hover:text-white text-sm", title: "Select camera", children: "\u25BC" }), showDeviceDropdowns.camera && ((0, jsx_runtime_1.jsx)("div", { className: "absolute bottom-full left-0 mb-1 bg-slate-800/90 backdrop-blur-lg border border-slate-600/50 rounded-lg z-50 min-w-48 max-h-32 overflow-y-auto", children: availableDevices.cameras.map(device => ((0, jsx_runtime_1.jsx)("button", { onClick: () => switchCamera(device.deviceId), className: `w-full p-2 text-left text-sm hover:bg-slate-700/50 transition-colors ${selectedDevices.camera === device.deviceId ? 'bg-blue-600/30 border-l-2 border-blue-500' : ''}`, children: device.label || `Camera ${device.deviceId.slice(0, 8)}` }, device.deviceId))) }))] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 bg-slate-700/30 rounded-lg px-3 py-2", children: [(0, jsx_runtime_1.jsx)("button", { onClick: toggleSpeaker, className: `text-lg ${isSpeakerMuted ? 'text-red-400' : 'text-white'} hover:scale-110 transition-transform`, title: isSpeakerMuted ? 'Unmute speaker' : 'Mute speaker', children: "\uD83D\uDD0A" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1", children: [(0, jsx_runtime_1.jsx)("input", { type: "range", min: "0", max: "100", value: speakerVolume, onChange: (e) => updateSpeakerVolume(Number(e.target.value)), className: "volume-slider", title: "Speaker volume" }), (0, jsx_runtime_1.jsxs)("span", { className: "text-xs text-slate-400 w-8", children: [speakerVolume, "%"] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => setShowDeviceDropdowns(prev => ({ ...prev, speaker: !prev.speaker })), className: "text-slate-400 hover:text-white text-sm", title: "Select speaker", children: "\u25BC" }), showDeviceDropdowns.speaker && ((0, jsx_runtime_1.jsx)("div", { className: "absolute bottom-full left-0 mb-1 bg-slate-800/90 backdrop-blur-lg border border-slate-600/50 rounded-lg z-50 min-w-48 max-h-32 overflow-y-auto", children: availableDevices.speakers.map(device => ((0, jsx_runtime_1.jsx)("button", { onClick: () => switchSpeaker(device.deviceId), className: `w-full p-2 text-left text-sm hover:bg-slate-700/50 transition-colors ${selectedDevices.speaker === device.deviceId ? 'bg-blue-600/30 border-l-2 border-blue-500' : ''}`, children: device.label || `Speaker ${device.deviceId.slice(0, 8)}` }, device.deviceId))) }))] })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex items-center gap-2 bg-slate-700/30 rounded-lg px-3 py-2", children: (0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsxs)("button", { onClick: () => setShowDeviceDropdowns(prev => ({ ...prev, quality: !prev.quality })), className: "flex items-center gap-2 text-sm text-white hover:text-blue-400 transition-colors", title: "Select video quality", children: [(0, jsx_runtime_1.jsx)("span", { children: "\u2699\uFE0F" }), (0, jsx_runtime_1.jsx)("span", { children: qualityOptions.find(q => q.value === selectedQuality)?.label }), (0, jsx_runtime_1.jsx)("span", { className: "text-slate-400", children: "\u25BC" })] }), showDeviceDropdowns.quality && ((0, jsx_runtime_1.jsx)("div", { className: "absolute bottom-full left-0 mb-1 bg-slate-800/90 backdrop-blur-lg border border-slate-600/50 rounded-lg z-50 min-w-48 max-h-32 overflow-y-auto", children: qualityOptions.map(option => ((0, jsx_runtime_1.jsxs)("button", { onClick: () => switchQuality(option.value), className: `w-full p-3 text-left hover:bg-slate-700/50 transition-colors ${selectedQuality === option.value ? 'bg-blue-600/30 border-l-2 border-blue-500' : ''}`, children: [(0, jsx_runtime_1.jsx)("div", { className: "font-medium text-sm", children: option.label }), (0, jsx_runtime_1.jsx)("div", { className: "text-xs text-slate-400", children: option.description })] }, option.value))) }))] }) }), (0, jsx_runtime_1.jsx)("div", { className: "flex items-center gap-2 bg-slate-700/30 rounded-lg px-3 py-2", children: (0, jsx_runtime_1.jsx)("button", { onClick: toggleLocalVideoVisibility, className: `text-lg ${!showLocalVideo ? 'text-slate-500' : 'text-white'} hover:scale-110 transition-transform`, title: showLocalVideo ? 'Hide your video preview' : 'Show your video preview', children: "\uD83D\uDC41\uFE0F" }) })] }), (0, jsx_runtime_1.jsx)("button", { onClick: endCall, className: "bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition-all transform hover:-translate-y-0.5", children: "\uD83D\uDCDE End Call" })] }), connectionStatus && ((0, jsx_runtime_1.jsx)("div", { className: "mt-3 text-center text-slate-300 text-sm", children: connectionStatus }))] }), ")}"] }))] })] }));
};
exports.default = VideoCallApp;
