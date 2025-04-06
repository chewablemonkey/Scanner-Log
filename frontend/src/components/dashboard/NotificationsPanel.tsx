import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as api from '../../lib/api';
import { Notification } from '../../types';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Bell } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

export function NotificationsPanel() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(true);

  useEffect(() => {
    if (token) {
      fetchNotifications();
    }
  }, [token, unreadOnly]);

  const fetchNotifications = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const data = await api.getNotifications(token, { unreadOnly });
      setNotifications(data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch notifications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    if (!token) return;
    
    try {
      await api.markNotificationRead(token, id);
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id ? { ...notification, isRead: true } : notification
        )
      );
      toast({
        title: 'Success',
        description: 'Notification marked as read',
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark notification as read',
        variant: 'destructive',
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!token) return;
    
    try {
      await api.markAllNotificationsRead(token);
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, isRead: true }))
      );
      toast({
        title: 'Success',
        description: 'All notifications marked as read',
      });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark all notifications as read',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            Stay updated on low inventory alerts
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUnreadOnly(!unreadOnly)}
          >
            {unreadOnly ? 'Show All' : 'Show Unread Only'}
          </Button>
          {notifications.some((n) => !n.isRead) && (
            <Button size="sm" onClick={handleMarkAllAsRead}>
              Mark All Read
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No notifications found
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border ${
                  notification.isRead ? 'bg-background' : 'bg-muted'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {!notification.isRead && (
                        <Badge variant="destructive" className="h-2 w-2 rounded-full p-0" />
                      )}
                      <p className="font-medium">{notification.message}</p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkAsRead(notification.id)}
                    >
                      Mark Read
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button variant="outline" size="sm" onClick={fetchNotifications}>
          Refresh
        </Button>
      </CardFooter>
    </Card>
  );
}
