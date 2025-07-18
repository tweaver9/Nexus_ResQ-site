import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import AppWithRouter from './App.jsx';
import { AuthProvider } from './contexts/AuthContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <AppWithRouter />
    </AuthProvider>
  </React.StrictMode>
);
