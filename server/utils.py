"""Utilities for the server."""

import hashlib
import math
from typing import Dict, List

import requests
from sqlalchemy import select

from server.config import (
    SECRET_KEY,
)
from server.db import db


def generate_user_id(github_username: str) -> str:
    """Generate a user ID from a GitHub username."""
    hashed = hashlib.sha256(
        f"{github_username}_{SECRET_KEY}".encode("utf-8")
    ).hexdigest()
    return f"{github_username}_{hashed[:8]}"


def get_username_from_user_id(user_id: str) -> str:
    """Get username from a user ID."""
    return user_id.split("_")[0]
