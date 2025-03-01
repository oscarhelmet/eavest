from flask import Flask, request, jsonify, render_template
from llm.google import Google
import json
import requests
import yfinance as yf
import pandas as pd
import numpy as np
import logging
import os
import datetime
import traceback

# Set Google Cloud environment variables
os.environ["GOOGLE_CLOUD_PROJECT"] = "starmony"
os.environ["GOOGLE_CLOUD_LOCATION"] = "us-central1"
os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "True"

# Rest of your imports and app setup

# Configure logging
log_directory = 'logs'
if not os.path.exists(log_directory):
    os.makedirs(log_directory)

log_filename = os.path.join(log_directory, f'app_{datetime.datetime.now().strftime("%Y%m%d")}.log')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(log_filename),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Define the custom JSON encoder
class CustomJSONEncoder(json.JSONEncoder):
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

app = Flask(__name__)
# Set the custom encoder for Flask's jsonify
app.json_encoder = CustomJSONEncoder

google_model = Google()

logger.info("Application started")

@app.route('/')
def index():
    client_ip = request.remote_addr
    user_agent = request.headers.get('User-Agent', 'Unknown')
    logger.info(f"Main page accessed by {client_ip} using {user_agent}")
    return render_template('index.html')

@app.route('/infer', methods=['POST'])
def infer():
    client_ip = request.remote_addr
    try:
        logger.info(f"Inference request received from {client_ip}")
        
        # Get the JSON data from the request
        data = request.json
        logger.debug(f"Request data: {json.dumps(data)}")
        
        # Extract the prompt from the JSON
        prompt = data.get('prompt')
        
        if not prompt:
            logger.warning(f"No prompt provided in request from {client_ip}")
            return jsonify({"error": "No prompt provided"}), 400
        
        logger.info(f"Processing prompt from {client_ip}: {prompt[:50]}...")
        
        # Use the Google class to generate a response
        message = google_model.generate(prompt)
        
        logger.info(f"Generated response for {client_ip}: {message[:50]}...")
        
        # Return the response as JSON
        return jsonify({"message": message})
    
    except Exception as e:
        logger.error(f"Error in inference endpoint for {client_ip}: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@app.route('/api/yahoo-finance/chart', methods=['GET'])
def yahoo_finance_chart():
    client_ip = request.remote_addr
    try:
        # Get query parameters
        symbol = request.args.get('symbol')
        period = request.args.get('period', '10y')
        interval = request.args.get('interval', '1mo')
        
        logger.info(f"Chart data requested from {client_ip} for symbol={symbol}, period={period}, interval={interval}")
        
        if not symbol:
            logger.warning(f"No symbol provided in chart request from {client_ip}")
            return jsonify({"error": "Symbol parameter is required"}), 400
        
        # Use yfinance to get historical data
        logger.info(f"Fetching historical data for {symbol} from Yahoo Finance")
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=period, interval=interval)
        
        logger.info(f"Received {len(hist)} data points for {symbol}")
        
        # Convert DataFrame to dictionary with lists
        # Ensure all pandas/numpy types are converted to Python native types
        timestamps = hist.index.astype(np.int64) // 10**9
        timestamps_list = timestamps.tolist()  # Convert to Python list
        
        data_dict = {
            "chart": {
                "result": [{
                    "meta": {
                        "symbol": symbol,
                        "period": period,
                        "interval": interval
                    },
                    "timestamp": timestamps_list,
                    "indicators": {
                        "quote": [{
                            "open": hist['Open'].tolist(),
                            "high": hist['High'].tolist(),
                            "low": hist['Low'].tolist(),
                            "close": hist['Close'].tolist(),
                            "volume": hist['Volume'].tolist() if 'Volume' in hist.columns else []
                        }]
                    }
                }]
            }
        }
        
        logger.info(f"Successfully prepared chart data for {symbol}")
        return jsonify(data_dict)
        
    except Exception as e:
        logger.error(f"Error in chart endpoint for {client_ip} - symbol={symbol if 'symbol' in locals() else 'unknown'}: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@app.route('/api/yahoo-finance/quote', methods=['GET'])
def yahoo_finance_quote():
    client_ip = request.remote_addr
    try:
        # Get symbol parameter
        symbol = request.args.get('symbol')
        
        logger.info(f"Quote data requested from {client_ip} for symbol={symbol}")
        
        if not symbol:
            logger.warning(f"No symbol provided in quote request from {client_ip}")
            return jsonify({"error": "Symbol parameter is required"}), 400
        
        # Use yfinance to get quote data
        logger.info(f"Fetching quote data for {symbol} from Yahoo Finance")
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        logger.info(f"Received quote data for {symbol} with {len(info) if info else 0} fields")
        
        # Structure response similar to Yahoo Finance quote API
        logger.debug(f"Converting {symbol} quote data to JSON-serializable format")
        result = {
            "quoteResponse": {
                "result": [{
                    "symbol": symbol,
                    "shortName": info.get("shortName"),
                    "longName": info.get("longName"),
                    "regularMarketPrice": info.get("regularMarketPrice"),
                    "regularMarketChange": info.get("regularMarketChange"),
                    "regularMarketChangePercent": info.get("regularMarketChangePercent"),
                    "regularMarketOpen": info.get("regularMarketOpen"),
                    "regularMarketDayHigh": info.get("regularMarketDayHigh"),
                    "regularMarketDayLow": info.get("regularMarketDayLow"),
                    "regularMarketVolume": info.get("regularMarketVolume"),
                    "marketCap": info.get("marketCap"),
                    "fiftyTwoWeekHigh": info.get("fiftyTwoWeekHigh"),
                    "fiftyTwoWeekLow": info.get("fiftyTwoWeekLow"),
                    "averageVolume": info.get("averageVolume"),
                    "trailingPE": info.get("trailingPE"),
                    "dividendYield": info.get("dividendYield"),
                }]
            }
        }
        
        logger.info(f"Successfully prepared quote data for {symbol}")
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in quote endpoint for {client_ip} - symbol={symbol if 'symbol' in locals() else 'unknown'}: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

# Add middleware to log all requests
@app.before_request
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

@app.after_request
def log_response_info(response):
    logger.info(f"Response: {response.status} - {response.content_length} bytes")
    return response

if __name__ == '__main__':
    logger.info("Starting Flask development server on port 3619")
    app.run(host='0.0.0.0', port=3619, debug=True)