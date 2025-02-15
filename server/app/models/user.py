# server/app/models/user.py

from app.extensions import db
from datetime import datetime

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    github_id = db.Column(db.String(120), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True)
    username = db.Column(db.String(80))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    @classmethod
    def get_or_create(cls, github_id, email, username):
        user = cls.query.filter_by(github_id=github_id).first()
        if not user:
            user = cls(github_id=github_id, email=email, username=username)
            db.session.add(user)
            db.session.commit()
        return user