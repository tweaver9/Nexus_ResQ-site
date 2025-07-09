# Backend Updates Needed

Your current backend index.js needs the following updates to fully support the frontend:

## 1. Update SIGNUP endpoint to handle firstName/lastName

Current signup only handles:
```javascript
const { newUsername, newPassword, role } = req.body;
```

Should be updated to:
```javascript
const { newUsername, newPassword, role, firstName, lastName } = req.body;

await userRef.set({
  username: newUsername,
  firstName: firstName || '',
  lastName: lastName || '',
  hashedPassword,
  role: role || "user",
  active: true,
  must_change_password: true,
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
});
```

## 2. Add Location/UUID Management Endpoints (NEW)

The frontend now creates structured location data with UUIDs. Add these endpoints for mobile app/API access:

### Get Client Locations:
```javascript
app.get("/locations", async (req, res) => {
  try {
    const locationsRef = db.collection("clients").doc(req.subdomain).collection("locations");
    const snapshot = await locationsRef.get();
    const locations = [];
    snapshot.forEach(doc => {
      locations.push({
        id: doc.id,
        ...doc.data()
      });
    });
    res.json(locations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Get Location Configuration:
```javascript
app.get("/location-config", async (req, res) => {
  try {
    const configDoc = await db.collection("clients").doc(req.subdomain)
      .collection("location_config").doc("settings").get();
    
    if (!configDoc.exists) {
      return res.status(404).json({ error: "Location configuration not found" });
    }
    
    res.json(configDoc.data());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Validate Location Code:
```javascript
app.post("/validate-location", async (req, res) => {
  try {
    const { locationCode } = req.body;
    
    // Check if location code exists
    const locationsRef = db.collection("clients").doc(req.subdomain).collection("locations");
    const snapshot = await locationsRef.where("fullLocationCode", "==", locationCode).get();
    
    if (snapshot.empty) {
      return res.json({ valid: false, message: "Location code not found" });
    }
    
    const locationData = snapshot.docs[0].data();
    res.json({ 
      valid: true, 
      location: {
        name: locationData.name,
        uuid: locationData.uuid,
        divisionType: locationData.divisionType
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## 3. Add missing endpoints that frontend uses:

### List Users endpoint (for manage-users.js):
```javascript
app.post("/list-users", requireAdmin, async (req, res) => {
  try {
    const usersRef = db.collection("clients").doc(req.subdomain).collection("users");
    const snapshot = await usersRef.get();
    const users = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (!data.soft_deleted) {
        users.push({
          id: doc.id,
          username: data.username,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          role: data.role,
          active: data.active !== false
        });
      }
    });
    res.json(users);
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Failed to list users' });
  }
});
```

## 4. Update the role checking middleware

The current role check looks for a user document by username, but it should handle the case where the username in the request might be the current user making the request, not necessarily the target user.

## 5. Current issues with frontend integration:

1. **onboard.html** - ✅ Fixed to use `hashedPassword`, `firstName`, `lastName`, `active`, `createdAt`
2. **login.js** - ✅ Fixed to use correct API format and store role from response
3. **manage-users.js** - ✅ Updated to use backend endpoints, but needs backend to support firstName/lastName
4. **change-password.js** - ✅ Fixed to use reset-password endpoint with subdomain

## 6. Frontend changes made:

All frontend files have been updated to:
- Use consistent Firebase v10+ ESM imports where possible
- Send `subdomain` in API requests as expected by backend
- Use `firstName`/`lastName` instead of `first_name`/`last_name`
- Use `hashedPassword` instead of `password` in database writes
- Use backend API endpoints instead of direct Firestore writes for user management

Once you update the backend with the missing firstName/lastName support and the list-users endpoint, the frontend should work seamlessly with your backend API.
