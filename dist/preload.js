/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "electron":
/*!***************************!*\
  !*** external "electron" ***!
  \***************************/
/***/ ((module) => {

module.exports = require("electron");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;
/*!************************!*\
  !*** ./src/preload.ts ***!
  \************************/

Object.defineProperty(exports, "__esModule", ({ value: true }));
const electron_1 = __webpack_require__(/*! electron */ "electron");
// Expose IPC methods to the renderer process
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    startSignalingServer: () => electron_1.ipcRenderer.invoke('start-signaling-server'),
    stopSignalingServer: () => electron_1.ipcRenderer.invoke('stop-signaling-server'),
    isSignalingServerRunning: () => electron_1.ipcRenderer.invoke('is-signaling-server-running'),
    checkForUpdates: () => electron_1.ipcRenderer.invoke('check-for-updates'),
    getAppVersion: () => electron_1.ipcRenderer.invoke('get-app-version'),
});

})();

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlbG9hZC5qcyIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUEscUM7Ozs7OztVQ0FBO1VBQ0E7O1VBRUE7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7O1VBRUE7VUFDQTs7VUFFQTtVQUNBO1VBQ0E7Ozs7Ozs7Ozs7QUN0QmE7QUFDYiw4Q0FBNkMsRUFBRSxhQUFhLEVBQUM7QUFDN0QsbUJBQW1CLG1CQUFPLENBQUMsMEJBQVU7QUFDckM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxDQUFDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vcDJwLXZpZGVvL2V4dGVybmFsIG5vZGUtY29tbW9uanMgXCJlbGVjdHJvblwiIiwid2VicGFjazovL3AycC12aWRlby93ZWJwYWNrL2Jvb3RzdHJhcCIsIndlYnBhY2s6Ly9wMnAtdmlkZW8vLi9zcmMvcHJlbG9hZC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJlbGVjdHJvblwiKTsiLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHR2YXIgY2FjaGVkTW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXTtcblx0aWYgKGNhY2hlZE1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIGNhY2hlZE1vZHVsZS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuXHRcdC8vIG5vIG1vZHVsZS5pZCBuZWVkZWRcblx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuXHRcdGV4cG9ydHM6IHt9XG5cdH07XG5cblx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdKG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5jb25zdCBlbGVjdHJvbl8xID0gcmVxdWlyZShcImVsZWN0cm9uXCIpO1xuLy8gRXhwb3NlIElQQyBtZXRob2RzIHRvIHRoZSByZW5kZXJlciBwcm9jZXNzXG5lbGVjdHJvbl8xLmNvbnRleHRCcmlkZ2UuZXhwb3NlSW5NYWluV29ybGQoJ2VsZWN0cm9uQVBJJywge1xuICAgIHN0YXJ0U2lnbmFsaW5nU2VydmVyOiAoKSA9PiBlbGVjdHJvbl8xLmlwY1JlbmRlcmVyLmludm9rZSgnc3RhcnQtc2lnbmFsaW5nLXNlcnZlcicpLFxuICAgIHN0b3BTaWduYWxpbmdTZXJ2ZXI6ICgpID0+IGVsZWN0cm9uXzEuaXBjUmVuZGVyZXIuaW52b2tlKCdzdG9wLXNpZ25hbGluZy1zZXJ2ZXInKSxcbiAgICBpc1NpZ25hbGluZ1NlcnZlclJ1bm5pbmc6ICgpID0+IGVsZWN0cm9uXzEuaXBjUmVuZGVyZXIuaW52b2tlKCdpcy1zaWduYWxpbmctc2VydmVyLXJ1bm5pbmcnKSxcbiAgICBjaGVja0ZvclVwZGF0ZXM6ICgpID0+IGVsZWN0cm9uXzEuaXBjUmVuZGVyZXIuaW52b2tlKCdjaGVjay1mb3ItdXBkYXRlcycpLFxuICAgIGdldEFwcFZlcnNpb246ICgpID0+IGVsZWN0cm9uXzEuaXBjUmVuZGVyZXIuaW52b2tlKCdnZXQtYXBwLXZlcnNpb24nKSxcbn0pO1xuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9