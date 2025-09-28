import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useAuth } from '../lib/auth';
import { ProtectedRoute } from '../components/ProtectedRoute';

export const Route = createFileRoute("/loading")({
  component: ProtectedLoadingPage,
});

function LoadingPage() {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Initializing...");
  const [error, setError] = useState("");
  const hasGenerated = useRef(false);
  const navigate = useNavigate();
  const { token } = useAuth();

  useEffect(() => {
    const generateTasks = async () => {
      if (hasGenerated.current) return;
      hasGenerated.current = true;

      try {
        setStatus("Analyzing your goals...");
        setProgress(25);

        await new Promise((resolve) => setTimeout(resolve, 1000));

        setStatus("Generating personalized tasks...");
        setProgress(50);

        const response = await fetch(
          "http://localhost:3000/api/goals/tasks/ai-create-all",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              'Authorization': `Bearer ${token}`
            },
          },
        );

        if (response.ok) {
          setStatus("Organizing your schedule...");
          setProgress(75);

          await new Promise((resolve) => setTimeout(resolve, 1000));

          setStatus("Ready!");
          setProgress(100);

          setTimeout(() => {
            navigate({ to: "/tasks" });
          }, 800);
        } else {
          throw new Error("Failed to generate tasks");
        }
      } catch (error) {
        setStatus("Error generating tasks");
        setError("We couldn't generate your tasks. Please try again.");
        console.error("Error:", error);

        setTimeout(() => {
          navigate({ to: "/goals" });
        }, 3000);
      }
    };

    generateTasks();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="mb-8">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Creating Your Personalized Plan
          </h2>
          <p className="text-gray-600">{status}</p>
          {error && <p className="text-red-600 mt-2">{error}</p>}
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        <p className="text-sm text-gray-500">
          This may take a few moments as we analyze your goals and create your
          personalized schedule
        </p>

        {error && (
          <div className="mt-4">
            <button
              onClick={() => navigate({ to: "/goals" })}
              className="text-blue-500 hover:text-blue-600 underline"
            >
              Return to Goals
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default LoadingPage;

function ProtectedLoadingPage() {
  return (
    <ProtectedRoute>
      <LoadingPage />
    </ProtectedRoute>
  );
}
