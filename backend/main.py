import os
import logging
import json
import asyncio
import time
from typing import List, Dict, Any, Optional
import httpx

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from otel_config import setup_telemetry
from eis_client import get_chat_response_stream, get_chat_response_stream_with_messages
from mcp_client import mcp_manager, MCPServer, MCPTransportType, MCPClientError, MCPConnectionError, MCPToolExecutionError
from mcp_config import config_manager
from contextlib import asynccontextmanager
from conversation_manager import conversation_manager
from es_data_client import es_data_client
from mcp_data_service import mcp_data_service
from main_page_data_service import main_page_data_service
from negative_news_alerts_service import negative_news_alerts_service
from account_news_reports_service import account_news_reports_service
from action_item_service import action_item_service
from email_generation_service import email_generation_service

# Simple logging status management
LOG_MCP_COMMUNICATIONS = os.getenv("LOG_MCP_COMMUNICATIONS", "false").lower() == "true"

def get_logging_status():
    """Returns the current MCP logging status."""
    return {"enabled": LOG_MCP_COMMUNICATIONS}

def update_logging_status(status: bool):
    """Updates the MCP logging status."""
    global LOG_MCP_COMMUNICATIONS
    LOG_MCP_COMMUNICATIONS = status
    return {"enabled": LOG_MCP_COMMUNICATIONS}

load_dotenv()

# --- Logging Setup ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("main_logger")

# Pydantic models
class EmailDraftRequest(BaseModel):
    account_id: str
    time_period: Optional[int] = 48
    time_unit: Optional[str] = "hours"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown events"""
    # Startup: Load MCP servers from configuration
    logger.info("Loading MCP servers from configuration...")
    try:
        enabled_servers = config_manager.get_enabled_servers()
        for server_id, server in enabled_servers.items():
            try:
                logger.info(f"Attempting to add MCP server: {server_id} ({server.name})")
                await mcp_manager.add_server(server)
                logger.info(f"Successfully loaded MCP server: {server_id}")
            except Exception as e:
                # Log the error but continue loading other servers
                logger.warning(f"Failed to load MCP server {server_id}: {e}")
                # Still add server to manager even if connection fails for customer-success servers
                if server_id.startswith('customer-success') or 'customer-success' in server.app_modes:
                    mcp_manager.servers[server_id] = server
                    mcp_manager.clients[server_id] = None  # Mark as registered but not connected
                    logger.info(f"Registered customer-success server {server_id} despite connection issue")
        
        logger.info(f"MCP server loading completed. Loaded {len(mcp_manager.servers)} servers.")
    except Exception as e:
        logger.error(f"Error loading MCP servers: {e}")
    
    yield  # App runs here
    
    # Shutdown: Clean up MCP connections
    logger.info("Shutting down MCP connections...")
    for server_id in list(mcp_manager.clients.keys()):
        try:
            await mcp_manager.remove_server(server_id)
        except Exception as e:
            logger.warning(f"Error removing server {server_id}: {e}")


app = FastAPI(
    title="Elastic Fin-Intel",
    description="An AI-powered insights dashboard for financial analysts.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- In-memory store ---
impact_summary_global = "No analysis performed yet."

def get_all_tool_definitions(app_mode: Optional[str] = None) -> List[Dict[str, Any]]:
    """Gathers all enabled tool definitions from MCP servers, optionally filtered by app mode."""
    all_defs = []
    
    # Get all enabled MCP servers and their tools
    if app_mode:
        enabled_servers = config_manager.get_servers_for_app_mode(app_mode)
        logger.info(f"Filtering MCP servers for app_mode: {app_mode}")
    else:
        enabled_servers = config_manager.get_enabled_servers()
    
    for server_id, server in enabled_servers.items():
        logger.debug(f"Processing tools for server {server_id}: {server.name} (modes: {server.app_modes})")
        
        for tool_name, tool in server.tools.items():
            logger.debug(f"Adding MCP tool: {tool_name} from server {server_id}")
            all_defs.append({
                "type": "function",
                "function": {
                    "name": tool_name,
                    "description": tool.description,
                    "parameters": tool.parameters,
                }
            })
    
    logger.info(f"Collected {len(all_defs)} tool definitions from {len(enabled_servers)} MCP servers (app_mode: {app_mode})")
    return all_defs


@app.on_event("startup")
async def startup_event():
    """Initialize MCP servers on startup"""
    logger.info("Starting Elastic Fin-Intel with MCP client manager")
    
    try:
        # Load all configured servers
        all_servers = config_manager.get_all_servers()
        logger.info(f"Found {len(all_servers)} configured MCP servers")
        
        # Initialize enabled servers in the manager
        for server_id, server in all_servers.items():
            if server.enabled:
                try:
                    logger.info(f"Initializing MCP server: {server_id} ({server.name})")
                    await mcp_manager.add_server(server)
                    logger.info(f"Successfully initialized server: {server_id}")
                except Exception as e:
                    logger.error(f"Failed to initialize server {server_id}: {e}")
                    # Mark server as error status in config
                    server.connection_status = "error"
                    config_manager.update_server(server)
            else:
                logger.debug(f"Skipping disabled server: {server_id}")
        
        logger.info("MCP client manager initialization complete")
        
    except Exception as e:
        logger.error(f"Error during MCP startup: {e}", exc_info=True)


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup connections on shutdown"""
    logger.info("Shutting down application")
    
    try:
        # Disconnect all MCP clients
        for server_id in list(mcp_manager.clients.keys()):
            await mcp_manager.remove_server(server_id)
        
        # Close ES data client
        await es_data_client.close()
        
        logger.info("Application shutdown complete")
        
    except Exception as e:
        logger.error(f"Error during shutdown: {e}", exc_info=True)


# --- API endpoints ---
@app.get("/metrics/overview")
async def get_metrics_overview(include_news: bool = False, include_reports: bool = False):
    """Get overview metrics for the financial dashboard"""
    try:
        # Get base metrics from MCP tools
        metrics = await mcp_data_service.get_accounts_overview()
        metrics["impact_summary"] = impact_summary_global
        
        # Only include news summary if requested (e.g., after "Start Day" is clicked)
        if include_news:
            news_summary = await main_page_data_service.get_news_summary()
            metrics["news_summary"] = news_summary
        else:
            metrics["news_summary"] = None
        
        # Only include reports summary if requested
        if include_reports:
            reports_summary = await main_page_data_service.get_reports_summary()
            metrics["reports_summary"] = reports_summary
        else:
            metrics["reports_summary"] = None
        
        return metrics
    except Exception as e:
        logger.error(f"Error fetching metrics overview via MCP: {e}")
        # Fall back to direct Elasticsearch queries
        try:
            logger.info("Falling back to direct Elasticsearch for metrics overview")
            metrics = await es_data_client.get_metrics_overview()
            metrics["impact_summary"] = impact_summary_global
            metrics["news_summary"] = None if not include_news else {
                "status": "error",
                "message": "News summary requires MCP configuration",
                "news_stories": []
            }
            metrics["reports_summary"] = None if not include_reports else {
                "status": "error",
                "message": "Reports summary requires MCP configuration", 
                "reports": []
            }
            return metrics
        except Exception as fallback_error:
            logger.error(f"Error with Elasticsearch fallback: {fallback_error}")
            return {
                "total_accounts": 0,
                "total_aum": 0,
                "total_news": 0,
                "total_reports": 0,
                "impact_summary": impact_summary_global,
                "news_summary": None if not include_news else {
                    "status": "error",
                    "message": "Error loading news summary",
                    "news_stories": []
                },
                "reports_summary": None if not include_reports else {
                    "status": "error",
                    "message": "Error loading reports summary", 
                    "reports": []
                }
            }

