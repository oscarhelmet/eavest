import yfinance as yf
import pandas as pd
import numpy as np
import logging
import time
import threading
from flask import current_app, has_app_context

# Configure logging
logger = logging.getLogger(__name__)

class YahooFinanceManager:
    """
    Manager for Yahoo Finance API calls with rate limiting, caching, and error handling
    """
    def __init__(self):
        self.session_lock = threading.Lock()
        self.last_request_time = 0
        
        # Get settings from app config if available
        if has_app_context():
            self.min_request_interval = current_app.config.get('YF_REQUEST_INTERVAL', 0.2)
            self.cache_ttl = current_app.config.get('YF_CACHE_TTL', 300)
        else:
            self.min_request_interval = 0.2
            self.cache_ttl = 300
            
        self._session = None
        self.max_retries = 3
        
        # Default headers to mimic a browser
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
        
        # Cache for history data
        self.history_cache = {}
        self.info_cache = {}
        logger.info("Yahoo Finance session manager initialized with caching")
    
    @property
    def session(self):
        with self.session_lock:
            if self._session is None:
                self._session = yf.Tickers("")
                # Apply headers to the underlying requests session
                for key, value in self.headers.items():
                    self._session.session.headers[key] = value
                logger.info("Created new Yahoo Finance session with custom headers")
            return self._session
    
    def get_ticker(self, symbol):
        with self.session_lock:
            # Rate limiting
            current_time = time.time()
            time_since_last_request = current_time - self.last_request_time
            if time_since_last_request < self.min_request_interval:
                sleep_time = self.min_request_interval - time_since_last_request
                logger.debug(f"Rate limiting: sleeping for {sleep_time:.2f}s")
                time.sleep(sleep_time)
            
            # Get or create ticker with retries
            for attempt in range(self.max_retries):
                try:
                    if attempt > 0:
                        logger.info(f"Retry attempt {attempt} for {symbol}")
                        time.sleep(1)  # Add delay between retries
                    
                    self._session = yf.Tickers(symbol)
                    # Apply headers to the underlying requests session
                    for key, value in self.headers.items():
                        self._session.session.headers[key] = value
                    
                    ticker = self._session.tickers[symbol]
                    self.last_request_time = time.time()
                    return ticker
                except Exception as e:
                    logger.error(f"Error getting ticker for {symbol} (attempt {attempt+1}/{self.max_retries}): {str(e)}")
                    if attempt == self.max_retries - 1:
                        # Last attempt, try direct creation
                        try:
                            logger.info("Falling back to direct Ticker creation")
                            ticker = yf.Ticker(symbol)
                            # Apply headers to the underlying requests session
                            for key, value in self.headers.items():
                                ticker.session.headers[key] = value
                            return ticker
                        except Exception as e2:
                            logger.error(f"Final error creating ticker for {symbol}: {str(e2)}")
                            raise

    def get_history(self, symbol, period='10y', interval='1mo'):
        """Get historical data with caching"""
        cache_key = f"{symbol}_{period}_{interval}"
        current_time = time.time()
        
        # Check if we have cached data and it's still valid
        if cache_key in self.history_cache:
            cache_entry = self.history_cache[cache_key]
            if current_time - cache_entry['timestamp'] < self.cache_ttl:
                logger.info(f"Using cached history data for {symbol}")
                return cache_entry['data']
        
        # No valid cache, fetch from Yahoo Finance
        ticker = self.get_ticker(symbol)
        hist = ticker.history(period=period, interval=interval)
        
        # Cache the result
        self.history_cache[cache_key] = {
            'timestamp': current_time,
            'data': hist
        }
        
        return hist
    
    def get_info(self, symbol):
        """Get ticker info with caching"""
        current_time = time.time()
        
        # Check if we have cached data and it's still valid
        if symbol in self.info_cache:
            cache_entry = self.info_cache[symbol]
            if current_time - cache_entry['timestamp'] < self.cache_ttl:
                logger.info(f"Using cached info data for {symbol}")
                return cache_entry['data']
        
        # No valid cache, fetch from Yahoo Finance
        ticker = self.get_ticker(symbol)
        info = ticker.info
        
        # Cache the result
        self.info_cache[symbol] = {
            'timestamp': current_time,
            'data': info
        }
        
        return info 