import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

// Generic CRUD operations
export const firebaseUtils = {
  // Create a new document
  async createDocument(clientId, collectionName, data) {
    try {
      const docRef = await addDoc(collection(db, `clients/${clientId}/${collectionName}`), {
        ...data,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
      return { id: docRef.id, ...data };
    } catch (error) {
      console.error(`Error creating ${collectionName}:`, error);
      throw error;
    }
  },

  // Update an existing document
  async updateDocument(clientId, collectionName, documentId, data) {
    try {
      const docRef = doc(db, `clients/${clientId}/${collectionName}`, documentId);
      await updateDoc(docRef, {
        ...data,
        updated_at: serverTimestamp()
      });
      return { id: documentId, ...data };
    } catch (error) {
      console.error(`Error updating ${collectionName}:`, error);
      throw error;
    }
  },

  // Delete a document
  async deleteDocument(clientId, collectionName, documentId) {
    try {
      const docRef = doc(db, `clients/${clientId}/${collectionName}`, documentId);
      await deleteDoc(docRef);
      return { success: true, id: documentId };
    } catch (error) {
      console.error(`Error deleting ${collectionName}:`, error);
      throw error;
    }
  },

  // Get a single document
  async getDocument(clientId, collectionName, documentId) {
    try {
      const docRef = doc(db, `clients/${clientId}/${collectionName}`, documentId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        throw new Error('Document not found');
      }
    } catch (error) {
      console.error(`Error getting ${collectionName}:`, error);
      throw error;
    }
  },

  // Get all documents from a collection
  async getDocuments(clientId, collectionName, options = {}) {
    try {
      let q = collection(db, `clients/${clientId}/${collectionName}`);
      
      // Apply filters
      if (options.where) {
        q = query(q, where(options.where.field, options.where.operator, options.where.value));
      }
      
      // Apply ordering
      if (options.orderBy) {
        q = query(q, orderBy(options.orderBy.field, options.orderBy.direction || 'asc'));
      }
      
      // Apply limit
      if (options.limit) {
        q = query(q, limit(options.limit));
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error(`Error getting ${collectionName}:`, error);
      throw error;
    }
  }
};

// Specific operations for different collections
export const userOperations = {
  async createUser(clientId, userData) {
    return firebaseUtils.createDocument(clientId, 'users', {
      ...userData,
      status: userData.status || 'active',
      role: userData.role || 'user'
    });
  },

  async updateUser(clientId, userId, userData) {
    return firebaseUtils.updateDocument(clientId, 'users', userId, userData);
  },

  async deleteUser(clientId, userId) {
    return firebaseUtils.deleteDocument(clientId, 'users', userId);
  },

  async getUser(clientId, userId) {
    return firebaseUtils.getDocument(clientId, 'users', userId);
  },

  async getUsers(clientId, options = {}) {
    return firebaseUtils.getDocuments(clientId, 'users', options);
  }
};

export const assetOperations = {
  async createAsset(clientId, assetData) {
    return firebaseUtils.createDocument(clientId, 'assets', {
      ...assetData,
      status: assetData.status !== undefined ? assetData.status : true
    });
  },

  async updateAsset(clientId, assetId, assetData) {
    return firebaseUtils.updateDocument(clientId, 'assets', assetId, assetData);
  },

  async deleteAsset(clientId, assetId) {
    return firebaseUtils.deleteDocument(clientId, 'assets', assetId);
  },

  async getAsset(clientId, assetId) {
    return firebaseUtils.getDocument(clientId, 'assets', assetId);
  },

  async getAssets(clientId, options = {}) {
    return firebaseUtils.getDocuments(clientId, 'assets', options);
  }
};

export const locationOperations = {
  async createLocation(clientId, locationData) {
    return firebaseUtils.createDocument(clientId, 'locations', locationData);
  },

  async updateLocation(clientId, locationId, locationData) {
    return firebaseUtils.updateDocument(clientId, 'locations', locationId, locationData);
  },

  async deleteLocation(clientId, locationId) {
    return firebaseUtils.deleteDocument(clientId, 'locations', locationId);
  },

  async getLocation(clientId, locationId) {
    return firebaseUtils.getDocument(clientId, 'locations', locationId);
  },

  async getLocations(clientId, options = {}) {
    return firebaseUtils.getDocuments(clientId, 'locations', options);
  }
};

export const logOperations = {
  async createLog(clientId, logData) {
    return firebaseUtils.createDocument(clientId, 'logs', {
      ...logData,
      timestamp: serverTimestamp()
    });
  },

  async getLogs(clientId, options = {}) {
    const defaultOptions = {
      orderBy: { field: 'timestamp', direction: 'desc' },
      limit: 100,
      ...options
    };
    return firebaseUtils.getDocuments(clientId, 'logs', defaultOptions);
  }
}; 