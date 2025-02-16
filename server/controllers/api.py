"""API endpoints."""

import os
import time
from datetime import datetime, timedelta, timezone
from typing import Any, cast

from apiflask import APIBlueprint
from flask import current_app, jsonify, request, session
import requests
from sqlalchemy import select

from server import db
from server.controllers.ai_insights import (
    analyze_code_quality,
    analyze_file,
    explain_code,
    summarize_pr,
)
from server.models.User import User

api = APIBlueprint("api", __name__, url_prefix="/api", tag="api")


### API Endpoints ###

def get_user_token():
    """Helper function to get the GitHub access token for the current user."""
    if "user" not in session:
        return None
        
    user = db.session.execute(
        select(User).where(User.github_username == session["user"]["login"])
    ).scalar_one_or_none()
    
    if not user or not user.github_access_token:
        return None
        
    return user.github_access_token

@api.before_request
def check_auth():
    """Verify user is authenticated before accessing API endpoints."""
    if request.endpoint and not request.endpoint.endswith('.analyze_file'):  # Skip auth for file analysis
        if "user" not in session:
            return jsonify({"error": "Not authenticated"}), 401
        token = get_user_token()
        if not token:
            return jsonify({"error": "GitHub token not found"}), 401

@api.route("/github/repositories", methods=["GET"])
def get_repositories():
    """Get list of repositories the authenticated user has access to."""
    token = get_user_token()
    
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "Authorization": f"token {token}"
    }

    # Get authenticated user's repositories (both private and public)
    repos_url = "https://api.github.com/user/repos"
    current_app.logger.info("Fetching user repositories")
    
    try:
        response = requests.get(
            repos_url,
            headers=headers,
            params={
                "sort": "updated",
                "per_page": 100,
                "type": "all"  # Include private repos
            }
        )
        response.raise_for_status()
        
        repos = response.json()
        formatted_repos = [{
            "name": repo["name"],
            "owner": repo["owner"]["login"],
            "full_name": repo["full_name"],
            "private": repo["private"],
            "description": repo["description"],
            "updated_at": repo["updated_at"]
        } for repo in repos]
        
        current_app.logger.info(f"Found {len(formatted_repos)} repositories")
        return jsonify(formatted_repos)

    except requests.exceptions.RequestException as e:
        current_app.logger.error(f"GitHub API request failed: {str(e)}")
        return jsonify({"error": "Failed to fetch repositories"}), 500

@api.route("/contributors/<repo_owner>/<repo_name>", methods=["GET"])
def get_contributors(repo_owner, repo_name):
    if not repo_owner or not repo_name:
        current_app.logger.error("Missing owner or repo in request")
        return jsonify({"error": "Missing owner or repo"}), 400

    token = get_user_token()
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "Authorization": f"token {token}"
    }

    contributors_url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/contributors"
    current_app.logger.info(f"Fetching contributors from {contributors_url}")
    contributors_response = requests.get(contributors_url, headers=headers)
    current_app.logger.info(f"Contributors response status: {contributors_response.status_code}")

    if contributors_response.status_code != 200:
        current_app.logger.error(f"GitHub API request failed: {contributors_response.json()}")
        return jsonify({"error": "GitHub API request failed", "details": contributors_response.json()}), contributors_response.status_code

    contributors = contributors_response.json()
    
    stats_url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/stats/contributors"
    current_app.logger.info(f"Fetching detailed stats from {stats_url}")
    max_retries = 3
    retry_delay = 1
    for attempt in range(max_retries):
        stats_response = requests.get(stats_url, headers=headers)
        current_app.logger.info(f"Stats attempt {attempt+1} status: {stats_response.status_code}")
        if stats_response.status_code == 200:
            break
        elif stats_response.status_code == 202 and attempt < max_retries - 1:
            current_app.logger.warning("GitHub is processing stats; retrying...")
            time.sleep(retry_delay)
            retry_delay *= 2
            continue
        else:
            current_app.logger.error("Failed to fetch detailed statistics")
            return jsonify({"error": "Failed to fetch detailed statistics"}), stats_response.status_code

    stats = stats_response.json()
    enriched_contributors = []
    for contributor in contributors:
        contributor_stats = next((s for s in stats if s["author"]["id"] == contributor["id"]), None)
        if contributor_stats:
            total_additions = sum(week["a"] for week in contributor_stats["weeks"])
            total_deletions = sum(week["d"] for week in contributor_stats["weeks"])
            total_commits = sum(week["c"] for week in contributor_stats["weeks"])
            commit_history = []
            for week in contributor_stats["weeks"]:
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

    current_app.logger.info(f"Returning data for {len(enriched_contributors)} contributors.")
    return jsonify(enriched_contributors)

