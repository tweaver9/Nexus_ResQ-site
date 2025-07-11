# Nexus Res-Q Asset Inspection Platform

## Overview
Nexus Res-Q is an enterprise-grade asset inspection and compliance management platform designed for industrial facilities, refineries, and petrochemical companies. The system provides comprehensive tracking, inspection management, and compliance reporting for critical safety assets.

## Target Industries
- Industrial Refineries (Exxon, BP, Chevron, Citgo)
- Petrochemical Companies (Dow, DuPont, Westlake Chemical)
- Manufacturing Facilities
- Any organization requiring NFPA-compliant asset inspections

## Technology Stack
- **Frontend**: Modern HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase Firestore (multi-tenant architecture)
- **Authentication**: Custom JWT with role-based access control
- **Styling**: Modern CSS variables with Inter font family
- **Mobile**: Responsive design optimized for field work

## Key Features
- ✅ Multi-tenant client isolation
- ✅ Role-based permissions (nexus/admin/manager/user)
- ✅ Real-time asset tracking and inspection management
- ✅ Barcode scanning integration for mobile devices
- ✅ Automated compliance reporting and PDF export
- ✅ Comprehensive audit logging
- ✅ Direct messaging portal for client-to-Nexus communication
- ✅ Intelligent location hierarchy with precision codes

## Location Hierarchy System

The platform uses a sophisticated 3-level location hierarchy for precise asset tracking:

### Level Structure
- **Level 0**: Broad areas (Zone 3 - Code: 359)
- **Level 1**: Buildings/Units (G Unit - Code: 883)
- **Level 2**: Precise locations (NW Alleyway - Code: 7485)

### Barcode Generation
Combined location codes create unique identifiers: `3598837485`
- Enables exact asset positioning
- Supports client-specific or auto-generated codes
- Flexible concatenation for different facility layouts

## Inspection Workflow

1. **Asset Scanning**: Barcode scanning via mobile devices
2. **Dynamic Questioning**: Type-specific inspection questions
3. **Real-time Logging**: Timestamped results with user signatures
4. **Report Generation**: Automated PDF compilation
5. **Compliance Tracking**: NFPA-compliant reporting and audit trails

## Query Capabilities
- Filter by User, Date, Location, Manager, Asset Type
- Advanced search and filtering
- Export capabilities (PDF, CSV)
- Real-time dashboard analytics

## File Structure

```
├── CSS/                    # Stylesheets
│   ├── nexus-modern.css   # Modern CSS variables (primary)
│   ├── dashboard.css      # Dashboard-specific styles
│   ├── login.css          # Login page styles
│   └── ...
├── logos/                 # Client logos and branding
├── dashboard.html         # Main application dashboard
├── login.html            # Authentication page
├── manage-assets.html    # Asset management interface
├── manage-users.html     # User management interface
├── onboard.html          # Client onboarding wizard
├── firebase.js           # Firebase configuration
├── firestore.rules       # Security rules
└── README.txt            # This file
```

## Security & Compliance

- Multi-tenant data isolation
- Role-based access control (RBAC)
- Comprehensive audit logging
- NFPA compliance reporting
- Enterprise-grade security rules

## Development Notes

- Uses modern JavaScript ES6+ features
- Responsive design for mobile field work
- Real-time Firebase integration
- Production-ready with proper error handling
- No demo/dummy data in production builds
