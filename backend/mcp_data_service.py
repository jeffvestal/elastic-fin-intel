"""
MCP-based data service for retrieving financial data through MCP tools.
This service replaces direct Elasticsearch queries with MCP tool calls.
"""

import logging
import json
from typing import Dict, List, Any, Optional
from mcp_config import config_manager
from mcp_client import mcp_manager

logger = logging.getLogger(__name__)


class MCPDataService:
    """Service for retrieving data through MCP tools instead of direct ES queries"""
    
    def __init__(self):
        self.logger = logging.getLogger(f"{__name__}.MCPDataService")
    
    async def get_accounts_overview(self) -> Dict[str, Any]:
        """Get account overview data using new dedicated MCP metric tools"""
        try:
            # Get servers designated for main page data
            main_page_servers = config_manager.get_main_page_servers()
            
            if not main_page_servers:
                raise Exception("No MCP servers configured for main page data")
            
            # Try to get metrics from each designated server
            for server_id, server in main_page_servers.items():
                try:
                    # Check if server has the new dedicated metric tools
                    required_tools = [
                        "financial_metricstotal_accounts",
                        "financial_metricstotal_aum", 
                        "financial_metricstotal_news",
                        "financial_metricstotal_reports"
                    ]
                    
                    if all(tool in server.tools for tool in required_tools):
                        overview = await self._get_metrics_via_dedicated_tools(server_id)
                        if overview:
                            return overview
                    else:
                        self.logger.warning(f"Server {server_id} missing some metric tools: {[t for t in required_tools if t not in server.tools]}")
                            
                except Exception as e:
                    self.logger.warning(f"Failed to get metrics from server {server_id}: {e}")
                    continue
            
            raise Exception("No MCP servers could provide metrics data")
            
        except Exception as e:
            self.logger.error(f"Error getting accounts overview via MCP: {e}")
            raise
    
    async def _get_accounts_overview_via_tool(self, server_id: str) -> Optional[Dict[str, Any]]:
        """Get account overview using financial_accounts_descriptions tool"""
        try:
            self.logger.info(f"Getting account overview from server {server_id} using financial_accounts_descriptions")
            
            # Query for account summary statistics
            arguments = {
                "nlQuery": "Get total number of accounts, total assets under management, and key portfolio metrics"
            }
            
            async for result in mcp_manager.execute_tool(server_id, "financial_accounts_descriptions", arguments):
                if result["type"] == "tool_result":
                    content = result["content"]
                    if isinstance(content, dict) and "text" in content:
                        try:
                            data = json.loads(content["text"])
                            return await self._parse_account_overview_response(data)
                        except json.JSONDecodeError:
                            self.logger.warning("Could not parse response as JSON")
                elif result["type"] == "error":
                    self.logger.error(f"Error from financial_accounts_descriptions tool: {result.get('error', 'Unknown error')}")
                    break
            
            return None
            
        except Exception as e:
            self.logger.error(f"Error using financial_accounts_descriptions tool: {e}")
            return None
    
    async def _get_accounts_overview_via_search(self, server_id: str) -> Optional[Dict[str, Any]]:
        """Get account overview using platform_coresearch tool"""
        try:
            self.logger.info(f"Getting account overview from server {server_id} using platform_coresearch")
            
            # Query for account aggregations
            arguments = {
                "index": "financial_accounts",
                "query": "aggregate total portfolio values, count accounts, and calculate key metrics"
            }
            
            async for result in mcp_manager.execute_tool(server_id, "platform_coresearch", arguments):
                if result["type"] == "tool_result":
                    content = result["content"]
                    if isinstance(content, dict) and "text" in content:
                        try:
                            data = json.loads(content["text"])
                            return await self._parse_account_overview_response(data)
                        except json.JSONDecodeError:
                            self.logger.warning("Could not parse response as JSON")
                elif result["type"] == "error":
                    self.logger.error(f"Error from platform_coresearch tool: {result.get('error', 'Unknown error')}")
                    break
            
            return None
            
        except Exception as e:
            self.logger.error(f"Error using platform_coresearch tool: {e}")
            return None
    
    async def _get_metrics_via_dedicated_tools(self, server_id: str) -> Optional[Dict[str, Any]]:
        """Get metrics using the new dedicated MCP tools"""
        try:
            self.logger.info(f"Getting metrics from server {server_id} using dedicated tools")
            
            overview = {
                "total_accounts": 0,
                "total_aum": 0,
                "total_news": 0,
                "total_reports": 0
            }
            
            # Call each dedicated metric tool
            metrics_tools = {
                "financial_metricstotal_accounts": "total_accounts",
                "financial_metricstotal_aum": "total_aum",
                "financial_metricstotal_news": "total_news",
                "financial_metricstotal_reports": "total_reports"
            }
            
            for tool_name, metric_key in metrics_tools.items():
                try:
                    self.logger.info(f"Calling {tool_name}")
                    async for result in mcp_manager.execute_tool(server_id, tool_name, {}):
                        if result["type"] == "tool_result":
                            content = result["content"]
                            if isinstance(content, dict) and "text" in content:
                                try:
                                    data = json.loads(content["text"])
                                    metric_value = await self._parse_metric_value(data, tool_name)
                                    overview[metric_key] = metric_value
                                    self.logger.info(f"{tool_name} returned: {metric_value}")
                                    break
                                except json.JSONDecodeError:
                                    self.logger.warning(f"Could not parse {tool_name} response as JSON")
                        elif result["type"] == "error":
                            self.logger.error(f"Error from {tool_name} tool: {result.get('error', 'Unknown error')}")
                            break
                            
                except Exception as e:
                    self.logger.warning(f"Error calling {tool_name}: {e}")
                    continue
            
            self.logger.info(f"Final metrics overview: {overview}")
            return overview
            
        except Exception as e:
            self.logger.error(f"Error getting metrics via dedicated tools: {e}")
            return None
    
    async def _parse_metric_value(self, data: Dict[str, Any], tool_name: str) -> int:
        """Parse a single metric value from MCP tool response"""
        try:
            # Look for ES|QL tabular data format
            if "results" in data:
                for result in data["results"]:
                    if result.get("type") == "tabular_data" and "data" in result:
                        tabular_data = result["data"]
                        if "values" in tabular_data and tabular_data["values"]:
                            # Get first row, first column value
                            first_row = tabular_data["values"][0]
                            if first_row:
                                value = first_row[0]
                                return int(value) if value is not None else 0
            
            self.logger.warning(f"Could not extract metric value from {tool_name} response")
            return 0
            
        except Exception as e:
            self.logger.error(f"Error parsing metric value from {tool_name}: {e}")
            return 0

    async def _parse_account_overview_response(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse the response from MCP tools into overview metrics"""
        try:
            # Default values
            overview = {
                "total_accounts": 0,
                "total_aum": 0,
                "total_news": 0,
                "total_reports": 0
            }
            
            # Try to extract data from ES response format
            if "result" in data and "aggregations" in data["result"]:
                aggs = data["result"]["aggregations"]
                
                # Total AUM from sum aggregation
                if "total_aum" in aggs and "value" in aggs["total_aum"]:
                    overview["total_aum"] = int(aggs["total_aum"]["value"] or 0)
            
            # Try to extract from hits
            if "result" in data and "hits" in data["result"]:
                hits_info = data["result"]["hits"]
                if "total" in hits_info:
                    if isinstance(hits_info["total"], dict) and "value" in hits_info["total"]:
                        overview["total_accounts"] = hits_info["total"]["value"]
                    elif isinstance(hits_info["total"], int):
                        overview["total_accounts"] = hits_info["total"]
            
            self.logger.info(f"Parsed overview: {overview}")
            return overview
            
        except Exception as e:
            self.logger.error(f"Error parsing account overview response: {e}")
            return {
                "total_accounts": 0,
                "total_aum": 0,
                "total_news": 0,
                "total_reports": 0
            }
    
    async def get_top_accounts(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get top accounts by portfolio value using MCP tools"""
        try:
            # Get servers designated for main page data
            main_page_servers = config_manager.get_main_page_servers()
            
            if not main_page_servers:
                raise Exception("No MCP servers configured for main page data")
            
            # Try to get top accounts from each designated server
            for server_id, server in main_page_servers.items():
                try:
                    # Check if server has financial_accounts_descriptions tool
                    if "financial_accounts_descriptions" in server.tools:
                        accounts = await self._get_top_accounts_via_tool(server_id, limit)
                        if accounts:
                            return accounts
                    
                    # Fallback to platform_coresearch
                    if "platform_coresearch" in server.tools:
                        accounts = await self._get_top_accounts_via_search(server_id, limit)
                        if accounts:
                            return accounts
                            
                except Exception as e:
                    self.logger.warning(f"Failed to get top accounts from server {server_id}: {e}")
                    continue
            
            raise Exception("No MCP servers could provide top accounts data")
            
        except Exception as e:
            self.logger.error(f"Error getting top accounts via MCP: {e}")
            raise
    
    async def _get_top_accounts_via_tool(self, server_id: str, limit: int) -> Optional[List[Dict[str, Any]]]:
        """Get top accounts using financial_accounts_descriptions tool"""
        try:
            self.logger.info(f"Getting top accounts from server {server_id} using financial_accounts_descriptions")
            
            arguments = {
                "nlQuery": f"Get top {limit} accounts by total portfolio value, including account name, portfolio value, and holdings"
            }
            
            async for result in mcp_manager.execute_tool(server_id, "financial_accounts_descriptions", arguments):
                if result["type"] == "tool_result":
                    content = result["content"]
                    if isinstance(content, dict) and "text" in content:
                        try:
                            data = json.loads(content["text"])
                            return await self._parse_top_accounts_response(data)
                        except json.JSONDecodeError:
                            self.logger.warning("Could not parse response as JSON")
                elif result["type"] == "error":
                    self.logger.error(f"Error from financial_accounts_descriptions tool: {result.get('error', 'Unknown error')}")
                    break
            
            return None
            
        except Exception as e:
            self.logger.error(f"Error using financial_accounts_descriptions tool: {e}")
            return None
    
    async def _get_top_accounts_via_search(self, server_id: str, limit: int) -> Optional[List[Dict[str, Any]]]:
        """Get top accounts using platform_coresearch tool"""
        try:
            self.logger.info(f"Getting top accounts from server {server_id} using platform_coresearch")
            
            arguments = {
                "index": "financial_accounts",
                "query": f"get top {limit} accounts sorted by total portfolio value descending"
            }
            
            async for result in mcp_manager.execute_tool(server_id, "platform_coresearch", arguments):
                if result["type"] == "tool_result":
                    content = result["content"]
                    if isinstance(content, dict) and "text" in content:
                        try:
                            data = json.loads(content["text"])
                            return await self._parse_top_accounts_response(data)
                        except json.JSONDecodeError:
                            self.logger.warning("Could not parse response as JSON")
                elif result["type"] == "error":
                    self.logger.error(f"Error from platform_coresearch tool: {result.get('error', 'Unknown error')}")
                    break
            
            return None
            
        except Exception as e:
            self.logger.error(f"Error using platform_coresearch tool: {e}")
            return None
    
    async def _parse_top_accounts_response(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse the response from MCP tools into top accounts list"""
        try:
            accounts = []
            
            # Try to extract from new MCP results format with tabular_data
            if "results" in data:
                for result in data["results"]:
                    if result.get("type") == "tabular_data" and "data" in result:
                        tabular_data = result["data"]
                        columns = tabular_data.get("columns", [])
                        values = tabular_data.get("values", [])
                        
                        col_map = {col.get("name", f"col_{i}"): i for i, col in enumerate(columns)}
                        
                        for row in values:
                            account = self._create_account_from_row(row, col_map)
                            if account:
                                accounts.append(account)
                        break
            
            # Fallback: Try to extract from ES hits format
            elif "result" in data and "hits" in data["result"] and "hits" in data["result"]["hits"]:
                hits = data["result"]["hits"]["hits"]
                for hit in hits:
                    source = hit.get("_source", {})
                    account = {
                        "account_id": hit.get("_id", ""),
                        "account_name": source.get("account_holder_name", "Unknown Account"),
                        "total_portfolio_value": source.get("total_portfolio_value", 0),
                        "account_type": source.get("account_type", "Unknown"),
                        "state": source.get("state", "Unknown"),
                        "risk_profile": source.get("risk_profile", "Unknown")
                    }
                    accounts.append(account)
            
            # Fallback: Try to extract from ES|QL values format  
            elif "result" in data and "values" in data["result"]:
                columns = data["result"].get("columns", [])
                values = data["result"].get("values", [])
                
                col_map = {col.get("name", f"col_{i}"): i for i, col in enumerate(columns)}
                
                for row in values:
                    account = self._create_account_from_row(row, col_map)
                    if account:
                        accounts.append(account)
            
            self.logger.info(f"Parsed {len(accounts)} top accounts")
            return accounts
            
        except Exception as e:
            self.logger.error(f"Error parsing top accounts response: {e}")
            return []
    
    def _create_account_from_row(self, row: List[Any], col_map: Dict[str, int]) -> Optional[Dict[str, Any]]:
        """Create account dict from ES|QL row"""
        try:
            def get_col_value(col_name: str, default: Any = "") -> Any:
                idx = col_map.get(col_name, -1)
                if idx >= 0 and idx < len(row):
                    return row[idx] if row[idx] is not None else default
                return default
            
            account_id = get_col_value("account_id") or get_col_value("_id")
            if not account_id:
                return None
            
            return {
                "account_id": str(account_id),
                "account_name": str(get_col_value("account_holder_name", get_col_value("account_name", "Unknown Account"))),
                "total_portfolio_value": float(get_col_value("total_portfolio_value", 0)) if get_col_value("total_portfolio_value") else 0,
                "account_type": str(get_col_value("account_type", "Unknown")),
                "state": str(get_col_value("state", "Unknown")),
                "risk_profile": str(get_col_value("risk_profile", "Unknown"))
            }
        except Exception as e:
            self.logger.warning(f"Error creating account from row: {e}")
            return None


# Global instance
mcp_data_service = MCPDataService()