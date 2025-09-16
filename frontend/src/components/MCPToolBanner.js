import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Slide,
  Chip,
  IconButton,
  Stack,
  Collapse,
  Card,
  CardContent,
  alpha,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SettingsIcon from '@mui/icons-material/Settings';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HistoryIcon from '@mui/icons-material/History';
import { useMCPNotification } from '../contexts/MCPNotificationContext';
import { useMCPDisplaySettings } from '../contexts/MCPDisplaySettingsContext';

const BannerContainer = styled(Paper)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  background: theme.palette.mode === 'dark'
    ? `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)}, ${alpha(theme.palette.grey[900], 0.95)})`
    : `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)}, ${alpha(theme.palette.primary.main, 0.05)})`,
  backdropFilter: 'blur(10px)',
  borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
  zIndex: 1100,
  overflow: 'visible',
}));

const ToolCard = styled(Card)(({ theme }) => ({
  flex: '0 0 auto',
  width: '100%',
  maxWidth: '320px',
  minWidth: '280px',
  background: theme.palette.mode === 'dark'
    ? alpha(theme.palette.background.paper, 0.8)
    : alpha(theme.palette.background.paper, 0.9),
  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
  borderRadius: theme.spacing(1.5),
  '&:hover': {
    borderColor: theme.palette.primary.main,
    boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.15)}`,
  },
  transition: 'all 0.2s ease-in-out',
  [theme.breakpoints.down('md')]: {
    minWidth: '250px',
    maxWidth: '280px',
  },
  [theme.breakpoints.down('sm')]: {
    minWidth: '100%',
    maxWidth: '100%',
    flex: '1 1 100%',
  },
}));

const MCPToolBanner = () => {
  const { activeTools, executionHistory } = useMCPNotification();
  const { autoCollapseTime, showExecutionHistory } = useMCPDisplaySettings();
  const [isExpanded, setIsExpanded] = useState(true);
  const [userCollapsed, setUserCollapsed] = useState(false);
  const [showTickerMode, setShowTickerMode] = useState(false);
  const collapseTimer = useRef(null);
  const tickerRef = useRef(null);

  // Convert Map to array for rendering
  const toolsArray = Array.from(activeTools.entries()).map(([id, tool]) => ({
    id,
    ...tool
  }));

  // Auto-collapse functionality
  useEffect(() => {
    if (toolsArray.length > 0 && !userCollapsed) {
      // Clear any existing timer
      if (collapseTimer.current) {
        clearTimeout(collapseTimer.current);
      }

      // Set new timer
      collapseTimer.current = setTimeout(() => {
        setIsExpanded(false);
      }, autoCollapseTime * 1000);
    }

    return () => {
      if (collapseTimer.current) {
        clearTimeout(collapseTimer.current);
      }
    };
  }, [toolsArray.length, autoCollapseTime, userCollapsed]);

  // Reset expansion when new tools appear
  useEffect(() => {
    if (toolsArray.length > 0) {
      setIsExpanded(true);
      setUserCollapsed(false);
    }
  }, [toolsArray.length]);

  const handleToggleExpansion = () => {
    setIsExpanded(!isExpanded);
    setUserCollapsed(true);
    
    // Clear auto-collapse timer when user manually controls
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current);
    }
  };

  const formatDuration = (startTime) => {
    const duration = Date.now() - startTime;
    if (duration < 1000) return '< 1s';
    if (duration < 60000) return `${Math.round(duration / 1000)}s`;
    return `${Math.round(duration / 60000)}m`;
  };

  const formatDurationMs = (duration) => {
    if (!duration) return 'N/A';
    if (duration < 1000) return `${duration}ms`;
    if (duration < 60000) return `${Math.round(duration / 1000)}s`;
    return `${Math.round(duration / 60000)}m`;
  };

  const formatParameters = (params) => {
    if (!params || typeof params !== 'object') return '';
    const keys = Object.keys(params);
    if (keys.length === 0) return '';
    if (keys.length === 1) return `${keys[0]}: ${String(params[keys[0]]).substring(0, 30)}${String(params[keys[0]]).length > 30 ? '...' : ''}`;
    return `${keys.length} parameters`;
  };

  // Get recent completed tools for ticker
  const recentCompletedTools = executionHistory
    .filter(item => item.status === 'completed' || item.status === 'error')
    .slice(-10) // Last 10 completions
    .reverse(); // Most recent first

  // Show ticker mode when no active tools but have completed tools
  const shouldShowTicker = toolsArray.length === 0 && recentCompletedTools.length > 0;
  const shouldShowBanner = toolsArray.length > 0 || shouldShowTicker;

  // Don't render if no active tools and no completed tools
  if (!shouldShowBanner) {
    return null;
  }

  const formatTimeAgo = (timestamp) => {
    const now = Date.now();
    const time = new Date(timestamp).getTime();
    const diff = now - time;
    
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  // Ticker mode (collapsed with completed tools)
  if (shouldShowTicker) {
    return (
      <Slide direction="down" in={true} timeout={300}>
        <BannerContainer elevation={2}>
          {/* Collapsed Ticker Bar */}
          <Box
            onClick={() => setShowTickerMode(!showTickerMode)}
            sx={{
              position: 'relative',
              width: '100%',
              height: showTickerMode ? 'auto' : 40,
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              overflow: 'hidden',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: (theme) => theme.palette.mode === 'dark'
                  ? `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 1)}, ${alpha(theme.palette.grey[800], 1)})`
                  : `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 1)}, ${alpha(theme.palette.primary.main, 0.08)})`,
              },
            }}
          >
            {!showTickerMode && (
              <>
                {/* Ticker Content */}
                <Box
                  ref={tickerRef}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Typography variant="body2" sx={{ mr: 2, fontWeight: 600, color: 'primary.main' }}>
                    Recent MCP Tools:
                  </Typography>
                  {recentCompletedTools.map((tool, index) => (
                    <Box key={`${tool.id}-${index}`} sx={{ display: 'flex', alignItems: 'center', mr: 3 }}>
                      <Box sx={{ mr: 1 }}>
                        {tool.status === 'completed' ? (
                          <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
                        ) : (
                          <ErrorIcon sx={{ fontSize: 14, color: 'error.main' }} />
                        )}
                      </Box>
                      <Typography variant="caption" sx={{ mr: 1, fontWeight: 500 }}>
                        {tool.toolName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ({formatTimeAgo(tool.timestamp)})
                      </Typography>
                      {index < recentCompletedTools.length - 1 && (
                        <Typography variant="caption" sx={{ mx: 2, color: 'text.secondary' }}>
                          •
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
                
                {/* Click to expand indicator */}
                <Box sx={{ position: 'absolute', right: 16, display: 'flex', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                    Click to expand
                  </Typography>
                  <ExpandMoreIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                </Box>
              </>
            )}

            {showTickerMode && (
              <Box sx={{ width: '100%', p: 2 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <HistoryIcon color="primary" />
                    <Typography variant="subtitle1" fontWeight={600}>
                      Recent MCP Tools
                    </Typography>
                    <Chip
                      size="small"
                      label={`${recentCompletedTools.length} completed`}
                      color="primary"
                      sx={{ fontSize: '0.75rem', height: 24 }}
                    />
                  </Box>
                  <Tooltip title="Collapse">
                    <IconButton 
                      size="small"
                      sx={{
                        background: (theme) => alpha(theme.palette.primary.main, 0.1),
                        '&:hover': {
                          background: (theme) => alpha(theme.palette.primary.main, 0.2),
                        },
                      }}
                    >
                      <ExpandLessIcon />
                    </IconButton>
                  </Tooltip>
                </Box>

                {/* Expanded Content */}
                <Stack 
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2} 
                  sx={{ 
                    overflowX: { xs: 'visible', sm: 'auto' },
                    pb: 1,
                    flexWrap: { xs: 'nowrap', sm: 'wrap', md: 'nowrap' },
                    '&::-webkit-scrollbar': {
                      height: 6,
                    },
                    '&::-webkit-scrollbar-track': {
                      backgroundColor: (theme) => alpha(theme.palette.grey[500], 0.1),
                      borderRadius: 3,
                    },
                    '&::-webkit-scrollbar-thumb': {
                      backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.3),
                      borderRadius: 3,
                      '&:hover': {
                        backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.5),
                      },
                    },
                  }}
                >
                  {recentCompletedTools.map((tool) => (
                    <ToolCard key={tool.id}>
                      <CardContent sx={{ 
                        p: { xs: 1.5, sm: 2 }, 
                        '&:last-child': { pb: { xs: 1.5, sm: 2 } }
                      }}>
                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                          <Typography variant="subtitle2" fontWeight={600} noWrap>
                            {tool.toolName}
                          </Typography>
                          <Box display="flex" alignItems="center" gap={0.5}>
                            {tool.status === 'completed' ? (
                              <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                            ) : (
                              <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />
                            )}
                            <Typography variant="caption" color="text.secondary">
                              {formatTimeAgo(tool.timestamp)}
                            </Typography>
                          </Box>
                        </Box>

                        {tool.description && (
                          <Typography 
                            variant="body2" 
                            color="text.secondary" 
                            sx={{ 
                              mb: 1,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {tool.description}
                          </Typography>
                        )}

                        <Stack spacing={1}>
                          {tool.serverName && (
                            <Chip
                              size="small"
                              label={`Server: ${tool.serverName}`}
                              variant="outlined"
                              sx={{ fontSize: '0.7rem', alignSelf: 'flex-start' }}
                            />
                          )}
                          
                          {tool.duration && (
                            <Typography variant="caption" color="text.secondary">
                              Duration: {formatDurationMs(tool.duration)}
                            </Typography>
                          )}
                        </Stack>
                      </CardContent>
                    </ToolCard>
                  ))}
                </Stack>
              </Box>
            )}
          </Box>
        </BannerContainer>
      </Slide>
    );
  }

  // Full banner mode (with active tools)
  return (
    <Slide direction="down" in={true} timeout={300}>
      <BannerContainer elevation={2}>
        {/* Collapsed Header Bar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 3,
            py: 1.5,
            minHeight: 56,
          }}
        >
          <Box display="flex" alignItems="center" gap={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <SettingsIcon color="primary" />
              <Typography variant="subtitle1" fontWeight={600}>
                MCP Tools Active
              </Typography>
              <Chip
                size="small"
                label={`${toolsArray.length} running`}
                color="primary"
                sx={{ fontSize: '0.75rem', height: 24 }}
              />
            </Box>

            {!isExpanded && (
              <Stack direction="row" spacing={1} sx={{ overflow: 'hidden' }}>
                {toolsArray.slice(0, 3).map((tool) => (
                  <motion.div
                    key={tool.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Chip
                      size="small"
                      label={tool.toolName}
                      variant="outlined"
                      icon={<CircularProgress size={12} thickness={4} color="inherit" />}
                      sx={{ 
                        fontSize: '0.7rem',
                        '& .MuiChip-icon': {
                          color: 'primary.main',
                        },
                      }}
                    />
                  </motion.div>
                ))}
                {toolsArray.length > 3 && (
                  <Chip
                    size="small"
                    label={`+${toolsArray.length - 3} more`}
                    variant="outlined"
                    sx={{ fontSize: '0.7rem' }}
                  />
                )}
              </Stack>
            )}
          </Box>

          <Box display="flex" alignItems="center" gap={1}>
            {!isExpanded && (
              <Typography variant="caption" color="text.secondary">
                Auto-collapsed after {autoCollapseTime}s
              </Typography>
            )}
            
            <Tooltip title={isExpanded ? 'Collapse' : 'Expand'}>
              <IconButton 
                onClick={handleToggleExpansion}
                size="small"
                sx={{
                  background: (theme) => alpha(theme.palette.primary.main, 0.1),
                  '&:hover': {
                    background: (theme) => alpha(theme.palette.primary.main, 0.2),
                  },
                }}
              >
                {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Expanded Content */}
        <Collapse in={isExpanded} timeout={300}>
          <Box sx={{ 
            px: { xs: 1, sm: 2, md: 3 }, 
            pb: 2,
          }}>
            <Stack 
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2} 
              sx={{ 
                overflowX: { xs: 'visible', sm: 'auto' },
                pb: 1,
                flexWrap: { xs: 'nowrap', sm: 'wrap', md: 'nowrap' },
                '&::-webkit-scrollbar': {
                  height: 6,
                },
                '&::-webkit-scrollbar-track': {
                  backgroundColor: (theme) => alpha(theme.palette.grey[500], 0.1),
                  borderRadius: 3,
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.3),
                  borderRadius: 3,
                  '&:hover': {
                    backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.5),
                  },
                },
              }}
            >
              <AnimatePresence>
                {toolsArray.map((tool) => (
                  <motion.div
                    key={tool.id}
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ToolCard>
                      <CardContent sx={{ 
                        p: { xs: 1.5, sm: 2 }, 
                        '&:last-child': { pb: { xs: 1.5, sm: 2 } }
                      }}>
                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                          <Typography variant="subtitle2" fontWeight={600} noWrap>
                            {tool.toolName}
                          </Typography>
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <CircularProgress size={16} thickness={4} color="primary" />
                            <Typography variant="caption" color="text.secondary">
                              {formatDuration(tool.startTime)}
                            </Typography>
                          </Box>
                        </Box>

                        {tool.description && (
                          <Typography 
                            variant="body2" 
                            color="text.secondary" 
                            sx={{ 
                              mb: 1,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {tool.description}
                          </Typography>
                        )}

                        <Stack spacing={1}>
                          {tool.serverName && (
                            <Chip
                              size="small"
                              label={`Server: ${tool.serverName}`}
                              variant="outlined"
                              sx={{ fontSize: '0.7rem', alignSelf: 'flex-start' }}
                            />
                          )}
                          
                          {tool.parameters && formatParameters(tool.parameters) && (
                            <Typography variant="caption" color="text.secondary">
                              {formatParameters(tool.parameters)}
                            </Typography>
                          )}
                        </Stack>

                        {/* Progress indicator */}
                        <LinearProgress 
                          sx={{ 
                            mt: 1.5,
                            height: 2,
                            borderRadius: 1,
                            backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.1),
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: (theme) => theme.palette.primary.main,
                            },
                          }} 
                        />
                      </CardContent>
                    </ToolCard>
                  </motion.div>
                ))}
              </AnimatePresence>
            </Stack>
          </Box>
        </Collapse>
      </BannerContainer>
    </Slide>
  );
};

export default MCPToolBanner;