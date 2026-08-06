import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TodoForm from "./TodoForm";

describe("TodoForm", () => {
  it("renders input, select and button", () => {
    render(<TodoForm onAdd={vi.fn()} />);

    expect(screen.getByPlaceholderText("Neues Todo...")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /hinzufügen/i })).toBeInTheDocument();
  });

  it("calls onAdd with title and priority on submit", () => {
    const onAdd = vi.fn();
    render(<TodoForm onAdd={onAdd} />);

    fireEvent.change(screen.getByPlaceholderText("Neues Todo..."), {
      target: { value: "Buy milk" },
    });
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "high" },
    });
    fireEvent.click(screen.getByRole("button", { name: /hinzufügen/i }));

    expect(onAdd).toHaveBeenCalledWith({ title: "Buy milk", priority: "high" });
  });

  it("clears input after submit", () => {
    render(<TodoForm onAdd={vi.fn()} />);

    const input = screen.getByPlaceholderText("Neues Todo...");
    fireEvent.change(input, { target: { value: "Test" } });
    fireEvent.click(screen.getByRole("button", { name: /hinzufügen/i }));

    expect(input).toHaveValue("");
  });

  it("does not call onAdd with empty title", () => {
    const onAdd = vi.fn();
    render(<TodoForm onAdd={onAdd} />);

    fireEvent.click(screen.getByRole("button", { name: /hinzufügen/i }));

    expect(onAdd).not.toHaveBeenCalled();
  });
});
