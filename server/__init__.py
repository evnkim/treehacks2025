"""The server module contains the command center backend.

Provides the create_app() function, which initialize a Flask application.
"""

from typing import cast

from apiflask import APIFlask
from flask import redirect, render_template
from flask_cors import CORS

from server.db import db, init_db

STATIC_FOLDER = "../client/dist"

cors: CORS = CORS()


def create_app(config_filename="config.py"):
    """Factory for initializing Flask application."""
    app = APIFlask(
        __name__,
        docs_path="/api/docs",
        static_folder=STATIC_FOLDER,
        template_folder=STATIC_FOLDER,
        static_url_path="",
    )

    app.config.from_pyfile(config_filename)

    app.secret_key = app.config["SECRET_KEY"]

    with app.app_context():
        db.init_app(app)
        from server.config import ALLOWED_DOMAINS

        cors.init_app(
            app,
            origins=cast(list[str], ALLOWED_DOMAINS),
            supports_credentials=True,
        )

        from server.controllers.auth import auth, oauth

        app.register_blueprint(auth)
        oauth.init_app(app)

        from server.controllers.api import api
        app.register_blueprint(api)

        init_db(db)

        @app.errorhandler(404)
        def _default(_error):
            # Return react frontend
            if app.config["ENV"] == "production":
                return render_template("index.html"), 200
            else:
                return redirect("/api/docs")

    return app
