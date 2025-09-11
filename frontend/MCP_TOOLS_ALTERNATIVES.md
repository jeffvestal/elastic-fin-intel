# MCP Tools Display Alternatives

This document outlines alternative approaches for displaying MCP Tools without blocking UI content.

## Current Issue
- MCP Tools display as fixed overlays at `bottom: 20, left: 20`
- High z-index (10000) causes blocking of chat window and panels
- Stacks vertically, potentially covering significant portions of interface

## Option A: Collapsible Panel (IMPLEMENTED)
- **Position**: Top-right corner floating action button
- **Behavior**: Toggle between collapsed indicator and expanded panel
- **Collapsed State**: Small badge with tool count
- **Expanded State**: Full tool details in dropdown panel
- **Benefits**: Non-intrusive, persistent visibility, user control
- **Implementation**: Floating action button with Material-UI Popover/Menu

## Option B: Top Banner Integration (ALTERNATIVE)
- **Position**: Horizontal banner at top of page, below header
- **Behavior**: Auto-hide after 5 seconds, option to pin
- **Display**: Compact chips in single row showing active tools
- **Benefits**: Full width utilization, doesn't block main content
- **Considerations**: May push content down, requires header integration

## Option C: Side Panel Drawer (ALTERNATIVE)  
- **Position**: Right-side drawer panel
- **Behavior**: Toggle open/closed, similar to chat drawer
- **Display**: Full tool details when open, small badge when closed
- **Benefits**: Dedicated space, doesn't interfere with main content
- **Considerations**: Takes up screen real estate when open, may conflict with responsive design

## Decision Matrix
| Feature | Option A | Option B | Option C |
|---------|----------|----------|----------|
| Non-intrusive | ✅ High | ⚠️ Medium | ✅ High |
| Easy to implement | ✅ Easy | ⚠️ Medium | ❌ Complex |
| Mobile friendly | ✅ Yes | ✅ Yes | ⚠️ Limited |
| User control | ✅ Full | ⚠️ Limited | ✅ Full |
| Content blocking | ✅ None | ⚠️ Minimal | ✅ None |

**Selected**: Option A for optimal balance of usability and implementation simplicity.