@app.get("/account/search")
async def search_accounts(q: str, app_mode: Optional[str] = None):
    """Search for accounts using MCP customer lookup tool"""
    if len(q) < 3:
        return {"accounts": []}
    
    try:
        # Get servers based on app_mode if provided
        if app_mode:
            enabled_servers = config_manager.get_servers_for_app_mode(app_mode)
            logger.info(f"Account search in app_mode: {app_mode}, found {len(enabled_servers)} servers")
        else:
            enabled_servers = config_manager.get_enabled_servers()
            logger.info(f"Account search with no app_mode, found {len(enabled_servers)} servers")
        
        # Check if we have any servers available
        if not enabled_servers or not isinstance(enabled_servers, dict):
            logger.warning(f"No MCP servers available for account search (app_mode: {app_mode})")
            return {"accounts": []}
        
        # Define tool patterns based on app_mode
        if app_mode == "portfolio":
            # Portfolio mode uses utilities_search_customer-lookup
            tool_patterns = ["utilities_search_customer-lookup", "utilities_search"]
        elif app_mode == "customer-success":
            # Customer success mode uses customer-success_searchcustomer-lookup but can fallback to utilities_search_customer-lookup
            tool_patterns = ["customer-success_searchcustomer-lookup", "utilities_search_customer-lookup", "searchcustomer"]
        else:
            # Try both patterns if no mode specified
            tool_patterns = ["customer-lookup", "searchcustomer", "utilities_search"]
        
        logger.debug(f"Looking for tools matching patterns: {tool_patterns}")
        
        # Look for customer search tools
        for server_id, server in enabled_servers.items():
            logger.debug(f"Checking server {server_id} ({server.name}) with app_modes: {server.app_modes}")
            
            if hasattr(server, 'tools') and server.tools:
                for tool_name in server.tools.keys():
                    # Check if this tool matches any of our patterns
                    if any(pattern in tool_name for pattern in tool_patterns):
                        logger.info(f"Attempting to use customer search tool '{tool_name}' from server {server_id} ({server.name})")
                        
                        try:
                            # Use search term directly
                            arguments = {
                                "search_term": q
                            }
                            
                            # Execute the MCP tool
                            async for result in mcp_manager.execute_tool(server_id, tool_name, arguments):
                                if result["type"] == "tool_result":
                                    content = result["content"]
                                    
                                    # Parse the result - handle nested MCP response structure
                                    if isinstance(content, dict) and "text" in content:
                                        try:
                                            # Parse the JSON response from MCP tool
                                            data = json.loads(content["text"])
                                            
                                            # Extract account data from the response
                                            accounts = []
                                            if "results" in data:
                                                for result_item in data["results"]:
                                                    if result_item.get("type") == "tabular_data" and "data" in result_item:
                                                        table_data = result_item["data"]
                                                        if "values" in table_data and "columns" in table_data:
                                                            # Get column names to map values correctly
                                                            columns = [col["name"] for col in table_data["columns"]]
                                                            
                                                            for row_values in table_data["values"]:
                                                                # Create a dict mapping column names to values
                                                                row = dict(zip(columns, row_values))
                                                                
                                                                # Convert MCP result to account format
                                                                account = {
                                                                    "name": row.get("account_holder_name", ""),
                                                                    "account": row.get("account_id", ""),
                                                                    "account_holder_name": row.get("account_holder_name", ""),
                                                                    "account_id": row.get("account_id", ""),
                                                                    "account_type": row.get("account_type", ""),
                                                                    "state": row.get("state", ""),
                                                                    "total_portfolio_value": 0  # Not provided by the lookup tool
                                                                }
                                                                accounts.append(account)
                                            
                                            logger.info(f"Successfully found {len(accounts)} accounts for query '{q}' using server {server_id}")
                                            return {"accounts": accounts}
                                            
                                        except json.JSONDecodeError as e:
                                            logger.error(f"Failed to parse MCP response for account search from server {server_id}: {e}")
                                            # Continue to next server/tool instead of returning
                                            break
                                    else:
                                        logger.warning(f"MCP response from server {server_id} not in expected format: {content}")
                                        # Continue to next server/tool instead of returning
                                        break
                                elif result["type"] == "error":
                                    logger.error(f"MCP tool error for account search from server {server_id}: {result['error']}")
                                    # Continue to next server/tool instead of returning
                                    break
                        except Exception as e:
                            logger.warning(f"Server {server_id} not available or failed: {e}. Trying next server...")
                            # Continue to next server instead of failing completely
                            continue
        
        # No suitable MCP server found
        logger.warning(f"No suitable customer search tool found for app_mode: {app_mode}")
        logger.warning(f"Available tools: {[tool_name for server in enabled_servers.values() for tool_name in server.tools.keys()]}")
        return {"accounts": []}
        
    except Exception as e:
        logger.error(f"Error searching accounts: {e}", exc_info=True)
        return {"accounts": []}


@app.get("/customer/search")
async def search_customers(q: str = "", limit: int = 50):
    """Customer search endpoint for customer success mode"""
    # Use the same search logic but with customer-success mode
    return await search_accounts(q=q, app_mode="customer-success")


