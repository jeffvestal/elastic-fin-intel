import os
import json
import asyncio
import traceback
from dotenv import load_dotenv
import openai

load_dotenv()

# OpenAI Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL")  # Optional for custom endpoints
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")  # Default model

# Initialize OpenAI client
client = None
if OPENAI_API_KEY:
    # Remove trailing /chat/completions from base_url if present
    clean_base_url = OPENAI_BASE_URL
    if OPENAI_BASE_URL and OPENAI_BASE_URL.endswith('/chat/completions'):
        clean_base_url = OPENAI_BASE_URL.rsplit('/chat/completions', 1)[0]
    
    client = openai.OpenAI(
        api_key=OPENAI_API_KEY,
        base_url=clean_base_url if clean_base_url else None
    )

async def get_chat_response_stream(prompt: str, dynamic_tools: list = None):
    """
    A unified function to handle streaming responses that could be text or tool calls.
    This makes a single call to OpenAI with a dynamic list of tools.
    """
    if not client:
        yield {"error": "OpenAI client not configured. Please set OPENAI_API_KEY environment variable."}
        return
    
    messages = [{"role": "user", "content": prompt}]
    async for result in _make_openai_request(messages, dynamic_tools):
        yield result

async def get_chat_response_stream_with_messages(messages: list, dynamic_tools: list = None):
    """
    A unified function to handle streaming responses with full conversation history.
    This makes a call to OpenAI with a messages array and dynamic list of tools.
    """
    if not client:
        yield {"error": "OpenAI client not configured. Please set OPENAI_API_KEY environment variable."}
        return
    
    async for result in _make_openai_request(messages, dynamic_tools):
        yield result

async def _make_openai_request(messages: list, dynamic_tools: list = None):
    """
    Shared function to make OpenAI API requests with streaming.
    """
    try:
        # Prepare request parameters
        kwargs = {
            "model": OPENAI_MODEL,
            "messages": messages,
            "stream": True,
            "temperature": 0.7,
            "max_tokens": 2000
        }
        
        # Add tools if provided
        if dynamic_tools:
            kwargs["tools"] = dynamic_tools
            kwargs["tool_choice"] = "auto"
        
        print(f"--- CALLING OPENAI API ---")
        print(f"--- MODEL ---: {OPENAI_MODEL}")
        print(f"--- MESSAGES ---: {json.dumps(messages, indent=2)}")
        if dynamic_tools:
            print(f"--- TOOLS ---: {len(dynamic_tools)} tools provided")
        
        # Create streaming completion
        stream = client.chat.completions.create(**kwargs)
        
        # Process streaming response
        for chunk in stream:
            # Convert to dict format for compatibility with existing code
            chunk_dict = {
                "choices": []
            }
            
            if chunk.choices:
                for choice in chunk.choices:
                    choice_dict = {
                        "delta": {},
                        "finish_reason": choice.finish_reason
                    }
                    
                    if choice.delta.content:
                        choice_dict["delta"]["content"] = choice.delta.content
                        print(f"--- BACKEND PARSED CONTENT ---: '{choice.delta.content}'")
                    
                    if choice.delta.tool_calls:
                        choice_dict["delta"]["tool_calls"] = []
                        for tool_call in choice.delta.tool_calls:
                            tool_call_dict = {
                                "index": tool_call.index,
                                "id": tool_call.id,
                                "type": tool_call.type,
                                "function": {}
                            }
                            if tool_call.function:
                                if tool_call.function.name:
                                    tool_call_dict["function"]["name"] = tool_call.function.name
                                if tool_call.function.arguments:
                                    tool_call_dict["function"]["arguments"] = tool_call.function.arguments
                            choice_dict["delta"]["tool_calls"].append(tool_call_dict)
                        print(f"--- BACKEND PARSED TOOL CALLS ---: {choice_dict['delta']['tool_calls']}")
                    
                    chunk_dict["choices"].append(choice_dict)
            
            yield chunk_dict
            
    except openai.OpenAIError as e:
        print(f"--- OPENAI ERROR ---: {e}")
        traceback.print_exc()
        yield {"error": f"OpenAI API error: {e}"}
    except Exception as e:
        print(f"--- UNEXPECTED ERROR ---: {e}")
        traceback.print_exc()
        yield {"error": "Sorry, an error occurred while processing your request."}

async def perform_semantic_search(query: str, index: str, field_with_semantic_text: str):
    """Performs a semantic search using ELSER."""
    from es_client import es_client
    
    if not es_client:
        raise Exception("Elasticsearch client not configured")
    
    resp = await es_client.search(
        index=index,
        query={
            "text_expansion": {
                field_with_semantic_text: {
                    "model_id": "elser-adaptive-endpoint",
                    "model_text": query
                }
            }
        }
    )
    return [
        {"id": hit["_id"], "score": hit["_score"], **hit["_source"]}
        for hit in resp["hits"]["hits"]
    ]
