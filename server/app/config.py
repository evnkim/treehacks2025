# server/app/config.py

import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.environ.get('SECRET_KEY')
SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
GITHUB_CLIENT_ID = os.environ.get('GITHUB_CLIENT_ID', 'dev-client-id')
GITHUB_CLIENT_SECRET = os.environ.get('GITHUB_CLIENT_SECRET', 'dev-client-secret')

FRONTEND_URL = "http://localhost:5173"
BACKEND_URL = "http://127.0.0.1:5000"
