from google import genai
from google.genai.types import GenerateContentConfig, GoogleSearch, HttpOptions, Tool
import json
import os
import logging
from google.cloud import aiplatform
from flask import current_app, has_app_context

# Configure logging
logger = logging.getLogger(__name__)

class Google:
    def __init__(self, model_name=None):
        # Initialize the Vertex AI SDK
        aiplatform.init()
        
        # Get model name from config if in app context
        if has_app_context():
            self.model_name = model_name or current_app.config.get('DEFAULT_LLM_MODEL', 'gemini-2.0-flash-001')
        else:
            self.model_name = model_name or 'gemini-2.0-flash-001'
            
        self.client = genai.Client(http_options=HttpOptions(api_version="v1"))
        logger.info(f"Google AI client initialized with model: {self.model_name}")

    def generate(self, template,
                 top_p=None,
                 top_k=None,
                 temperature=None,
                 system_instructions=None,
                 max_output_tokens=None,
                 with_search=True) -> dict:
        """
        Generate content using Google Gemini model with Google Search grounding.
        
        Returns a dictionary containing:
        - text: The generated text response
        - sources: List of sources used for grounding (if available)
        - search_suggestions: Google Search suggestions (if available)
        """
        try:
            tools = []
            
            # Get config settings from app config or use defaults
            top_k = top_k or current_app.config.get('LLM_TOP_K', 20)
            temperature = temperature or current_app.config.get('LLM_TEMPERATURE', 0.6)
            
            # Add Google Search tool if requested
            if with_search:
                tools.append(Tool(google_search=GoogleSearch()))
                logger.info("Google Search tool enabled for grounding")
            
            # --- Model Invocation using genai ---
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=template,
                config=GenerateContentConfig(
                    tools=tools,
                    temperature=temperature,
                    top_p=top_p,
                    top_k=top_k,
                    max_output_tokens=max_output_tokens,
                    response_modalities=["TEXT"],  # Ensure text response
                ),
            )
            
            # Prepare result dictionary
            result = {
                "text": response.text.strip(),
                "sources": [],
                "rendered_content": None
            }
            
            # Extract grounding metadata if available
            if hasattr(response.candidates[0], 'grounding_metadata') and response.candidates[0].grounding_metadata:
                metadata = response.candidates[0].grounding_metadata
                
                # Extract search entry point (Google Search Suggestions)
                if hasattr(metadata, 'search_entry_point') and metadata.search_entry_point:
                    result["rendered_content"] = metadata.search_entry_point.rendered_content
                    logger.info("Google Search Suggestions extracted")
                
                # Extract grounding sources
                if hasattr(metadata, 'grounding_chunks') and metadata.grounding_chunks:
                    for chunk in metadata.grounding_chunks:
                        if hasattr(chunk, 'web') and chunk.web and hasattr(chunk.web, 'uri'):
                            source = {
                                "uri": chunk.web.uri,
                                "title": chunk.web.title if hasattr(chunk.web, 'title') else "Source"
                            }
                            result["sources"].append(source)
                    
                    logger.info(f"Extracted {len(result['sources'])} grounding sources")
            
            return result
            
        except Exception as e:
            logger.error(f"Error generating content: {str(e)}")
            return {"text": f"Error generating response: {str(e)}", "sources": [], "search_suggestions": None}
            
    def generate_with_url_context(self, template, urls, 
                                 top_p=None,
                                 top_k=None,
                                 temperature=None,
                                 max_output_tokens=None) -> dict:
        """
        Generate content using both URL context and Google Search for grounding.
        
        Args:
            template: The prompt template
            urls: List of URLs to provide as context
            
        Returns a dictionary with response text and sources
        """
        try:
            # Configure tools with Google Search
            tools = [Tool(google_search=GoogleSearch())]
            
            # Get config settings from app config or use defaults
            top_k = top_k or current_app.config.get('LLM_TOP_K', 20)
            temperature = temperature or current_app.config.get('LLM_TEMPERATURE', 0.6)
            
            # Prepare the content with URL context
            content_parts = []
            
            # Add the user's prompt as the main content
            content_parts.append(template)
            
            # Add URL context as a separate part
            if urls and len(urls) > 0:
                url_context = "Here are some relevant URLs to consider:\n"
                for url in urls:
                    url_context += f"- {url}\n"
                
                # We don't add this directly as we'll use the official URL context approach
                logger.info(f"Using {len(urls)} URLs as context")
            
            # Generate content with Google Search
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=template,
                config=GenerateContentConfig(
                    tools=tools,
                    temperature=temperature,
                    top_p=top_p,
                    top_k=top_k,
                    max_output_tokens=max_output_tokens,
                    response_modalities=["TEXT"],
                ),
                # When using URL context with Gemini 2.0, these go in the request
                # rather than as part of config
                url_context=urls if urls and len(urls) > 0 else None,
            )
            
            # Prepare result with URL context and search results
            result = {
                "text": response.text.strip(),
                "sources": [],
                "context_urls": urls,
                "search_suggestions": None
            }
            
            # Extract search metadata if available
            if hasattr(response.candidates[0], 'grounding_metadata') and response.candidates[0].grounding_metadata:
                metadata = response.candidates[0].grounding_metadata
                
                # Extract search entry point
                if hasattr(metadata, 'search_entry_point') and metadata.search_entry_point:
                    result["rendered_content"] = metadata.search_entry_point.rendered_content
                
                # Extract grounding sources
                if hasattr(metadata, 'grounding_chunks') and metadata.grounding_chunks:
                    for chunk in metadata.grounding_chunks:
                        if hasattr(chunk, 'web') and chunk.web and hasattr(chunk.web, 'uri'):
                            source = {
                                "uri": chunk.web.uri,
                                "title": chunk.web.title if hasattr(chunk.web, 'title') else "Source"
                            }
                            result["sources"].append(source)
            
            return result
            
        except Exception as e:
            logger.error(f"Error generating content with URL context: {str(e)}")
            return {
                "text": f"Error generating response: {str(e)}", 
                "sources": [], 
                "context_urls": urls,
                "search_suggestions": None
            } 