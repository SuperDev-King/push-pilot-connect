import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NotificationCardProps {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  type?: 'info' | 'success' | 'warning' | 'error';
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
}

export const NotificationCard = ({
  id,
  title,
  body,
  timestamp,
  read,
  type = 'info',
  onMarkRead,
  onDismiss
}: NotificationCardProps) => {
  const getTypeColor = () => {
    switch (type) {
      case 'success':
        return 'text-notification-success border-notification-success/20 bg-notification-success/5';
      case 'warning':
        return 'text-notification-warning border-notification-warning/20 bg-notification-warning/5';
      case 'error':
        return 'text-notification-error border-notification-error/20 bg-notification-error/5';
      default:
        return 'text-notification-info border-notification-info/20 bg-notification-info/5';
    }
  };

  const getTypeIcon = () => {
    switch (type) {
      case 'success':
        return <Check className="w-4 h-4" />;
      case 'error':
        return <X className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  return (
    <Card
      className={`transition-all duration-200 ${
        read
          ? 'bg-muted/30 border-border/30'
          : `bg-card/80 backdrop-blur-sm border-primary/20 shadow-glow hover:shadow-primary`
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full ${getTypeColor()}`}>
            {getTypeIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold text-sm leading-tight">{title}</h4>
              {!read && (
                <div className="w-2 h-2 bg-primary rounded-full mt-1 flex-shrink-0" />
              )}
            </div>
            
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {body}
            </p>
            
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-muted-foreground">
                {new Date(timestamp).toLocaleString()}
              </span>
              
              <div className="flex items-center gap-1">
                {!read && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onMarkRead(id)}
                    className="h-7 px-2 text-xs"
                  >
                    Mark as read
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDismiss(id)}
                  className="h-7 px-2 text-xs hover:text-destructive"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};