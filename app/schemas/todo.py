from datetime import datetime

from pydantic import BaseModel, Field

from app.models.todo import Priority


class TodoCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    priority: Priority = Priority.MEDIUM


class TodoUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    completed: bool | None = None
    priority: Priority | None = None


class TodoResponse(BaseModel):
    id: int
    title: str
    description: str | None
    completed: bool
    priority: Priority
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
