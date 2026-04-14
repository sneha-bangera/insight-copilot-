import pytest
from fastapi.testclient import TestClient
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200

def test_status(client):
    response = client.get("/api/status")
    assert response.status_code == 200

def test_tables_endpoint(client):
    response = client.get("/api/tables")
    assert response.status_code == 200

def test_history_endpoint(client):
    response = client.get("/api/history")
    assert response.status_code == 200