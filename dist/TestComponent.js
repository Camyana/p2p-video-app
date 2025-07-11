"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const TestComponent = () => {
    const mode = 'hosting';
    return ((0, jsx_runtime_1.jsx)("div", { children: (0, jsx_runtime_1.jsx)("main", { children: mode === 'hosting' && ((0, jsx_runtime_1.jsx)("div", { children: (0, jsx_runtime_1.jsx)("div", { children: (0, jsx_runtime_1.jsx)("h2", { children: "Test" }) }) })) }) }));
};
exports.default = TestComponent;
