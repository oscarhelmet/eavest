from flask import Blueprint, request, jsonify, current_app
from api.utils.yahoo import YahooFinanceManager
import logging
import traceback

# Configure logging
logger = logging.getLogger(__name__)

# Create the blueprint for Yahoo Finance
yahoo_bp = Blueprint('yahoo_finance', __name__, url_prefix='/api/yahoo-finance')

# Create a separate blueprint for Portfolio endpoints
portfolio_bp = Blueprint('portfolio', __name__, url_prefix='/api/portfolio')

# Create a Yahoo Finance Manager instance
yf_manager = YahooFinanceManager()
logger.info("Yahoo Finance manager initialized")

@yahoo_bp.route('/chart', methods=['GET'])
def yahoo_finance_chart():
    """Get historical chart data for a symbol"""
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
        
        # Use the YahooFinanceManager to get historical data with caching
        logger.info(f"Fetching historical data for {symbol} using YahooFinanceManager")
        
        # Get history data with caching
        hist = yf_manager.get_history(symbol, period, interval)
        
        logger.info(f"Received {len(hist)} data points for {symbol}")
        
        # Convert DataFrame to dictionary with lists
        # Ensure all pandas/numpy types are converted to Python native types
        import numpy as np
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

@yahoo_bp.route('/quote', methods=['GET'])
def yahoo_finance_quote():
    """Get quote data for a symbol"""
    client_ip = request.remote_addr
    try:
        # Get symbol parameter
        symbol = request.args.get('symbol')
        
        logger.info(f"Quote data requested from {client_ip} for symbol={symbol}")
        
        if not symbol:
            logger.warning(f"No symbol provided in quote request from {client_ip}")
            return jsonify({"error": "Symbol parameter is required"}), 400
        
        # Use the YahooFinanceManager to get quote data with caching
        logger.info(f"Fetching quote data for {symbol} using YahooFinanceManager")
        
        # Get info data with caching
        info = yf_manager.get_info(symbol)
        
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

# Import and initialize the PortfolioLLM class
from api.portfolio.llm import PortfolioLLM
portfolio_llm = PortfolioLLM()

# Portfolio LLM routes
@portfolio_bp.route('/news', methods=['POST'])
def portfolio_news():
    """Get news for portfolio assets using LLM"""
    client_ip = request.remote_addr
    try:
        # Get JSON data from request
        data = request.json
        symbols = data.get('symbols')
        
        logger.info(f"Portfolio news request from {client_ip} for symbols: {symbols}")
        
        if not symbols:
            logger.warning(f"Missing symbols in portfolio news request from {client_ip}")
            return jsonify({"error": "Symbols are required"}), 400
        
        # Process using PortfolioLLM (prompt is now constructed in the backend)
        result = portfolio_llm.get_portfolio_news(symbols)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in portfolio news endpoint for {client_ip}: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@portfolio_bp.route('/analysis', methods=['POST'])
def portfolio_analysis():
    """Generate portfolio analysis report using LLM"""
    client_ip = request.remote_addr
    try:
        # Get JSON data from request
        data = request.json
        portfolio_data = data.get('portfolio')
        
        logger.info(f"Portfolio analysis request from {client_ip}")
        
        if not portfolio_data:
            logger.warning(f"Missing portfolio data in analysis request from {client_ip}")
            return jsonify({"error": "Portfolio data is required"}), 400
        
        # Process using PortfolioLLM (prompt is now constructed in the backend)
        result = portfolio_llm.generate_portfolio_analysis(portfolio_data)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in portfolio analysis endpoint for {client_ip}: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@portfolio_bp.route('/chat', methods=['POST'])
def portfolio_chat():
    """Generate chat response about portfolio using LLM"""
    client_ip = request.remote_addr
    try:
        # Get JSON data from request
        data = request.json
        portfolio_data = data.get('portfolio')
        user_message = data.get('message')
        
        logger.info(f"Portfolio chat request from {client_ip}: {user_message[:50]}...")
        
        if not portfolio_data or not user_message:
            logger.warning(f"Missing data in portfolio chat request from {client_ip}")
            return jsonify({"error": "Portfolio data and message are required"}), 400
        
        # Process using PortfolioLLM (prompt is now constructed in the backend)
        result = portfolio_llm.generate_chat_response(portfolio_data, user_message)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in portfolio chat endpoint for {client_ip}: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500 