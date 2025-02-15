# server/app/api/routes.py

from flask import Blueprint, jsonify, session, current_app
from app.auth.services import github_oauth
from app.extensions import oauth
import os
import requests
import time
from datetime import datetime, timedelta

api_bp = Blueprint('api', __name__)

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")

@api_bp.route("/contributors/<repo_owner>/<repo_name>", methods=["GET"])
def get_contributors(repo_owner, repo_name):
    if not repo_owner or not repo_name:
        current_app.logger.error("Missing owner or repo in request")
        return jsonify({"error": "Missing owner or repo"}), 400

    # Log if the token is available
    if not GITHUB_TOKEN:
        current_app.logger.error("GITHUB_TOKEN is not set!")
    else:
        current_app.logger.info("GITHUB_TOKEN loaded successfully.")

    # Headers with Authentication
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "Authorization": f"token {GITHUB_TOKEN}"
    }

    # Get basic contributor info
    contributors_url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/contributors"
    current_app.logger.info(f"Fetching contributors from {contributors_url}")
    contributors_response = requests.get(contributors_url, headers=headers)
    current_app.logger.info(f"Contributors response status: {contributors_response.status_code}")

    if contributors_response.status_code != 200:
        current_app.logger.error(f"GitHub API request failed: {contributors_response.json()}")
        return jsonify({"error": "GitHub API request failed", "details": contributors_response.json()}), contributors_response.status_code

    contributors = contributors_response.json()
    
    # Get detailed stats for each contributor with retries
    stats_url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/stats/contributors"
    current_app.logger.info(f"Fetching detailed stats from {stats_url}")
    max_retries = 3
    retry_delay = 1  # seconds
    
    for attempt in range(max_retries):
        stats_response = requests.get(stats_url, headers=headers)
        current_app.logger.info(f"Stats attempt {attempt+1} status: {stats_response.status_code}")
        
        if stats_response.status_code == 200:
            break
        elif stats_response.status_code == 202 and attempt < max_retries - 1:
            current_app.logger.warning("GitHub is processing stats; retrying...")
            time.sleep(retry_delay)
            retry_delay *= 2  # Exponential backoff
            continue
        else:
            current_app.logger.error("Failed to fetch detailed statistics")
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
            
            # Get recent activity (last 4 weeks)
            recent_weeks = contributor_stats["weeks"][-4:]
            recent_commits = sum(week["c"] for week in recent_weeks)
            recent_additions = sum(week["a"] for week in recent_weeks)
            recent_deletions = sum(week["d"] for week in recent_weeks)
            
            # Format commit history for graphing
            commit_history = []
            for week in contributor_stats["weeks"]:
                week_date = datetime.fromtimestamp(week["w"]).isoformat()
                commit_history.append({
                    "date": week_date,
                    "commits": week["c"]
                })
            
            enriched_contributor = {
                **contributor,
                "total_additions": total_additions,
                "total_deletions": total_deletions,
                "total_commits": total_commits,
                "recent_commits": recent_commits,
                "recent_additions": recent_additions,
                "recent_deletions": recent_deletions,
                "commit_history": commit_history
            }
            enriched_contributors.append(enriched_contributor)
        else:
            enriched_contributors.append(contributor)

    current_app.logger.info(f"Returning data for {len(enriched_contributors)} contributors.")
    return jsonify(enriched_contributors)
