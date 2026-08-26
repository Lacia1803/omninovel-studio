import pytest
from fastapi.testclient import TestClient


def test_create_project(client: TestClient):
    response = client.post("/api/projects", json={
        "title": "Test Novel",
        "author": "Author Name",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test Novel"
    assert data["author"] == "Author Name"
    assert "id" in data


def test_list_projects_empty(client: TestClient):
    response = client.get("/api/projects")
    assert response.status_code == 200
    assert response.json() == []


def test_get_project_not_found(client: TestClient):
    response = client.get("/api/projects/nonexistent")
    assert response.status_code == 404


def test_delete_project(client: TestClient):
    create = client.post("/api/projects", json={"title": "To Delete"})
    pid = create.json()["id"]
    response = client.delete(f"/api/projects/{pid}")
    assert response.status_code == 200
    assert response.json()["ok"] is True
    response = client.get(f"/api/projects/{pid}")
    assert response.status_code == 404


def test_add_chapter(client: TestClient):
    proj = client.post("/api/projects", json={"title": "Test"}).json()
    pid = proj["id"]
    response = client.post(f"/api/projects/{pid}/chapters", json={
        "number": 1,
        "title": "Chương 1",
        "original_content": "Nội dung chương 1",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Chương 1"
    assert data["project_id"] == pid


def test_update_chapter(client: TestClient):
    proj = client.post("/api/projects", json={"title": "Test"}).json()
    pid = proj["id"]
    chap = client.post(f"/api/projects/{pid}/chapters", json={
        "number": 1, "title": "Old", "original_content": "text",
    }).json()
    response = client.put(f"/api/projects/{pid}/chapters/{chap['id']}", json={
        "title": "New",
        "translated_content": "translated text",
        "status": "translated",
    })
    assert response.status_code == 200
    assert response.json()["title"] == "New"
    assert response.json()["status"] == "translated"


def test_delete_chapter(client: TestClient):
    proj = client.post("/api/projects", json={"title": "Test"}).json()
    pid = proj["id"]
    chap = client.post(f"/api/projects/{pid}/chapters", json={
        "number": 1, "title": "To Delete", "original_content": "text",
    }).json()
    response = client.delete(f"/api/projects/{pid}/chapters/{chap['id']}")
    assert response.status_code == 200
    assert response.json()["ok"] is True


def test_add_glossary_item(client: TestClient):
    proj = client.post("/api/projects", json={"title": "Test"}).json()
    pid = proj["id"]
    response = client.post(f"/api/projects/{pid}/glossary", json={
        "source_term": "老祖",
        "target_term": "Lão Tổ",
        "category": "name",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["source_term"] == "老祖"
    assert data["target_term"] == "Lão Tổ"


def test_delete_glossary_item(client: TestClient):
    proj = client.post("/api/projects", json={"title": "Test"}).json()
    pid = proj["id"]
    item = client.post(f"/api/projects/{pid}/glossary", json={
        "source_term": "test", "target_term": "test_vi",
    }).json()
    response = client.delete(f"/api/projects/{pid}/glossary/{item['id']}")
    assert response.status_code == 200
    assert response.json()["ok"] is True