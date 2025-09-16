import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  CircularProgress,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  Drawer,
  Button,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import MinimizeIcon from '@mui/icons-material/Minimize';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { usePageContext } from '../contexts/PageContextProvider';
import { useMCPNotification } from '../contexts/MCPNotificationContext';
import { useAppMode } from '../contexts/AppModeContext';
import ChatMessageRenderer from './ChatMessageRenderer';
import ReactMarkdown from 'react-markdown';

const GlobalChat = () => {
  const { 
    globalChatOpen, 
    setGlobalChatOpen, 
    globalChatPosition,
    updateChatPosition,
    pageInfo, 
    getContextPrompt, 
    hasCustomerContext, 
    hasAccountContext 
  } = usePageContext();
  
  const { appMode } = useAppMode();
  const { showMCPTool, hideMCPTool } = useMCPNotification();
  
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatWidth, setChatWidth] = useState(460);
  const [chatHeight, setChatHeight] = useState(600);
  const [chatExpanded, setChatExpanded] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [isNewConversation, setIsNewConversation] = useState(true);
  
  const isResizing = useRef(false);
  const isResizingVertical = useRef(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Extract session ID from response text and clean the display text
  const extractSessionId = (responseText) => {
    const sessionMatch = responseText.match(/Session ID: ([a-f0-9-]+)/);
    if (sessionMatch) {
      const extractedSessionId = sessionMatch[1];
      console.log('📋 Extracted session ID:', extractedSessionId);
      setSessionId(extractedSessionId);
      setIsNewConversation(false);
      return responseText.replace(/Session ID: [a-f0-9-]+\n\n/, '');
    }
    return responseText;
  };

  const startNewConversation = () => {
    setSessionId(null);
    setIsNewConversation(true);
    setMessages([]);
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const notificationId = showMCPTool('Global Chat with MCP Tools', 'Processing query with available tools');

    const userMessage = { sender: 'user', text: input, timestamp: new Date().toLocaleTimeString() };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput('');
    setIsLoading(true);

    // Auto-expand when sending a message
    if (!chatExpanded && globalChatPosition === 'bottom') {
      setChatExpanded(true);
    }

    setMessages(prevMessages => [...prevMessages, { sender: 'agent', text: '', timestamp: new Date().toLocaleTimeString() }]);

    try {
      let contextualQuery = input;
      if (hasCustomerContext || hasAccountContext) {
        const contextPrompt = getContextPrompt();
        contextualQuery = `${contextPrompt}\n\nQuestion: ${input}`;
      }
      
      const requestBody = { query: contextualQuery, app_mode: appMode };
      if (sessionId && !isNewConversation) {
        requestBody.session_id = sessionId;
      }

      const response = await fetch('http://localhost:8000/chat/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const fullText = await response.text();
      const cleanedText = extractSessionId(fullText);

      setMessages(prev => {
        const newMessages = [...prev];
        if (newMessages.length > 0 && newMessages[newMessages.length - 1].sender === 'agent') {
          newMessages[newMessages.length - 1].text = cleanedText;
        }
        return newMessages;
      });

    } catch (error) {
      console.error("Error fetching chat response:", error);
      const errorText = "Sorry, an error occurred while fetching the response.";
      setMessages(prev => {
        const newMessages = [...prev];
        if (newMessages.length > 0 && newMessages[newMessages.length - 1].sender === 'agent') {
            newMessages[newMessages.length - 1].text = errorText;
        }
        return newMessages;
      });
    } finally {
      setIsLoading(false);
      hideMCPTool(notificationId);
    }
  };

  const handlePositionChange = (event, newPosition) => {
    if (newPosition !== null) {
      updateChatPosition(newPosition);
    }
  };

  const handleChatInputFocus = () => {
    if (!chatExpanded && globalChatPosition === 'bottom') {
      setChatExpanded(true);
    }
  };

  const handleChatCollapse = () => {
    setChatExpanded(false);
  };

  // Resize handlers
  const handleMouseDown = (e) => {
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleVerticalMouseDown = (e) => {
    isResizingVertical.current = true;
    document.addEventListener('mousemove', handleVerticalMouseMove);
    document.addEventListener('mouseup', handleVerticalMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!isResizing.current) return;
    const newWidth = window.innerWidth - e.clientX;
    setChatWidth(Math.max(300, Math.min(800, newWidth)));
  };

  const handleVerticalMouseMove = (e) => {
    if (!isResizingVertical.current) return;
    const newHeight = window.innerHeight - e.clientY;
    setChatHeight(Math.max(300, Math.min(window.innerHeight * 0.8, newHeight)));
  };

  const handleMouseUp = () => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleVerticalMouseUp = () => {
    isResizingVertical.current = false;
    document.removeEventListener('mousemove', handleVerticalMouseMove);
    document.removeEventListener('mouseup', handleVerticalMouseUp);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSend();
  };

  if (!globalChatOpen) {
    return null;
  }

  // Bottom position mode
  if (globalChatPosition === 'bottom') {
    return (
      <Paper
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: chatExpanded ? chatHeight : '90px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0px -8px 25px rgba(0, 0, 0, 0.4)',
          borderRadius: '12px 12px 0 0',
          overflow: 'hidden',
          zIndex: 1150,
          bgcolor: 'background.paper',
          transition: 'height 0.3s ease-in-out',
        }}
      >
        {/* Vertical resize handle - only when expanded */}
        {chatExpanded && (
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              height: '10px',
              cursor: 'ns-resize',
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              zIndex: 1,
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.2)',
              },
            }}
            onMouseDown={handleVerticalMouseDown}
          />
        )}

        {/* Header with controls - only when expanded */}
        {chatExpanded && (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            p: 1, 
            borderBottom: '1px solid #333', 
            mt: 1 
          }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              Global Chat
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {pageInfo.name} {hasCustomerContext || hasAccountContext ? '• Context Aware' : ''}
            </Typography>
            {sessionId && (
              <Chip 
                label={`Session: ${sessionId.slice(-8)}`} 
                size="small" 
                variant="outlined" 
                sx={{ fontSize: '0.7rem' }}
              />
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ToggleButtonGroup
              value={globalChatPosition}
              exclusive
              onChange={handlePositionChange}
              size="small"
            >
              <ToggleButton value="bottom">
                <Tooltip title="Bottom Position">
                  <OpenInFullIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="right">
                <Tooltip title="Right Side Panel">
                  <CallSplitIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>
            {chatExpanded && (
              <IconButton onClick={handleChatCollapse} size="small">
                <MinimizeIcon />
              </IconButton>
            )}
            <IconButton onClick={startNewConversation} size="small" title="New Conversation">
              <AddIcon />
            </IconButton>
            <IconButton onClick={() => setGlobalChatOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
          </Box>
        )}

        {/* Messages area - only when expanded */}
        {chatExpanded && (
          <Paper sx={{ flexGrow: 1, p: 2, overflowY: 'auto', bgcolor: 'background.default', m: 1, borderRadius: 1 }}>
            {messages.map((message, index) => (
              <Box key={index} sx={{ mb: 2, textAlign: message.sender === 'user' ? 'right' : 'left' }}>
                <Typography variant="caption" display="block" sx={{ color: 'text.secondary' }}>
                  {message.sender === 'user' ? 'You' : 'AI Agent'} - {message.timestamp}
                </Typography>
                <Paper
                  sx={{
                    display: 'inline-block',
                    p: 1,
                    bgcolor: message.sender === 'user' ? 'primary.dark' : 'background.paper',
                    color: message.sender === 'user' ? 'white' : 'inherit',
                    borderRadius: '10px',
                    boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  {message.sender === 'user' ? (
                    <ReactMarkdown>{message.text}</ReactMarkdown>
                  ) : (
                    <ChatMessageRenderer message={message.text} />
                  )}
                </Paper>
              </Box>
            ))}
            {isLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
                <CircularProgress size={24} />
                <Typography sx={{ ml: 1, color: 'text.secondary' }}>AI is thinking...</Typography>
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Paper>
        )}

        {/* Input area - always visible */}
        <Box component="form" onSubmit={handleSubmit} sx={{ 
          display: 'flex', 
          p: chatExpanded ? 2 : 3, 
          borderTop: chatExpanded ? '1px solid #333' : 'none',
          alignItems: 'center',
          justifyContent: 'center',
          flexGrow: chatExpanded ? 0 : 1
        }}>
          <TextField
            fullWidth
            size="small"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={handleChatInputFocus}
            placeholder={
              chatExpanded 
                ? (hasAccountContext ? "Ask about this account..." : hasCustomerContext ? "Ask about this customer..." : "Ask a question...") 
                : "Global Chat - Ask me anything..."
            }
            disabled={isLoading}
            sx={{ mr: 1 }}
          />
          <Button 
            type="submit"
            variant="contained" 
            disabled={isLoading || !input.trim()}
            sx={{ minWidth: '60px' }}
          >
            Send
          </Button>
        </Box>
      </Paper>
    );
  }

  // Right side panel mode
  return (
    <Drawer
      anchor="right"
      open={globalChatOpen}
      onClose={() => setGlobalChatOpen(false)}
      variant="temporary"
      PaperProps={{
        sx: {
          width: chatWidth,
          boxShadow: '0px 8px 25px rgba(0, 0, 0, 0.4)',
          borderRadius: '12px 0 0 12px',
          overflow: 'hidden',
        },
      }}
    >
      {/* Horizontal resize handle */}
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '15px',
          cursor: 'ew-resize',
          bgcolor: 'rgba(255, 255, 255, 0.2)',
          borderRight: '1px solid rgba(255, 255, 255, 0.3)',
          zIndex: 10,
          '&:hover': {
            bgcolor: 'rgba(255, 255, 255, 0.4)',
            borderRight: '2px solid rgba(255, 255, 255, 0.6)',
          },
        }}
        onMouseDown={handleMouseDown}
      />
      
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', pl: 2 }}>
        {/* Header with position toggle */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: '1px solid #333' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <Typography variant="h6">Global Chat</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5 }}>
              {pageInfo.name} {hasCustomerContext || hasAccountContext ? '• Context Aware' : ''}
            </Typography>
            {sessionId && (
              <Chip 
                label={`Session: ${sessionId.slice(-8)}`} 
                size="small" 
                variant="outlined" 
                sx={{ mt: 0.5, fontSize: '0.7rem' }}
              />
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ToggleButtonGroup
              value={globalChatPosition}
              exclusive
              onChange={handlePositionChange}
              size="small"
              sx={{ mr: 1 }}
            >
              <ToggleButton value="bottom">
                <Tooltip title="Bottom Position">
                  <OpenInFullIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="right">
                <Tooltip title="Right Side Panel">
                  <CallSplitIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>
            <IconButton 
              onClick={startNewConversation} 
              size="small"
              title="New Conversation"
            >
              <AddIcon />
            </IconButton>
            <IconButton onClick={() => setGlobalChatOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
        
        {/* Messages area */}
        <Paper sx={{ flexGrow: 1, p: 2, overflowY: 'auto', bgcolor: 'background.default' }}>
          {messages.map((message, index) => (
            <Box key={index} sx={{ mb: 2, textAlign: message.sender === 'user' ? 'right' : 'left' }}>
              <Typography variant="caption" display="block" sx={{ color: 'text.secondary' }}>
                {message.sender === 'user' ? 'You' : 'AI Agent'} - {message.timestamp}
              </Typography>
              <Paper
                sx={{
                  display: 'inline-block',
                  p: 1,
                  bgcolor: message.sender === 'user' ? 'primary.dark' : 'background.paper',
                  color: message.sender === 'user' ? 'white' : 'inherit',
                  borderRadius: '10px',
                  boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.2)',
                }}
              >
                {message.sender === 'user' ? (
                  <ReactMarkdown>{message.text}</ReactMarkdown>
                ) : (
                  <ChatMessageRenderer message={message.text} />
                )}
              </Paper>
            </Box>
          ))}
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
              <CircularProgress size={24} />
              <Typography sx={{ ml: 1, color: 'text.secondary' }}>AI is thinking...</Typography>
            </Box>
          )}
          <div ref={messagesEndRef} />
        </Paper>
        
        {/* Input area */}
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', p: 1, borderTop: '1px solid #333' }}>
          <TextField
            fullWidth
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={hasAccountContext ? "Ask about this account..." : hasCustomerContext ? "Ask about this customer..." : "Ask a question..."}
            disabled={isLoading}
          />
          <Button type="submit" sx={{ ml: 1 }} disabled={isLoading || !input.trim()}>Send</Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default GlobalChat;