from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.crud import create_todo, delete_todo, get_todo, get_todos, update_todo
from app.models import Priority
from app.schemas import TodoCreate, TodoResponse, TodoUpdate

router = APIRouter(prefix="/todos", tags=["todos"])

DbSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[TodoResponse])
def list_todos(
    db: DbSession,
    completed: bool | None = None,
    priority: Priority | None = None,
):
    """List all todos, optionally filtered by status or priority."""
    return get_todos(db, completed=completed, priority=priority)


@router.get("/{todo_id}", response_model=TodoResponse)
def read_todo(todo_id: int, db: DbSession):
    """Get a single todo by ID."""
    todo = get_todo(db, todo_id)
    if todo is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    return todo


@router.post("", response_model=TodoResponse, status_code=201)
def create(todo_in: TodoCreate, db: DbSession):
    """Create a new todo."""
    return create_todo(db, todo_in)


@router.put("/{todo_id}", response_model=TodoResponse)
def update(todo_id: int, todo_in: TodoUpdate, db: DbSession):
    """Update an existing todo (partial update)."""
    todo = get_todo(db, todo_id)
    if todo is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    return update_todo(db, todo, todo_in)


@router.delete("/{todo_id}", status_code=204)
def delete(todo_id: int, db: DbSession):
    """Delete a todo."""
    todo = get_todo(db, todo_id)
    if todo is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    delete_todo(db, todo)
