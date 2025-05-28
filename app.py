from flask import Flask
from flask_cors import CORS
import logging
import os
import datetime
from config import get_config, LOG_FILENAME
from api.utils.helpers import CustomJSONEncoder

def create_app(config_name=None):
    """Create and configure the Flask application"""
    app = Flask(__name__)
    
    # Load configuration
    config = get_config()
    app.config.from_object(config)
    
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(levelname)s] %(message)s',
        handlers=[
            logging.FileHandler(LOG_FILENAME),
            logging.StreamHandler()
        ]
    )
    logger = logging.getLogger(__name__)
    
    # Enable CORS
    CORS(app)
    
    # Set custom JSON encoder
    app.json_encoder = CustomJSONEncoder
    
    # Import blueprints inside function to avoid circular imports
    from api.routes import main_bp
    from api.portfolio.routes import portfolio_bp, yahoo_bp
    from api.tech_analyze.routes import tech_analyze_bp
    
    # Register blueprints
    app.register_blueprint(main_bp)
    app.register_blueprint(portfolio_bp)
    app.register_blueprint(yahoo_bp)
    app.register_blueprint(tech_analyze_bp)
    
    # Ensure the temp folder exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # Add template context processor
    @app.context_processor
    def inject_now():
        return {'now': datetime.datetime.now()}
    
    # Initialize the app with config
    config.init_app(app)
    
    logger.info("Application initialized with all blueprints registered")
    
    return app

# Create the app instance
app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3619, debug=app.config['DEBUG'])