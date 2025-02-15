from flask import current_app, url_for, jsonify
from app.extensions import oauth, db
from app.models.user import User

class GitHubOAuth:
    def __init__(self):
        self.github = oauth.register(
            name='github',
            client_id=current_app.config['GITHUB_CLIENT_ID'],
            client_secret=current_app.config['GITHUB_CLIENT_SECRET'],
            access_token_url='https://github.com/login/oauth/access_token',
            authorize_url='https://github.com/login/oauth/authorize',
            api_base_url='https://api.github.com/',
            client_kwargs={'scope': 'user:email'},
        )

    def authorize_redirect(self):
        return self.github.authorize_redirect(
            redirect_uri=url_for('auth.github_callback', _external=True)
        )

    def handle_callback(self):
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

github_oauth = GitHubOAuth()