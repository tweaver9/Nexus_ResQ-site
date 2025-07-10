// messaging-ui.js - UI components for messaging system

// Use global messagingSystem from messaging.js loaded in HTML

class MessagingUI {
  constructor() {
    this.isOpen = false;
    this.unreadCount = 0;
    this.messages = [];
    this.init();
  }

  async init() {
    // Only initialize if user is logged in and has client context
    const userSession = sessionStorage.getItem('nexusUser');
    const clientSubdomain = sessionStorage.getItem('clientSubdomain');

    if (!userSession || !clientSubdomain) {
      console.log('Messaging system not initialized - user not logged in or missing client context');
      return;
    }

    this.createMessagingButton();
    this.createMessagingModal();
    await this.updateUnreadCount();

    // Update unread count every 30 seconds
    setInterval(() => this.updateUnreadCount(), 30000);
  }

  createMessagingButton() {
    // Create floating messaging button
    const button = document.createElement('div');
    button.id = 'messaging-button';
    button.className = 'messaging-button';
    button.innerHTML = `
      <div class="messaging-icon">💬</div>
      <div class="messaging-badge" id="messaging-badge" style="display: none;">0</div>
    `;
    
    button.addEventListener('click', () => this.toggleMessaging());
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .messaging-button {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 60px;
        height: 60px;
        background: linear-gradient(135deg, var(--nexus-yellow), #f59e0b);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(253, 216, 53, 0.3);
        transition: all 0.3s ease;
        z-index: 1000;
      }
      
      .messaging-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 25px rgba(253, 216, 53, 0.4);
      }
      
      .messaging-icon {
        font-size: 24px;
        color: var(--nexus-dark);
      }
      
      .messaging-badge {
        position: absolute;
        top: -5px;
        right: -5px;
        background: var(--nexus-error);
        color: white;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 600;
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(button);
  }

  createMessagingModal() {
    const modal = document.createElement('div');
    modal.id = 'messaging-modal';
    modal.className = 'messaging-modal';
    modal.style.display = 'none';
    
    modal.innerHTML = `
      <div class="messaging-modal-content">
        <div class="messaging-header">
          <h3>Messages</h3>
          <button class="messaging-close" onclick="messagingUI.toggleMessaging()">×</button>
        </div>
        
        <div class="messaging-tabs">
          <button class="messaging-tab active" data-tab="messages">Messages</button>
          <button class="messaging-tab" data-tab="compose">New Message</button>
        </div>
        
        <div class="messaging-content">
          <div id="messages-tab" class="messaging-tab-content active">
            <div id="messages-list" class="messages-list">
              <div class="loading">Loading messages...</div>
            </div>
          </div>
          
          <div id="compose-tab" class="messaging-tab-content">
            <form id="compose-form" class="compose-form">
              <div class="form-group">
                <label>Subject</label>
                <input type="text" id="message-subject" required placeholder="Enter subject...">
              </div>
              <div class="form-group">
                <label>Priority</label>
                <select id="message-priority">
                  <option value="low">Low</option>
                  <option value="normal" selected>Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div class="form-group">
                <label>Message</label>
                <textarea id="message-content" required placeholder="Enter your message..." rows="6"></textarea>
              </div>
              <button type="submit" class="send-button">Send to Nexus Support</button>
            </form>
          </div>
        </div>
      </div>
    `;
    
    // Add modal styles
    const modalStyle = document.createElement('style');
    modalStyle.textContent = `
      .messaging-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 2000;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .messaging-modal-content {
        background: var(--nexus-card);
        border-radius: var(--radius);
        width: 90%;
        max-width: 600px;
        max-height: 80vh;
        overflow: hidden;
        box-shadow: var(--shadow-heavy);
      }
      
      .messaging-header {
        background: var(--nexus-dark);
        padding: 1rem 1.5rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid var(--nexus-border);
      }
      
      .messaging-header h3 {
        color: var(--nexus-light);
        margin: 0;
      }
      
      .messaging-close {
        background: none;
        border: none;
        color: var(--nexus-muted);
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .messaging-tabs {
        display: flex;
        background: var(--nexus-dark);
      }
      
      .messaging-tab {
        flex: 1;
        padding: 0.75rem;
        background: none;
        border: none;
        color: var(--nexus-muted);
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .messaging-tab.active {
        color: var(--nexus-yellow);
        background: var(--nexus-card);
      }
      
      .messaging-content {
        height: 400px;
        overflow-y: auto;
      }
      
      .messaging-tab-content {
        display: none;
        padding: 1.5rem;
      }
      
      .messaging-tab-content.active {
        display: block;
      }
      
      .messages-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      
      .message-item {
        background: var(--nexus-dark);
        border-radius: var(--radius-sm);
        padding: 1rem;
        border-left: 4px solid var(--nexus-yellow);
      }
      
      .message-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
      }
      
      .message-subject {
        font-weight: 600;
        color: var(--nexus-light);
      }
      
      .message-meta {
        font-size: 0.75rem;
        color: var(--nexus-muted);
      }
      
      .message-content {
        color: var(--nexus-muted);
        line-height: 1.5;
      }
      
      .compose-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      
      .form-group label {
        font-weight: 600;
        color: var(--nexus-light);
        font-size: 0.875rem;
      }
      
      .form-group input,
      .form-group select,
      .form-group textarea {
        background: var(--nexus-dark);
        border: 1px solid var(--nexus-border);
        border-radius: var(--radius-sm);
        padding: 0.75rem;
        color: var(--nexus-light);
        font-size: 0.875rem;
      }
      
      .form-group input:focus,
      .form-group select:focus,
      .form-group textarea:focus {
        outline: none;
        border-color: var(--nexus-yellow);
      }
      
      .send-button {
        background: var(--nexus-yellow);
        color: var(--nexus-dark);
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: var(--radius-sm);
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .send-button:hover {
        background: #f59e0b;
        transform: translateY(-1px);
      }
      
      .loading {
        text-align: center;
        color: var(--nexus-muted);
        padding: 2rem;
      }
      
      .priority-high {
        border-left-color: var(--nexus-warning);
      }
      
      .priority-urgent {
        border-left-color: var(--nexus-error);
      }
    `;
    
    document.head.appendChild(modalStyle);
    document.body.appendChild(modal);
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.messaging-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabName = e.target.dataset.tab;
        this.switchTab(tabName);
      });
    });
    
    // Form submission
    document.getElementById('compose-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.sendMessage();
    });
    
    // Close modal on outside click
    document.getElementById('messaging-modal').addEventListener('click', (e) => {
      if (e.target.id === 'messaging-modal') {
        this.toggleMessaging();
      }
    });
  }

  async toggleMessaging() {
    const modal = document.getElementById('messaging-modal');
    
    if (this.isOpen) {
      modal.style.display = 'none';
      this.isOpen = false;
    } else {
      modal.style.display = 'flex';
      this.isOpen = true;
      await this.loadMessages();
    }
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.messaging-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.messaging-tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
  }

  async loadMessages() {
    const messagesList = document.getElementById('messages-list');
    messagesList.innerHTML = '<div class="loading">Loading messages...</div>';
    
    try {
      this.messages = await messagingSystem.getClientMessages();
      this.renderMessages();
    } catch (error) {
      console.error('Error loading messages:', error);
      messagesList.innerHTML = '<div class="loading">Error loading messages</div>';
    }
  }

  renderMessages() {
    const messagesList = document.getElementById('messages-list');
    
    if (this.messages.length === 0) {
      messagesList.innerHTML = '<div class="loading">No messages yet</div>';
      return;
    }
    
    messagesList.innerHTML = this.messages.map(message => `
      <div class="message-item priority-${message.priority}">
        <div class="message-header">
          <div class="message-subject">${message.subject}</div>
          <div class="message-meta">
            ${message.fromRole === 'nexus' ? 'Nexus Support' : message.fromUser} • 
            ${message.timestamp.toLocaleDateString()} ${message.timestamp.toLocaleTimeString()}
          </div>
        </div>
        <div class="message-content">${message.message}</div>
      </div>
    `).join('');
  }

  async sendMessage() {
    const subject = document.getElementById('message-subject').value;
    const content = document.getElementById('message-content').value;
    const priority = document.getElementById('message-priority').value;
    
    if (!subject || !content) {
      alert('Please fill in all fields');
      return;
    }
    
    try {
      await messagingSystem.sendMessageToNexus(subject, content, priority);
      
      // Reset form
      document.getElementById('compose-form').reset();
      
      // Switch to messages tab and reload
      this.switchTab('messages');
      await this.loadMessages();
      await this.updateUnreadCount();
      
      alert('Message sent successfully!');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  }

  async updateUnreadCount() {
    try {
      this.unreadCount = await messagingSystem.getUnreadCount();
      const badge = document.getElementById('messaging-badge');
      
      if (this.unreadCount > 0) {
        badge.textContent = this.unreadCount;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    } catch (error) {
      console.error('Error updating unread count:', error);
    }
  }
}

// Export singleton instance
export const messagingUI = new MessagingUI();

// Make it globally available for onclick handlers
window.messagingUI = messagingUI;
