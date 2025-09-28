import { ProtectedRoute } from "./ProtectedRoute";
import TasksPage from "../routes/tasks";

export default function ProtectedTasks() {
  return (
    <ProtectedRoute>
      <TasksPage />
    </ProtectedRoute>
  );
}
