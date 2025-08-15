from flask import Blueprint, request, jsonify, render_template, url_for, current_app
from api.utils.llm.google import Google
from api.utils.helpers import save_temp_image, extract_structured_data_from_html
import logging
import traceback
import os
import time
import json
import re
from google.genai.types import Part

# Configure logging
logger = logging.getLogger(__name__)

# Create the blueprint
tech_analyze_bp = Blueprint('tech_analyze', __name__, url_prefix='/api/technical-analysis')

# Initialize the Google LLM model
google_model = Google()
logger.info("Google model initialized for technical analysis")

# Technical analysis API endpoint
@tech_analyze_bp.route('', methods=['POST'])
def technical_analysis_api():
    """JSON API endpoint for technical analysis with images"""
    client_ip = request.remote_addr
    try:
        logger.info(f"Technical analysis API request received from {client_ip}")
        
        # Get form data
        mode = request.form.get('mode', 'simple')
        draw_lines = request.form.get('draw_lines', 'false') == 'true'
        include_entry_exit = request.form.get('include_entry_exit', 'true') == 'true'
        
        logger.info(f"Analysis mode: {mode}, draw_lines: {draw_lines}, include_entry_exit: {include_entry_exit}")
        
        # Process images and create content for Google API
        image_parts = []
        image_descriptions = []
        
        # Handle images based on mode
        if mode == 'simple':
            if 'chart' in request.files:
                file = request.files['chart']
                if file.filename:
                    img_data = file.read()
                    # Create a Part object for the image
                    image_part = Part.from_bytes(data=img_data, mime_type=file.content_type or 'image/jpeg')
                    image_parts.append(image_part)
                    image_descriptions.append("Price chart showing recent price action and market structure.")
        else:
            # Handle multiple timeframe charts
            timeframes = [
                ('weekly_chart', 'Weekly'),
                ('daily_chart', 'Daily'),
                ('four_hour_chart', '4-Hour'),
                ('one_hour_chart', '1-Hour')
            ]
            
            for file_key, label in timeframes:
                if file_key in request.files:
                    file = request.files[file_key]
                    if file.filename:
                        img_data = file.read()
                        # Create a Part object for the image
                        image_part = Part.from_bytes(data=img_data, mime_type=file.content_type or 'image/jpeg')
                        image_parts.append(image_part)
                        image_descriptions.append(f"{label} timeframe chart showing price action and market structure.")
        
        if not image_parts:
            return jsonify({
                'success': False,
                'error': 'No images provided'
            }), 400
        
        # Prepare comprehensive prompt based on mode
        if mode == 'simple':
            prompt_text = """You are a professional technical analyst. Analyze this price chart and provide a comprehensive technical analysis.

Focus on:
1. Price action patterns and market structure
2. Key support and resistance levels  
3. Trend direction and strength
4. Volume analysis if visible
5. Potential entry and exit points
6. Risk management considerations

Provide your analysis as a JSON object with the following structure:
{
  "verdict": "bullish" | "bearish" | "neutral",
  "verdict_strength": <number 0-100>,
  "volatility": "high" | "medium" | "low", 
  "volatility_strength": <number 0-100>,
  "insights": [
    "Key insight 1",
    "Key insight 2", 
    "Key insight 3",
    "Key insight 4"
  ],
  "trading_opportunity": "<HTML formatted text describing potential trades, entry/exit points, and risk management>"
}

Be specific about price levels, patterns, and actionable insights. Focus on pure price action analysis without indicators."""
        else:
            prompt_text = """You are a professional technical analyst. Analyze these multiple timeframe charts and provide a comprehensive multi-timeframe technical analysis.

Focus on:
1. Overall trend direction across timeframes
2. Key support and resistance levels on each timeframe
3. Market structure and price action patterns
4. Confluence between timeframes for potential entries/exits
5. Volume analysis if visible
6. Risk management across timeframes
7. Higher timeframe bias vs lower timeframe execution

Provide your analysis as a JSON object with the following structure:
{
  "verdict": "bullish" | "bearish" | "neutral",
  "verdict_strength": <number 0-100>,
  "volatility": "high" | "medium" | "low",
  "volatility_strength": <number 0-100>, 
  "insights": [
    "Multi-timeframe insight 1",
    "Multi-timeframe insight 2",
    "Multi-timeframe insight 3", 
    "Multi-timeframe insight 4"
  ],
  "trading_opportunity": "<HTML formatted text describing potential trades with timeframe analysis, entry/exit points, and risk management, each point should <br> seperated>"
}

Be specific about confluence zones, timeframe alignment, and actionable multi-timeframe insights. Focus on pure price action analysis without indicators."""
        
        # Create content list for Google API
        content_parts = [prompt_text] + image_parts
        
        # Call Google LLM with image analysis
        logger.info(f"Calling Google LLM for technical analysis with {len(image_parts)} images")
        global google_model
        result = google_model.client.models.generate_content(
            model=google_model.model_name,
            contents=content_parts,
            config={
                "temperature": 0.3, 
                "top_k": 20, 
                "top_p": 0.95,
                "seed": 0,
                "max_output_tokens": 65535,
                "safety_settings": [
                    {
                        "category": "HARM_CATEGORY_HATE_SPEECH",
                        "threshold": "OFF"
                    },
                    {
                        "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                        "threshold": "OFF"
                    },
                    {
                        "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        "threshold": "OFF"
                    },
                    {
                        "category": "HARM_CATEGORY_HARASSMENT",
                        "threshold": "OFF"
                    }
                ],
                "thinking_config": {
                    "thinking_budget": -1,
                }
            }
        )
        
        # Parse the response to extract structured data
        try:
            response_text = result.text
            logger.info(response_text)
            logger.info(f"LLM response received: {len(response_text)} characters")
            
            # Try to extract JSON from the response
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                structured_data = json.loads(json_str)
                logger.info("Successfully parsed JSON from LLM response")
            else:
                # Fallback if no JSON found
                logger.warning("No JSON found in LLM response, using fallback")
                structured_data = {
                    "verdict": "neutral",
                    "verdict_strength": 50,
                    "volatility": "medium",
                    "volatility_strength": 50,
                    "insights": [
                        "Chart analysis completed but could not parse structured data",
                        "Please try uploading a clearer chart image",
                        "Ensure the chart shows clear price action and timeframes",
                        "Manual review may be needed for this analysis"
                    ],
                    "trading_opportunity": f"<p>Analysis response: {response_text[:200]}...</p>"
                }
        except Exception as e:
            logger.error(f"Error parsing LLM response: {str(e)}")
            structured_data = {
                "verdict": "neutral",
                "verdict_strength": 50,
                "volatility": "medium", 
                "volatility_strength": 50,
                "insights": [
                    "Error processing analysis",
                    "Please try again with a clearer chart",
                    "Ensure the image shows price data clearly",
                    "Contact support if the issue persists"
                ],
                "trading_opportunity": "<p>Unable to determine trading opportunities. Please try again with a higher quality chart image.</p>"
            }
        
        # Log successful analysis
        logger.info(f"Technical analysis completed successfully for {client_ip}: {structured_data.get('verdict', 'unknown')} sentiment")
        
        # Return structured JSON response
        return jsonify({
            'success': True,
            'mode': mode,
            'analysis': {
                'sentiment': {
                    'verdict': structured_data.get('verdict', 'neutral'),
                    'strength': structured_data.get('verdict_strength', 50)
                },
                'volatility': {
                    'level': structured_data.get('volatility', 'medium'),
                    'strength': structured_data.get('volatility_strength', 50)
                },
                'insights': structured_data.get('insights', []),
                'trading_opportunity': structured_data.get('trading_opportunity', '')
            }
        })
    
    except Exception as e:
        logger.error(f"Error in technical analysis API for {client_ip}: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Support/resistance line drawing API endpoint
@tech_analyze_bp.route('/draw', methods=['POST'])
def technical_analysis_draw_api():
    """API endpoint for drawing support and resistance lines on charts"""
    client_ip = request.remote_addr
    try:
        logger.info(f"Technical analysis draw request received from {client_ip}")
        
        # Get the chart image
        if 'chart' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No chart image provided'
            }), 400
        
        file = request.files['chart']
        if not file.filename:
            return jsonify({
                'success': False,
                'error': 'No chart image provided'
            }), 400
        
        img_data = file.read()
        
        # Get existing analysis context
        existing_analysis = request.form.get('existing_analysis', '')
        
        # Create image part for Google API
        image_part = Part.from_bytes(data=img_data, mime_type=file.content_type or 'image/jpeg')
        
        # Prepare prompt for line drawing analysis
        prompt_text = f"""System instruction: You are an expert technical chart analyst. Your task is to analyze the provided trading chart image and identify key technical elements. Return these elements as a JSON array. Each object in the array should represent a single annotation (like a support line, resistance line, trend line, chart pattern, entry/exit point, or signal).

Ensure the JSON array is the only output. Do not include any explanatory text before or after the JSON array. Do not use markdown code fencing (```json ... ```) around the JSON.

Context from previous general analysis (use this to inform your drawing, but focus on coordinate-based annotations):
{existing_analysis}

Analyze this trading chart and identify the following elements:
1.  Support levels: Horizontal lines where price has found support.
2.  Resistance levels: Horizontal lines where price has faced resistance.
3.  Trend lines: Diagonal lines indicating the primary direction of price movement.
4.  Chart patterns: Recognizable formations like triangles, head and shoulders, flags, etc.
5.  Potential entry points: Specific points or small regions suggesting favorable trade entries.
6.  Potential exit points: Specific points or small regions for taking profits or cutting losses.
7.  Key signals: Important indicators or candlestick patterns that traders should note (e.g., a pin bar at support).

For each identified element, provide a JSON object with the following fields:
-   "type": (string) The type of element. Examples: "support", "resistance", "trendline", "pattern", "entry", "exit", "signal".
-   "label": (string) A concise description of the element (e.g., "Major Support", "Ascending Triangle", "Entry Signal").
-   "coordinates": (array) The coordinates for the element, expressed as percentages of the image dimensions (0-100).
    -   For horizontal or diagonal lines (support, resistance, trendline): `[x1, y1, x2, y2]`
    -   For points (entry, exit, signal): `[x, y]`
    -   For patterns (e.g., bounding box of a pattern): `[x, y, width, height]`
-   "confidence": (number, 0.0 to 1.0) Your confidence in the accuracy of this identified element.
-   "color": (string, optional) A suggested hex color code for displaying this element (e.g., "#FF0000" for resistance). If not specified, a default will be used.

Example of a single element in the JSON array:
{{
  "type": "support",
  "label": "Support at 100.50",
  "coordinates": [0, 50, 100, 50],
  "confidence": 0.85,
  "color": "#00FF00"
}}

Provide the response as a single, valid JSON array of such objects. No other text or formatting.
"""
        
        content_parts = [prompt_text, image_part]
        
        # Call Google LLM for line analysis
        global google_model
        logger.info("Calling Google LLM for support/resistance line analysis")
        result = google_model.client.models.generate_content(
            model=google_model.model_name,
            contents=content_parts,
            config={
                "temperature": 0.2, 
                "top_k": 10, 
                "top_p": 0.95,
                "seed": 0,
                "max_output_tokens": 65535,
                "safety_settings": [
                    {
                        "category": "HARM_CATEGORY_HATE_SPEECH",
                        "threshold": "OFF"
                    },
                    {
                        "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                        "threshold": "OFF"
                    },
                    {
                        "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        "threshold": "OFF"
                    },
                    {
                        "category": "HARM_CATEGORY_HARASSMENT",
                        "threshold": "OFF"
                    }
                ],
                "thinking_config": {
                    "thinking_budget": -1,
                }
            }
        )
        
        # Parse the response
        try:
            response_text = result.text
            logger.info(f"Line analysis response received: {len(response_text)} characters")
            
            # Try to extract JSON from the response
            json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                annotations_data = json.loads(json_str)
                logger.info("Successfully parsed line analysis JSON")
            else:
                # Fallback
                logger.warning("No JSON found in line analysis response")
                annotations_data = []
        except Exception as e:
            logger.error(f"Error parsing line analysis response: {str(e)}")
            annotations_data = []
        
        logger.info(f"Line drawing analysis completed for {client_ip}")
        
        return jsonify({
            'success': True,
            'annotations': annotations_data
        })
    
    except Exception as e:
        logger.error(f"Error in technical analysis draw API for {client_ip}: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500 