// nexus-admin.js - Nexus Admin Portal for Message Management

import { db } from './firebase.js';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  where, 
  updateDoc,
  addDoc,
  doc,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

class NexusAdmin {
  constructor() {
    this.messages = [];
    this.clients = [];
    this.currentFilter = {
      priority: '',
      status: '',
      client: ''
    };
    this.init();
  }

  async init() {
    // Check if user is Nexus admin
    const userRole = sessionStorage.getItem('role');
    if (!userRole || userRole.toLowerCase() !== 'nexus') {
      alert('Access denied. This portal is only for Nexus employees.');
      window.location.href = 'login.html';
      return;
    }

    this.setupEventListeners();
    await this.loadData();
  }

  setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.admin-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabName = e.target.dataset.tab;
        this.switchTab(tabName);
      });
    });

    // Filters
    document.getElementById('priority-filter').addEventListener('change', (e) => {
      this.currentFilter.priority = e.target.value;
      this.filterMessages();
    });

    document.getElementById('status-filter').addEventListener('change', (e) => {
      this.currentFilter.status = e.target.value;
      this.filterMessages();
    });

    document.getElementById('client-filter').addEventListener('change', (e) => {
      this.currentFilter.client = e.target.value;
      this.filterMessages();
    });
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.admin-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    // Load data for specific tabs
    if (tabName === 'stats') {
      this.updateStatistics();
    } else if (tabName === 'clients') {
      this.loadClientOverview();
    }
  }

  async loadData() {
    try {
      await Promise.all([
        this.loadMessages(),
        this.loadClients()
      ]);
      this.populateClientFilter();
      this.updateStatistics();
    } catch (error) {
      console.error('Error loading data:', error);
      this.showError('Failed to load data. Please refresh the page.');
    }
  }

  async loadMessages() {
    try {
      const messagesSnapshot = await getDocs(
        query(
          collection(db, 'nexus_messages'),
          orderBy('timestamp', 'desc')
        )
      );

      this.messages = [];
      messagesSnapshot.forEach(doc => {
        this.messages.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date()
        });
      });

      this.renderMessages();
    } catch (error) {
      console.error('Error loading messages:', error);
      this.showError('Failed to load messages.');
    }
  }

  async loadClients() {
    try {
      const clientsSnapshot = await getDocs(collection(db, 'clients'));
      
      this.clients = [];
      clientsSnapshot.forEach(doc => {
        this.clients.push({
          id: doc.id,
          ...doc.data()
        });
      });
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  }

  populateClientFilter() {
    const clientFilter = document.getElementById('client-filter');
    
    // Clear existing options except "All Clients"
    while (clientFilter.children.length > 1) {
      clientFilter.removeChild(clientFilter.lastChild);
    }

    // Add client options
    this.clients.forEach(client => {
      const option = document.createElement('option');
      option.value = client.id;
      option.textContent = client.name || client.id;
      clientFilter.appendChild(option);
    });
  }

  filterMessages() {
    let filteredMessages = [...this.messages];

    if (this.currentFilter.priority) {
      filteredMessages = filteredMessages.filter(msg => 
        msg.priority === this.currentFilter.priority
      );
    }

    if (this.currentFilter.status) {
      filteredMessages = filteredMessages.filter(msg => 
        msg.status === this.currentFilter.status
      );
    }

    if (this.currentFilter.client) {
      filteredMessages = filteredMessages.filter(msg => 
        msg.clientSubdomain === this.currentFilter.client
      );
    }

    this.renderMessages(filteredMessages);
  }

  renderMessages(messagesToRender = this.messages) {
    const container = document.getElementById('messages-container');

    if (messagesToRender.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <h3>No Messages Found</h3>
          <p>No messages match your current filters.</p>
        </div>
      `;
      return;
    }

    const messagesHTML = messagesToRender.map(message => `
      <div class="message-card">
        <div class="message-header">
          <div class="message-meta">
            <div class="message-client">${message.clientName || message.clientSubdomain}</div>
            <div class="message-user">From: ${message.fromUser} (${message.fromRole})</div>
            <div class="message-timestamp">${message.timestamp.toLocaleString()}</div>
          </div>
          <div class="message-priority priority-${message.priority}">${message.priority}</div>
        </div>
        
        <div class="message-subject">${message.subject}</div>
        <div class="message-content">${message.message}</div>
        
        <div class="message-actions">
          <button class="action-btn btn-reply" onclick="nexusAdmin.replyToMessage('${message.id}', '${message.clientSubdomain}', '${message.threadId}')">
            Reply
          </button>
          <button class="action-btn btn-status" onclick="nexusAdmin.updateMessageStatus('${message.id}', 'in_progress')">
            Mark In Progress
          </button>
          <button class="action-btn btn-close" onclick="nexusAdmin.updateMessageStatus('${message.id}', 'resolved')">
            Mark Resolved
          </button>
        </div>
      </div>
    `).join('');

    container.innerHTML = `<div class="messages-grid">${messagesHTML}</div>`;
  }

  async replyToMessage(messageId, clientSubdomain, threadId) {
    const modal = document.createElement('div');
    modal.className = 'reply-modal';
    modal.innerHTML = `
      <div class="reply-modal-content">
        <h3 style="color: var(--nexus-light); margin-bottom: 1rem;">Reply to Message</h3>
        <form class="reply-form" id="reply-form">
          <textarea placeholder="Enter your reply..." required></textarea>
          <div class="reply-actions">
            <button type="button" class="action-btn btn-cancel" onclick="this.closest('.reply-modal').remove()">Cancel</button>
            <button type="submit" class="action-btn btn-send">Send Reply</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('reply-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const replyText = e.target.querySelector('textarea').value.trim();
      if (!replyText) return;

      try {
        // Send reply to client
        await this.sendReplyToClient(clientSubdomain, threadId, replyText);
        
        // Update message status
        await this.updateMessageStatus(messageId, 'in_progress');
        
        modal.remove();
        this.showSuccess('Reply sent successfully!');
        
        // Reload messages
        await this.loadMessages();
        
      } catch (error) {
        console.error('Error sending reply:', error);
        this.showError('Failed to send reply. Please try again.');
      }
    });
  }

  async sendReplyToClient(clientSubdomain, threadId, message) {
    const responseData = {
      threadId: threadId,
      fromUser: sessionStorage.getItem('username') || 'Nexus Support',
      fromRole: 'nexus',
      toRole: 'client',
      subject: 'Re: Support Response',
      message: message,
      timestamp: serverTimestamp(),
      isRead: false,
      priority: 'normal',
      status: 'in_progress',
      clientSubdomain: clientSubdomain
    };

    // Add to client's messages collection
    await addDoc(collection(db, 'clients', clientSubdomain, 'messages'), responseData);

    // Log to client's logs collection
    await addDoc(collection(db, 'clients', clientSubdomain, 'logs'), {
      action: 'nexus_response_received',
      fromUser: sessionStorage.getItem('username') || 'Nexus Support',
      threadId: threadId,
      timestamp: new Date().toISOString(),
      status: 'in_progress'
    });
  }

  async updateMessageStatus(messageId, status) {
    try {
      await updateDoc(doc(db, 'nexus_messages', messageId), {
        status: status,
        lastUpdated: serverTimestamp(),
        updatedBy: sessionStorage.getItem('username') || 'Nexus Admin'
      });

      this.showSuccess(`Message status updated to ${status}`);
      await this.loadMessages();
    } catch (error) {
      console.error('Error updating message status:', error);
      this.showError('Failed to update message status.');
    }
  }

  updateStatistics() {
    const totalMessages = this.messages.length;
    const openMessages = this.messages.filter(m => m.status === 'open').length;
    const urgentMessages = this.messages.filter(m => m.priority === 'urgent').length;

    document.getElementById('total-messages').textContent = totalMessages;
    document.getElementById('open-messages').textContent = openMessages;
    document.getElementById('urgent-messages').textContent = urgentMessages;
    
    // Calculate average response time (simplified)
    document.getElementById('avg-response-time').textContent = '< 2h';
  }

  async loadClientOverview() {
    const container = document.getElementById('clients-container');
    
    if (this.clients.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🏢</div>
          <h3>No Clients Found</h3>
          <p>No client organizations are currently registered.</p>
        </div>
      `;
      return;
    }

    const clientsHTML = this.clients.map(client => `
      <div class="message-card">
        <div class="message-header">
          <div class="message-meta">
            <div class="message-client">${client.name || client.id}</div>
            <div class="message-user">Subdomain: ${client.id}</div>
            <div class="message-timestamp">Created: ${new Date(client.created || Date.now()).toLocaleDateString()}</div>
          </div>
        </div>
        <div class="message-content">
          <strong>Settings:</strong> ${JSON.stringify(client.settings || {}, null, 2)}
        </div>
      </div>
    `).join('');

    container.innerHTML = `<div class="messages-grid">${clientsHTML}</div>`;
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showNotification(message, type) {
    // Simple notification system
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? 'var(--nexus-success)' : 'var(--nexus-error)'};
      color: white;
      padding: 1rem 1.5rem;
      border-radius: var(--radius-sm);
      z-index: 10000;
      box-shadow: var(--shadow-card);
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }
}

// Initialize Nexus Admin
const nexusAdmin = new NexusAdmin();

// Make it globally available for onclick handlers
window.nexusAdmin = nexusAdmin;
