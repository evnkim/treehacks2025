"""API endpoints."""

import os
import time
from datetime import datetime, timedelta, timezone
from typing import Any, cast

from apiflask import APIBlueprint
from flask import current_app, jsonify, request
import requests
from sqlalchemy import select

from server import db
from server.controllers.ai_insights import (
    analyze_code_quality,
    analyze_file,
    explain_code,
    summarize_pr,
)

api = APIBlueprint("api", __name__, url_prefix="/api", tag="api")


### API Endpoints ###

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")

@api.route("/contributors/<repo_owner>/<repo_name>", methods=["GET"])
def get_contributors(repo_owner, repo_name):
    if not repo_owner or not repo_name:
        current_app.logger.error("Missing owner or repo in request")
        return jsonify({"error": "Missing owner or repo"}), 400

    if not GITHUB_TOKEN:
        current_app.logger.error("GITHUB_TOKEN is not set!")
    else:
        current_app.logger.info("GITHUB_TOKEN loaded successfully.")

    headers = {
        "Accept": "application/vnd.github.v3+json",
        "Authorization": f"token {GITHUB_TOKEN}"
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
    """
    Lists files in a GitHub repository folder.
    Expects an optional query parameter "path" (default is root).
    """
    path = request.args.get("path", "")
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "Authorization": f"token {GITHUB_TOKEN}"
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
    """
    Fetches the raw content of a file in a GitHub repository.
    Expects a query parameter "path" with the file path in the repo.
    """
    path = request.args.get("path", "")
    headers = {
        # Use the raw content media type
        "Accept": "application/vnd.github.v3.raw",
        "Authorization": f"token {GITHUB_TOKEN}"
    }
    url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/contents/{path}"
    current_app.logger.info(f"Fetching file content from GitHub: {url}")
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        current_app.logger.error(f"GitHub API error: {response.json()}")
        return jsonify({"error": "Failed to fetch file content", "details": response.json()}), response.status_code
    # Return raw text
    return response.text
