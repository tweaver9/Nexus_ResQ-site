# React Dashboard Application

A modern, responsive dashboard application built with React and Firebase.

## Features

- Modern glass-morphism UI design
- User management panel
- Assets management
- Logs monitoring
- Real-time data with Firebase
- Responsive design
- Authentication system

## Project Structure

```
src/
├── components/
│   ├── atomic/
│   │   └── DashboardComponents.jsx
│   ├── ui/
│   │   ├── badge.jsx
│   │   ├── dialog.jsx
│   │   └── table.jsx
│   ├── CompleteDashboardExample.jsx
│   ├── Sidebar.jsx
│   ├── ModernUserManagementPanel.jsx
│   ├── ModernAssetsPanel.jsx
│   ├── ModernLogsPanel.jsx
│   └── LoginPanel.jsx
├── hooks/
│   ├── useUsers.js
│   ├── useAssets.js
│   ├── useLogs.js
│   ├── useLocations.js
│   ├── useInspections.js
│   └── useAssignments.js
├── lib/
│   ├── firebaseUtils.js
│   └── utils.js
├── contexts/
│   └── AuthContext.js
└── firebase.js
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure Firebase:
   - Update `src/firebase.js` with your Firebase configuration
   - Set up Firestore database
   - Configure authentication

3. Start the development server:
   ```bash
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Firebase Setup

1. Create a Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Enable Firestore Database
3. Enable Authentication (Email/Password)
4. Copy your Firebase config and update `src/firebase.js`

## Available Scripts

- `npm start` - Runs the app in development mode
- `npm build` - Builds the app for production
- `npm test` - Launches the test runner
- `npm eject` - Ejects from Create React App

## Technologies Used

- React 18
- Firebase (Firestore, Authentication)
- Lucide React (Icons)
- CSS3 with glass-morphism effects

## License

This project is private and proprietary.
