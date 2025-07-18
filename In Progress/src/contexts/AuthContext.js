import React, { createContext, useContext, useState, useEffect } from 'react';

// MOCK AUTH - NO FIREBASE WRITES, SAFE FOR DEMO
const mockUser = {
  uid: 'demo-user-123',
  email: 'demo@company.com',
  displayName: 'Demo User'
};

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(mockUser); // Always logged in for demo
  const [loading, setLoading] = useState(false); // No loading needed for demo

  const login = async (email, password) => {
    // Mock login - always succeeds for demo
    console.log('Demo login - no actual authentication');
    setCurrentUser(mockUser);
    return Promise.resolve();
  };

  const logout = () => {
    // Mock logout
    console.log('Demo logout - no actual sign out');
    setCurrentUser(null);
    return Promise.resolve();
  };

  const value = {
    currentUser,
    clientId: 'demo-client-123', // Mock client ID for demo
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
