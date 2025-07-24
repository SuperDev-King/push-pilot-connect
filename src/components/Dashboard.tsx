import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { removeAuthToken, getUserData, logout } from '@/lib/auth';
import { NotificationCard } from '@/components/NotificationCard';
import { PermissionBanner } from '@/components/PermissionBanner';
import { notificationService, NotificationData } from '@/services/notificationService';
import { Bell, LogOut, Settings, Shield, Smartphone, Trash2, RefreshCw } from 'lucide-react';

interface DashboardProps {
  onLogout: () => void;
}

export const Dashboard = ({ onLogout }: DashboardProps) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const userData = getUserData();

  useEffect(() => {
    // Subscribe to notification updates
    const unsubscribe = notificationService.subscribe((updatedNotifications) => {
      setNotifications(updatedNotifications);
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await logout();
      onLogout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = (id: string) => {
    notificationService.markAsRead(id);
  };

  const handleDismissNotification = (id: string) => {
    notificationService.removeNotification(id);
  };

  const handleMarkAllAsRead = () => {
    notificationService.markAllAsRead();
    toast({
      title: 'Marked as Read',
      description: 'All notifications have been marked as read.',
    });
  };

  const handleClearAll = () => {
    notificationService.clearAllNotifications();
    toast({
      title: 'Notifications Cleared',
      description: 'All notifications have been removed.',
    });
  };

  const handleSendTestNotification = () => {
    notificationService.sendTestNotification();
  };

  const handleRefreshPermission = async () => {
    setIsLoading(true);
    try {
      const enabled = await notificationService.enableNotifications();
      if (enabled) {
        toast({
          title: 'Success',
          description: 'Notifications have been enabled.',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to enable notifications.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPermissionStatus = () => {
    const permission = notificationService.getPermissionStatus();
    switch (permission) {
      case 'granted':
        return { text: 'Enabled', variant: 'default' as const, color: 'text-notification-success' };
      case 'denied':
        return { text: 'Blocked', variant: 'destructive' as const, color: 'text-notification-error' };
      default:
        return { text: 'Pending', variant: 'secondary' as const, color: 'text-notification-warning' };
    }
  };

  const stats = notificationService.getStats();
  const permissionStatus = getPermissionStatus();
  const fcmToken = notificationService.getFCMToken();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-accent rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Push Pilot Connect</h1>
                <p className="text-sm text-muted-foreground">
                  Welcome back, {userData?.name || 'User'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {stats.unread > 0 && (
                <Badge variant="destructive" className="px-2 py-1">
                  {stats.unread} unread
                </Badge>
              )}
              <Button 
                onClick={handleLogout} 
                variant="outline" 
                size="sm"
                disabled={isLoading}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Permission Banner */}
        {notificationService.getPermissionStatus() !== 'granted' && (
          <PermissionBanner onPermissionGranted={() => window.location.reload()} />
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Status Cards */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-gradient-secondary border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="w-5 h-5 text-primary" />
                  Notification Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Permission</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={permissionStatus.variant}>
                        {permissionStatus.text}
                      </Badge>
                      {permissionStatus.text !== 'Enabled' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleRefreshPermission}
                          disabled={isLoading}
                          className="h-6 w-6 p-0"
                        >
                          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Device Type</span>
                    <div className="flex items-center gap-1 text-sm">
                      <Smartphone className="w-4 h-4" />
                      {/Mobile|Android|iPhone/.test(navigator.userAgent) ? 'Mobile' : 'Desktop'}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Notifications</span>
                    <Badge variant="secondary">{stats.total}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Unread</span>
                    <Badge variant={stats.unread > 0 ? "destructive" : "secondary"}>
                      {stats.unread}
                    </Badge>
                  </div>
                  {fcmToken && (
                    <div className="pt-2 border-t border-border/50">
                      <span className="text-xs text-muted-foreground">FCM Token Active</span>
                      <div className="text-xs text-muted-foreground mt-1 font-mono bg-muted/50 p-1 rounded text-center">
                        {fcmToken.slice(0, 20)}...
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-secondary border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Settings className="w-5 h-5 text-primary" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button 
                    className="w-full justify-start bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
                    variant="outline"
                    onClick={handleSendTestNotification}
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    Send Test Notification
                  </Button>
                  <Button 
                    className="w-full justify-start"
                    variant="outline"
                    onClick={handleMarkAllAsRead}
                    disabled={stats.unread === 0}
                  >
                    Mark All as Read
                  </Button>
                  <Button 
                    className="w-full justify-start text-destructive border-destructive/20 hover:bg-destructive/10"
                    variant="outline"
                    onClick={handleClearAll}
                    disabled={stats.total === 0}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear All
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notifications List */}
          <div className="lg:col-span-2">
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Recent Notifications
                  {stats.total > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {stats.total}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Your latest push notifications will appear here. 
                  {stats.unread > 0 && ` ${stats.unread} unread notifications.`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {notifications.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gradient-accent rounded-full flex items-center justify-center opacity-50">
                        <Bell className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">No notifications yet</h3>
                      <p className="text-sm max-w-md mx-auto leading-relaxed mb-4">
                        When you receive push notifications, they'll appear here. You can test the system by clicking the "Send Test Notification" button.
                      </p>
                      <Button 
                        onClick={handleSendTestNotification}
                        variant="outline"
                        size="sm"
                      >
                        <Bell className="w-4 h-4 mr-2" />
                        Try Test Notification
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {notifications.map((notification) => (
                        <NotificationCard
                          key={notification.id}
                          id={notification.id}
                          title={notification.title}
                          body={notification.body}
                          timestamp={notification.timestamp}
                          read={notification.read}
                          type={notification.type}
                          onMarkRead={handleMarkAsRead}
                          onDismiss={handleDismissNotification}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};