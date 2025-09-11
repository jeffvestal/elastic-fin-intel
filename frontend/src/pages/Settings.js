import React, { useState, useEffect } from 'react';
import { 
    Box, 
    Typography, 
    TextField, 
    Button, 
    Paper, 
    Switch, 
    List, 
    ListItem, 
    ListItemText, 
    IconButton,
    Stack,
    FormControlLabel,
    CircularProgress,
    Divider,
    Radio,
    RadioGroup,
    FormControl,
    FormLabel,
    Slider,
    Card,
    CardContent,
    Chip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useDemoMode } from '../contexts/DemoModeContext';
import { useMCPDisplaySettings } from '../contexts/MCPDisplaySettingsContext';

const Settings = () => {
    const { isDemoMode, toggleDemoMode } = useDemoMode();
    const {
        displayMode,
        autoCollapseTime,
        showExecutionHistory,
        bannerPosition,
        updateDisplayMode,
        updateAutoCollapseTime,
        updateShowExecutionHistory,
        updateBannerPosition,
        resetToDefaults
    } = useMCPDisplaySettings();
    const [settings, setSettings] = useState(null);
    const [newServerUrl, setNewServerUrl] = useState('');
    const [newServerApiKey, setNewServerApiKey] = useState('');
    const [newServerName, setNewServerName] = useState('');
    const [newServerUseForMainPage, setNewServerUseForMainPage] = useState(false);
    const [loggingEnabled, setLoggingEnabled] = useState(false);
    const [refreshingServers, setRefreshingServers] = useState(new Set());

    useEffect(() => {
        // Fetch server settings with fallback for demo mode
        fetch('/settings')
            .then(res => res.ok ? res.json() : Promise.reject('Backend not available'))
            .then(data => setSettings(data))
            .catch(err => {
                console.log("Backend not available, using demo settings");
                // Set demo settings when backend is not available
                setSettings({
                    demo_server: {
                        name: "Demo MCP Server",
                        url: "http://localhost:3001",
                        enabled: true,
                        status: "connected",
                        tools: {
                            search_tool: { enabled: true, description: "Search financial data" },
                            analysis_tool: { enabled: true, description: "Analyze market trends" }
                        }
                    }
                });
            });
        
        // Fetch logging status with fallback
        fetch('/settings/logging')
            .then(res => res.ok ? res.json() : Promise.reject('Backend not available'))
            .then(data => setLoggingEnabled(data.enabled))
            .catch(err => {
                console.log("Backend not available, using demo logging setting");
                setLoggingEnabled(false);
            });
    }, []);

    const handleToggle = (server, tool = null) => {
        const newSettings = { ...settings };
        if (tool) {
            // Toggle individual tool
            newSettings[server].tools[tool].enabled = !newSettings[server].tools[tool].enabled;
        } else {
            // Toggle server and all its tools
            const serverEnabled = !newSettings[server].enabled;
            newSettings[server].enabled = serverEnabled;
            
            // Toggle all tools to match server state
            Object.keys(newSettings[server].tools || {}).forEach(toolName => {
                newSettings[server].tools[toolName].enabled = serverEnabled;
            });
        }
        setSettings(newSettings);
        fetch('/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSettings),
        }).catch(err => console.log("Settings update skipped - backend not available"));
    };

    const handleMainPageToggle = (serverId) => {
        const newSettings = { ...settings };
        const currentValue = newSettings[serverId].use_for_main_page || false;
        newSettings[serverId].use_for_main_page = !currentValue;
        
        setSettings(newSettings);
        
        // Update the server configuration on the backend
        fetch(`/servers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: serverId,
                name: newSettings[serverId].name,
                url: newSettings[serverId].url,
                apiKey: newSettings[serverId].api_key,
                useForMainPage: !currentValue
            }),
        }).catch(error => {
            console.error('Failed to update main page setting:', error);
            // Revert the change on error
            newSettings[serverId].use_for_main_page = currentValue;
            setSettings(newSettings);
        });
    };

    const handleAddServer = () => {
        const serverData = {
            id: 'new-server-' + Date.now(),
            name: newServerName,
            url: newServerUrl,
            apiKey: newServerApiKey,
            useForMainPage: newServerUseForMainPage
        };

        fetch('/servers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(serverData),
        })
        .then(res => {
            if (!res.ok) {
                return res.json().then(err => { throw new Error(err.detail || 'Server returned an error') });
            }
            return res.json();
        })
        .then(data => {
            const newSettings = { ...settings, [data.id]: data };
            setSettings(newSettings);
            setNewServerName('');
            setNewServerUrl('');
            setNewServerApiKey('');
            setNewServerUseForMainPage(false);
        })
        .catch(error => {
            console.log('Backend not available - simulating server add for demo');
            // Add server to local state for demo purposes
            const demoServer = {
                id: serverData.id,
                name: serverData.name,
                url: serverData.url,
                enabled: true,
                status: "demo",
                tools: {
                    demo_tool: { enabled: true, description: "Demo tool for presentation" }
                }
            };
            const newSettings = { ...settings, [demoServer.id]: demoServer };
            setSettings(newSettings);
            setNewServerName('');
            setNewServerUrl('');
            setNewServerApiKey('');
            setNewServerUseForMainPage(false);
        });
    };

    const handleRemoveServer = (serverId) => {
        fetch(`/servers/${serverId}`, { method: 'DELETE' })
        .then(() => {
            const newSettings = { ...settings };
            delete newSettings[serverId];
            setSettings(newSettings);
        })
        .catch(err => {
            console.log('Backend not available - removing server from demo state');
            const newSettings = { ...settings };
            delete newSettings[serverId];
            setSettings(newSettings);
        });
    };

    const handleLoggingToggle = (event) => {
        const isEnabled = event.target.checked;
        setLoggingEnabled(isEnabled);
        fetch('/settings/logging', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: isEnabled }),
        })
        .catch(err => console.log('Backend not available - logging toggle saved locally only'));
    };

    const handleRefreshTools = async (serverId) => {
        // Add server to refreshing set
        setRefreshingServers(prev => new Set([...prev, serverId]));
        
        try {
            const response = await fetch(`/servers/${serverId}/refresh-tools`, {
                method: 'POST',
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to refresh tools');
            }
            
            const updatedServer = await response.json();
            
            // Update the settings with the refreshed server data
            setSettings(prev => ({
                ...prev,
                [serverId]: updatedServer
            }));
            
        } catch (error) {
            console.log('Backend not available - simulating tool refresh');
            // Simulate tool refresh for demo
            const currentServer = settings[serverId];
            if (currentServer) {
                const refreshedServer = {
                    ...currentServer,
                    tools: {
                        ...currentServer.tools,
                        refreshed_tool: { enabled: true, description: "Refreshed demo tool" }
                    }
                };
                setSettings(prev => ({
                    ...prev,
                    [serverId]: refreshedServer
                }));
            }
        } finally {
            // Remove server from refreshing set
            setRefreshingServers(prev => {
                const newSet = new Set(prev);
                newSet.delete(serverId);
                return newSet;
            });
        }
    };

    if (!settings) {
        return <Typography>Loading...</Typography>;
    }

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto' }}>
            <Typography variant="h4" gutterBottom>MCP Settings</Typography>
            
            {/* MCP Display Settings */}
            <Card sx={{ mb: 4 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        MCP Tools Display Settings
                        <Chip size="small" label="New" color="primary" />
                    </Typography>
                    
                    <Stack spacing={3}>
                        {/* Display Mode */}
                        <FormControl component="fieldset">
                            <FormLabel component="legend" sx={{ mb: 1 }}>
                                Display Mode
                            </FormLabel>
                            <RadioGroup
                                row
                                value={displayMode}
                                onChange={(e) => updateDisplayMode(e.target.value)}
                            >
                                <FormControlLabel 
                                    value="floating" 
                                    control={<Radio />} 
                                    label={
                                        <Box>
                                            <Typography variant="body2" fontWeight={500}>Floating Button</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Top-right floating action button
                                            </Typography>
                                        </Box>
                                    } 
                                />
                                <FormControlLabel 
                                    value="banner" 
                                    control={<Radio />} 
                                    label={
                                        <Box>
                                            <Typography variant="body2" fontWeight={500}>Top Banner</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Horizontal banner at top of page
                                            </Typography>
                                        </Box>
                                    } 
                                />
                                <FormControlLabel 
                                    value="both" 
                                    control={<Radio />} 
                                    label={
                                        <Box>
                                            <Typography variant="body2" fontWeight={500}>Both</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Show both banner and floating button
                                            </Typography>
                                        </Box>
                                    } 
                                />
                            </RadioGroup>
                        </FormControl>

                        {/* Auto-collapse Timer */}
                        {displayMode !== 'floating' && (
                            <Box>
                                <Typography variant="body2" fontWeight={500} gutterBottom>
                                    Auto-collapse Timer: {autoCollapseTime} seconds
                                </Typography>
                                <Slider
                                    value={autoCollapseTime}
                                    onChange={(e, value) => updateAutoCollapseTime(value)}
                                    min={1}
                                    max={10}
                                    step={1}
                                    marks
                                    valueLabelDisplay="auto"
                                    sx={{ mt: 1 }}
                                />
                                <Typography variant="caption" color="text.secondary">
                                    Banner will auto-collapse after this many seconds
                                </Typography>
                            </Box>
                        )}

                        {/* Banner Position (only if banner is enabled) */}
                        {(displayMode === 'banner' || displayMode === 'both') && (
                            <FormControl component="fieldset">
                                <FormLabel component="legend" sx={{ mb: 1 }}>
                                    Banner Position
                                </FormLabel>
                                <RadioGroup
                                    row
                                    value={bannerPosition}
                                    onChange={(e) => updateBannerPosition(e.target.value)}
                                >
                                    <FormControlLabel 
                                        value="top" 
                                        control={<Radio />} 
                                        label="Top (below header)" 
                                    />
                                    <FormControlLabel 
                                        value="bottom" 
                                        control={<Radio />} 
                                        label="Bottom (above footer)" 
                                    />
                                </RadioGroup>
                            </FormControl>
                        )}

                        {/* Show Execution History */}
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={showExecutionHistory}
                                    onChange={(e) => updateShowExecutionHistory(e.target.checked)}
                                />
                            }
                            label={
                                <Box>
                                    <Typography variant="body2" fontWeight={500}>Show Execution History</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Display history of completed MCP tool executions
                                    </Typography>
                                </Box>
                            }
                        />

                        {/* Actions */}
                        <Stack direction="row" spacing={2} sx={{ pt: 2 }}>
                            <Button 
                                variant="outlined" 
                                onClick={resetToDefaults}
                                size="small"
                            >
                                Reset to Defaults
                            </Button>
                            <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                                Current: {displayMode === 'floating' ? 'Floating Button' : displayMode === 'banner' ? 'Top Banner' : 'Both'}, 
                                {displayMode !== 'floating' && ` ${autoCollapseTime}s auto-collapse,`}
                                {showExecutionHistory ? ' with history' : ' no history'}
                            </Typography>
                        </Stack>
                    </Stack>
                </CardContent>
            </Card>
            
            <Paper sx={{ p: 3, mb: 4 }}>
                <Typography variant="h6" gutterBottom>Register New Server</Typography>
                <Stack spacing={2} sx={{ mb: 2 }}>
                    <TextField
                        label="Server Name"
                        variant="outlined"
                        fullWidth
                        value={newServerName}
                        onChange={(e) => setNewServerName(e.target.value)}
                        placeholder="e.g., My Elasticsearch Server"
                    />
                    <TextField
                        label="Server URL"
                        variant="outlined"
                        fullWidth
                        value={newServerUrl}
                        onChange={(e) => setNewServerUrl(e.target.value)}
                        placeholder="e.g., http://localhost:5601/api/chat/mcp"
                    />
                    <TextField
                        label="API Key (optional)"
                        variant="outlined"
                        fullWidth
                        type="password"
                        value={newServerApiKey}
                        onChange={(e) => setNewServerApiKey(e.target.value)}
                        placeholder="Enter API Key"
                    />
                    <FormControlLabel
                        control={
                            <Switch 
                                checked={newServerUseForMainPage}
                                onChange={(e) => setNewServerUseForMainPage(e.target.checked)}
                            />
                        }
                        label="Use for main page data"
                    />
                    <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 4, mt: -1 }}>
                        Enable this server to provide additional dashboard content like news summaries
                    </Typography>
                </Stack>
                <Button variant="contained" color="primary" onClick={handleAddServer}>
                    Add Server
                </Button>
            </Paper>

            <Paper sx={{ p: 3, mb: 4 }}>
                <Typography variant="h6" gutterBottom>Global Settings</Typography>
                
                <FormControlLabel
                    control={<Switch checked={isDemoMode} onChange={toggleDemoMode} />}
                    label="Demo Mode"
                />
                <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
                    Enables simplified UI optimized for presentations and demos
                </Typography>
                
                <Divider sx={{ my: 2 }} />
                
                <FormControlLabel
                    control={<Switch checked={loggingEnabled} onChange={handleLoggingToggle} />}
                    label="Enable MCP Communication Logging"
                />
                <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 4 }}>
                    Enables detailed logging of MCP tool communications
                </Typography>
            </Paper>

            {Object.entries(settings).map(([serverId, server]) => (
                <Paper key={serverId} sx={{ p: 3, mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h5">{server.name}</Typography>
                        <Box>
                            <Switch checked={server.enabled} onChange={() => handleToggle(serverId)} />
                            <IconButton 
                                onClick={() => handleRefreshTools(serverId)} 
                                color="primary"
                                disabled={refreshingServers.has(serverId)}
                                title="Refresh Tools"
                            >
                                {refreshingServers.has(serverId) ? (
                                    <CircularProgress size={20} />
                                ) : (
                                    <RefreshIcon />
                                )}
                            </IconButton>
                            {serverId !== 'local' && (
                                <IconButton onClick={() => handleRemoveServer(serverId)} color="error">
                                    <DeleteIcon />
                                </IconButton>
                            )}
                        </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>{server.url}</Typography>
                    
                    <Box sx={{ mt: 2, mb: 2 }}>
                        <FormControlLabel
                            control={
                                <Switch 
                                    checked={server.use_for_main_page || false}
                                    onChange={() => handleMainPageToggle(serverId)}
                                    disabled={!server.enabled}
                                />
                            }
                            label="Use for main page data"
                            sx={{ opacity: server.enabled ? 1 : 0.5 }}
                        />
                        <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 4 }}>
                            When enabled, this server will provide additional content like news summaries for the dashboard
                        </Typography>
                    </Box>
                    
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="h6">Tools</Typography>
                        <List>
                            {Object.entries(server.tools || {}).map(([toolId, tool]) => (
                                <ListItem key={toolId} secondaryAction={
                                    <Switch 
                                        edge="end" 
                                        checked={server.enabled && (tool.enabled || false)} 
                                        disabled={!server.enabled}
                                        onChange={() => handleToggle(serverId, toolId)} 
                                    />
                                }>
                                    <ListItemText 
                                        primary={toolId} 
                                        secondary={tool.description || 'No description available'}
                                        sx={{ opacity: server.enabled ? 1 : 0.5 }}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Box>
                </Paper>
            ))}
        </Box>
    );
};

export default Settings;
