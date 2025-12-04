import { useState } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Box,
  Divider,
  Button,
  Chip,
  Paper,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  BatteryAlert,
  Error as ErrorIcon,
  CheckCircle,
  Close,
  DoneAll,
  Delete,
  Info,
  Warning,
} from '@mui/icons-material';
import { useNotifications } from '../contexts/NotificationContext';
import type { Notification } from '../types/database.types';

export default function NotificationIcon() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAll } =
    useNotifications();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.notification_id);
    }
  };

  const handleDelete = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    await deleteNotification(notificationId);
  };

  const getNotificationIcon = (type: string, severity: string) => {
    switch (type) {
      case 'battery_low':
        return <BatteryAlert color="warning" />;
      case 'task_failed':
        return <ErrorIcon color="error" />;
      case 'robot_error':
        return <ErrorIcon color="error" />;
      default:
        if (severity === 'error' || severity === 'critical') {
          return <ErrorIcon color="error" />;
        } else if (severity === 'warning') {
          return <Warning color="warning" />;
        } else {
          return <Info color="info" />;
        }
    }
  };

  const getSeverityColor = (severity: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (severity) {
      case 'critical':
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    return `${days}일 전`;
  };

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleClick}
        aria-label="notifications"
        sx={{ ml: 2 }}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 600,
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* Header */}
        <Box sx={{ p: 2, pb: 1 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">알림</Typography>
            <Box>
              {unreadCount > 0 && (
                <Button
                  size="small"
                  startIcon={<DoneAll />}
                  onClick={markAllAsRead}
                  sx={{ mr: 1 }}
                >
                  모두 읽음
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  size="small"
                  color="error"
                  startIcon={<Delete />}
                  onClick={clearAll}
                >
                  전체 삭제
                </Button>
              )}
            </Box>
          </Box>
        </Box>

        <Divider />

        {/* Notification List */}
        {notifications.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
            <Typography color="textSecondary">알림이 없습니다</Typography>
          </Box>
        ) : (
          <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
            {notifications.map((notification) => (
              <MenuItem
                key={notification.notification_id}
                onClick={() => handleNotificationClick(notification)}
                sx={{
                  py: 1.5,
                  px: 2,
                  backgroundColor: notification.is_read ? 'transparent' : 'action.hover',
                  '&:hover': {
                    backgroundColor: notification.is_read
                      ? 'action.hover'
                      : 'action.selected',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {getNotificationIcon(notification.notification_type, notification.severity)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                      <Typography
                        variant="body2"
                        fontWeight={notification.is_read ? 'normal' : 'bold'}
                      >
                        {notification.title}
                      </Typography>
                      <Chip
                        label={notification.severity}
                        size="small"
                        color={getSeverityColor(notification.severity)}
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    </Box>
                  }
                  secondary={
                    <>
                      {notification.message && (
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                          {notification.message}
                        </Typography>
                      )}
                      <Typography variant="caption" color="textSecondary">
                        {formatTime(notification.created_at)}
                      </Typography>
                    </>
                  }
                />
                <IconButton
                  size="small"
                  onClick={(e) => handleDelete(notification.notification_id, e)}
                  sx={{ ml: 1 }}
                >
                  <Close fontSize="small" />
                </IconButton>
              </MenuItem>
            ))}
          </Box>
        )}
      </Menu>
    </>
  );
}
