import React from 'react';
import { createRoot } from 'react-dom/client';
import VideoCallApp from './VideoCallApp';
import './styles.css';

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(<VideoCallApp />);
