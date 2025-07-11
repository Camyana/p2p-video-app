"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Test;
const jsx_runtime_1 = require("react/jsx-runtime");
// This is just the end part to test the syntax
function Test() {
    return ((0, jsx_runtime_1.jsx)("div", { className: "min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white", children: (0, jsx_runtime_1.jsx)("main", { className: "flex-1 flex items-center justify-center p-5", children: true && ((0, jsx_runtime_1.jsx)("div", { className: "w-full h-full flex flex-col gap-5", children: (0, jsx_runtime_1.jsxs)("div", { className: "bg-slate-800/20 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-4", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex flex-wrap items-center justify-between gap-4", children: (0, jsx_runtime_1.jsx)("button", { onClick: () => { }, children: "End Call" }) }), true && ((0, jsx_runtime_1.jsx)("div", { className: "mt-3 text-center text-slate-300 text-sm", children: "Connection Status" }))] }) })) }) }));
}
;
