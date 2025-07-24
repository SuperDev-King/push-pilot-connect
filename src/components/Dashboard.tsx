import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { removeAuthToken } from '@/lib/auth';
import { onMessageListener } from '@/lib/firebase';
import { NotificationCard } from '@/components/NotificationCard';
import { PermissionBanner } from '@/components/PermissionBanner';
import { Bell, LogOut, Settings, Shield, Smartphone, Trash2 } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
}

interface DashboardProps {
  onLogout: () => void;
}

export const Dashboard = ({ onLogout }: DashboardProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
  const { toast } = useToast();

  useEffect(() => {
    // Listen for foreground messages
    const setupMessageListener = async () => {
      try {
        await onMessageListener().then((payload: any) => {
          const newNotification: Notification = {
            id: Date.now().toString(),
            title: payload.notification?.title || 'New Notification',
            body: payload.notification?.body || 'You received a new message',
            timestamp: new Date().toISOString(),
            read: false
          };

          setNotifications(prev => [newNotification, ...prev]);
          
          toast({
            title: newNotification.title,
            description: newNotification.body,
          });
        });
      } catch (error) {
        console.error('Error setting up message listener:', error);
      }
    };

    setupMessageListener();
  }, [toast]);

  const handleLogout = () => {
    removeAuthToken();
    onLogout();
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const getPermissionStatus = () => {
    switch (notificationPermission) {
      case 'granted':
        return { text: 'Enabled', variant: 'default' as const, color: 'text-notification-success' };
      case 'denied':
        return { text: 'Blocked', variant: 'destructive' as const, color: 'text-notification-error' };
      default:
        return { text: 'Pending', variant: 'secondary' as const, color: 'text-notification-warning' };
    }
  };

  const permissionStatus = getPermissionStatus();

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
                <p className="text-sm text-muted-foreground">Notification Management Dashboard</p>
              </div>
            </div>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Permission Banner */}
        <PermissionBanner />
        
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
                    <Badge variant={permissionStatus.variant}>
                      {permissionStatus.text}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Device Type</span>
                    <div className="flex items-center gap-1 text-sm">
                      <Smartphone className="w-4 h-4" />
                      {/Mobile|Android|iPhone/.test(navigator.userAgent) ? 'Mobile' : 'Desktop'}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Notifications Received</span>
                    <Badge variant="secondary">{notifications.length}</Badge>
                  </div>
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
                    onClick={() => {
                      toast({
                        title: 'Test Notification',
                        description: 'This is a test notification from your dashboard.',
                      });
                    }}
                  >
                    Send Test Notification
                  </Button>
                  <Button 
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => {
                      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                    }}
                  >
                    Mark All as Read
                  </Button>
                  <Button 
                    className="w-full justify-start text-destructive border-destructive/20 hover:bg-destructive/10"
                    variant="outline"
                    onClick={clearAllNotifications}
                    disabled={notifications.length === 0}
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
                </CardTitle>
                <CardDescription>
                  Your latest push notifications will appear here
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
                      <p className="text-sm max-w-md mx-auto leading-relaxed">
                        When you receive push notifications, they'll appear here. You can test the system by clicking the "Send Test Notification" button.
                      </p>
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
                          onMarkRead={markAsRead}
                          onDismiss={dismissNotification}
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