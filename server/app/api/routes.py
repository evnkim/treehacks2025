from flask import Blueprint, jsonify, session, current_app
from app.auth.services import github_oauth
from app.extensions import oauth
import os
import requests

api_bp = Blueprint('api', __name__)

### fill in with API routes ###

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")

@api_bp.route("/contributors/<repo_owner>/<repo_name>", methods=["GET"])
def get_contributors(repo_owner, repo_name):
    if not repo_owner or not repo_name:
        return jsonify({"error": "Missing owner or repo"}), 400

    # GitHub API URL
    url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/contributors"

    # Headers with Authentication
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "Authorization": f"token {GITHUB_TOKEN}"
    }

    response = requests.get(url, headers=headers)

    if response.status_code != 200:
        return jsonify({"error": "GitHub API request failed", "details": response.json()}), response.status_code

    return jsonify(response.json())