@api.route("/commits/<repo_owner>/<repo_name>", methods=["GET"])
def get_commits(repo_owner, repo_name):
    """
    Fetch recent commits for the specified repository.
    Optionally accept query parameters like 'branch', 'per_page', 'page'.
    """
    if not GITHUB_TOKEN:
        return jsonify({"error": "GitHub token not configured"}), 500
    
    # Extract optional query parameters
    branch = request.args.get("branch", "main")
    per_page = request.args.get("per_page", "30")
    page = request.args.get("page", "1")

    # Build GitHub API URL
    url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/commits"
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "Authorization": f"token {GITHUB_TOKEN}"
    }
    params = {
        "sha": branch,
        "per_page": per_page,
        "page": page
    }

    try:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        commits_data = response.json()

        # You could enrich the data further, or just return as-is
        # Example: format the commit data to only return what you need
        formatted_commits = []
        for commit_obj in commits_data:
            commit = commit_obj.get("commit", {})
            author = commit.get("author", {})
            committer = commit_obj.get("committer", {})
            
            formatted_commits.append({
                "sha": commit_obj.get("sha"),
                "message": commit.get("message"),
                "author_name": author.get("name"),
                "author_email": author.get("email"),
                "date": author.get("date"),
                "committer_avatar_url": committer.get("avatar_url"),
            })

        return jsonify(formatted_commits)

    except requests.exceptions.RequestException as e:
        return jsonify({"error": str(e)}), 500
    
@api.route("/overview/<repo_owner>/<repo_name>", methods=["GET"])
def get_overview(repo_owner, repo_name):
    """
    Returns an overview of repository stats:
      - Basic GitHub info (stars, forks, watchers, open issues)
      - Possibly code analysis stats (code complexity, lines of code, etc.)
      - Possibly total commits or other local computed metrics
    """
    if not GITHUB_TOKEN:
        return jsonify({"error": "GitHub token not configured"}), 500

    headers = {
        "Accept": "application/vnd.github.v3+json",
        "Authorization": f"token {GITHUB_TOKEN}"
    }

    # 1. Basic repo info: GET /repos/{owner}/{repo}
    repo_url = f"https://api.github.com/repos/{repo_owner}/{repo_name}"
    repo_info_res = requests.get(repo_url, headers=headers)
    if repo_info_res.status_code != 200:
        return jsonify({"error": "Could not fetch repository info"}), repo_info_res.status_code
    repo_info = repo_info_res.json()

    # 2. Total commits: GET /repos/{owner}/{repo}/commits?per_page=1
    #    Use 'Link' header to find the last page or do a HEAD request
    commits_url = f"{repo_url}/commits"
    params = {"per_page": 1}
    commits_res = requests.get(commits_url, headers=headers, params=params)
    if commits_res.status_code != 200:
        total_commits = None
    else:
        # Extract from the 'Link' header if present
        # e.g.: <https://api.github.com/repositories/xxx/commits?per_page=1&page=65>; rel="last"
        links = commits_res.headers.get("Link", "")
        total_commits = None
        if 'rel="last"' in links:
            # Extract the page number
            # Typically: <...&page=123>; rel="last"
            parts = links.split(",")
            for part in parts:
                if 'rel="last"' in part:
                    # find ?page=X
                    start = part.find("page=")
                    end = part.find(">;", start)
                    if start != -1 and end != -1:
                        total_commits = part[start+5:end]  # the page number
                        break

    # 3. Example local code analysis (optional)
    #    Suppose you already store or can compute average code complexity, lines of code, etc.
    #    For demonstration, we'll fake these values:
    code_analysis_data = {
        "average_complexity": 4.3/10,
        "total_lines_of_code": 1442
    }

    # 4. Combine data into a single JSON
    overview_data = {
        "name": repo_info.get("name"),
        "description": repo_info.get("description"),
        "stars": repo_info.get("stargazers_count"),
        "forks": repo_info.get("forks_count"),
        "watchers": repo_info.get("watchers_count"),
        "open_issues": repo_info.get("open_issues_count"),
        "total_commits": total_commits,  # or None if unavailable
        "average_complexity": code_analysis_data["average_complexity"],
        "total_lines_of_code": code_analysis_data["total_lines_of_code"],
    }

    return jsonify(overview_data)


@api.route("/analyze/file", methods=["POST"])
def analyze_single_file():
    """
    Expects JSON with:
      - file_content: The content of a single file to analyze.
    Returns the structured analysis output from analyze_file().
    """
    data = request.get_json()
    if not data or 'file_content' not in data:
        current_app.logger.error("Missing file_content in request")
        return jsonify({"error": "Missing file_content in request"}), 400
    file_content = data['file_content']
    current_app.logger.info("Analyzing single file content.")
    analysis = analyze_file(file_content)
    return jsonify(analysis)

