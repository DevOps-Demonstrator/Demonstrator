import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TodoItem from "./TodoItem";

const baseTodo = {
  id: 1,
  title: "Test Todo",
  completed: false,
  priority: "medium",
};

describe("TodoItem", () => {
  it("renders title and priority", () => {
    render(
      <TodoItem todo={baseTodo} onToggle={vi.fn()} onDelete={vi.fn()} />,
    );

    expect(screen.getByText("Test Todo")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
  });

  it("renders checkbox unchecked for incomplete todo", () => {
    render(
      <TodoItem todo={baseTodo} onToggle={vi.fn()} onDelete={vi.fn()} />,
    );

    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("renders checkbox checked for completed todo", () => {
    render(
      <TodoItem
        todo={{ ...baseTodo, completed: true }}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("calls onToggle when checkbox clicked", () => {
    const onToggle = vi.fn();
    render(
      <TodoItem todo={baseTodo} onToggle={onToggle} onDelete={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("checkbox"));

    expect(onToggle).toHaveBeenCalledWith(1, true);
  });

  it("calls onDelete when delete button clicked", () => {
    const onDelete = vi.fn();
    render(
      <TodoItem todo={baseTodo} onToggle={vi.fn()} onDelete={onDelete} />,
    );

    fireEvent.click(screen.getByText("\u00d7"));

    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it("applies completed class", () => {
    const { container } = render(
      <TodoItem
        todo={{ ...baseTodo, completed: true }}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(container.querySelector(".todo-item")).toHaveClass("completed");
  });

  it("shows correct priority label for each level", () => {
    const { rerender } = render(
      <TodoItem
        todo={{ ...baseTodo, priority: "low" }}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("Low")).toBeInTheDocument();

    rerender(
      <TodoItem
        todo={{ ...baseTodo, priority: "high" }}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("High")).toBeInTheDocument();
  });
});