@app.get("/account/{account_id}")
async def get_account_details(account_id: str, app_mode: Optional[str] = None):
    """Get detailed account information for the drilldown page using MCP tools"""
    try:
        # Use portfolio mode as default if not specified
        if not app_mode:
            app_mode = "portfolio"
            
        # Get MCP servers for the specified app mode
        configured_servers = config_manager.get_servers_for_app_mode(app_mode)
        if not configured_servers:
            raise HTTPException(status_code=503, detail=f"No MCP servers configured for app mode: {app_mode}")
        
        # Filter to only include servers that are actually connected and available in mcp_manager
        available_servers = {}
        for server_id, server in configured_servers.items():
            if server_id in mcp_manager.servers:
                available_servers[server_id] = server
            else:
                logger.warning(f"Server {server_id} is configured but not connected/available in MCP manager")
        
        if not available_servers:
            raise HTTPException(status_code=503, detail=f"No MCP servers are connected and available for app mode: {app_mode}")
        
        # Find a server with account-details tool (with fallback)
        if app_mode == "portfolio":
            account_details_tools = ["utilities_account_account-details"]
        else:  # customer-success mode
            # Try customer-success tools first, fallback to utilities tools
            account_details_tools = ["customer-success_account_account-details", "utilities_account_account-details"]
        
        server_with_tool = None
        account_details_tool = None
        
        for tool_name in account_details_tools:
            for server_id, server in available_servers.items():
                if tool_name in server.tools:
                    server_with_tool = (server_id, server)
                    account_details_tool = tool_name
                    break
            if server_with_tool:
                break
        
        if not server_with_tool:
            raise HTTPException(status_code=503, detail=f"No MCP server has account-details tool for app mode: {app_mode}")
        
        server_id, server = server_with_tool
        logger.info(f"Using account-details tool from server {server_id}")
        
        # Execute the MCP tool using streaming approach
        result_content = None
        async for tool_result in mcp_manager.execute_tool(server_id, account_details_tool, {"account_number": account_id}):
            if tool_result["type"] == "tool_result":
                result_content = tool_result["content"]
                break
            elif tool_result["type"] == "error":
                raise HTTPException(status_code=500, detail=f"MCP tool error: {tool_result['error']}")
        
        if result_content:
            import json
            
            # Handle MCP response format - could be dict with "text" field or direct string
            content_to_parse = None
            if isinstance(result_content, dict) and "text" in result_content:
                content_to_parse = result_content["text"]
            elif isinstance(result_content, str):
                content_to_parse = result_content
            else:
                content_to_parse = json.dumps(result_content)
            
            # Parse the content JSON
            account_data = {}
            try:
                parsed_content = json.loads(content_to_parse)
                
                # Extract the actual account data from MCP response structure
                if "results" in parsed_content and len(parsed_content["results"]) > 0:
                    first_result = parsed_content["results"][0]
                    if "data" in first_result and "values" in first_result["data"]:
                        columns = first_result["data"]["columns"]
                        values = first_result["data"]["values"]
                        
                        if len(values) > 0:
                            # Convert tabular data to object
                            for i, column in enumerate(columns):
                                if i < len(values[0]):
                                    account_data[column["name"]] = values[0][i]
                        
                # If we can't extract structured data, use parsed content as account data
                if not account_data and isinstance(parsed_content, dict):
                    account_data = parsed_content
                    
            except json.JSONDecodeError:
                # If JSON parsing fails, create basic account data with the raw content
                account_data = {"raw_content": content_to_parse}
            
            # Add missing fields that the frontend expects but MCP tool doesn't provide
            # The MCP tool only returns: account_id, account_holder_name, account_type
            # Frontend expects these field names: type, risk_profile, state
            
            # Map account_type to type (frontend expects 'type' not 'account_type')
            if "account_type" in account_data and "type" not in account_data:
                account_data["type"] = account_data["account_type"]
            
            # Set reasonable defaults for missing fields with correct field names
            if "state" not in account_data:
                account_data["state"] = "Active"  # Default status (frontend expects 'state')
                
            if "risk_profile" not in account_data:
                # Determine risk level based on account type
                account_type = account_data.get("account_type", "").lower()
                if "retirement" in account_type:
                    account_data["risk_profile"] = "Conservative"
                elif "investment" in account_type or "trading" in account_type:
                    account_data["risk_profile"] = "Moderate"
                elif "savings" in account_type or "checking" in account_type:
                    account_data["risk_profile"] = "Conservative"
                else:
                    account_data["risk_profile"] = "Moderate"  # Default
            
            # Now fetch holdings data using current-holdings tool (with fallback)
            if app_mode == "portfolio":
                holdings_tools = ["utilities_portfolio_current-holdings"]
            else:  # customer-success mode
                holdings_tools = ["customer-success_portfoliocurrent-holdings", "utilities_portfolio_current-holdings"]
            
            holdings_data = []
            holdings_tool = None
            
            # Find a server with current-holdings tool (with fallback)
            holdings_server_with_tool = None
            for tool_name in holdings_tools:
                for server_id, server in available_servers.items():
                    if tool_name in server.tools:
                        holdings_server_with_tool = (server_id, server)
                        holdings_tool = tool_name
                        break
                if holdings_server_with_tool:
                    break
            
            if holdings_server_with_tool:
                server_id, server = holdings_server_with_tool
                logger.info(f"Using current-holdings tool from server {server_id}")
                
                try:
                    # Execute the holdings MCP tool
                    holdings_result_content = None
                    async for tool_result in mcp_manager.execute_tool(server_id, holdings_tool, {"account_number": account_id}):
                        if tool_result["type"] == "tool_result":
                            holdings_result_content = tool_result["content"]
                            break
                        elif tool_result["type"] == "error":
                            logger.warning(f"Holdings MCP tool error: {tool_result['error']}")
                            break
                    
                    if holdings_result_content:
                        # Parse holdings response
                        holdings_content_to_parse = None
                        if isinstance(holdings_result_content, dict) and "text" in holdings_result_content:
                            holdings_content_to_parse = holdings_result_content["text"]
                        elif isinstance(holdings_result_content, str):
                            holdings_content_to_parse = holdings_result_content
                        else:
                            holdings_content_to_parse = json.dumps(holdings_result_content)
                        
                        try:
                            holdings_parsed_content = json.loads(holdings_content_to_parse)
                            
                            # Extract holdings data from MCP response structure
                            if "results" in holdings_parsed_content and len(holdings_parsed_content["results"]) > 0:
                                first_result = holdings_parsed_content["results"][0]
                                if "data" in first_result and "values" in first_result["data"]:
                                    columns = first_result["data"]["columns"]
                                    values = first_result["data"]["values"]
                                    
                                    # Convert tabular data to array of holdings objects
                                    holdings_data = []
                                    for row in values:
                                        holding = {}
                                        for i, column in enumerate(columns):
                                            if i < len(row):
                                                holding[column["name"]] = row[i]
                                        holdings_data.append(holding)
                        except json.JSONDecodeError:
                            logger.warning(f"Failed to parse holdings response: {holdings_content_to_parse}")
                except Exception as e:
                    logger.warning(f"Error fetching holdings for account {account_id}: {e}")
            
            # Add holdings data to account response
            account_data["holdings"] = holdings_data
            
            return account_data
        else:
            raise HTTPException(status_code=404, detail="Account not found")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching account {account_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching account data: {str(e)}")


@app.get("/account/{account_id}/news-reports")
async def get_account_news_reports(account_id: str, time_period: int = 72, time_unit: str = "hours"):
    """Get news and reports for all symbols in an account's holdings"""
    try:
        news_reports_data = await account_news_reports_service.get_account_news_reports(
            account_id, time_period, time_unit
        )
        return news_reports_data
    except Exception as e:
        logger.error(f"Error fetching news/reports for account {account_id}: {e}")
        raise HTTPException(status_code=500, detail="Error fetching news/reports data")

@app.get("/account/{account_id}/trades")
async def get_account_trades(account_id: str, app_mode: Optional[str] = None):
    """Get recent trades for an account using MCP tools"""
    try:
        # Use portfolio mode as default if not specified
        if not app_mode:
            app_mode = "portfolio"
            
        # Get MCP servers for the specified app mode
        configured_servers = config_manager.get_servers_for_app_mode(app_mode)
        if not configured_servers:
            raise HTTPException(status_code=503, detail=f"No MCP servers configured for app mode: {app_mode}")
        
        # Filter to include servers that are either connected in mcp_manager or are customer-success servers
        # (customer-success servers may show error status but still be functional)
        available_servers = {}
        for server_id, server in configured_servers.items():
            if server_id in mcp_manager.servers:
                available_servers[server_id] = server
            elif server_id.startswith('customer-success') or 'customer-success' in server.app_modes:
                # Include customer-success servers even if they have connection issues
                # since the user confirmed they are working
                logger.info(f"Including customer-success server {server_id} (app_modes: {server.app_modes}) despite connection status")
                available_servers[server_id] = server
            else:
                logger.warning(f"Server {server_id} is configured but not connected/available in MCP manager")
        
        if not available_servers:
            raise HTTPException(status_code=503, detail=f"No MCP servers are connected and available for app mode: {app_mode}")
        
        # Find a server with recent-trades tool (with fallback)
        if app_mode == "portfolio":
            trades_tools = ["utilities_trading_recent-trades"]
        else:  # customer-success mode
            trades_tools = ["customer-success_trading_recent-trades", "utilities_trading_recent-trades"]
        
        server_with_tool = None
        trades_tool = None
        
        for tool_name in trades_tools:
            for server_id, server in available_servers.items():
                if tool_name in server.tools:
                    server_with_tool = (server_id, server)
                    trades_tool = tool_name
                    break
            if server_with_tool:
                break
        
        if not server_with_tool:
            raise HTTPException(status_code=503, detail=f"No MCP server has recent-trades tool for app mode: {app_mode}")
        
        server_id, server = server_with_tool
        logger.info(f"Using recent-trades tool from server {server_id}")
        
        # Execute the MCP tool using streaming approach
        result_content = None
        # Prepare parameters based on which tool is being used
        if trades_tool == "customer-success_trading_recent-trades":
            # Customer-success tool needs account_number parameter
            tool_params = {"account_number": account_id}
        elif trades_tool == "utilities_trading_recent-trades":
            # Utilities tool needs account_id parameter (not account_number)
            tool_params = {"account_id": account_id}
        else:
            # Fallback utilities tool still needs time_period parameter
            tool_params = {"account_number": account_id, "time_period": "8766 HOURS"}
        
        async for tool_result in mcp_manager.execute_tool(server_id, trades_tool, tool_params):
            if tool_result["type"] == "tool_result":
                result_content = tool_result["content"]
                break
            elif tool_result["type"] == "error":
                raise HTTPException(status_code=500, detail=f"MCP tool error: {tool_result['error']}")
        
        if result_content:
            import json
            
            # Handle MCP response format - could be dict with "text" field or direct string
            content_to_parse = None
            if isinstance(result_content, dict) and "text" in result_content:
                content_to_parse = result_content["text"]
            elif isinstance(result_content, str):
                content_to_parse = result_content
            else:
                return {"trades": result_content}
            
            # Parse the content JSON
            try:
                parsed_content = json.loads(content_to_parse)
                
                # Convert MCP tabular data to frontend-expected format
                if "results" in parsed_content and len(parsed_content["results"]) > 0:
                    result = parsed_content["results"][0]
                    if "data" in result and "columns" in result["data"] and "values" in result["data"]:
                        # Extract column names
                        columns = [col["name"] for col in result["data"]["columns"]]
                        values = result["data"]["values"]
                        
                        # Convert tabular data to array of objects
                        trades = []
                        for value_row in values:
                            trade = {}
                            for i, col_name in enumerate(columns):
                                if i < len(value_row):
                                    trade[col_name] = value_row[i]
                            trades.append(trade)
                        
                        return {"trades": trades}
                
                # Fallback: return raw content if structure doesn't match expected format
                return parsed_content
                
            except json.JSONDecodeError:
                # If JSON parsing fails, return raw content
                return {"raw_content": content_to_parse}
            
            # Return raw content if it's not parseable
            return result_content
        else:
            return {"trades": []}
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching trades for account {account_id}: {e}")
        raise HTTPException(status_code=500, detail="Error fetching trades data")

@app.post("/agent/start_day")
async def start_day():
    """Trigger the daily analysis workflow"""
    try:
        global impact_summary_global
        # This could trigger a more sophisticated analysis workflow
        impact_summary_global = "Daily analysis completed - market conditions favorable, no significant alerts."
        logger.info("Daily analysis workflow triggered")
        return {"status": "success", "message": "Daily analysis completed"}
    except Exception as e:
        logger.error(f"Error starting day: {e}")
        raise HTTPException(status_code=500, detail="Error starting daily analysis")

@app.post("/email/draft")
async def draft_email(request: EmailDraftRequest):
    """Draft a contextual email for client communication"""
    try:
        logger.info(f"Email draft request received: account_id={request.account_id}, time_period={request.time_period}, time_unit={request.time_unit}")
        
        # Validate time period
        if request.time_period <= 0:
            raise HTTPException(status_code=400, detail="Time period must be positive")
            
        # Validate time unit
        if request.time_unit not in ["minutes", "hours", "days"]:
            raise HTTPException(status_code=400, detail="Time unit must be 'minutes', 'hours', or 'days'")
        
        logger.info(f"Generating email for account {request.account_id} with {request.time_period} {request.time_unit}")
        
        # Use the email generation service
        email_data = await email_generation_service.generate_account_email(
            request.account_id, request.time_period, request.time_unit
        )
        
        # Ensure we return valid email data
        if not isinstance(email_data, dict) or "subject" not in email_data or "body" not in email_data:
            logger.error(f"Invalid email data returned: {email_data}")
            raise ValueError("Invalid email data generated")
        
        return email_data
        
    except ValueError as e:
        error_msg = str(e)
        logger.error(f"Validation error: {error_msg}")
        if "not found" in error_msg.lower():
            raise HTTPException(status_code=404, detail=error_msg)
        else:
            raise HTTPException(status_code=400, detail=error_msg)
    except Exception as e:
        logger.error(f"Error drafting email: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error drafting email. Please try again.")

@app.get("/article/{article_id}")
async def get_article_content(article_id: str):
    """Get news article content"""
    try:
        content = await es_data_client.get_article_content(article_id)
        if content:
            return {"content": content}
        else:
            raise HTTPException(status_code=404, detail="Article not found")
    except Exception as e:
        logger.error(f"Error fetching article {article_id}: {e}")
        raise HTTPException(status_code=500, detail="Error fetching article")

@app.get("/report/{report_id}")
async def get_report_content(report_id: str):
    """Get financial report content"""
    try:
        content = await es_data_client.get_report_content(report_id)
        if content:
            return {"content": content}
        else:
            raise HTTPException(status_code=404, detail="Report not found")
    except Exception as e:
        logger.error(f"Error fetching report {report_id}: {e}")
        raise HTTPException(status_code=500, detail="Error fetching report")

@app.get("/article/full/{document_id}")
async def get_full_article(document_id: str, index: str = "financial_news"):
    """Get full article/report content from ES using MCP server"""
    try:
        # Get the MCP server configured for main page data
        main_page_servers = config_manager.get_main_page_servers()
        
        if not main_page_servers:
            raise HTTPException(status_code=503, detail="No MCP servers configured for article retrieval")
        
        # Use the first available server that supports main page data
        server_id = list(main_page_servers.keys())[0]
        server = main_page_servers[server_id]
        
        # Check if the server has the get_document_by_id tool
        if "get_document_by_id" not in server.tools:
            raise HTTPException(status_code=503, detail="MCP server does not support document retrieval")
        
        # Determine content type based on index
        content_type = "report" if index == "financial_reports" else "article"
        logger.info(f"Fetching full {content_type} {document_id} from index {index} using server {server_id}")
        
        # Execute the get_document_by_id tool
        arguments = {
            "id": document_id,
            "index": index
        }
        
        async for result in mcp_manager.execute_tool(server_id, "get_document_by_id", arguments):
            if result["type"] == "tool_result":
                content = result["content"]
                if isinstance(content, dict) and "text" in content:
                    try:
                        data = json.loads(content["text"])
                        logger.info(f"Retrieved full {content_type} data: {json.dumps(data, indent=2)}")
                        
                        # Extract the content from ES response
                        if "result" in data and "_source" in data["result"]:
                            source = data["result"]["_source"]
                            
                            # Set appropriate default title based on content type
                            default_title = "Financial Report" if content_type == "report" else "Financial Article"
                            
                            return {
                                "title": source.get("title", default_title),
                                "content": source.get("content", source.get("summary", "Content not available")),
                                "published_date": source.get("published_date", ""),
                                "symbol": source.get("symbol", ""),
                                "source": source.get("source", ""),
                                "url": source.get("url", ""),
                                "document_id": document_id,
                                "index": index,
                                "content_type": content_type
                            }
                        else:
                            logger.warning(f"Unexpected response format for document {document_id}")
                            raise HTTPException(status_code=404, detail=f"{content_type.title()} not found")
                            
                    except json.JSONDecodeError as e:
                        logger.error(f"Could not parse {content_type} response: {e}")
                        raise HTTPException(status_code=500, detail=f"Error parsing {content_type} data")
            elif result["type"] == "error":
                logger.error(f"Error retrieving {content_type} {document_id}: {result.get('error', 'Unknown error')}")
                raise HTTPException(status_code=404, detail=f"{content_type.title()} not found")
        
        # If we get here, no valid result was returned
        raise HTTPException(status_code=404, detail=f"{content_type.title()} not found")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching full article {document_id}: {e}")
        raise HTTPException(status_code=500, detail="Error fetching article")

@app.get("/accounts")
async def get_all_accounts():
    """Get all accounts for the accounts list page"""
    try:
        accounts = await es_data_client.get_all_accounts()
        return {"accounts": accounts}
    except Exception as e:
        logger.error(f"Error fetching all accounts: {e}")
        raise HTTPException(status_code=500, detail="Error fetching accounts")

@app.get("/accounts/charts-data")
async def get_accounts_charts_data():
    """Get chart data for the accounts page using MCP tools"""
    try:
        # Get enabled MCP servers for portfolio mode
        enabled_servers = config_manager.get_enabled_servers()
        if not enabled_servers:
            logger.warning("No MCP servers available for chart data")
            return {
                "overall_metrics": {},
                "account_performance": {},
                "error": "No MCP servers configured"
            }
        
        # Find the utilities server with chart tools
        utilities_server = None
        utilities_server_id = None
        for server_id, server in enabled_servers.items():
            if "utilities_metrics_total_aum" in server.tools:
                utilities_server = server
                utilities_server_id = server_id
                break
        
        if not utilities_server:
            logger.warning("No utilities server found with chart tools")
            return {
                "overall_metrics": {},
                "account_performance": {},
                "error": "No chart tools available"
            }
        
        logger.info(f"Using utilities server {utilities_server_id} for chart data")
        
        # Initialize result structure
        chart_data = {
            "overall_metrics": {},
            "account_performance": {},
            "error": None
        }
        
        # Execute MCP tools for overall metrics in parallel
        mcp_tools = [
            ("utilities_metrics_total_aum", {}),
            ("utilities_overview_top_performers", {}),
            ("utilities_overview_sector_distribution", {}),
            ("utilities_metrics_monthly_trade_activity", {}),
            ("utilities_metrics_account_distribution_by_risk", {})
        ]
        
        async def execute_mcp_tool(tool_name, tool_args):
            """Execute a single MCP tool and return the result"""
            if tool_name not in utilities_server.tools:
                logger.debug(f"Tool {tool_name} not available in server {utilities_server_id}")
                return tool_name, None
                
            try:
                logger.debug(f"Executing MCP tool: {tool_name}")
                async for result in mcp_manager.execute_tool(utilities_server_id, tool_name, tool_args):
                    if result["type"] == "tool_result":
                        content = result["content"]
                        if isinstance(content, dict) and "text" in content:
                            try:
                                data = json.loads(content["text"])
                                # Extract data from MCP response structure
                                if "results" in data and len(data["results"]) > 0:
                                    first_result = data["results"][0]
                                    if "data" in first_result:
                                        return tool_name, first_result["data"]
                                    else:
                                        return tool_name, data
                                else:
                                    return tool_name, data
                            except json.JSONDecodeError:
                                logger.warning(f"Failed to parse {tool_name} response")
                                return tool_name, None
                        else:
                            return tool_name, content
                        break
                    elif result["type"] == "error":
                        logger.error(f"MCP tool {tool_name} error: {result['error']}")
                        return tool_name, None
                        break
            except Exception as e:
                logger.error(f"Error executing {tool_name}: {e}")
                return tool_name, None
            
            return tool_name, None
        
        # Execute all MCP tools in parallel
        tool_tasks = [execute_mcp_tool(tool_name, tool_args) for tool_name, tool_args in mcp_tools]
        tool_results = await asyncio.gather(*tool_tasks, return_exceptions=True)
        
        # Process results and add to chart_data
        for result in tool_results:
            if isinstance(result, Exception):
                logger.error(f"Exception in parallel tool execution: {result}")
                continue
            
            tool_name, tool_data = result
            if tool_data is not None:
                chart_data["overall_metrics"][tool_name] = tool_data
        
        # Get account performance data for individual accounts in parallel
        try:
            accounts = await es_data_client.get_all_accounts()
            # Limit to first 10 accounts for performance
            sample_accounts = accounts[:10] if len(accounts) > 10 else accounts
            
            async def get_account_performance(account):
                """Get performance data for a single account"""
                account_id = account.get("account_id")
                if not account_id:
                    return account_id, None
                    
                # Get portfolio performance history for this account
                if "utilities_metrics_portfolio_performance_history" not in utilities_server.tools:
                    return account_id, None
                    
                try:
                    logger.debug(f"Getting performance data for account {account_id}")
                    async for result in mcp_manager.execute_tool(
                        utilities_server_id, 
                        "utilities_metrics_portfolio_performance_history", 
                        {"account_id": account_id}
                    ):
                        if result["type"] == "tool_result":
                            content = result["content"]
                            if isinstance(content, dict) and "text" in content:
                                try:
                                    data = json.loads(content["text"])
                                    # Extract chart-ready data
                                    if "results" in data and len(data["results"]) > 0:
                                        first_result = data["results"][0]
                                        if "data" in first_result and "values" in first_result["data"]:
                                            # Convert tabular data to chart format
                                            columns = first_result["data"]["columns"]
                                            values = first_result["data"]["values"]
                                            
                                            chart_points = []
                                            for row in values:
                                                point = {}
                                                for i, column in enumerate(columns):
                                                    if i < len(row):
                                                        point[column["name"]] = row[i]
                                                chart_points.append(point)
                                            
                                            return account_id, chart_points
                                except json.JSONDecodeError:
                                    logger.warning(f"Failed to parse performance data for {account_id}")
                            break
                        elif result["type"] == "error":
                            logger.error(f"Error getting performance for {account_id}: {result['error']}")
                            break
                except Exception as e:
                    logger.error(f"Error fetching performance for account {account_id}: {e}")
                
                return account_id, None
            
            # Execute all account performance requests in parallel
            if sample_accounts:
                account_tasks = [get_account_performance(account) for account in sample_accounts]
                account_results = await asyncio.gather(*account_tasks, return_exceptions=True)
                
                # Process results and add to chart_data
                for result in account_results:
                    if isinstance(result, Exception):
                        logger.error(f"Exception in parallel account performance execution: {result}")
                        continue
                    
                    account_id, chart_points = result
                    if account_id and chart_points is not None:
                        chart_data["account_performance"][account_id] = chart_points
                        
        except Exception as e:
            logger.error(f"Error fetching accounts for performance data: {e}")
        
        logger.info(f"Chart data collection complete. Overall metrics: {len(chart_data['overall_metrics'])}, Account performance: {len(chart_data['account_performance'])}")
        return chart_data
        
    except Exception as e:
        logger.error(f"Error fetching charts data: {e}", exc_info=True)
        return {
            "overall_metrics": {},
            "account_performance": {},
            "error": f"Error fetching chart data: {str(e)}"
        }

@app.get("/news")
async def get_all_news():
    """Get all news articles for the news list page"""
    try:
        news = await es_data_client.get_all_news()
        return {"news": news}
    except Exception as e:
        logger.error(f"Error fetching all news: {e}")
        raise HTTPException(status_code=500, detail="Error fetching news")

@app.get("/reports")
async def get_all_reports():
    """Get all reports for the reports list page"""
    try:
        logger.info("🔍 Backend: Starting to fetch all reports from ES")
        reports = await es_data_client.get_all_reports()
        logger.info(f"🔍 Backend: Found {len(reports)} reports")
        if len(reports) > 0:
            logger.info(f"🔍 Backend: Sample report fields: {list(reports[0].keys()) if reports else 'No reports'}")
        return {"reports": reports}
    except Exception as e:
        logger.error(f"❌ Backend: Error fetching all reports: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error fetching reports")

@app.get("/alerts/negative-news")
async def get_negative_news_alerts(time_period: int = 48, time_unit: str = "hours"):
    """Get negative news alerts for accounts with positions in negative sentiment news/reports"""
    try:
        # Validate time_unit
        valid_units = ["minutes", "hours", "days"]
        if time_unit not in valid_units:
            raise HTTPException(status_code=400, detail=f"Invalid time_unit. Must be one of: {valid_units}")
        
        # Validate time_period
        if time_period <= 0:
            raise HTTPException(status_code=400, detail="time_period must be greater than 0")
        
        logger.info(f"Getting negative news alerts for {time_period} {time_unit}")
        alerts = await negative_news_alerts_service.get_negative_news_alerts(time_period, time_unit)
        return alerts
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching negative news alerts: {e}")
        raise HTTPException(status_code=500, detail="Error fetching negative news alerts")

@app.get("/action-item")
async def get_action_item(time_period: int = 48, time_unit: str = "hours"):
    """Get action item analysis for top accounts with negative news"""
    try:
        # Validate time_unit
        valid_units = ["minutes", "hours", "days"]
        if time_unit not in valid_units:
            raise HTTPException(status_code=400, detail=f"Invalid time_unit. Must be one of: {valid_units}")
        
        # Validate time_period
        if time_period <= 0:
            raise HTTPException(status_code=400, detail="time_period must be greater than 0")
        
        logger.info(f"Getting action item analysis for {time_period} {time_unit}")
        action_item = await action_item_service.get_action_item_analysis(time_period, time_unit)
        return action_item
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching action item analysis: {e}")
        raise HTTPException(status_code=500, detail="Error fetching action item analysis")

async def article_summarization_generator(article_content: str, symbol: str = "", account_id: str = ""):
    """
    Generate a streaming summary of an article with focus on account/symbol relevance.
    """
    try:
        # Build context-aware prompt
        context_parts = []
        
        # Add account context if provided
        if account_id:
            try:
                account_data = await es_data_client.get_account_details(account_id)
                if account_data and "holdings" in account_data:
                    # Find relevant holding for the symbol
                    relevant_holding = None
                    for holding in account_data["holdings"]:
                        if holding.get("symbol") == symbol:
                            relevant_holding = holding
                            break
                    
                    if relevant_holding:
                        context_parts.append(f"Account Context: The account {account_data.get('account_name', account_id)} holds {relevant_holding.get('total_quantity', 0)} shares of {symbol} ({relevant_holding.get('company_name', '')}) worth ${relevant_holding.get('total_current_value', 0):,.2f} in the {relevant_holding.get('sector', 'unknown')} sector.")
                    else:
                        context_parts.append(f"Account Context: Analyzing potential impact on account {account_data.get('account_name', account_id)} portfolio.")
            except Exception as e:
                logger.warning(f"Could not fetch account context for {account_id}: {e}")
        
        # Build the summarization prompt
        system_prompt = """You are a professional financial analyst providing concise, actionable summaries of news articles. 

Focus on:
1. Key financial implications and market impact
2. Specific effects on the mentioned company/symbol
3. Potential portfolio implications for investors
4. Risk factors and opportunities
5. Timeline and likelihood of impacts

Provide a clear, structured summary in 3-4 paragraphs that a financial advisor could use when speaking with clients."""
        
        context_text = "\n".join(context_parts) if context_parts else ""
        
        user_prompt = f"""Please summarize this financial article with focus on implications for {symbol if symbol else 'relevant investments'}:

{context_text}

Article Content:
{article_content}

Provide a professional summary focusing on financial relevance, market implications, and potential impact on investors holding {symbol if symbol else 'related positions'}."""

        # Create message for single-turn summarization
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        # Use existing EIS client for LLM interaction
        async for data in get_chat_response_stream_with_messages(messages):
            if data.get("error"):
                yield f"Error: {data['error']}"
                return

            # Safe access to choices array
            choices = data.get("choices", [])
            if not choices:
                continue
                
            delta = choices[0].get("delta", {})
            content = delta.get("content")
            
            if content:
                yield content
            
    except Exception as e:
        logger.error(f"Error in article summarization: {e}")
        yield f"Error generating summary: {str(e)}"

async def chat_stream_generator(prompt: str, session_id: Optional[str] = None, app_mode: Optional[str] = None):
    """
    Multi-turn conversation generator with hybrid conversation persistence.
    """
    print(f"--- USER PROMPT ---: {prompt}")
    print(f"--- APP MODE ---: {app_mode}")
    
    # Handle conversation session
    if session_id:
        # Continue existing conversation
        messages = conversation_manager.get_messages(session_id)
        if not messages:
            # Session not found, create new one
            session_id = conversation_manager.create_session(prompt)
            messages = [{"role": "user", "content": prompt}]
        else:
            # Add new user message to existing conversation
            conversation_manager.add_message(session_id, {"role": "user", "content": prompt})
            messages.append({"role": "user", "content": prompt})
    else:
        # Create new conversation session
        session_id = conversation_manager.create_session(prompt)
        messages = [{"role": "user", "content": prompt}]
    
    yield f"Session ID: {session_id}\n\n"
    
    dynamic_tools = get_all_tool_definitions(app_mode)
    max_turns = 5  # Prevent infinite loops
    turn = 0
    
    while turn < max_turns:
        turn += 1
        print(f"--- TURN {turn} ---")
        
        tool_calls = {}  # Use dict to accumulate by index
        assistant_response = ""

        # Make LLM call with current conversation history
        async for data in get_chat_response_stream_with_messages(messages, dynamic_tools=dynamic_tools):
            if data.get("error"):
                yield f"Error: {data['error']}"
                return

            # Safe access to choices array
            choices = data.get("choices", [])
            if not choices:
                continue
                
            delta = choices[0].get("delta", {})
            
            # Accumulate tool calls properly
            if "tool_calls" in delta and delta["tool_calls"]:
                for tool_call in delta["tool_calls"]:
                    index = tool_call.get("index", 0)
                    if index not in tool_calls:
                        tool_calls[index] = {"name": "", "arguments": ""}
                    
                    function_data = tool_call.get("function", {})
                    if "name" in function_data:
                        tool_calls[index]["name"] = function_data["name"]
                    if "arguments" in function_data:
                        tool_calls[index]["arguments"] += function_data["arguments"]
            
            content = delta.get("content")
            if content:
                assistant_response += content
                yield content
        
        print(f"--- ASSISTANT RESPONSE TURN {turn} ---: {assistant_response}")

        # If no tool calls, we have the final answer
        if not tool_calls:
            print(f"--- FINAL ANSWER REACHED IN {turn} TURNS ---")
            break
        
        # Execute tools and build tool results for next turn
        tool_results = []
        # Get servers filtered by app_mode if provided
        if app_mode:
            enabled_servers = config_manager.get_servers_for_app_mode(app_mode)
        else:
            enabled_servers = config_manager.get_enabled_servers()
        
        # Add assistant message with tool calls to conversation
        assistant_message = {"role": "assistant", "content": assistant_response}
        if tool_calls:
            assistant_message["tool_calls"] = [
                {
                    "id": f"call_{i}",
                    "type": "function", 
                    "function": {"name": tc["name"], "arguments": tc["arguments"]}
                }
                for i, tc in tool_calls.items()
            ]
        messages.append(assistant_message)
        conversation_manager.add_message(session_id, assistant_message)

        for i, tool_call in tool_calls.items():
            function_name = tool_call.get("name")
            
            # Skip tool calls with no function name
            if not function_name:
                logger.warning(f"Skipping tool call with no function name: {tool_call}")
                continue
            
            # Handle empty or invalid arguments safely
            args_str = tool_call.get("arguments", "{}")
            if not args_str.strip():
                args_str = "{}"
            
            try:
                function_args = json.loads(args_str)
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse tool arguments '{args_str}': {e}")
                function_args = {}
            
            logger.info(f"Executing tool call: {function_name}({function_args})")
            
            result = None
            
            # Check MCP servers for the tool
            tool_found = False
            for server_id, server in enabled_servers.items():
                if function_name in server.tools:
                    logger.debug(f"Executing MCP tool {function_name} on server {server_id}")
                    tool_found = True
                    
                    try:
                        # Check if server is registered in mcp_manager, if not try to register it
                        if server_id not in mcp_manager.servers:
                            logger.info(f"Server {server_id} not in mcp_manager, attempting to register it")
                            if server_id.startswith('customer-success') or 'customer-success' in server.app_modes:
                                try:
                                    await mcp_manager.add_server(server)
                                    logger.info(f"Successfully registered customer-success server {server_id}")
                                except Exception as e:
                                    logger.warning(f"Failed to register customer-success server {server_id}: {e}")
                                    # Continue anyway - maybe the server is functional despite connection issues
                        
                        # Prepare arguments with conversation context
                        enhanced_args = conversation_manager.prepare_tool_arguments(
                            session_id, server_id, server.to_dict(), function_args
                        )
                        
                        # Use the MCP client with streaming support
                        async for tool_result in mcp_manager.execute_tool(server_id, function_name, enhanced_args):
                            if tool_result["type"] == "error":
                                result = f"Error calling MCP tool {function_name}: {tool_result['error']}"
                                logger.error(f"MCP tool error: {tool_result['error']}")
                            else:
                                result = tool_result["content"]
                                logger.info(f"MCP tool {function_name} executed successfully on server {server_id}")
                                
                                # Extract and store conversation ID if server supports it
                                raw_response = tool_result.get("raw_response", {})
                                conversation_id = conversation_manager.extract_conversation_id(
                                    server_id, server.to_dict(), raw_response
                                )
                                if conversation_id:
                                    conversation_manager.store_server_conversation_id(
                                        session_id, server_id, conversation_id
                                    )
                            break  # Take first result for now
                    except Exception as e:
                        logger.error(f"Error executing MCP tool {function_name} on server {server_id}: {e}")
                        result = f"Error calling MCP tool {function_name}: {e}"
                    break
            
            if not tool_found:
                logger.warning(f"Tool {function_name} not found in any enabled MCP server")
                result = f"Tool {function_name} not found in any enabled MCP server"
            
            if result is not None:
                logger.debug(f"Tool result for {function_name}: {result}")
                tool_results.append({"tool_name": function_name, "result": result})
                
                # Add tool result to conversation history
                tool_message = {
                    "role": "tool",
                    "tool_call_id": f"call_{i}",
                    "content": str(result)
                }
                messages.append(tool_message)
                conversation_manager.add_message(session_id, tool_message)

        # Show tool results to user in structured format
        if tool_results:
            tool_results_data = {
                "turn": turn,
                "tool_results": [
                    {
                        "tool_name": tr["tool_name"],
                        "result": tr["result"],
                        "timestamp": time.time()
                    }
                    for tr in tool_results
                ]
            }
            yield f"\n\n```json-tool-results\n{json.dumps(tool_results_data, indent=2)}\n```\n\n"

@app.post("/chat/query")
async def chat_query(query: Dict[str, str]):
    prompt = query.get("query", "")
    session_id = query.get("session_id")  # Optional session ID for conversation persistence
    app_mode = query.get("app_mode")  # Optional app mode for filtering MCP servers
    logger.info(f"Chat query received with app_mode: {app_mode}")
    return StreamingResponse(chat_stream_generator(prompt, session_id, app_mode), media_type="text/plain")

@app.post("/article/summarize")
async def summarize_article(request: Dict[str, str]):
    """Summarize an article with focus on account/symbol relevance"""
    article_content = request.get("article_content", "")
    symbol = request.get("symbol", "")
    account_id = request.get("account_id", "")
    
    if not article_content:
        raise HTTPException(status_code=400, detail="Article content is required")
    
    return StreamingResponse(
        article_summarization_generator(article_content, symbol, account_id), 
        media_type="text/plain"
    )

# --- Settings Endpoints ---

@app.get("/settings")
async def get_current_settings():
    """Get current MCP server settings (without API keys)"""
    safe_config = config_manager.get_safe_config()
    # Return just the servers part to match frontend expectations
    return safe_config.get("servers", {})

@app.post("/settings")
async def update_current_settings(new_settings: Dict[str, Any]):
    """Update MCP server settings"""
    try:
        # This endpoint could be used for bulk updates
        # For now, we'll return the current settings
        logger.info("Settings update requested (not implemented for bulk updates)")
        return config_manager.get_safe_config()
    except Exception as e:
        logger.error(f"Error updating settings: {e}")
        raise HTTPException(status_code=400, detail=f"Error updating settings: {e}")

@app.get("/settings/logging")
async def get_logging_config():
    return get_logging_status()

@app.put("/settings/logging")
async def update_logging_config(status: Dict[str, bool]):
    return update_logging_status(status.get("enabled", False))

@app.post("/servers")
async def register_external_server(server_config: Dict[str, Any]):
    """Registers a new external MCP server using the clean HTTP-based client."""
    server_id = server_config.get("id")
    if not server_id:
        raise HTTPException(status_code=400, detail="Server ID is required.")
    
    url = server_config.get("url")
    api_key = server_config.get("apiKey")
    name = server_config.get("name", "Unnamed Server")
    transport = server_config.get("transport", "http")
    conversation_field = server_config.get("conversationField")
    conversation_location = server_config.get("conversationLocation", "response")
    use_for_main_page = server_config.get("useForMainPage", False)
    
    logger.info(f"Registering new MCP server: {server_id} at {url}")
    if conversation_field:
        logger.info(f"Server supports conversation persistence: {conversation_field} in {conversation_location}")
    if use_for_main_page:
        logger.info(f"Server designated for main page data enhancement")
    
    try:
        # Create MCPServer instance
        server = MCPServer(
            id=server_id,
            name=name,
            url=url,
            api_key=api_key,
            transport=MCPTransportType(transport),
            enabled=True,
            conversation_field=conversation_field,
            conversation_location=conversation_location,
            use_for_main_page=use_for_main_page
        )
        
        # Add server to manager (this will test connection and discover tools)
        await mcp_manager.add_server(server)
        
        # Save to persistent configuration
        config_manager.add_server(server)
        
        logger.info(f"Successfully registered MCP server: {server_id} with {len(server.tools)} tools")
        
        # Return server config without API key
        result = server.to_dict()
        result.pop("api_key", None)
        return result
        
    except MCPConnectionError as e:
        logger.error(f"Connection error registering server {server_id}: {e}")
        raise HTTPException(status_code=400, detail=f"Connection error: {e}")
    except MCPClientError as e:
        logger.error(f"Client error registering server {server_id}: {e}")
        raise HTTPException(status_code=400, detail=f"Client error: {e}")
    except Exception as e:
        logger.error(f"Unexpected error registering server {server_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")

@app.delete("/servers/{server_id}")
async def unregister_external_server(server_id: str):
    try:
        # Remove from MCP manager
        await mcp_manager.remove_server(server_id)
        # Remove from config
        config_manager.remove_server(server_id)
        return {"message": f"Server {server_id} removed successfully."}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error removing server: {e}")

@app.post("/servers/{server_id}/refresh-tools")
async def refresh_server_tools(server_id: str):
    """Refresh/rediscover tools for an existing MCP server"""
    try:
        # Get the current server config
        all_servers = config_manager.get_all_servers()
        if server_id not in all_servers:
            raise HTTPException(status_code=404, detail=f"Server {server_id} not found")
        
        server = all_servers[server_id]
        logger.info(f"Refreshing tools for MCP server: {server_id} ({server.name})")
        
        # Remove and re-add the server to refresh tools
        await mcp_manager.remove_server(server_id)
        await mcp_manager.add_server(server)
        
        # Update the config with refreshed tools
        config_manager.update_server(server)
        
        logger.info(f"Successfully refreshed tools for server: {server_id} - found {len(server.tools)} tools")
        
        # Return updated server config without API key
        result = server.to_dict()
        result.pop("api_key", None)
        return result
        
    except HTTPException:
        raise
    except MCPConnectionError as e:
        logger.error(f"Connection error refreshing tools for server {server_id}: {e}")
        raise HTTPException(status_code=400, detail=f"Connection error: {e}")
    except Exception as e:
        logger.error(f"Error refreshing tools for server {server_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error refreshing server tools: {e}")

@app.get("/tools")
async def get_available_tools(app_mode: Optional[str] = None):
    """Get all available tools from MCP servers, optionally filtered by app mode"""
    tools = []
    
    # Filter by app_mode if provided
    if app_mode:
        enabled_servers = config_manager.get_servers_for_app_mode(app_mode)
    else:
        enabled_servers = config_manager.get_enabled_servers()
    
    for server_id, server in enabled_servers.items():
        for tool_name, tool in server.tools.items():
            tools.append({
                "name": tool_name,
                "description": tool.description,
                "server": server.name,
                "server_id": server_id
            })
    
    return {
        "server_name": "MCP Servers",
        "tools": tools
    }