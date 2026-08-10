import { useEffect, useState } from "react";
import { createTodo, deleteTodo, fetchTodos, updateTodo } from "./api";
import TodoForm from "./components/TodoForm";
import TodoList from "./components/TodoList";

export default function App() {
  const [todos, setTodos] = useState([]);
  const [error, setError] = useState(null);

  const loadTodos = async () => {
    try {
      setTodos(await fetchTodos());
      setError(null);
    } catch {
      setError("Verbindung zur API fehlgeschlagen.");
    }
  };

  useEffect(() => {
    loadTodos();
  }, []);

  const handleAdd = async (data) => {
    await createTodo(data);
    loadTodos();
  };

  const handleToggle = async (id, completed) => {
    await updateTodo(id, { completed });
    loadTodos();
  };

  const handleDelete = async (id) => {
    await deleteTodo(id);
    loadTodos();
  };

  return (
    <div className="app">
      <h1>Todo API</h1>
      {error && <p className="error">{error}</p>}
      <TodoForm onAdd={handleAdd} />
      <TodoList todos={todos} onToggle={handleToggle} onDelete={handleDelete} />
    </div>
  );
}
