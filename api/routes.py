from flask import Blueprint, request, jsonify, render_template, url_for
from api.utils.llm.google import Google
import logging
import traceback
import os
import re
import json

# Configure logging
logger = logging.getLogger(__name__)

# Create the blueprint
main_bp = Blueprint('main', __name__)

# Initialize Google LLM model
google_model = Google()
logger.info("Google model initialized for main routes")

@main_bp.route('/')
def index():
    """Home page"""
    client_ip = request.remote_addr
    user_agent = request.headers.get('User-Agent', 'Unknown')
    logger.info(f"Main page accessed by {client_ip} using {user_agent}")
    return render_template('index.html')

@main_bp.route('/technical-analysis')
def technical_analysis():
    """Technical analysis page"""
    client_ip = request.remote_addr
    logger.info(f"Technical analysis page accessed by {client_ip}")
    return render_template('technical_analysis.html')

@main_bp.route('/technical-analysis-prototype')
def technical_analysis_prototype():
    """Technical analysis prototype page"""
    client_ip = request.remote_addr
    logger.info(f"Technical analysis prototype page accessed by {client_ip}")
    return render_template('technical_analysis_prototype.html')

@main_bp.route('/infer', methods=['POST'])
def infer():
    """General inference endpoint for LLM queries - redirects to appropriate portfolio endpoints"""
    client_ip = request.remote_addr
    try:
        logger.info(f"Inference request received from {client_ip}")
        
        # Get the JSON data from the request
        data = request.json
        logger.debug(f"Request data: {data}")
        
        # Extract the prompt from the JSON
        prompt = data.get('prompt')
        
        if not prompt:
            logger.warning(f"No prompt provided in request from {client_ip}")
            return jsonify({"error": "No prompt provided"}), 400
        
        logger.info(f"Processing prompt from {client_ip}: {prompt[:50]}...")
        
        # Import portfolio LLM functionality
        from api.portfolio.llm import PortfolioLLM
        portfolio_llm = PortfolioLLM()
        
        # Check prompt content to determine which endpoint to use
        if "news items about these financial assets" in prompt:
            # This is a news request
            # Extract symbols from the prompt
            symbols_section = prompt.split("these financial assets:")[1].split(".")[0].strip()
            logger.info(f"Routing to portfolio news endpoint for symbols: {symbols_section}")
            result = portfolio_llm.get_portfolio_news(symbols_section)
        elif "Please analyze this portfolio data" in prompt:
            # This is a portfolio analysis request
            logger.info(f"Routing to portfolio analysis endpoint")
            # Extract portfolio data from the prompt
            portfolio_data = {}  # Default empty data
            try:
                # Try to extract the JSON data from the prompt
                json_match = re.search(r'{\s*"assets":.+?news":\s*\[.+?\]\s*}', prompt, re.DOTALL)
                if json_match:
                    portfolio_data = json.loads(json_match.group(0))
                    logger.info(f"Extracted portfolio data with {len(portfolio_data.get('assets', []))} assets")
            except Exception as e:
                logger.error(f"Error extracting portfolio data: {str(e)}")
            
            result = portfolio_llm.generate_portfolio_analysis(portfolio_data)
        elif "You are a financial portfolio assistant analyzing this portfolio" in prompt:
            # This is a chat request
            logger.info(f"Routing to portfolio chat endpoint")
            # Extract the user's message
            user_message = prompt.split("The user asks:")[1].split("\n")[0].strip()
            # Extract portfolio data
            portfolio_data = {}
            try:
                # Try to extract the JSON data from the prompt
                json_match = re.search(r'{\s*"assets":.+?marketSentiment":\s*[\d\.]+\s*}', prompt, re.DOTALL)
                if json_match:
                    portfolio_data = json.loads(json_match.group(0))
                    logger.info(f"Extracted portfolio data for chat with {len(portfolio_data.get('assets', []))} assets")
            except Exception as e:
                logger.error(f"Error extracting portfolio data for chat: {str(e)}")
            
            result = portfolio_llm.generate_chat_response(portfolio_data, user_message)
        else:
            # Generic LLM request
            logger.info(f"Using generic LLM endpoint")
            # Use the original Google model
            
            # Check if URL context is provided
            urls = data.get('urls', [])
            
            # Validate URLs if provided
            if urls:
                # Ensure URLs are properly formatted
                validated_urls = []
                for url in urls:
                    if url and isinstance(url, str) and (url.startswith('http://') or url.startswith('https://')):
                        validated_urls.append(url)
                    else:
                        logger.warning(f"Invalid URL provided: {url}")
                
                if validated_urls:
                    logger.info(f"Using {len(validated_urls)} validated URLs for context")
                    result = google_model.generate_with_url_context(prompt, validated_urls)
                else:
                    logger.warning("No valid URLs found in request, proceeding without URL context")
                    result = google_model.generate(prompt)
            else:
                result = google_model.generate(prompt)
        
        logger.info(f"Generated response for {client_ip}: {result['text'][:50]}...")
        logger.info(f"Response includes {len(result.get('sources', []))} sources")
        
        # Return the response as JSON with sources and search suggestions
        return jsonify({
            "message": result["text"],
            "sources": result.get("sources", []),
            "search_suggestions": result.get("rendered_content", "")
        })
    
    except Exception as e:
        logger.error(f"Error in inference endpoint for {client_ip}: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

# Add middleware to log all requests
@main_bp.before_request
def log_request_info():
    client_ip = request.remote_addr
    path = request.path
    method = request.method
    user_agent = request.headers.get('User-Agent', 'Unknown')
    
    # Filter out health checks or static file requests if needed
    if not (path.startswith('/static/') or path == '/health'):
        logger.info(f"Request: {method} {path} from {client_ip} using {user_agent}")
    
    # Log suspicious or potential attack paths
    suspicious_patterns = ['.php', 'wp-', 'admin', 'shell', '.git', 'cgi-bin', 'wp-content']
    if any(pattern in path for pattern in suspicious_patterns):
        logger.warning(f"Suspicious request pattern detected: {method} {path} from {client_ip}")

@main_bp.after_request
def log_response_info(response):
    logger.info(f"Response: {response.status} - {response.content_length} bytes")
    return response 