import os
import logging
import datetime
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Base directory
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# Configure logging
LOG_DIRECTORY = os.path.join(BASE_DIR, 'logs')
if not os.path.exists(LOG_DIRECTORY):
    os.makedirs(LOG_DIRECTORY)

LOG_FILENAME = os.path.join(LOG_DIRECTORY, f'app_{datetime.datetime.now().strftime("%Y%m%d")}.log')

# App configuration
class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'hard-to-guess-string'
    DEBUG = os.environ.get('FLASK_DEBUG', 'False').lower() in ('true', '1', 't')
    
    # Google API configuration
    GOOGLE_API_KEY = os.environ.get('GOOGLE_API_KEY')
    
    # File upload configuration
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'static', 'temp')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max upload size
    
    # Yahoo Finance settings
    YF_REQUEST_INTERVAL = 0.2  # 200ms between requests
    YF_CACHE_TTL = 300  # 5 minutes cache TTL
    
    # LLM settings
    DEFAULT_LLM_MODEL = os.environ.get('DEFAULT_LLM_MODEL', 'gemini-2.0-flash-001')
    LLM_TEMPERATURE = float(os.environ.get('LLM_TEMPERATURE', 0.6))
    LLM_TOP_K = int(os.environ.get('LLM_TOP_K', 20))
    
    @staticmethod
    def init_app(app):
        """Initialize app with this configuration"""
        pass

# Development configuration
class DevelopmentConfig(Config):
    DEBUG = True
    
# Production configuration
class ProductionConfig(Config):
    DEBUG = False
    
    @staticmethod
    def init_app(app):
        # Set up production-specific logging
        Config.init_app(app)
        
        # Configure production logging to file
        file_handler = logging.FileHandler(LOG_FILENAME)
        file_handler.setLevel(logging.INFO)
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s [%(levelname)s] %(message)s'
        ))
        app.logger.addHandler(file_handler)

# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}

# Get configuration based on environment
def get_config():
    env = os.environ.get('FLASK_ENV', 'default')
    return config.get(env, config['default']) 