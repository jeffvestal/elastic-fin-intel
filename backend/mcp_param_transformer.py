"""
MCP Parameter Transformer

This module provides parameter transformation functions for MCP tool calls,
specifically to handle format compatibility issues between tool definitions
and actual service requirements.
"""

import re
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# Tools that need ES|QL time format transformation
ESQL_TIME_FORMAT_TOOLS = {
    'customer-success_tradingrecent-trades',
    'customer-success_accountrecent-activity', 
    'customer-success_researchasset-news'
}

def fix_esql_time_format(time_value: str) -> str:
    """
    Fix ES|QL time format by removing spaces between number and unit.
    
    ES|QL TO_TIMEDURATION expects: "30DAYS", "7HOURS", etc.
    But MCP tool descriptions specify: "30 DAYS", "7 HOURS", etc.
    
    Args:
        time_value: Time string like "30 DAYS" or "7 hours"
        
    Returns:
        Fixed time string like "30DAYS" or "7HOURS"
    """
    if not isinstance(time_value, str):
        return time_value
    
    # Pattern to match number followed by space and time unit
    # Case insensitive to handle various formats
    pattern = r'(\d+)\s+(days?|hours?|minutes?|mins?|seconds?|secs?|weeks?|months?|years?)'
    
    def replace_match(match):
        number = match.group(1)
        unit = match.group(2).upper()
        # Normalize plural forms to singular for consistency
        unit_mapping = {
            'DAYS': 'DAYS',
            'DAY': 'DAYS',
            'HOURS': 'HOURS', 
            'HOUR': 'HOURS',
            'MINUTES': 'MINUTES',
            'MINUTE': 'MINUTES',
            'MINS': 'MINUTES',
            'MIN': 'MINUTES',
            'SECONDS': 'SECONDS',
            'SECOND': 'SECONDS',
            'SECS': 'SECONDS',
            'SEC': 'SECONDS',
            'WEEKS': 'WEEKS',
            'WEEK': 'WEEKS',
            'MONTHS': 'MONTHS',
            'MONTH': 'MONTHS',
            'YEARS': 'YEARS',
            'YEAR': 'YEARS'
        }
        normalized_unit = unit_mapping.get(unit, unit)
        return f"{number}{normalized_unit}"
    
    result = re.sub(pattern, replace_match, time_value, flags=re.IGNORECASE)
    
    if result != time_value:
        logger.debug(f"Transformed time format: '{time_value}' -> '{result}'")
    
    return result

def transform_parameters(tool_name: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transform parameters for specific tools to handle format compatibility issues.
    
    Args:
        tool_name: Name of the MCP tool being called
        parameters: Original parameters dict
        
    Returns:
        Transformed parameters dict
    """
    if tool_name not in ESQL_TIME_FORMAT_TOOLS:
        return parameters
    
    # Create a copy to avoid modifying the original
    transformed = parameters.copy()
    
    # Fix ES|QL time format for time_period parameter
    if 'time_period' in transformed:
        original_value = transformed['time_period']
        transformed['time_period'] = fix_esql_time_format(original_value)
        
        if transformed['time_period'] != original_value:
            logger.info(f"Tool {tool_name}: Transformed time_period '{original_value}' -> '{transformed['time_period']}'")
    
    return transformed

def should_transform_tool(tool_name: str) -> bool:
    """
    Check if a tool requires parameter transformation.
    
    Args:
        tool_name: Name of the MCP tool
        
    Returns:
        True if tool needs parameter transformation
    """
    return tool_name in ESQL_TIME_FORMAT_TOOLS