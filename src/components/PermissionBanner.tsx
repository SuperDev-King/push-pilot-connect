import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Bell, X } from 'lucide-react';
import { requestNotificationPermission } from '@/lib/firebase';
import { registerFCMToken } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

interface PermissionBannerProps {
  onPermissionGranted?: () => void;
}

export const PermissionBanner = ({ onPermissionGranted }: PermissionBannerProps) => {
  const [isVisible, setIsVisible] = useState(Notification.permission === 'default');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    
    try {
      const token = await requestNotificationPermission();
      
      if (token) {
        await registerFCMToken(token);
        toast({
          title: 'Notifications Enabled',
          description: 'You will now receive push notifications.',
        });
        setIsVisible(false);
        onPermissionGranted?.();
      } else {
        toast({
          title: 'Permission Denied',
          description: 'Please enable notifications in your browser settings.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to enable notifications. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <Card className="mb-6 border-notification-warning/20 bg-notification-warning/5">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-notification-warning/10 text-notification-warning">
            <AlertTriangle className="w-4 h-4" />
          </div>
          
          <div className="flex-1">
            <h4 className="font-semibold text-sm mb-1">Enable Push Notifications</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Allow notifications to receive real-time updates and alerts directly to your device.
            </p>
            
            <div className="flex items-center gap-2">
              <Button 
                size="sm"
                onClick={handleEnableNotifications}
                disabled={isLoading}
                className="bg-notification-warning hover:bg-notification-warning/90 text-black"
              >
                <Bell className="w-4 h-4 mr-1" />
                {isLoading ? 'Enabling...' : 'Enable Notifications'}
              </Button>
              
              <Button 
                size="sm"
                variant="ghost"
                onClick={() => setIsVisible(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4 mr-1" />
                Maybe Later
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};