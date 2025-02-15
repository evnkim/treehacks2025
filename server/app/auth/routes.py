# server/app/auth/routes.py

from flask import Blueprint, jsonify, session, current_app
from app.auth.services import github_oauth
from app.extensions import oauth

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login/github')
def github_login():
    return github_oauth.authorize_redirect()

@auth_bp.route('/github/callback')
def github_callback():
    return github_oauth.handle_callback()

@auth_bp.route('/logout')
def logout():
    session.clear()
    return jsonify({'message': 'Logged out successfully'})