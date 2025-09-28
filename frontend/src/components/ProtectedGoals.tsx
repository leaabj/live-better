import { ProtectedRoute } from "./ProtectedRoute";
import GoalsPage from "../routes/goals";

export default function ProtectedGoals() {
  return (
    <ProtectedRoute>
      <GoalsPage />
    </ProtectedRoute>
  );
}
