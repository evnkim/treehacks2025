"""API endpoints."""

import random
from datetime import datetime, timedelta, timezone
from typing import Any, cast

from apiflask import APIBlueprint
from flask import jsonify, request, session
from sqlalchemy import select

from server import db
from server.models.User import User
from server.utils import (
    get_username_from_user_id,
)

api = APIBlueprint("api", __name__, url_prefix="/api", tag="api")


### API Endpoints ###
