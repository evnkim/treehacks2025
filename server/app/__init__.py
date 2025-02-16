from flask import Flask
from app.extensions import db, oauth
# from app.config import Config
from flask_cors import CORS

def create_app(config_filename="config.py"):
    app = Flask(__name__)
    app.config.from_pyfile(config_filename)
    
    # Ensure secret key is set
    if not app.secret_key:
        app.secret_key = app.config['SECRET_KEY']

    # Initialize extensions
    db.init_app(app)
    oauth.init_app(app)
    
    # Configure CORS with credentials support
    CORS(app, 
         origins=["http://localhost:5173"],
         supports_credentials=True,)

    # Register blueprints
    from app.auth.routes import auth
    from app.api.routes import api_bp
    from app.auth.services import github_oauth
    
    github_oauth.init_app(app)
    app.register_blueprint(auth, url_prefix='/auth')
    app.register_blueprint(api_bp, url_prefix='/api')
    
    return app