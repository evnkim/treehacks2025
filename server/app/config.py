import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SESSION_COOKIE_SECURE = True
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)
    GITHUB_CLIENT_ID = os.environ.get('GITHUB_CLIENT_ID', 'dev-client-id')
    GITHUB_CLIENT_SECRET = os.environ.get('GITHUB_CLIENT_SECRET', 'dev-client-secret')
    GITHUB_TOKEN = os.environ.get('GITHUB_TOKEN', 'dev-token')
