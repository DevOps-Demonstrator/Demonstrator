from app.crud import create_todo, delete_todo, get_todo, get_todos, update_todo
from app.models import Priority
from app.schemas import TodoCreate, TodoUpdate


class TestCreateTodo:

    def test_creates_with_defaults(self, db):
        todo = create_todo(db, TodoCreate(title="Buy milk"))
        assert todo.id is not None
        assert todo.title == "Buy milk"
        assert todo.completed is False
        assert todo.priority == Priority.MEDIUM

    def test_creates_with_all_fields(self, db):
        todo = create_todo(
            db,
            TodoCreate(
                title="Deploy app",
                description="Push to production",
                priority=Priority.HIGH,
            ),
        )
        assert todo.description == "Push to production"
        assert todo.priority == Priority.HIGH


class TestGetTodos:

    def test_empty_list(self, db):
        assert get_todos(db) == []

    def test_returns_all(self, db):
        create_todo(db, TodoCreate(title="First"))
        create_todo(db, TodoCreate(title="Second"))
        assert len(get_todos(db)) == 2

    def test_filter_by_completed(self, db):
        todo = create_todo(db, TodoCreate(title="Done"))
        update_todo(db, todo, TodoUpdate(completed=True))
        create_todo(db, TodoCreate(title="Open"))

        assert len(get_todos(db, completed=True)) == 1
        assert len(get_todos(db, completed=False)) == 1

    def test_filter_by_priority(self, db):
        create_todo(db, TodoCreate(title="Low", priority=Priority.LOW))
        create_todo(db, TodoCreate(title="High", priority=Priority.HIGH))

        result = get_todos(db, priority=Priority.HIGH)
        assert len(result) == 1
        assert result[0].title == "High"


class TestGetTodo:

    def test_existing(self, db):
        created = create_todo(db, TodoCreate(title="Find me"))
        found = get_todo(db, created.id)
        assert found is not None
        assert found.title == "Find me"

    def test_nonexistent(self, db):
        assert get_todo(db, 999) is None


class TestUpdateTodo:

    def test_partial_update(self, db):
        todo = create_todo(db, TodoCreate(title="Original"))
        updated = update_todo(db, todo, TodoUpdate(title="Changed"))
        assert updated.title == "Changed"
        assert updated.completed is False

    def test_mark_completed(self, db):
        todo = create_todo(db, TodoCreate(title="Do it"))
        updated = update_todo(db, todo, TodoUpdate(completed=True))
        assert updated.completed is True


class TestDeleteTodo:

    def test_delete(self, db):
        todo = create_todo(db, TodoCreate(title="Remove me"))
        delete_todo(db, todo)
        assert get_todo(db, todo.id) is None
