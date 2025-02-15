from flask import Blueprint, jsonify, session, current_app
from app.auth.services import github_oauth
from app.extensions import oauth
import os
import requests
import time
from datetime import datetime, timedelta

api_bp = Blueprint('api', __name__)

### fill in with API routes ###

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")

@api_bp.route("/contributors/<repo_owner>/<repo_name>", methods=["GET"])
def get_contributors(repo_owner, repo_name):
    if not repo_owner or not repo_name:
        return jsonify({"error": "Missing owner or repo"}), 400

    # Headers with Authentication
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "Authorization": f"token {GITHUB_TOKEN}"
    }

    # Get basic contributor info
    contributors_url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/contributors"
    contributors_response = requests.get(contributors_url, headers=headers)

    if contributors_response.status_code != 200:
        return jsonify({"error": "GitHub API request failed", "details": contributors_response.json()}), contributors_response.status_code

    contributors = contributors_response.json()
    
    # Get detailed stats for each contributor with retries
    stats_url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/stats/contributors"
    max_retries = 3
    retry_delay = 1  # seconds
    
    for attempt in range(max_retries):
        stats_response = requests.get(stats_url, headers=headers)
        
        if stats_response.status_code == 200:
            break
        elif stats_response.status_code == 202 and attempt < max_retries - 1:
            time.sleep(retry_delay)
            retry_delay *= 2  # Exponential backoff
            continue
        else:
            return jsonify({"error": "Failed to fetch detailed statistics"}), stats_response.status_code

    stats = stats_response.json()
    
    # Combine basic info with detailed stats
    enriched_contributors = []
    for contributor in contributors:
        contributor_stats = next(
            (s for s in stats if s["author"]["id"] == contributor["id"]), 
            None
        )
        
        if contributor_stats:
            total_additions = sum(week["a"] for week in contributor_stats["weeks"])
            total_deletions = sum(week["d"] for week in contributor_stats["weeks"])
            total_commits = sum(week["c"] for week in contributor_stats["weeks"])
            
            # Get all commit history data
            commit_history = []
            for week in contributor_stats["weeks"]:
                # Convert Unix timestamp to ISO date string
                week_date = datetime.fromtimestamp(week["w"]).isoformat()
                commit_history.append({
                    "date": week_date,
                    "commits": week["c"],
                    "additions": week["a"],
                    "deletions": week["d"]
                })
            
            enriched_contributor = {
                **contributor,
                "total_additions": total_additions,
                "total_deletions": total_deletions,
                "total_commits": total_commits,
                "commit_history": commit_history
            }
            enriched_contributors.append(enriched_contributor)
        else:
            enriched_contributors.append(contributor)

    return jsonify(enriched_contributors)