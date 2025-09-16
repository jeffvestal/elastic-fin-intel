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
    Chip,
    FormGroup,
    Checkbox
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Collapse } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import { useDemoMode } from '../contexts/DemoModeContext';
import { useMCPDisplaySettings } from '../contexts/MCPDisplaySettingsContext';
import { useAppMode } from '../contexts/AppModeContext';

const Settings = () => {
    const { isDemoMode, toggleDemoMode } = useDemoMode();

    // Helper function to format tool names for better readability
    const formatToolName = (toolId) => {
        // Split by underscores to get main parts
        const parts = toolId.split('_');
        
        if (parts.length < 2) {
            // Single part, just format it
            return parts[0]
                .replace(/([a-z])([A-Z])/g, '$1 $2')
                .split(/[-\s]/)
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join('-');
        }
        
        // Handle multi-part tool names
        const firstNamespace = parts[0];
        const remainingPart = parts.slice(1).join('_');
        
        // Try to parse the remaining part to extract nested namespaces
        // Look for patterns like "searchcustomer-lookup" or "researchasset-news"
        let secondNamespace = '';
        let toolName = remainingPart;
        
        // Common namespace patterns to look for
        const namespacePatterns = [
            'search', 'research', 'account', 'portfolio', 'trading', 'market',
            'utilities', 'customer', 'asset', 'core', 'platform'
        ];
        
        for (const pattern of namespacePatterns) {
            if (remainingPart.toLowerCase().startsWith(pattern)) {
                secondNamespace = pattern;
                toolName = remainingPart.slice(pattern.length);
                break;
            }
        }
        
        // Build the namespace parts
        const namespaceParts = [firstNamespace];
        if (secondNamespace) {
            namespaceParts.push(secondNamespace);
        }
        
        // Format each namespace part
        const formattedNamespaces = namespaceParts.map(part => {
            return part
                .replace(/([a-z])([A-Z])/g, '$1 $2')
                .split(/[-\s]/)
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
        });
        
        // Format the final tool name part (handle hyphens as word separators)
        const formattedToolName = toolName
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .split(/[-\s]/)
            .filter(word => word.length > 0) // Remove empty parts
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('-');
        
        // Combine all parts
        const allParts = [...formattedNamespaces, formattedToolName];
        return allParts.filter(part => part.length > 0).join(' > ');
    };

    // Helper function to get namespace (first part before first underscore/dot)
    const getToolNamespace = (toolId) => {
        const parts = toolId.split(/[_.]/);
        return parts[0] || 'other';
    };

    // Helper function to group tools by namespace
    const groupToolsByNamespace = (tools) => {
        const grouped = {};
        Object.entries(tools || {}).forEach(([toolId, tool]) => {
            const namespace = getToolNamespace(toolId);
            if (!grouped[namespace]) {
                grouped[namespace] = [];
            }
            grouped[namespace].push([toolId, tool]);
        });
        return grouped;
    };
    const { appMode } = useAppMode();
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
    const [newServerAppModes, setNewServerAppModes] = useState(['both']);
    const [loggingEnabled, setLoggingEnabled] = useState(false);
    const [refreshingServers, setRefreshingServers] = useState(new Set());
    const [expandedServers, setExpandedServers] = useState(new Set());

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

    const handleToggleNamespace = (serverId, namespace) => {
        const newSettings = { ...settings };
        const server = newSettings[serverId];
        
        if (!server || !server.tools) return;
        
        // Get all tools in this namespace
        const namespaceTools = Object.entries(server.tools).filter(([toolId, tool]) => 
            getToolNamespace(toolId) === namespace
        );
        
        if (namespaceTools.length === 0) return;
        
        // Check if all tools in namespace are currently enabled
        const allEnabled = namespaceTools.every(([toolId, tool]) => tool.enabled);
        
        // Toggle all tools in the namespace to the opposite state
        const newState = !allEnabled;
        namespaceTools.forEach(([toolId, tool]) => {
            newSettings[serverId].tools[toolId].enabled = newState;
        });
        
        setSettings(newSettings);
        fetch('/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSettings),
        }).catch(err => console.log("Settings update skipped - backend not available"));
    };

    const getNamespaceToggleState = (serverId, namespace) => {
        const server = settings[serverId];
        if (!server || !server.tools) return false;
        
        // Get all tools in this namespace
        const namespaceTools = Object.entries(server.tools).filter(([toolId, tool]) => 
            getToolNamespace(toolId) === namespace
        );
        
        if (namespaceTools.length === 0) return false;
        
        const enabledCount = namespaceTools.filter(([toolId, tool]) => tool.enabled).length;
        
        // Return object with checked state and indeterminate state
        return {
            checked: enabledCount === namespaceTools.length,
            indeterminate: enabledCount > 0 && enabledCount < namespaceTools.length
        };
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
            useForMainPage: newServerUseForMainPage,
            appModes: newServerAppModes
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
            setNewServerAppModes(['both']);
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
            setNewServerAppModes(['both']);
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

    const toggleServerExpansion = (serverId) => {
        setExpandedServers(prev => {
            const newSet = new Set(prev);
            if (newSet.has(serverId)) {
                newSet.delete(serverId);
            } else {
                newSet.add(serverId);
            }
            return newSet;
        });
    };

    const handleServerAppModesUpdate = async (serverId, newAppModes) => {
        try {
            const response = await fetch(`/servers/${serverId}/app-modes`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ app_modes: newAppModes }),
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to update app modes');
            }
            
            const updatedServer = await response.json();
            
            // Update local settings
            setSettings(prev => ({
                ...prev,
                [serverId]: { ...prev[serverId], app_modes: newAppModes }
            }));
            
        } catch (error) {
            console.log('Backend not available - simulating app modes update');
            // Update local state for demo
            setSettings(prev => ({
                ...prev,
                [serverId]: { ...prev[serverId], app_modes: newAppModes }
            }));
        }
    };

    const handleExistingServerAppModeChange = (serverId, mode, checked) => {
        const currentAppModes = settings[serverId]?.app_modes || ['both'];
        let newAppModes;
        
        if (checked) {
            // If "both" is selected, replace with just "both"
            if (mode === 'both') {
                newAppModes = ['both'];
            } else {
                // If selecting specific mode, remove "both" and add the mode
                const withoutBoth = currentAppModes.filter(m => m !== 'both');
                newAppModes = [...new Set([...withoutBoth, mode])]; // Use Set to avoid duplicates
                // If all specific modes are selected, switch to "both"
                if (newAppModes.includes('portfolio') && newAppModes.includes('customer-success')) {
                    newAppModes = ['both'];
                }
            }
        } else {
            if (mode === 'both') {
                // If unchecking "both", default to portfolio mode
                newAppModes = ['portfolio'];
            } else {
                // Remove the specific mode
                newAppModes = currentAppModes.filter(m => m !== mode);
                // If no modes left, default to the other specific mode or "both"
                if (newAppModes.length === 0 || (newAppModes.length === 1 && newAppModes[0] === 'both')) {
                    // Default to the other mode
                    newAppModes = mode === 'portfolio' ? ['customer-success'] : ['portfolio'];
                }
            }
        }
        
        // Update the server with new app modes
        handleServerAppModesUpdate(serverId, newAppModes);
    };

    const handleAppModeChange = (mode, checked) => {
        setNewServerAppModes(prev => {
            let newAppModes;
            
            if (checked) {
                if (mode === 'both') {
                    newAppModes = ['both'];
                } else {
                    const withoutBoth = prev.filter(m => m !== 'both');
                    newAppModes = [...new Set([...withoutBoth, mode])];
                    if (newAppModes.includes('portfolio') && newAppModes.includes('customer-success')) {
                        newAppModes = ['both'];
                    }
                }
            } else {
                if (mode === 'both') {
                    newAppModes = ['portfolio'];
                } else {
                    newAppModes = prev.filter(m => m !== mode);
                    if (newAppModes.length === 0 || (newAppModes.length === 1 && newAppModes[0] === 'both')) {
                        newAppModes = mode === 'portfolio' ? ['customer-success'] : ['portfolio'];
                    }
                }
            }
            
            return newAppModes;
        });
    };

    if (!settings) {
        return <Typography>Loading...</Typography>;
    }

    // Filter servers based on current app mode
    const filteredServers = Object.entries(settings).filter(([serverId, server]) => {
        const serverAppModes = server.app_modes || ['both'];
        return serverAppModes.includes(appMode) || serverAppModes.includes('both');
    });

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

                    <FormControl component="fieldset" sx={{ mt: 2 }}>
                        <FormLabel component="legend">Available App Modes</FormLabel>
                        <FormGroup>
                            <FormControlLabel
                                control={
                                    <Checkbox 
                                        checked={newServerAppModes.includes('both')}
                                        onChange={(e) => handleAppModeChange('both', e.target.checked)}
                                    />
                                }
                                label="Both (Portfolio & Customer Success)"
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox 
                                        checked={newServerAppModes.includes('portfolio')}
                                        onChange={(e) => handleAppModeChange('portfolio', e.target.checked)}
                                    />
                                }
                                label="Portfolio Mode Only"
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox 
                                        checked={newServerAppModes.includes('customer-success')}
                                        onChange={(e) => handleAppModeChange('customer-success', e.target.checked)}
                                    />
                                }
                                label="Customer Success Mode Only"
                            />
                        </FormGroup>
                        <Typography variant="caption" display="block" color="text.secondary">
                            Select which app modes this server should be available for
                        </Typography>
                    </FormControl>
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

            {filteredServers.map(([serverId, server]) => {
                const isExpanded = expandedServers.has(serverId);
                return (
                <Paper key={serverId} sx={{ p: 3, mb: 3 }}>
                    <Box 
                        sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            cursor: 'pointer'
                        }}
                        onClick={() => toggleServerExpansion(serverId)}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="h5">{server.name}</Typography>
                            {server.app_modes && server.app_modes.length > 0 && (
                                <Chip 
                                    size="small" 
                                    label={server.app_modes.join(', ')} 
                                    color="primary" 
                                    variant="outlined"
                                />
                            )}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <IconButton size="small">
                                {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </IconButton>
                        </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>{server.url}</Typography>
                    
                    <Collapse in={isExpanded}>
                        <Box sx={{ pt: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 2 }}>
                                <Switch checked={server.enabled} onChange={() => handleToggle(serverId)} />
                                <IconButton 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRefreshTools(serverId);
                                    }} 
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
                                    <IconButton onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveServer(serverId);
                                    }} color="error">
                                        <DeleteIcon />
                                    </IconButton>
                                )}
                            </Box>
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

                            <Box sx={{ mt: 3, mb: 2 }}>
                                <FormControl component="fieldset" disabled={!server.enabled}>
                                    <FormLabel component="legend" sx={{ fontSize: '0.875rem' }}>App Mode Availability</FormLabel>
                                    <FormGroup>
                                        <FormControlLabel
                                            control={
                                                <Checkbox 
                                                    checked={(server.app_modes || ['both']).includes('both')}
                                                    onChange={(e) => handleExistingServerAppModeChange(serverId, 'both', e.target.checked)}
                                                    size="small"
                                                />
                                            }
                                            label="Both (Portfolio & Customer Success)"
                                            sx={{ opacity: server.enabled ? 1 : 0.5 }}
                                        />
                                        <FormControlLabel
                                            control={
                                                <Checkbox 
                                                    checked={(server.app_modes || ['both']).includes('portfolio')}
                                                    onChange={(e) => handleExistingServerAppModeChange(serverId, 'portfolio', e.target.checked)}
                                                    disabled={!server.enabled}
                                                    size="small"
                                                />
                                            }
                                            label="Portfolio Mode Only"
                                            sx={{ opacity: server.enabled ? 1 : 0.5 }}
                                        />
                                        <FormControlLabel
                                            control={
                                                <Checkbox 
                                                    checked={(server.app_modes || ['both']).includes('customer-success')}
                                                    onChange={(e) => handleExistingServerAppModeChange(serverId, 'customer-success', e.target.checked)}
                                                    disabled={!server.enabled}
                                                    size="small"
                                                />
                                            }
                                            label="Customer Success Mode Only"
                                            sx={{ opacity: server.enabled ? 1 : 0.5 }}
                                        />
                                    </FormGroup>
                                    <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                                        Control which app modes this server is available for
                                    </Typography>
                                </FormControl>
                            </Box>
                            
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="h6">Tools ({Object.keys(server.tools || {}).length})</Typography>
                                {(() => {
                                    const groupedTools = groupToolsByNamespace(server.tools);
                                    return Object.entries(groupedTools).map(([namespace, tools]) => (
                                        <Box key={namespace} sx={{ mt: 2 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                                    {namespace.charAt(0).toUpperCase() + namespace.slice(1)} ({tools.length})
                                                </Typography>
                                                {(() => {
                                                    const toggleState = getNamespaceToggleState(serverId, namespace);
                                                    return (
                                                        <Checkbox
                                                            checked={toggleState.checked}
                                                            indeterminate={toggleState.indeterminate}
                                                            disabled={!server.enabled}
                                                            onChange={() => handleToggleNamespace(serverId, namespace)}
                                                            size="small"
                                                            sx={{ 
                                                                '& .MuiSvgIcon-root': { fontSize: '1.2rem' }
                                                            }}
                                                        />
                                                    );
                                                })()}
                                            </Box>
                                            <List dense>
                                                {tools.map(([toolId, tool]) => (
                                                    <ListItem key={toolId} sx={{ pl: 2, py: 0.5, alignItems: 'flex-start' }}>
                                                        <ListItemText 
                                                            primary={
                                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                    <Typography 
                                                                        variant="body2" 
                                                                        sx={{ 
                                                                            fontWeight: 500,
                                                                            color: (server.enabled && tool.enabled) ? 'text.primary' : 'text.disabled',
                                                                            opacity: (server.enabled && tool.enabled) ? 1 : 0.5
                                                                        }}
                                                                    >
                                                                        {formatToolName(toolId)}
                                                                    </Typography>
                                                                    <Switch 
                                                                        size="small"
                                                                        checked={server.enabled && (tool.enabled || false)} 
                                                                        disabled={!server.enabled}
                                                                        onChange={() => handleToggle(serverId, toolId)} 
                                                                    />
                                                                </Box>
                                                            }
                                                            secondary={
                                                                <Box sx={{ 
                                                                    mt: 0.5,
                                                                    '& p': { 
                                                                        margin: 0, 
                                                                        fontSize: '0.75rem', 
                                                                        color: (server.enabled && tool.enabled) ? 'text.secondary' : 'text.disabled'
                                                                    },
                                                                    '& ul, & ol': {
                                                                        margin: '0.25em 0',
                                                                        paddingLeft: '1.2em',
                                                                        fontSize: '0.75rem',
                                                                        color: (server.enabled && tool.enabled) ? 'text.secondary' : 'text.disabled'
                                                                    },
                                                                    '& li': {
                                                                        margin: '0.1em 0',
                                                                        fontSize: '0.75rem',
                                                                        color: (server.enabled && tool.enabled) ? 'text.secondary' : 'text.disabled'
                                                                    },
                                                                    '& code': { 
                                                                        backgroundColor: (server.enabled && tool.enabled) 
                                                                            ? 'rgba(144, 202, 249, 0.16)' 
                                                                            : 'rgba(144, 202, 249, 0.08)', 
                                                                        color: (server.enabled && tool.enabled) ? 'primary.main' : 'text.disabled',
                                                                        padding: '0.1em 0.3em', 
                                                                        borderRadius: '3px', 
                                                                        fontSize: '0.7rem'
                                                                    } 
                                                                }}>
                                                                    <ReactMarkdown>
                                                                        {tool.description || 'No description available'}
                                                                    </ReactMarkdown>
                                                                </Box>
                                                            }
                                                        />
                                                    </ListItem>
                                                ))}
                                            </List>
                                        </Box>
                                    ));
                                })()}
                            </Box>
                        </Box>
                    </Collapse>
                </Paper>
                )
            })}
        </Box>
    );
};

export default Settings;
