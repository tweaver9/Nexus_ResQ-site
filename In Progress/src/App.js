import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import CompleteDashboardExample from './components/CompleteDashboardExample';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <CompleteDashboardExample />
      </div>
    </AuthProvider>
  );
}

export default App;
