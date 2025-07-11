"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const VideoCallApp = () => {
    // All the existing state and ref declarations would go here
    const [mode, setMode] = (0, react_1.useState)('hosting');
    const [localStream, setLocalStream] = (0, react_1.useState)(null);
    const [remoteStream, setRemoteStream] = (0, react_1.useState)(null);
    const [isHosting, setIsHosting] = (0, react_1.useState)(false);
    const [connectionStatus, setConnectionStatus] = (0, react_1.useState)('');
    const [myIP, setMyIP] = (0, react_1.useState)('Loading...');
    const [targetIP, setTargetIP] = (0, react_1.useState)('');
    const [autoAcceptCalls, setAutoAcceptCalls] = (0, react_1.useState)(true);
    const [waitingUsers, setWaitingUsers] = (0, react_1.useState)([]);
    const [showLocalVideo, setShowLocalVideo] = (0, react_1.useState)(true);
    const [isMicMuted, setIsMicMuted] = (0, react_1.useState)(false);
    const [isCameraOff, setIsCameraOff] = (0, react_1.useState)(false);
    const [isSpeakerMuted, setIsSpeakerMuted] = (0, react_1.useState)(false);
    const [micVolume, setMicVolume] = (0, react_1.useState)(80);
    const [speakerVolume, setSpeakerVolume] = (0, react_1.useState)(80);
    const [selectedQuality, setSelectedQuality] = (0, react_1.useState)('720p');
    const [showDeviceDropdowns, setShowDeviceDropdowns] = (0, react_1.useState)({
        camera: false,
        microphone: false,
        speaker: false,
        quality: false
    });
    const [availableDevices, setAvailableDevices] = (0, react_1.useState)({
        cameras: [],
        microphones: [],
        speakers: []
    });
    const [selectedDevices, setSelectedDevices] = (0, react_1.useState)({
        camera: '',
        microphone: '',
        speaker: ''
    });
    const localVideoRef = (0, react_1.useRef)(null);
    const localPreviewRef = (0, react_1.useRef)(null);
    const localHostingRef = (0, react_1.useRef)(null);
    const remoteVideoRef = (0, react_1.useRef)(null);
    // Quality options
    const qualityOptions = [
        { value: '480p', label: '480p', description: 'Standard quality' },
        { value: '720p', label: '720p', description: 'High quality' },
        { value: '1080p', label: '1080p', description: 'Full HD' }
    ];
    // Mock functions - replace with actual implementations
    const startHosting = () => {
        setIsHosting(true);
        setMode('call');
        setConnectionStatus(`Hosting and ready for calls on IP: ${myIP}`);
    };
    const stopHosting = () => {
        setIsHosting(false);
        setMode('hosting');
        setConnectionStatus('');
    };
    const connectToIP = () => {
        if (targetIP.trim()) {
            setMode('call');
            setConnectionStatus(`Calling ${targetIP}...`);
        }
    };
    const endCall = () => {
        setMode('hosting');
        setRemoteStream(null);
        setConnectionStatus('Call ended');
    };
    const toggleMicrophone = () => {
        setIsMicMuted(!isMicMuted);
    };
    const toggleCamera = () => {
        setIsCameraOff(!isCameraOff);
    };
    const toggleSpeaker = () => {
        setIsSpeakerMuted(!isSpeakerMuted);
    };
    const toggleLocalVideoVisibility = () => {
        setShowLocalVideo(!showLocalVideo);
    };
    const updateMicVolume = (volume) => {
        setMicVolume(volume);
    };
    const updateSpeakerVolume = (volume) => {
        setSpeakerVolume(volume);
    };
    const switchQuality = (qualityValue) => {
        setSelectedQuality(qualityValue);
        setShowDeviceDropdowns(prev => ({ ...prev, quality: false }));
    };
    const switchCamera = (deviceId) => {
        setSelectedDevices(prev => ({ ...prev, camera: deviceId }));
        setShowDeviceDropdowns(prev => ({ ...prev, camera: false }));
    };
    const switchMicrophone = (deviceId) => {
        setSelectedDevices(prev => ({ ...prev, microphone: deviceId }));
        setShowDeviceDropdowns(prev => ({ ...prev, microphone: false }));
    };
    const switchSpeaker = (deviceId) => {
        setSelectedDevices(prev => ({ ...prev, speaker: deviceId }));
        setShowDeviceDropdowns(prev => ({ ...prev, speaker: false }));
    };
    const toggleFullscreen = (videoType) => {
        // Fullscreen implementation
    };
    const isLocalTesting = (callerIP, hostIP) => {
        return callerIP === hostIP || hostIP === 'localhost' || hostIP === '127.0.0.1';
    };
    // Set mock IP
    (0, react_1.useEffect)(() => {
        setMyIP('192.168.1.100');
    }, []);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white", children: [(0, jsx_runtime_1.jsxs)("header", { className: "bg-slate-800/30 backdrop-blur-lg border-b border-slate-700/50 p-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between items-center mb-2", children: [(0, jsx_runtime_1.jsx)("h1", { className: "text-2xl font-light", children: "P2P Video Call" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-4", children: [(0, jsx_runtime_1.jsx)("div", { className: "w-3 h-3 rounded-full bg-green-400", title: "Signaling Server: running" }), (0, jsx_runtime_1.jsxs)("div", { className: "text-sm text-slate-300", children: [(0, jsx_runtime_1.jsx)("span", { children: "Status: Connected" }), isHosting && (0, jsx_runtime_1.jsx)("span", { className: "text-green-400 font-semibold", children: " | Hosting" })] })] })] }), myIP && myIP !== 'Loading...' && ((0, jsx_runtime_1.jsxs)("div", { className: "flex justify-center items-center gap-2 bg-blue-500/20 border border-blue-500/30 rounded-full px-4 py-2 max-w-sm mx-auto", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-sm", children: "Your IP:" }), (0, jsx_runtime_1.jsx)("code", { className: "bg-slate-700/50 px-2 py-1 rounded text-sm font-mono text-white", children: myIP }), (0, jsx_runtime_1.jsx)("button", { onClick: () => navigator.clipboard?.writeText(myIP), className: "text-white hover:bg-slate-700/50 p-1 rounded transition-colors", title: "Copy to clipboard", children: "\uD83D\uDCCB" })] }))] }), (0, jsx_runtime_1.jsxs)("main", { className: "flex-1 flex items-center justify-center p-5", children: [mode === 'hosting' && ((0, jsx_runtime_1.jsxs)("div", { className: "bg-slate-800/20 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-8 max-w-4xl w-full", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-center mb-8", children: (0, jsx_runtime_1.jsx)("h2", { className: "text-3xl font-light text-white", children: "Ready to Connect" }) }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-8 items-start", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex justify-center", children: (0, jsx_runtime_1.jsxs)("div", { className: "relative rounded-2xl overflow-hidden bg-slate-900/30 border-2 border-slate-700/30", children: [(0, jsx_runtime_1.jsx)("video", { ref: localHostingRef, autoPlay: true, muted: true, playsInline: true, className: "w-80 aspect-video object-contain bg-black rounded-xl" }), !localStream && ((0, jsx_runtime_1.jsx)("div", { className: "w-80 aspect-video flex items-center justify-center text-slate-400 bg-slate-900/50", children: (0, jsx_runtime_1.jsx)("p", { children: "\uD83D\uDCF9 Camera preview will appear here" }) })), (0, jsx_runtime_1.jsx)("div", { className: "absolute bottom-3 left-3 bg-black/70 text-white px-2 py-1 rounded text-sm", children: "Your Camera" })] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-6", children: [(0, jsx_runtime_1.jsx)("div", { children: !isHosting ? ((0, jsx_runtime_1.jsx)("button", { onClick: startHosting, className: "w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-all transform hover:-translate-y-0.5", children: "Start Hosting (Auto-Accept Calls)" })) : ((0, jsx_runtime_1.jsx)("button", { onClick: stopHosting, className: "w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-all transform hover:-translate-y-0.5", children: "Stop Hosting" })) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between bg-slate-700/30 rounded-lg px-4 py-3", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { className: "text-white font-medium", children: "Auto-Accept Calls" }), (0, jsx_runtime_1.jsx)("div", { className: "text-slate-400 text-sm", children: "Automatically accept incoming calls" })] }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setAutoAcceptCalls(!autoAcceptCalls), className: `w-12 h-6 rounded-full transition-colors ${autoAcceptCalls ? 'bg-green-600' : 'bg-slate-600'}`, children: (0, jsx_runtime_1.jsx)("div", { className: `w-5 h-5 bg-white rounded-full transition-transform ${autoAcceptCalls ? 'translate-x-6' : 'translate-x-0.5'}` }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsxs)("button", { onClick: () => setShowDeviceDropdowns(prev => ({ ...prev, quality: !prev.quality })), className: "w-full bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/50 text-white py-3 px-4 rounded-lg transition-colors text-left flex items-center justify-between", children: [(0, jsx_runtime_1.jsxs)("span", { children: ["\uD83C\uDFA5 ", qualityOptions.find(q => q.value === selectedQuality)?.label] }), (0, jsx_runtime_1.jsx)("span", { className: "text-slate-400", children: "\u25BC" })] }), showDeviceDropdowns.quality && ((0, jsx_runtime_1.jsx)("div", { className: "absolute top-full left-0 right-0 mt-1 bg-slate-800/90 backdrop-blur-lg border border-slate-600/50 rounded-lg z-50 max-h-48 overflow-y-auto", children: qualityOptions.map(option => ((0, jsx_runtime_1.jsxs)("button", { onClick: () => switchQuality(option.value), className: `w-full p-3 text-left hover:bg-slate-700/50 transition-colors ${selectedQuality === option.value ? 'bg-blue-600/30 border-l-2 border-blue-500' : ''}`, children: [(0, jsx_runtime_1.jsx)("div", { className: "font-medium", children: option.label }), (0, jsx_runtime_1.jsx)("div", { className: "text-sm text-slate-400", children: option.description })] }, option.value))) }))] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-8 text-center border-t border-slate-700/50 pt-8", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-xl font-light text-white mb-4", children: "Or Call Someone" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col sm:flex-row gap-3 justify-center items-center max-w-md mx-auto", children: [(0, jsx_runtime_1.jsx)("input", { type: "text", placeholder: "Enter friend's IP address", value: targetIP, onChange: (e) => setTargetIP(e.target.value), className: "flex-1 w-full sm:w-auto bg-slate-700/50 border border-slate-600/50 text-white py-3 px-4 rounded-lg placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-slate-600/50 transition-all" }), (0, jsx_runtime_1.jsx)("button", { onClick: connectToIP, className: "w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all transform hover:-translate-y-0.5", children: "Call" })] }), targetIP && isLocalTesting(myIP, targetIP) && ((0, jsx_runtime_1.jsx)("div", { className: "mt-3 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 py-2 px-4 rounded-lg text-sm", children: "\uD83D\uDD2C Local testing mode detected - calling same IP address" }))] }), connectionStatus && ((0, jsx_runtime_1.jsx)("div", { className: "mt-6 text-center", children: (0, jsx_runtime_1.jsx)("p", { className: "text-slate-300", children: connectionStatus }) })), waitingUsers.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "mt-6 bg-blue-500/20 border border-blue-500/30 rounded-lg p-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "text-center text-blue-400 font-medium mb-2", children: ["Incoming Connections (", waitingUsers.length, ")"] }), (0, jsx_runtime_1.jsx)("div", { className: "space-y-2", children: waitingUsers.map((user) => ((0, jsx_runtime_1.jsxs)("div", { className: "text-center text-slate-300 text-sm", children: ["\uD83D\uDCDE ", user.fromIP, " at ", new Date(user.joinTime).toLocaleTimeString(), autoAcceptCalls && (0, jsx_runtime_1.jsx)("span", { className: "text-green-400 ml-2", children: "\u2713 Auto-accepted" })] }, user.fromIP))) })] }))] })), mode === 'call' && ((0, jsx_runtime_1.jsxs)("div", { className: "w-full h-full flex flex-col gap-5", children: [isHosting && ((0, jsx_runtime_1.jsxs)("div", { className: "bg-green-600/20 border border-green-500/30 rounded-lg p-3 text-center", children: [(0, jsx_runtime_1.jsxs)("div", { className: "text-green-400 font-medium", children: ["\uD83C\uDFAF Hosting Active - Auto-accepting calls on ", myIP] }), waitingUsers.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "text-green-300 text-sm mt-1", children: ["Recent connections: ", waitingUsers.map(u => u.fromIP).join(', ')] }))] })), (0, jsx_runtime_1.jsxs)("div", { className: `flex-1 grid gap-5 min-h-96 ${!showLocalVideo ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`, children: [showLocalVideo && ((0, jsx_runtime_1.jsxs)("div", { className: "relative rounded-2xl overflow-hidden bg-slate-900/30 border-2 border-slate-700/30", children: [(0, jsx_runtime_1.jsx)("video", { ref: localVideoRef, autoPlay: true, muted: true, playsInline: true, className: "w-full aspect-video object-contain bg-black" }), (0, jsx_runtime_1.jsx)("div", { className: "absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded-md text-sm font-medium", children: "You" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => toggleFullscreen('local'), className: "absolute top-4 right-4 bg-black/70 hover:bg-black/90 text-white p-2 rounded-md transition-colors", title: "Toggle fullscreen", children: "\u26F6" }), !localStream && ((0, jsx_runtime_1.jsx)("div", { className: "absolute inset-0 flex items-center justify-center bg-black/50 text-slate-300", children: (0, jsx_runtime_1.jsx)("p", { children: "No local video" }) }))] })), (0, jsx_runtime_1.jsxs)("div", { className: "relative rounded-2xl overflow-hidden bg-slate-900/30 border-2 border-slate-700/30", children: [(0, jsx_runtime_1.jsx)("video", { ref: remoteVideoRef, autoPlay: true, playsInline: true, className: "w-full aspect-video object-contain bg-black" }), (0, jsx_runtime_1.jsx)("div", { className: "absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded-md text-sm font-medium", children: "Remote" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => toggleFullscreen('remote'), className: "absolute top-4 right-4 bg-black/70 hover:bg-black/90 text-white p-2 rounded-md transition-colors", title: "Toggle fullscreen", children: "\u26F6" }), !remoteStream && ((0, jsx_runtime_1.jsx)("div", { className: "absolute inset-0 flex items-center justify-center bg-black/50 text-slate-300", children: (0, jsx_runtime_1.jsx)("p", { children: "Waiting for remote video..." }) }))] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "bg-slate-800/20 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center justify-between gap-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 bg-slate-700/30 rounded-lg px-3 py-2", children: [(0, jsx_runtime_1.jsx)("button", { onClick: toggleMicrophone, className: `text-lg ${isMicMuted ? 'text-red-400' : 'text-white'} hover:scale-110 transition-transform`, title: isMicMuted ? 'Unmute microphone' : 'Mute microphone', children: "\uD83C\uDFA4" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1", children: [(0, jsx_runtime_1.jsx)("input", { type: "range", min: "0", max: "100", value: micVolume, onChange: (e) => updateMicVolume(Number(e.target.value)), className: "w-20 h-1 bg-slate-600 rounded-lg outline-none cursor-pointer appearance-none", title: "Microphone volume" }), (0, jsx_runtime_1.jsxs)("span", { className: "text-xs text-slate-400 w-8", children: [micVolume, "%"] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => setShowDeviceDropdowns(prev => ({ ...prev, microphone: !prev.microphone })), className: "text-slate-400 hover:text-white text-sm", title: "Select microphone", children: "\u25BC" }), showDeviceDropdowns.microphone && ((0, jsx_runtime_1.jsx)("div", { className: "absolute bottom-full left-0 mb-1 bg-slate-800/90 backdrop-blur-lg border border-slate-600/50 rounded-lg z-50 min-w-48 max-h-32 overflow-y-auto", children: availableDevices.microphones.map(device => ((0, jsx_runtime_1.jsx)("button", { onClick: () => switchMicrophone(device.deviceId), className: `w-full p-2 text-left text-sm hover:bg-slate-700/50 transition-colors ${selectedDevices.microphone === device.deviceId ? 'bg-blue-600/30 border-l-2 border-blue-500' : ''}`, children: device.label || `Microphone ${device.deviceId.slice(0, 8)}` }, device.deviceId))) }))] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 bg-slate-700/30 rounded-lg px-3 py-2", children: [(0, jsx_runtime_1.jsx)("button", { onClick: toggleCamera, className: `text-lg ${isCameraOff ? 'text-red-400' : 'text-white'} hover:scale-110 transition-transform`, title: isCameraOff ? 'Turn camera on' : 'Turn camera off', children: "\uD83D\uDCF9" }), (0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => setShowDeviceDropdowns(prev => ({ ...prev, camera: !prev.camera })), className: "text-slate-400 hover:text-white text-sm", title: "Select camera", children: "\u25BC" }), showDeviceDropdowns.camera && ((0, jsx_runtime_1.jsx)("div", { className: "absolute bottom-full left-0 mb-1 bg-slate-800/90 backdrop-blur-lg border border-slate-600/50 rounded-lg z-50 min-w-48 max-h-32 overflow-y-auto", children: availableDevices.cameras.map(device => ((0, jsx_runtime_1.jsx)("button", { onClick: () => switchCamera(device.deviceId), className: `w-full p-2 text-left text-sm hover:bg-slate-700/50 transition-colors ${selectedDevices.camera === device.deviceId ? 'bg-blue-600/30 border-l-2 border-blue-500' : ''}`, children: device.label || `Camera ${device.deviceId.slice(0, 8)}` }, device.deviceId))) }))] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 bg-slate-700/30 rounded-lg px-3 py-2", children: [(0, jsx_runtime_1.jsx)("button", { onClick: toggleSpeaker, className: `text-lg ${isSpeakerMuted ? 'text-red-400' : 'text-white'} hover:scale-110 transition-transform`, title: isSpeakerMuted ? 'Unmute speaker' : 'Mute speaker', children: "\uD83D\uDD0A" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1", children: [(0, jsx_runtime_1.jsx)("input", { type: "range", min: "0", max: "100", value: speakerVolume, onChange: (e) => updateSpeakerVolume(Number(e.target.value)), className: "w-20 h-1 bg-slate-600 rounded-lg outline-none cursor-pointer appearance-none", title: "Speaker volume" }), (0, jsx_runtime_1.jsxs)("span", { className: "text-xs text-slate-400 w-8", children: [speakerVolume, "%"] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => setShowDeviceDropdowns(prev => ({ ...prev, speaker: !prev.speaker })), className: "text-slate-400 hover:text-white text-sm", title: "Select speaker", children: "\u25BC" }), showDeviceDropdowns.speaker && ((0, jsx_runtime_1.jsx)("div", { className: "absolute bottom-full left-0 mb-1 bg-slate-800/90 backdrop-blur-lg border border-slate-600/50 rounded-lg z-50 min-w-48 max-h-32 overflow-y-auto", children: availableDevices.speakers.map(device => ((0, jsx_runtime_1.jsx)("button", { onClick: () => switchSpeaker(device.deviceId), className: `w-full p-2 text-left text-sm hover:bg-slate-700/50 transition-colors ${selectedDevices.speaker === device.deviceId ? 'bg-blue-600/30 border-l-2 border-blue-500' : ''}`, children: device.label || `Speaker ${device.deviceId.slice(0, 8)}` }, device.deviceId))) }))] })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex items-center gap-2 bg-slate-700/30 rounded-lg px-3 py-2", children: (0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsxs)("button", { onClick: () => setShowDeviceDropdowns(prev => ({ ...prev, quality: !prev.quality })), className: "flex items-center gap-2 text-sm text-white hover:text-blue-400 transition-colors", title: "Select video quality", children: [(0, jsx_runtime_1.jsx)("span", { children: "\u2699\uFE0F" }), (0, jsx_runtime_1.jsx)("span", { children: qualityOptions.find(q => q.value === selectedQuality)?.label }), (0, jsx_runtime_1.jsx)("span", { className: "text-slate-400", children: "\u25BC" })] }), showDeviceDropdowns.quality && ((0, jsx_runtime_1.jsx)("div", { className: "absolute bottom-full left-0 mb-1 bg-slate-800/90 backdrop-blur-lg border border-slate-600/50 rounded-lg z-50 min-w-48 max-h-32 overflow-y-auto", children: qualityOptions.map(option => ((0, jsx_runtime_1.jsxs)("button", { onClick: () => switchQuality(option.value), className: `w-full p-3 text-left hover:bg-slate-700/50 transition-colors ${selectedQuality === option.value ? 'bg-blue-600/30 border-l-2 border-blue-500' : ''}`, children: [(0, jsx_runtime_1.jsx)("div", { className: "font-medium text-sm", children: option.label }), (0, jsx_runtime_1.jsx)("div", { className: "text-xs text-slate-400", children: option.description })] }, option.value))) }))] }) }), (0, jsx_runtime_1.jsx)("div", { className: "flex items-center gap-2 bg-slate-700/30 rounded-lg px-3 py-2", children: (0, jsx_runtime_1.jsx)("button", { onClick: toggleLocalVideoVisibility, className: `text-lg ${!showLocalVideo ? 'text-slate-500' : 'text-white'} hover:scale-110 transition-transform`, title: showLocalVideo ? 'Hide your video preview' : 'Show your video preview', children: "\uD83D\uDC41\uFE0F" }) })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex justify-center mt-4", children: (0, jsx_runtime_1.jsx)("button", { onClick: endCall, className: "bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition-all transform hover:-translate-y-0.5", children: "\uD83D\uDCDE End Call" }) }), connectionStatus && ((0, jsx_runtime_1.jsx)("div", { className: "mt-3 text-center text-slate-300 text-sm", children: connectionStatus }))] })] }))] })] }));
};
exports.default = VideoCallApp;
