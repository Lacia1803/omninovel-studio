import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_project(client: AsyncClient):
    response = await client.post("/api/projects", json={
        "title": "Test Novel",
        "author": "Author Name",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test Novel"
    assert data["author"] == "Author Name"
    assert "id" in data


@pytest.mark.asyncio
async def test_list_projects_empty(client: AsyncClient):
    response = await client.get("/api/projects")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_get_project_not_found(client: AsyncClient):
    response = await client.get("/api/projects/nonexistent")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_project(client: AsyncClient):
    create = await client.post("/api/projects", json={"title": "To Delete"})
    pid = create.json()["id"]
    response = await client.delete(f"/api/projects/{pid}")
    assert response.status_code == 200
    assert response.json()["ok"] is True
    response = await client.get(f"/api/projects/{pid}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_add_chapter(client: AsyncClient):
    proj = (await client.post("/api/projects", json={"title": "Test"})).json()
    pid = proj["id"]
    response = await client.post(f"/api/projects/{pid}/chapters", json={
        "number": 1,
        "title": "Chương 1",
        "original_content": "Nội dung chương 1",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Chương 1"
    assert data["project_id"] == pid


@pytest.mark.asyncio
async def test_update_chapter(client: AsyncClient):
    proj = (await client.post("/api/projects", json={"title": "Test"})).json()
    pid = proj["id"]
    chap = (await client.post(f"/api/projects/{pid}/chapters", json={
        "number": 1, "title": "Old", "original_content": "text",
    })).json()
    response = await client.put(f"/api/projects/{pid}/chapters/{chap['id']}", json={
        "title": "New",
        "translated_content": "translated text",
        "status": "translated",
    })
    assert response.status_code == 200
    assert response.json()["title"] == "New"
    assert response.json()["status"] == "translated"


@pytest.mark.asyncio
async def test_delete_chapter(client: AsyncClient):
    proj = (await client.post("/api/projects", json={"title": "Test"})).json()
    pid = proj["id"]
    chap = (await client.post(f"/api/projects/{pid}/chapters", json={
        "number": 1, "title": "To Delete", "original_content": "text",
    })).json()
    response = await client.delete(f"/api/projects/{pid}/chapters/{chap['id']}")
    assert response.status_code == 200
    assert response.json()["ok"] is True


@pytest.mark.asyncio
async def test_add_glossary_item(client: AsyncClient):
    proj = (await client.post("/api/projects", json={"title": "Test"})).json()
    pid = proj["id"]
    response = await client.post(f"/api/projects/{pid}/glossary", json={
        "source_term": "老祖",
        "target_term": "Lão Tổ",
        "category": "name",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["source_term"] == "老祖"
    assert data["target_term"] == "Lão Tổ"


@pytest.mark.asyncio
async def test_delete_glossary_item(client: AsyncClient):
    proj = (await client.post("/api/projects", json={"title": "Test"})).json()
    pid = proj["id"]
    item = (await client.post(f"/api/projects/{pid}/glossary", json={
        "source_term": "test", "target_term": "test_vi",
    })).json()
    response = await client.delete(f"/api/projects/{pid}/glossary/{item['id']}")
    assert response.status_code == 200
    assert response.json()["ok"] is True
