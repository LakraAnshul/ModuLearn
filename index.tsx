
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Initialize dev tools in development mode
if (import.meta.env.DEV) {
  import('./lib/timestampDevTools').catch(err => {
    console.warn('Failed to initialize timestamp dev tools:', err);
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
