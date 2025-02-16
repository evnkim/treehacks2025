from flask import current_app, url_for, jsonify, session, redirect, request
from app.extensions import oauth, db
from app.models.User import User

class GitHubOAuth:
    def __init__(self):
        self.github = None

    def init_app(self, app):
        self.github = oauth.register(
            name='github',
            client_id=app.config['GITHUB_CLIENT_ID'],
            client_secret=app.config['GITHUB_CLIENT_SECRET'],
            access_token_url='https://github.com/login/oauth/access_token',
            authorize_url='https://github.com/login/oauth/authorize',
            api_base_url='https://api.github.com/',
            client_kwargs={'scope': 'user:email'},
        )

    def authorize_redirect(self):
        oauth.create_client('github')
        print(f"[GitHub OAuth] Authorization Request - Session Data: {dict(session)}")
        
        return self.github.authorize_redirect(
            redirect_uri=url_for('auth.github_callback', _external=True)
        )

    def handle_callback(self):
        oauth.create_client('github')

        print(f"[GitHub OAuth] Callback Request - Session Data: {dict(session)}")

        token = self.github.authorize_access_token()
        resp = self.github.get('user', token=token)
        github_user_data = resp.json()
        
        user = User.get_or_create(
            github_id=str(github_user_data['id']),
            email=github_user_data.get('email'),
            username=github_user_data['login']
        )
        
        session['user_id'] = user.id
        
        return jsonify({
            'token': token['access_token'],
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email
            }
        })

# Module level instantiation. Initialize later in app factory by calling github_oauth.init_app(app)
github_oauth = GitHubOAuth()