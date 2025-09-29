import { ProtectedRoute } from "./ProtectedRoute";
import LoadingPage from "../routes/loading";

export default function ProtectedLoading() {
  return (
    <ProtectedRoute>
      <LoadingPage />
    </ProtectedRoute>
  );
}
