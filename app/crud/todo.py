from sqlalchemy.orm import Session

from app.models.todo import Priority, Todo
from app.schemas.todo import TodoCreate, TodoUpdate


def get_todos(
    db: Session,
    completed: bool | None = None,
    priority: Priority | None = None,
) -> list[Todo]:
    """List todos with optional filters."""
    query = db.query(Todo)
    if completed is not None:
        query = query.filter(Todo.completed == completed)
    if priority is not None:
        query = query.filter(Todo.priority == priority)
    return query.order_by(Todo.created_at.desc()).all()


def get_todo(db: Session, todo_id: int) -> Todo | None:
    """Get a single todo by ID."""
    return db.query(Todo).filter(Todo.id == todo_id).first()


def create_todo(db: Session, todo_in: TodoCreate) -> Todo:
    """Create a new todo."""
    todo = Todo(**todo_in.model_dump())
    db.add(todo)
    db.commit()
    db.refresh(todo)
    return todo


def update_todo(db: Session, todo: Todo, todo_in: TodoUpdate) -> Todo:
    """Update an existing todo (partial update)."""
    update_data = todo_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(todo, field, value)
    db.commit()
    db.refresh(todo)
    return todo


def delete_todo(db: Session, todo: Todo) -> None:
    """Delete a todo."""
    db.delete(todo)
    db.commit()
