import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Fade,
  Chip,
  Fab,
  Popover,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Badge,
  IconButton,
  Divider,
  Tabs,
  Tab,
  alpha,
  Stack,
  Tooltip
} from '@mui/material';
import { styled } from '@mui/material/styles';
import SettingsIcon from '@mui/icons-material/Settings';
import HistoryIcon from '@mui/icons-material/History';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CloseIcon from '@mui/icons-material/Close';
import { useMCPNotification } from '../contexts/MCPNotificationContext';
import { useMCPDisplaySettings } from '../contexts/MCPDisplaySettingsContext';

const MCPFab = styled(Fab)(({ theme }) => ({
  position: 'fixed',
  top: 100,
  right: 24,
  zIndex: 1300,
  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  color: 'white',
  '&:hover': {
    background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
    transform: 'scale(1.05)',
  },
  transition: 'all 0.2s ease-in-out',
}));

const MCPPopover = styled(Popover)(({ theme }) => ({
  '& .MuiPopover-paper': {
    background: theme.palette.mode === 'dark' 
      ? `linear-gradient(135deg, ${theme.palette.background.paper}, ${theme.palette.grey[900]})`
      : `linear-gradient(135deg, ${theme.palette.background.paper}, ${theme.palette.grey[50]})`,
    backdropFilter: 'blur(10px)',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.spacing(2),
    minWidth: 380,
    maxWidth: 450,
    maxHeight: 600,
    overflow: 'hidden',
  },
}));

const ToolListItem = styled(ListItem)(({ theme }) => ({
  borderRadius: theme.spacing(1),
  margin: theme.spacing(0.5, 1),
  background: theme.palette.mode === 'dark'
    ? theme.palette.grey[800]
    : theme.palette.grey[100],
  '&:hover': {
    background: theme.palette.mode === 'dark'
      ? theme.palette.grey[700]
      : theme.palette.grey[200],
  },
}));

