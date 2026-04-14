from fastapi.testclient import TestClient
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200

def test_status():
    response = client.get("/status")
    assert response.status_code == 200

def test_tables_endpoint():
    response = client.get("/tables")
    assert response.status_code == 200

def test_history_endpoint():
    response = client.get("/history")
    assert response.status_code == 200