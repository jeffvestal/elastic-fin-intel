import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Fade,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  IconButton,
  LinearProgress
} from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import SettingsIcon from '@mui/icons-material/Settings';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useMCPNotification } from '../contexts/MCPNotificationContext';
import { useDemoMode } from '../contexts/DemoModeContext';

const pulse = keyframes`
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.9;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`;

const slideIn = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const ExecutionContainer = styled(Box)(({ theme, isDemo }) => ({
  position: 'fixed',
  top: isDemo ? 80 : 20,
  right: 20,
  zIndex: 10000,
  width: isDemo ? 400 : 320,
  maxHeight: isDemo ? '70vh' : '50vh',
  overflowY: 'auto',
  pointerEvents: 'none',
}));

const ExecutionPaper = styled(Paper)(({ theme, isDemo }) => ({
  padding: theme.spacing(isDemo ? 2 : 1.5),
  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(10px)',
  boxShadow: theme.shadows[8],
  borderRadius: theme.spacing(1.5),
  border: `1px solid ${theme.palette.primary.main}`,
  pointerEvents: 'auto',
  animation: `${slideIn} 0.3s ease-out`,
}));

const ToolItem = styled(ListItem)(({ theme, isActive, isCompleted }) => ({
  borderRadius: theme.spacing(1),
  margin: theme.spacing(0.5, 0),
  backgroundColor: isCompleted 
    ? theme.palette.success.main + '20'
    : isActive 
      ? theme.palette.primary.main + '20'
      : 'transparent',
  animation: isActive ? `${pulse} 2s infinite` : 'none',
  transition: 'all 0.3s ease',
}));

const MCPExecutionPanel = () => {
  const { activeTools } = useMCPNotification();
  const { isDemoMode } = useDemoMode();
  const [expanded, setExpanded] = useState(true);
  const [completedTools, setCompletedTools] = useState(new Set());
  const [toolHistory, setToolHistory] = useState([]);

  // Convert Map to array for rendering
  const toolsArray = Array.from(activeTools.entries()).map(([id, tool]) => ({
    id,
    ...tool
  }));

  // Track tool completion
  useEffect(() => {
    const currentToolIds = new Set(toolsArray.map(tool => tool.id));
    
    // Find tools that were active but are no longer in the array (completed)
    toolHistory.forEach(historicalTool => {
      if (!currentToolIds.has(historicalTool.id) && !completedTools.has(historicalTool.id)) {
        setCompletedTools(prev => new Set([...prev, historicalTool.id]));
      }
    });

    // Update tool history
    setToolHistory(prev => {
      const newHistory = [...prev];
      toolsArray.forEach(tool => {
        if (!newHistory.some(h => h.id === tool.id)) {
          newHistory.push({
            ...tool,
            startTime: Date.now()
          });
        }
      });
      // Keep only recent tools in history (last 10)
      return newHistory.slice(-10);
    });
  }, [toolsArray, toolHistory, completedTools]);

  // Don't render if no tools and not in demo mode
  if (toolsArray.length === 0 && completedTools.size === 0 && !isDemoMode) {
    return null;
  }

  const recentCompleted = toolHistory
    .filter(tool => completedTools.has(tool.id))
    .slice(-3); // Show last 3 completed

  const handleToggleExpanded = () => {
    setExpanded(!expanded);
  };

  return (
    <ExecutionContainer isDemo={isDemoMode}>
      <Fade in={true} timeout={300}>
        <ExecutionPaper elevation={8} isDemo={isDemoMode}>
          {/* Header */}
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Box display="flex" alignItems="center" gap={1}>
              <SettingsIcon 
                color="primary" 
                sx={{ fontSize: isDemoMode ? 24 : 20 }}
              />
              <Typography 
                variant={isDemoMode ? "h6" : "subtitle1"} 
                fontWeight="bold"
                color="primary"
              >
                MCP Tools
              </Typography>
              {toolsArray.length > 0 && (
                <Chip 
                  label={`${toolsArray.length} Active`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
            </Box>
            <IconButton 
              size="small" 
              onClick={handleToggleExpanded}
              sx={{ p: 0.5 }}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>

          <Collapse in={expanded}>
            {/* Active Tools */}
            {toolsArray.length > 0 && (
              <Box mb={2}>
                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  sx={{ 
                    fontWeight: 'bold',
                    fontSize: isDemoMode ? '0.85rem' : '0.75rem'
                  }}
                >
                  EXECUTING
                </Typography>
                <List dense sx={{ py: 0.5 }}>
                  {toolsArray.map((tool) => (
                    <ToolItem key={tool.id} isActive={true}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <CircularProgress 
                          size={isDemoMode ? 20 : 16} 
                          thickness={4}
                          color="primary"
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography 
                            variant="body2" 
                            fontWeight="medium"
                            sx={{ fontSize: isDemoMode ? '0.9rem' : '0.8rem' }}
                          >
                            {tool.toolName}
                          </Typography>
                        }
                        secondary={
                          tool.description && (
                            <Typography 
                              variant="caption"
                              sx={{ 
                                fontSize: isDemoMode ? '0.8rem' : '0.7rem',
                                opacity: 0.8
                              }}
                            >
                              {tool.description}
                            </Typography>
                          )
                        }
                      />
                    </ToolItem>
                  ))}
                </List>
                {toolsArray.length > 0 && (
                  <LinearProgress 
                    sx={{ 
                      my: 1, 
                      borderRadius: 1,
                      height: isDemoMode ? 6 : 4
                    }} 
                  />
                )}
              </Box>
            )}

            {/* Recently Completed Tools */}
            {recentCompleted.length > 0 && (
              <Box>
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ 
                    fontWeight: 'bold',
                    fontSize: isDemoMode ? '0.85rem' : '0.75rem'
                  }}
                >
                  RECENTLY COMPLETED
                </Typography>
                <List dense sx={{ py: 0.5 }}>
                  {recentCompleted.map((tool) => (
                    <ToolItem key={tool.id} isCompleted={true}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <CheckCircleIcon 
                          color="success" 
                          sx={{ fontSize: isDemoMode ? 20 : 16 }}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography 
                            variant="body2"
                            sx={{ 
                              fontSize: isDemoMode ? '0.9rem' : '0.8rem',
                              opacity: 0.8
                            }}
                          >
                            {tool.toolName}
                          </Typography>
                        }
                      />
                    </ToolItem>
                  ))}
                </List>
              </Box>
            )}

            {/* Demo Mode Instructions */}
            {isDemoMode && toolsArray.length === 0 && recentCompleted.length === 0 && (
              <Box textAlign="center" py={2}>
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ fontStyle: 'italic' }}
                >
                  Demo Mode Active
                </Typography>
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  display="block"
                >
                  MCP tool executions will appear here
                </Typography>
              </Box>
            )}
          </Collapse>
        </ExecutionPaper>
      </Fade>
    </ExecutionContainer>
  );
};

export default MCPExecutionPanel;