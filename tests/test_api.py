class TestHealth:

    def test_health(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}


class TestCreateTodoAPI:

    def test_create_minimal(self, client):
        resp = client.post("/todos", json={"title": "Buy milk"})
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Buy milk"
        assert data["completed"] is False
        assert data["priority"] == "medium"

    def test_create_with_all_fields(self, client):
        resp = client.post(
            "/todos",
            json={
                "title": "Deploy",
                "description": "Push to prod",
                "priority": "high",
            },
        )
        assert resp.status_code == 201
        assert resp.json()["priority"] == "high"

    def test_create_empty_title_rejected(self, client):
        resp = client.post("/todos", json={"title": ""})
        assert resp.status_code == 422

    def test_create_missing_title_rejected(self, client):
        resp = client.post("/todos", json={})
        assert resp.status_code == 422


class TestListTodosAPI:

    def test_empty(self, client):
        resp = client.get("/todos")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_returns_created(self, client):
        client.post("/todos", json={"title": "A"})
        client.post("/todos", json={"title": "B"})
        resp = client.get("/todos")
        assert len(resp.json()) == 2

    def test_filter_completed(self, client):
        r = client.post("/todos", json={"title": "Do"})
        todo_id = r.json()["id"]
        client.put(f"/todos/{todo_id}", json={"completed": True})

        resp = client.get("/todos", params={"completed": True})
        assert len(resp.json()) == 1

    def test_filter_priority(self, client):
        client.post("/todos", json={"title": "Low", "priority": "low"})
        client.post("/todos", json={"title": "High", "priority": "high"})

        resp = client.get("/todos", params={"priority": "high"})
        assert len(resp.json()) == 1
        assert resp.json()[0]["title"] == "High"


class TestReadTodoAPI:

    def test_existing(self, client):
        r = client.post("/todos", json={"title": "Find me"})
        todo_id = r.json()["id"]
        resp = client.get(f"/todos/{todo_id}")
        assert resp.status_code == 200
        assert resp.json()["title"] == "Find me"

    def test_not_found(self, client):
        resp = client.get("/todos/999")
        assert resp.status_code == 404


class TestUpdateTodoAPI:

    def test_partial_update(self, client):
        r = client.post("/todos", json={"title": "Old"})
        todo_id = r.json()["id"]
        resp = client.put(f"/todos/{todo_id}", json={"title": "New"})
        assert resp.status_code == 200
        assert resp.json()["title"] == "New"

    def test_update_not_found(self, client):
        resp = client.put("/todos/999", json={"title": "X"})
        assert resp.status_code == 404


class TestDeleteTodoAPI:

    def test_delete(self, client):
        r = client.post("/todos", json={"title": "Bye"})
        todo_id = r.json()["id"]
        resp = client.delete(f"/todos/{todo_id}")
        assert resp.status_code == 204

        resp = client.get(f"/todos/{todo_id}")
        assert resp.status_code == 404

    def test_delete_not_found(self, client):
        resp = client.delete("/todos/999")
        assert resp.status_code == 404
