// messaging.js - Client-to-Nexus messaging system

import { 
  db, 
  getCurrentClientSubdomain, 
  getClientCollection, 
  getClientDoc 
} from './firebase.js';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  where, 
  updateDoc,
  doc,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/**
 * Messaging System Schema:
 * 
 * /clients/{clientSubdomain}/messages/{messageId}
 * {
 *   id: string,
 *   threadId: string, // Groups related messages
 *   fromUser: string, // username
 *   fromRole: string, // user role
 *   toRole: string, // 'nexus' or 'client'
 *   subject: string,
 *   message: string,
 *   timestamp: timestamp,
 *   isRead: boolean,
 *   priority: string, // 'low', 'normal', 'high', 'urgent'
 *   status: string, // 'open', 'in_progress', 'resolved', 'closed'
 *   attachments: array, // future enhancement
 *   clientSubdomain: string
 * }
 * 
 * Also logged to /clients/{clientSubdomain}/logs for permanent record
 */

class MessagingSystem {
  constructor() {
    this.currentUser = null;
    this.currentClient = null;
    this.isNexusUser = false;
    this.init();
  }

  async init() {
    // Get current user context
    const userSession = sessionStorage.getItem('nexusUser');
    const clientSubdomain = sessionStorage.getItem('clientSubdomain');

    if (userSession && clientSubdomain) {
      this.currentUser = JSON.parse(userSession);
      this.currentClient = clientSubdomain;
      this.isNexusUser = this.currentUser.role === 'nexus';
    } else {
      console.log('Messaging system not initialized - missing user session or client context');
    }
  }

  // Send message from client to Nexus
  async sendMessageToNexus(subject, message, priority = 'normal') {
    if (!this.currentUser || !this.currentClient) {
      throw new Error('User not authenticated or client context missing');
    }

    const messageData = {
      threadId: this.generateThreadId(),
      fromUser: this.currentUser.username,
      fromRole: this.currentUser.role,
      toRole: 'nexus',
      subject: subject,
      message: message,
      timestamp: serverTimestamp(),
      isRead: false,
      priority: priority,
      status: 'open',
      clientSubdomain: this.currentClient,
      clientName: sessionStorage.getItem('clientName') || this.currentClient
    };

    try {
      // Add to client's messages collection
      const messageRef = await addDoc(
        getClientCollection(this.currentClient, 'messages'), 
        messageData
      );

      // Log to client's logs collection for permanent record
      await addDoc(getClientCollection(this.currentClient, 'logs'), {
        action: 'message_sent_to_nexus',
        messageId: messageRef.id,
        fromUser: this.currentUser.username,
        subject: subject,
        timestamp: new Date().toISOString(),
        priority: priority
      });

      // Also add to global nexus_messages for Nexus users to see
      await addDoc(collection(db, 'nexus_messages'), {
        ...messageData,
        messageId: messageRef.id,
        clientMessageRef: `clients/${this.currentClient}/messages/${messageRef.id}`
      });

      return messageRef.id;
    } catch (error) {
      console.error('Error sending message to Nexus:', error);
      throw error;
    }
  }

  // Send response from Nexus to client
  async sendNexusResponse(clientSubdomain, threadId, message, status = 'in_progress') {
    if (!this.isNexusUser) {
      throw new Error('Only Nexus users can send responses');
    }

    const responseData = {
      threadId: threadId,
      fromUser: this.currentUser.username,
      fromRole: 'nexus',
      toRole: 'client',
      subject: 'Re: Support Response',
      message: message,
      timestamp: serverTimestamp(),
      isRead: false,
      priority: 'normal',
      status: status,
      clientSubdomain: clientSubdomain
    };

    try {
      // Add to client's messages collection
      const responseRef = await addDoc(
        collection(db, 'clients', clientSubdomain, 'messages'), 
        responseData
      );

      // Log to client's logs collection
      await addDoc(collection(db, 'clients', clientSubdomain, 'logs'), {
        action: 'nexus_response_received',
        messageId: responseRef.id,
        fromUser: this.currentUser.username,
        threadId: threadId,
        timestamp: new Date().toISOString(),
        status: status
      });

      return responseRef.id;
    } catch (error) {
      console.error('Error sending Nexus response:', error);
      throw error;
    }
  }

  // Get messages for current client
  async getClientMessages(limit = 50) {
    if (!this.currentClient) {
      throw new Error('Client context missing');
    }

    try {
      const q = query(
        getClientCollection(this.currentClient, 'messages'),
        orderBy('timestamp', 'desc'),
        limit(limit)
      );

      const snapshot = await getDocs(q);
      const messages = [];

      snapshot.forEach(doc => {
        messages.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date()
        });
      });

      return messages;
    } catch (error) {
      console.error('Error getting client messages:', error);
      throw error;
    }
  }

  // Get all messages for Nexus users (across all clients)
  async getAllNexusMessages(limit = 100) {
    if (!this.isNexusUser) {
      throw new Error('Only Nexus users can access all messages');
    }

    try {
      const q = query(
        collection(db, 'nexus_messages'),
        orderBy('timestamp', 'desc'),
        limit(limit)
      );

      const snapshot = await getDocs(q);
      const messages = [];

      snapshot.forEach(doc => {
        messages.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date()
        });
      });

      return messages;
    } catch (error) {
      console.error('Error getting Nexus messages:', error);
      throw error;
    }
  }

  // Mark message as read
  async markAsRead(messageId) {
    try {
      if (this.isNexusUser) {
        // Update in nexus_messages
        await updateDoc(doc(db, 'nexus_messages', messageId), {
          isRead: true
        });
      } else {
        // Update in client messages
        await updateDoc(
          doc(db, 'clients', this.currentClient, 'messages', messageId), 
          { isRead: true }
        );
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
  }

  // Update message status
  async updateMessageStatus(messageId, status) {
    if (!this.isNexusUser) {
      throw new Error('Only Nexus users can update message status');
    }

    try {
      await updateDoc(doc(db, 'nexus_messages', messageId), {
        status: status
      });
    } catch (error) {
      console.error('Error updating message status:', error);
      throw error;
    }
  }

  // Generate unique thread ID
  generateThreadId() {
    return `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get unread message count
  async getUnreadCount() {
    try {
      // Check if we have valid context
      if (!this.currentUser || !this.currentClient) {
        return 0;
      }

      let q;

      if (this.isNexusUser) {
        q = query(
          collection(db, 'nexus_messages'),
          where('isRead', '==', false)
        );
      } else {
        q = query(
          getClientCollection(this.currentClient, 'messages'),
          where('isRead', '==', false),
          where('toRole', '==', 'client')
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const messagingSystem = new MessagingSystem();
