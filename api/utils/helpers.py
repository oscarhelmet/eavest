import json
import pandas as pd
import numpy as np
import logging
import os
import time
from flask import current_app, has_app_context
from werkzeug.utils import secure_filename
import io
from PIL import Image
import base64

# Configure logging
logger = logging.getLogger(__name__)

class CustomJSONEncoder(json.JSONEncoder):
    """Custom JSON encoder for pandas and numpy types"""
    def default(self, obj):
        if isinstance(obj, (np.integer, np.floating, np.bool_)):
            return obj.item()
        elif isinstance(obj, pd.Timestamp):
            return obj.isoformat()
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, pd.Index):
            return obj.tolist()  # Convert Index to list
        elif pd.isna(obj):
            return None
        return super().default(obj)

def save_temp_image(image_file=None, image_data_b64=None, prefix='chart'):
    """
    Save an image to a temporary file
    
    Args:
        image_file: File object from request.files
        image_data_b64: Base64 encoded image data (alternative to file)
        prefix: Prefix for the filename
        
    Returns:
        Path to the saved file
    """
    try:
        if has_app_context():
            temp_dir = current_app.config['UPLOAD_FOLDER']
        else:
            temp_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'static', 'temp')
            
        os.makedirs(temp_dir, exist_ok=True)
        
        if image_file and image_file.filename:
            # Save uploaded file
            filename = secure_filename(image_file.filename)
            temp_path = os.path.join(temp_dir, f"{prefix}_{int(time.time())}_{filename}")
            image_file.save(temp_path)
            return temp_path
            
        elif image_data_b64:
            # Handle base64 encoded image
            if image_data_b64.startswith('data:image'):
                # Extract the base64 part
                image_data_b64 = image_data_b64.split(',')[1]
            
            # Decode base64 to image
            image_bytes = base64.b64decode(image_data_b64)
            image = Image.open(io.BytesIO(image_bytes))
            
            # Save to temp file
            temp_path = os.path.join(temp_dir, f"{prefix}_{int(time.time())}.png")
            image.save(temp_path)
            return temp_path
            
        return None
    except Exception as e:
        logger.error(f"Error saving temporary image: {str(e)}")
        return None

def extract_structured_data_from_html(analysis_html):
    """
    Extract structured data from the technical analysis HTML
    
    Args:
        analysis_html: HTML string from LLM
        
    Returns:
        Dictionary with structured data
    """
    import re
    structured_analysis = {}
    
    # Extract sentiment (verdict)
    verdict_match = re.search(r'data-verdict="([^"]+)"', analysis_html)
    verdict_strength_match = re.search(r'data-verdict-strength="([^"]+)"', analysis_html)
    if verdict_match:
        structured_analysis['sentiment'] = {
            'verdict': verdict_match.group(1),
            'strength': float(verdict_strength_match.group(1)) if verdict_strength_match else 50
        }
    
    # Extract volatility
    volatility_match = re.search(r'data-volatility="([^"]+)"', analysis_html)
    volatility_strength_match = re.search(r'data-volatility-strength="([^"]+)"', analysis_html)
    if volatility_match:
        structured_analysis['volatility'] = {
            'level': volatility_match.group(1),
            'strength': float(volatility_strength_match.group(1)) if volatility_strength_match else 50
        }
    
    # Extract insights
    insights = re.findall(r'data-insight>([^<]+)<', analysis_html)
    if insights:
        structured_analysis['insights'] = insights
    
    # Extract trading opportunity
    trading_opp_match = re.search(r'data-trading-opportunity>(.*?)<\/div>', analysis_html, re.DOTALL)
    if trading_opp_match:
        structured_analysis['trading_opportunity'] = trading_opp_match.group(1)
    
    return structured_analysis 