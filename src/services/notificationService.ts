import {
  requestNotificationPermission,
  onMessageListener,
  getCurrentToken,
  isNotificationSupported,
  getNotificationPermission
} from '@/lib/firebase';
import { registerFCMToken, getUserFCMTokens } from '@/lib/auth';
import { toast } from '@/hooks/use-toast';

export interface NotificationData {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  type?: 'info' | 'success' | 'warning' | 'error';
  data?: Record<string, any>;
}

class NotificationService {
  private static instance: NotificationService;
  private fcmToken: string | null = null;
  private notifications: NotificationData[] = [];
  private listeners: ((notifications: NotificationData[]) => void)[] = [];

  private constructor() {
    this.initializeMessaging();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Initialize Firebase messaging
  private async initializeMessaging(): Promise<void> {
    if (!isNotificationSupported()) {
      console.warn('Notifications not supported in this browser');
      return;
    }

    try {
      // Listen for foreground messages
      onMessageListener()
        .then((payload: any) => {
          console.log('Foreground message received:', payload);
          this.handleForegroundMessage(payload);
        })
        .catch((error) => {
          console.error('Error setting up foreground message listener:', error);
        });

      // Load existing token if available
      this.fcmToken = await getCurrentToken();
      
      // Load notifications from localStorage
      this.loadNotificationsFromStorage();
    } catch (error) {
      console.error('Error initializing messaging:', error);
    }
  }

  // Request permission and register token
  public async enableNotifications(): Promise<boolean> {
    try {
      const token = await requestNotificationPermission();
      
      if (token) {
        this.fcmToken = token;
        await this.registerTokenWithBackend(token);
        
        // Store token locally for reference
        localStorage.setItem('fcm_token', token);
        
        toast({
          title: 'Notifications Enabled',
          description: 'You will now receive push notifications.',
        });
        
        return true;
      } else {
        toast({
          title: 'Permission Denied',
          description: 'Please enable notifications in your browser settings.',
          variant: 'destructive',
        });
        
        return false;
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to enable notifications. Please try again.',
        variant: 'destructive',
      });
      
      return false;
    }
  }

  // Register FCM token with backend
  private async registerTokenWithBackend(token: string): Promise<void> {
    try {
      await registerFCMToken(token);
      console.log('FCM token registered with backend successfully');
    } catch (error) {
      console.error('Failed to register FCM token with backend:', error);
      throw error;
    }
  }

  // Handle foreground messages
  private handleForegroundMessage(payload: any): void {
    const notification: NotificationData = {
      id: Date.now().toString(),
      title: payload.notification?.title || payload.data?.title || 'New Notification',
      body: payload.notification?.body || payload.data?.body || 'You received a new message',
      timestamp: new Date().toISOString(),
      read: false,
      type: payload.data?.type || 'info',
      data: payload.data
    };

    this.addNotification(notification);
    
    // Show toast notification
    toast({
      title: notification.title,
      description: notification.body,
    });

    // Show browser notification if page is not focused
    if (document.hidden && getNotificationPermission() === 'granted') {
      new Notification(notification.title, {
        body: notification.body,
        icon: '/favicon.ico',
        tag: notification.id
      });
    }
  }

  // Add notification to local storage and notify listeners
  private addNotification(notification: NotificationData): void {
    this.notifications.unshift(notification);
    
    // Keep only latest 50 notifications
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50);
    }
    
    this.saveNotificationsToStorage();
    this.notifyListeners();
  }

  // Subscribe to notification updates
  public subscribe(callback: (notifications: NotificationData[]) => void): () => void {
    this.listeners.push(callback);
    
    // Immediately call with current notifications
    callback(this.notifications);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Get all notifications
  public getNotifications(): NotificationData[] {
    return [...this.notifications];
  }

  // Mark notification as read
  public markAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      notification.read = true;
      this.saveNotificationsToStorage();
      this.notifyListeners();
    }
  }

  // Mark all notifications as read
  public markAllAsRead(): void {
    let hasChanges = false;
    this.notifications.forEach(notification => {
      if (!notification.read) {
        notification.read = true;
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      this.saveNotificationsToStorage();
      this.notifyListeners();
    }
  }

  // Remove notification
  public removeNotification(notificationId: string): void {
    const index = this.notifications.findIndex(n => n.id === notificationId);
    if (index !== -1) {
      this.notifications.splice(index, 1);
      this.saveNotificationsToStorage();
      this.notifyListeners();
    }
  }

  // Clear all notifications
  public clearAllNotifications(): void {
    this.notifications = [];
    this.saveNotificationsToStorage();
    this.notifyListeners();
  }

  // Get notification statistics
  public getStats(): { total: number; unread: number; read: number } {
    const total = this.notifications.length;
    const unread = this.notifications.filter(n => !n.read).length;
    const read = total - unread;
    
    return { total, unread, read };
  }

  // Get FCM token
  public getFCMToken(): string | null {
    return this.fcmToken;
  }

  // Check notification permission status
  public getPermissionStatus(): NotificationPermission {
    return getNotificationPermission();
  }

  // Check if notifications are supported
  public isSupported(): boolean {
    return isNotificationSupported();
  }

  // Send test notification (for development)
  public sendTestNotification(): void {
    const testNotification: NotificationData = {
      id: `test-${Date.now()}`,
      title: 'Test Notification',
      body: 'This is a test notification from your dashboard.',
      timestamp: new Date().toISOString(),
      read: false,
      type: 'info'
    };

    this.addNotification(testNotification);
  }

  // Private methods for storage
  private saveNotificationsToStorage(): void {
    try {
      localStorage.setItem('notifications', JSON.stringify(this.notifications));
    } catch (error) {
      console.error('Error saving notifications to storage:', error);
    }
  }

  private loadNotificationsFromStorage(): void {
    try {
      const stored = localStorage.getItem('notifications');
      if (stored) {
        this.notifications = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading notifications from storage:', error);
      this.notifications = [];
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => callback(this.notifications));
  }

  // Cleanup method
  public cleanup(): void {
    this.listeners = [];
    // Remove any event listeners if needed
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();
export default notificationService;
