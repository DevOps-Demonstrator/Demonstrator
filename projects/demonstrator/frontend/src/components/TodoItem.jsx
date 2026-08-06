const PRIORITY_LABELS = { low: "Low", medium: "Medium", high: "High" };

export default function TodoItem({ todo, onToggle, onDelete }) {
  return (
    <li className={`todo-item ${todo.completed ? "completed" : ""}`}>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggle(todo.id, !todo.completed)}
      />
      <span className="todo-title">{todo.title}</span>
      <span className={`priority priority-${todo.priority}`}>
        {PRIORITY_LABELS[todo.priority]}
      </span>
      <button className="delete-btn" onClick={() => onDelete(todo.id)}>
        &times;
      </button>
    </li>
  );
}