@api.route("/analyze/folder", methods=["POST"])
def analyze_folder():
    """
    Expects JSON with:
      - folder_path: The path to a folder containing files to analyze.
    Aggregates analysis statistics for all .py files in the folder.
    """
    data = request.get_json()
    if not data or 'folder_path' not in data:
        current_app.logger.error("Missing folder_path in request")
        return jsonify({"error": "Missing folder_path in request"}), 400

    folder_path = data['folder_path']
    if not os.path.isdir(folder_path):
        current_app.logger.error(f"Invalid folder path: {folder_path}")
        return jsonify({"error": f"Invalid folder path: {folder_path}"}), 400

    aggregate = {
        "total_files_analyzed": 0,
        "total_lines_of_code": 0,
        "sum_cyclomatic_complexity": 0,
        "sum_maintainability_index": 0,
        "sum_halstead_metrics": {
            "length": 0,
            "vocabulary": 0,
            "difficulty": 0,
            "volume": 0,
            "effort": 0
        },
        "files_with_complexity": 0,
        "issues": [],
        "suggestions": []
    }

    for root, dirs, files in os.walk(folder_path):
        for file in files:
            if file.endswith(".py"):
                file_path = os.path.join(root, file)
                current_app.logger.info(f"Analyzing file: {file_path}")
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        content = f.read()
                except Exception as e:
                    current_app.logger.error(f"Error reading file {file_path}: {e}")
                    continue

                result = analyze_file(content)
                if "error" in result:
                    current_app.logger.error(f"Error analyzing file {file_path}: {result['error']}")
                    continue

                aggregate["total_files_analyzed"] += 1
                aggregate["total_lines_of_code"] += result.get("lines_of_code", 0)

                comp = result.get("complexity_metrics", {})
                if comp:
                    cyclo = comp.get("cyclomatic_complexity") or 0
                    mi = comp.get("maintainability_index") or 0
                    halstead = comp.get("halstead_metrics", {})
                    length = halstead.get("length") or 0
                    vocabulary = halstead.get("vocabulary") or 0
                    difficulty = halstead.get("difficulty") or 0
                    volume = halstead.get("volume") or 0
                    effort = halstead.get("effort") or 0

                    aggregate["sum_cyclomatic_complexity"] += cyclo
                    aggregate["sum_maintainability_index"] += mi
                    aggregate["sum_halstead_metrics"]["length"] += length
                    aggregate["sum_halstead_metrics"]["vocabulary"] += vocabulary
                    aggregate["sum_halstead_metrics"]["difficulty"] += difficulty
                    aggregate["sum_halstead_metrics"]["volume"] += volume
                    aggregate["sum_halstead_metrics"]["effort"] += effort
                    aggregate["files_with_complexity"] += 1

                aggregate["issues"].extend(result.get("issues", []))
                aggregate["suggestions"].extend(result.get("suggestions", []))

    if aggregate["files_with_complexity"] > 0:
        avg_cyclo = aggregate["sum_cyclomatic_complexity"] / aggregate["files_with_complexity"]
        avg_mi = aggregate["sum_maintainability_index"] / aggregate["files_with_complexity"]
        avg_halstead = {k: v / aggregate["files_with_complexity"] for k, v in aggregate["sum_halstead_metrics"].items()}
    else:
        avg_cyclo = None
        avg_mi = None
        avg_halstead = None

    aggregate_results = {
        "total_files_analyzed": aggregate["total_files_analyzed"],
        "total_lines_of_code": aggregate["total_lines_of_code"],
        "average_cyclomatic_complexity": avg_cyclo,
        "average_maintainability_index": avg_mi,
        "average_halstead_metrics": avg_halstead,
        "issues": list(set(aggregate["issues"])),
        "suggestions": list(set(aggregate["suggestions"]))
    }

    current_app.logger.info(f"Aggregate analysis completed for {aggregate['total_files_analyzed']} files.")
    return jsonify(aggregate_results)

# -------------------------------
# New endpoints to interact with GitHub repository contents
# -------------------------------

@api.route("/github/list-files/<repo_owner>/<repo_name>", methods=["GET"])
def github_list_files(repo_owner, repo_name):
    """Lists files in a GitHub repository folder."""
    path = request.args.get("path", "")
    token = get_user_token()
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "Authorization": f"token {token}"
    }
    url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/contents/{path}"
    current_app.logger.info(f"Fetching GitHub repository contents from {url}")
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        current_app.logger.error(f"GitHub API error: {response.json()}")
        return jsonify({"error": "Failed to fetch repository contents", "details": response.json()}), response.status_code
    return jsonify(response.json())

@api.route("/github/get-file/<repo_owner>/<repo_name>", methods=["GET"])
def github_get_file(repo_owner, repo_name):
    """Fetches the raw content of a file in a GitHub repository."""
    path = request.args.get("path", "")
    token = get_user_token()
    headers = {
        "Accept": "application/vnd.github.v3.raw",
        "Authorization": f"token {token}"
    }
    url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/contents/{path}"
    current_app.logger.info(f"Fetching file content from GitHub: {url}")
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        current_app.logger.error(f"GitHub API error: {response.json()}")
        return jsonify({"error": "Failed to fetch file content", "details": response.json()}), response.status_code
    return response.text
