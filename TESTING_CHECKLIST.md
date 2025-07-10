# Nexus Res-Q Firebase Refactor - Testing Checklist

## Pre-Testing Setup

### 1. Session Storage Requirements
Before testing, ensure your browser session has:
- `tenant_id` or `clientSubdomain` - Your client identifier
- `username` - Your username
- `role` - Your role (admin, manager, user, nexus)
- `clientName` - Your client's display name
- `clientLogoUrl` - (optional) Your client's logo URL

### 2. Test Client Setup
Use the onboarding system or manually create a test client with:
- Client subdomain (e.g., "testclient")
- Admin user in client-specific users collection
- Basic locations
- Placeholder documents in required collections

## Core Functionality Tests

### ✅ 1. Firebase Configuration & Utilities
- [ ] `getCurrentClientSubdomain()` returns correct subdomain
- [ ] `getClientCollection()` generates correct paths
- [ ] `getClientDoc()` generates correct document references
- [ ] `validateClientExists()` correctly validates clients
- [ ] `getClientSettings()` loads client configuration

### ✅ 2. Onboarding System
- [ ] Creates client root document with proper structure
- [ ] Creates admin user in client-specific users collection
- [ ] Creates locations with UUIDs
- [ ] Creates placeholder documents in all required collections
- [ ] Handles custom asset types and question templates correctly
- [ ] Stores comprehensive settings object

### ✅ 3. Authentication & Session Management
- [ ] Login validates client subdomain exists
- [ ] Session storage includes all required client context
- [ ] Client settings are loaded and cached
- [ ] Proper error handling for invalid subdomains

### ✅ 4. Asset Management
- [ ] Loads assets from client-specific collection
- [ ] Asset type loading uses fallback logic correctly
- [ ] Asset creation saves to correct client collection
- [ ] Asset editing works with client-specific paths
- [ ] Asset deletion works correctly
- [ ] Bulk operations target correct collections

### ✅ 5. Dashboard System
- [ ] Loads failed assets from client-specific inspectionRecords
- [ ] Loads recent inspections from client-specific inspectionRecords
- [ ] Area status loading uses client-specific locations
- [ ] All data is properly isolated by client
- [ ] Error handling works correctly

### ✅ 6. Inspection System
- [ ] Loads inspections from client-specific inspectionRecords
- [ ] Area filtering uses client-specific locations
- [ ] Asset type filtering uses fallback logic
- [ ] Inspection details modal works correctly
- [ ] Data isolation is maintained

### ✅ 7. Location Management
- [ ] Loads locations from client-specific collection
- [ ] Location hierarchy creation works
- [ ] Sub-location creation targets correct collection
- [ ] Placeholder documents are handled correctly

## Data Isolation Tests

### 8. Multi-Tenant Isolation
- [ ] Client A cannot see Client B's assets
- [ ] Client A cannot see Client B's users
- [ ] Client A cannot see Client B's locations
- [ ] Client A cannot see Client B's inspection records
- [ ] Cross-client data access is prevented

### 9. Fallback Logic Tests
- [ ] Asset types fall back to global when client-specific empty
- [ ] Question templates fall back to global when client-specific empty
- [ ] Default categories are used when no asset types found
- [ ] Graceful degradation when global collections are empty

## User Interface Tests

### 10. Navigation & Context
- [ ] Dashboard shows correct client name and logo
- [ ] All pages maintain client context
- [ ] Session persistence works across page reloads
- [ ] Logout clears all session data

### 11. Error Handling
- [ ] Graceful handling of missing client subdomain
- [ ] Proper error messages for invalid clients
- [ ] Network error handling
- [ ] Permission error handling

## Performance Tests

### 12. Loading Performance
- [ ] Asset loading is reasonably fast
- [ ] Location loading is efficient
- [ ] Caching works correctly for asset types
- [ ] No unnecessary Firebase calls

### 13. Caching
- [ ] Asset types are cached per client
- [ ] Cache invalidation works correctly
- [ ] Client settings are cached appropriately

## Integration Tests

### 14. End-to-End Workflows
- [ ] Complete onboarding → login → asset management workflow
- [ ] User creation → login → inspection workflow
- [ ] Location creation → asset assignment → inspection workflow
- [ ] Multi-user scenarios work correctly

### 15. Backend Integration
- [ ] User management API works with new structure
- [ ] Authentication API handles client context
- [ ] Password reset works with client-specific users

## Browser Compatibility

### 16. Cross-Browser Testing
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Edge

## Security Tests

### 17. Access Control
- [ ] Role-based access control works
- [ ] Client data isolation is enforced
- [ ] No unauthorized cross-client access
- [ ] Session security is maintained

## Regression Tests

### 18. Backward Compatibility
- [ ] Existing clients continue to work
- [ ] Legacy data access patterns still function
- [ ] No breaking changes for existing users

## Test Tools

### Automated Testing
Use `test-firebase-structure.html` for:
- Client context validation
- Asset types fallback testing
- Collection structure verification
- Data loading validation

### Manual Testing
1. Create test client via onboarding
2. Login with test client credentials
3. Navigate through all major features
4. Verify data isolation
5. Test error scenarios

## Known Issues & Limitations

### Current Limitations
- Backend API may need updates for client-specific user storage
- Some legacy HTML files may still reference old patterns
- Admin tools need full multi-tenant support

### Future Enhancements
- Comprehensive automated test suite
- Performance monitoring
- Advanced caching strategies
- Enhanced error reporting

## Success Criteria

The refactor is successful when:
1. ✅ All core functionality works with new structure
2. ✅ Complete data isolation between clients
3. ✅ Fallback logic works correctly
4. ✅ No breaking changes for existing workflows
5. ✅ Performance is maintained or improved
6. [ ] All tests in this checklist pass
7. [ ] Backend integration is complete
8. [ ] Documentation is updated
