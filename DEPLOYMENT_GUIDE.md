# Nexus Res-Q Production Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying the Nexus Res-Q platform to production with enterprise-grade security and performance.

## Prerequisites

### Required Accounts & Services
- Firebase Project (with Firestore, Authentication, Hosting)
- Domain name for production deployment
- SSL certificate (Firebase Hosting provides this automatically)
- Email service for notifications (optional)

### Development Environment
- Node.js 16+ (for Firebase CLI)
- Git (for version control)
- Code editor (VS Code recommended)

## 1. Environment Setup

### 1.1 Install Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

### 1.2 Initialize Firebase Project
```bash
firebase init
# Select: Firestore, Hosting, Storage (optional)
# Choose existing project or create new one
```

### 1.3 Environment Variables
Copy `.env.example` to `.env` and configure:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Production Settings
NODE_ENV=production
VITE_APP_URL=https://your-domain.com
VITE_API_URL=https://your-api-domain.com
```

## 2. Firebase Configuration

### 2.1 Firestore Security Rules
Deploy the production security rules:

```bash
firebase deploy --only firestore:rules
```

Verify rules are deployed correctly in Firebase Console.

### 2.2 Firestore Indexes
Create required indexes for optimal performance:

```javascript
// Required indexes (create in Firebase Console)
Collection: clients/{clientId}/users
Fields: username (Ascending), active (Ascending)

Collection: clients/{clientId}/assets  
Fields: location (Ascending), sublocation (Ascending), created (Descending)

Collection: clients/{clientId}/inspectionRecords
Fields: assetId (Ascending), timestamp (Descending)

Collection: clients/{clientId}/messages
Fields: isRead (Ascending), timestamp (Descending)

Collection: nexus_messages
Fields: status (Ascending), priority (Ascending), timestamp (Descending)
```

### 2.3 Authentication Configuration
1. Enable Custom Token authentication in Firebase Console
2. Configure authorized domains for production
3. Set up password policies (minimum 6 characters)

## 3. Security Configuration

### 3.1 Domain Security
Configure in Firebase Console > Authentication > Settings:
- Add production domain to authorized domains
- Enable email verification (optional)
- Configure password reset settings

### 3.2 CORS Configuration
For API endpoints, configure CORS headers:
```javascript
// Example CORS configuration
{
  "origin": ["https://your-domain.com", "https://nexusresq.com"],
  "methods": ["GET", "POST", "PUT", "DELETE"],
  "allowedHeaders": ["Content-Type", "Authorization"]
}
```

### 3.3 Rate Limiting
Implement rate limiting for API endpoints:
- Login attempts: 5 per minute per IP
- Message sending: 10 per hour per user
- Asset creation: 100 per hour per user

## 4. Performance Optimization

### 4.1 Firestore Optimization
- Enable offline persistence
- Implement pagination for large datasets
- Use composite indexes for complex queries
- Cache frequently accessed data

### 4.2 Frontend Optimization
- Minify and compress JavaScript/CSS
- Implement lazy loading for components
- Use CDN for static assets
- Enable gzip compression

### 4.3 Monitoring Setup
Configure monitoring and alerting:
- Firebase Performance Monitoring
- Error tracking (Sentry recommended)
- Uptime monitoring
- Database performance metrics

## 5. Deployment Process

### 5.1 Pre-deployment Checklist
- [ ] All environment variables configured
- [ ] Security rules tested and deployed
- [ ] Database indexes created
- [ ] Performance testing completed
- [ ] Security audit passed
- [ ] Backup procedures tested

### 5.2 Deploy to Firebase Hosting
```bash
# Build production assets
npm run build

# Deploy to Firebase
firebase deploy --only hosting

# Deploy specific functions (if using)
firebase deploy --only functions

# Deploy everything
firebase deploy
```

### 5.3 Custom Domain Setup
1. Add custom domain in Firebase Console
2. Configure DNS records:
   ```
   Type: A
   Name: @
   Value: 151.101.1.195, 151.101.65.195
   
   Type: CNAME
   Name: www
   Value: your-project.web.app
   ```
3. Wait for SSL certificate provisioning (24-48 hours)

## 6. Post-Deployment Configuration

### 6.1 Create Initial Data
```javascript
// Create default asset types
const defaultAssetTypes = [
  { name: "Fire Extinguisher", code: "FE", category: "Safety" },
  { name: "Emergency Light", code: "EL", category: "Safety" },
  { name: "Exit Sign", code: "ES", category: "Safety" }
];

// Create default question templates
const defaultQuestions = [
  { question: "Is the asset in good condition?", type: "boolean" },
  { question: "Any visible damage?", type: "boolean" },
  { question: "Additional notes", type: "text" }
];
```

### 6.2 Create First Nexus Admin User
```javascript
// Create Nexus admin user (run once)
const nexusAdmin = {
  username: "nexusadmin",
  firstName: "Nexus",
  lastName: "Administrator", 
  role: "nexus",
  hashedPassword: await bcrypt.hash("secure_password", 10),
  active: true,
  created: new Date().toISOString()
};
```

### 6.3 Configure Client Onboarding
Set up automated client onboarding:
- Default locations creation
- Initial admin user setup
- Welcome email templates
- Billing integration (if applicable)

## 7. Monitoring & Maintenance

### 7.1 Health Checks
Implement automated health checks:
- Database connectivity
- Authentication service
- API endpoints
- File upload functionality

### 7.2 Backup Strategy
- Firestore automatic backups (daily)
- Export critical data weekly
- Test restore procedures monthly
- Document recovery processes

### 7.3 Update Procedures
- Security patches: Apply immediately
- Feature updates: Test in staging first
- Database migrations: Plan during low usage
- Rollback procedures documented

## 8. Security Best Practices

### 8.1 Regular Security Audits
- Review Firestore security rules monthly
- Audit user permissions quarterly
- Penetration testing annually
- Dependency vulnerability scans weekly

### 8.2 Data Protection
- Encrypt sensitive data at rest
- Use HTTPS for all communications
- Implement proper session management
- Regular security training for team

### 8.3 Compliance
- GDPR compliance for EU users
- SOC 2 compliance for enterprise clients
- Regular compliance audits
- Data retention policies

## 9. Troubleshooting

### 9.1 Common Issues
- **Authentication failures**: Check security rules and user permissions
- **Slow queries**: Review indexes and query optimization
- **CORS errors**: Verify domain configuration
- **Rate limiting**: Check Firebase quotas and limits

### 9.2 Support Contacts
- Firebase Support: [Firebase Console Support]
- Nexus Res-Q Team: support@nexusresq.com
- Emergency Contact: [24/7 support number]

## 10. Scaling Considerations

### 10.1 Database Scaling
- Monitor read/write operations
- Implement data archiving for old records
- Consider regional deployment for global users
- Plan for multi-region backup

### 10.2 Performance Scaling
- CDN for global content delivery
- Load balancing for high traffic
- Caching strategies for frequently accessed data
- Database connection pooling

## Conclusion

Following this deployment guide ensures a secure, scalable, and maintainable production deployment of the Nexus Res-Q platform. Regular monitoring and maintenance are crucial for optimal performance and security.

For additional support or questions, contact the Nexus Res-Q development team.