const MCPToolNotification = () => {
  const { activeTools, executionHistory, getExecutionStats } = useMCPNotification();
  const { showExecutionHistory } = useMCPDisplaySettings();
  const [anchorEl, setAnchorEl] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  
  try {
    // Convert Map to array for rendering
    const toolsArray = Array.from(activeTools.entries()).map(([id, tool]) => ({
      id,
      ...tool
    }));


    // Don't render if no active tools and no history to show
    if (toolsArray.length === 0 && (!showExecutionHistory || executionHistory.length === 0)) {
      return null;
    }

    const stats = getExecutionStats();
    const recentHistory = executionHistory.slice(-10).reverse(); // Show last 10, most recent first

    const handleClick = (event) => {
      setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
      setAnchorEl(null);
    };

    const open = Boolean(anchorEl);
    const id = open ? 'mcp-tools-popover' : undefined;

    const formatDuration = (duration) => {
      if (!duration) return 'N/A';
      if (duration < 1000) return `${duration}ms`;
      if (duration < 60000) return `${Math.round(duration / 1000)}s`;
      return `${Math.round(duration / 60000)}m`;
    };

    const formatTimestamp = (timestamp) => {
      const date = new Date(timestamp);
      return date.toLocaleTimeString();
    };

    const handleTabChange = (event, newValue) => {
      setActiveTab(newValue);
    };

    return (
      <>
        <Fade in={true} timeout={300}>
          <Badge 
            badgeContent={toolsArray.length > 0 ? toolsArray.length : (showExecutionHistory && recentHistory.length > 0 ? '•' : 0)}
            color={toolsArray.length > 0 ? "secondary" : "primary"}
            overlap="circular"
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
          >
            <Tooltip 
              title={toolsArray.length > 0 
                ? `${toolsArray.length} active tools` 
                : showExecutionHistory && recentHistory.length > 0 
                  ? `${recentHistory.length} recent executions` 
                  : 'MCP Tools'}
            >
              <MCPFab
                aria-describedby={id}
                size="medium"
                onClick={handleClick}
                sx={{
                  ...(toolsArray.length > 0 && {
                    animation: 'pulse 2s infinite',
                    '@keyframes pulse': {
                      '0%': {
                        boxShadow: '0 0 0 0 rgba(25, 118, 210, 0.7)',
                      },
                      '70%': {
                        boxShadow: '0 0 0 10px rgba(25, 118, 210, 0)',
                      },
                      '100%': {
                        boxShadow: '0 0 0 0 rgba(25, 118, 210, 0)',
                      },
                    },
                  }),
                }}
              >
                <SettingsIcon />
              </MCPFab>
            </Tooltip>
          </Badge>
        </Fade>

        <MCPPopover
          id={id}
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'center',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
          sx={{ mt: 1 }}
        >
          <Box sx={{ p: 2, pb: 0 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography variant="h6" fontWeight={600}>
                MCP Tools
              </Typography>
              <IconButton size="small" onClick={handleClose}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
            
            {/* Stats Summary */}
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <Chip 
                size="small" 
                label={`${stats.activeCount} active`} 
                color={stats.activeCount > 0 ? "secondary" : "default"}
                icon={stats.activeCount > 0 ? <CircularProgress size={12} color="inherit" /> : null}
              />
              {showExecutionHistory && (
                <Chip 
                  size="small" 
                  label={`${stats.completedExecutions} completed`} 
                  variant="outlined"
                  icon={<CheckCircleIcon sx={{ fontSize: 12 }} />}
                />
              )}
              {stats.averageDuration > 0 && (
                <Chip 
                  size="small" 
                  label={`${formatDuration(stats.averageDuration)} avg`}
                  variant="outlined"
                  icon={<AccessTimeIcon sx={{ fontSize: 12 }} />}
                />
              )}
            </Stack>

            {/* Tabs */}
            {showExecutionHistory && recentHistory.length > 0 && (
              <Tabs 
                value={activeTab} 
                onChange={handleTabChange} 
                variant="fullWidth" 
                sx={{ 
                  minHeight: 36,
                  '& .MuiTab-root': {
                    minHeight: 36,
                    fontSize: '0.8rem',
                    textTransform: 'none',
                  },
                }}
              >
                <Tab 
                  label={`Active (${toolsArray.length})`} 
                  icon={<SettingsIcon sx={{ fontSize: 16 }} />} 
                  iconPosition="start"
                />
                <Tab 
                  label={`History (${recentHistory.length})`} 
                  icon={<HistoryIcon sx={{ fontSize: 16 }} />} 
                  iconPosition="start"
                />
              </Tabs>
            )}
          </Box>
          
          <Divider />
          
          <List sx={{ py: 0, maxHeight: 350, overflow: 'auto' }}>
            {/* Active Tools Tab */}
            {(activeTab === 0 || !showExecutionHistory) && toolsArray.map((tool, index) => (
              <ToolListItem key={tool.id} divider={index < toolsArray.length - 1}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <CircularProgress 
                    size={20} 
                    thickness={4}
                    color="primary"
                  />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="subtitle2" fontWeight={600} noWrap>
                        {tool.toolName}
                      </Typography>
                      <Chip 
                        label="Active" 
                        size="small" 
                        color="secondary"
                        sx={{ 
                          fontSize: '0.65rem',
                          height: 18,
                        }}
                      />
                    </Box>
                  }
                  secondary={
                    <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                      {tool.description && (
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{ 
                            fontSize: '0.75rem',
                            lineHeight: 1.3,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {tool.description}
                        </Typography>
                      )}
                      <Box display="flex" alignItems="center" gap={1}>
                        {tool.serverName && (
                          <Typography variant="caption" color="primary">
                            {tool.serverName}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          Running for {formatDuration(Date.now() - tool.startTime)}
                        </Typography>
                      </Box>
                    </Stack>
                  }
                />
              </ToolListItem>
            ))}

            {/* History Tab */}
            {activeTab === 1 && showExecutionHistory && recentHistory.map((item, index) => (
              <ToolListItem key={`history-${item.id}`} divider={index < recentHistory.length - 1}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {item.status === 'completed' ? (
                    <CheckCircleIcon color="success" sx={{ fontSize: 20 }} />
                  ) : item.status === 'error' ? (
                    <ErrorIcon color="error" sx={{ fontSize: 20 }} />
                  ) : (
                    <CircularProgress size={20} thickness={4} color="primary" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="subtitle2" fontWeight={600} noWrap>
                        {item.toolName}
                      </Typography>
                      {item.duration && (
                        <Chip 
                          label={formatDuration(item.duration)}
                          size="small" 
                          variant="outlined"
                          sx={{ 
                            fontSize: '0.65rem',
                            height: 18,
                          }}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                      {item.description && (
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{ 
                            fontSize: '0.75rem',
                            lineHeight: 1.3,
                            display: '-webkit-box',
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {item.description}
                        </Typography>
                      )}
                      <Box display="flex" alignItems="center" gap={1}>
                        {item.serverName && (
                          <Typography variant="caption" color="primary">
                            {item.serverName}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          {formatTimestamp(item.timestamp)}
                        </Typography>
                      </Box>
                    </Stack>
                  }
                />
              </ToolListItem>
            ))}
            
            {/* Empty States */}
            {toolsArray.length === 0 && activeTab === 0 && (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No active tools
                </Typography>
              </Box>
            )}
            
            {recentHistory.length === 0 && activeTab === 1 && showExecutionHistory && (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No execution history
                </Typography>
              </Box>
            )}
          </List>
          
          <Divider />
          <Box sx={{ p: 1.5, bgcolor: alpha('action.hover', 0.5) }}>
            <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" justifyContent="space-between">
              <Box display="flex" alignItems="center" gap={0.5}>
                <SettingsIcon sx={{ fontSize: 12 }} />
                MCP (Model Context Protocol) Tools
              </Box>
              {stats.totalExecutions > 0 && (
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="caption">
                    {stats.totalExecutions} total executions
                  </Typography>
                </Box>
              )}
            </Typography>
          </Box>
        </MCPPopover>
      </>
    );
  } catch (error) {
    console.error('🔧 MCP Notification Component Error:', error);
    return (
      <MCPFab
        sx={{ 
          backgroundColor: 'error.main',
          '&:hover': {
            backgroundColor: 'error.dark',
          }
        }}
        onClick={() => console.log('MCP Tools Error - Check console')}
      >
        ⚠️
      </MCPFab>
    );
  }
};

export default MCPToolNotification;