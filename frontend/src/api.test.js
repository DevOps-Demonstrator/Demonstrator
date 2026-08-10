import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTodo, deleteTodo, fetchTodos, updateTodo } from "./api";

describe("API client", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("fetchTodos", () => {
    it("fetches all todos", async () => {
      const todos = [{ id: 1, title: "Test" }];
      fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(todos) });

      const result = await fetchTodos();

      expect(fetch).toHaveBeenCalledWith("/todos");
      expect(result).toEqual(todos);
    });

    it("appends filter params", async () => {
      fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) });

      await fetchTodos({ completed: true, priority: "high" });

      expect(fetch).toHaveBeenCalledWith("/todos?completed=true&priority=high");
    });

    it("throws on error response", async () => {
      fetch.mockResolvedValue({ ok: false });

      await expect(fetchTodos()).rejects.toThrow("Failed to fetch todos");
    });
  });

  describe("createTodo", () => {
    it("posts new todo", async () => {
      const todo = { id: 1, title: "New" };
      fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(todo) });

      const result = await createTodo({ title: "New", priority: "medium" });

      expect(fetch).toHaveBeenCalledWith("/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New", priority: "medium" }),
      });
      expect(result).toEqual(todo);
    });

    it("throws on error response", async () => {
      fetch.mockResolvedValue({ ok: false });

      await expect(createTodo({ title: "X" })).rejects.toThrow(
        "Failed to create todo",
      );
    });
  });

  describe("updateTodo", () => {
    it("puts updated data", async () => {
      const todo = { id: 1, title: "Updated", completed: true };
      fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(todo) });

      const result = await updateTodo(1, { completed: true });

      expect(fetch).toHaveBeenCalledWith("/todos/1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
      expect(result).toEqual(todo);
    });
  });

  describe("deleteTodo", () => {
    it("sends delete request", async () => {
      fetch.mockResolvedValue({ ok: true });

      await deleteTodo(1);

      expect(fetch).toHaveBeenCalledWith("/todos/1", { method: "DELETE" });
    });

    it("throws on error response", async () => {
      fetch.mockResolvedValue({ ok: false });

      await expect(deleteTodo(1)).rejects.toThrow("Failed to delete todo");
    });
  });
});
