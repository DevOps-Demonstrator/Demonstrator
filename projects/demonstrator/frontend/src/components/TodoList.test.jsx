import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TodoList from "./TodoList";

describe("TodoList", () => {
  it("shows empty state when no todos", () => {
    render(<TodoList todos={[]} onToggle={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText("Keine Todos vorhanden.")).toBeInTheDocument();
  });

  it("renders all todos", () => {
    const todos = [
      { id: 1, title: "First", completed: false, priority: "low" },
      { id: 2, title: "Second", completed: true, priority: "high" },
    ];
    render(
      <TodoList todos={todos} onToggle={vi.fn()} onDelete={vi.fn()} />,
    );

    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });

  it("does not show empty state when todos exist", () => {
    const todos = [
      { id: 1, title: "Test", completed: false, priority: "medium" },
    ];
    render(
      <TodoList todos={todos} onToggle={vi.fn()} onDelete={vi.fn()} />,
    );

    expect(screen.queryByText("Keine Todos vorhanden.")).not.toBeInTheDocument();
  });
});
