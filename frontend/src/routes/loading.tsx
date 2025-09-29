import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "../lib/auth";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { SparklingProgress } from "../components/SparklingProgress";

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

  // Smooth progress animation function
  const animateProgress = (start: number, end: number, duration: number) => {
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progressRatio = Math.min(elapsed / duration, 1);
      const currentProgress = start + (end - start) * easeOutCubic(progressRatio);
      
      setProgress(currentProgress);
      
      if (progressRatio < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  };

  // Easing function for smoother animation
  const easeOutCubic = (t: number) => {
    return 1 - Math.pow(1 - t, 3);
  };

  useEffect(() => {
    const generateTasks = async () => {
      if (hasGenerated.current) return;
      hasGenerated.current = true;

      try {
        setStatus("Analyzing your goals...");
        animateProgress(0, 25, 800);

        await new Promise((resolve) => setTimeout(resolve, 1200));

        setStatus("Generating personalized tasks...");
        animateProgress(25, 60, 1200);

        const response = await fetch(
          "http://localhost:3000/api/goals/tasks/ai-create-all",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (response.ok) {
          setStatus("Organizing your schedule...");
          animateProgress(60, 85, 1000);

          await new Promise((resolve) => setTimeout(resolve, 1200));

          setStatus("Ready!");
          animateProgress(85, 100, 600);

          setTimeout(() => {
            navigate({ to: "/tasks" });
          }, 1000);
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
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="mb-8">
          <div className="w-16 h-16 border-4 border-yellow-200 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Creating Your Personalized Plan
          </h2>
          <p className="text-gray-300">{status}</p>
          {error && <p className="text-red-400 mt-2">{error}</p>}
        </div>

        {/* Progress bar */}
        <SparklingProgress
          percentage={progress}
          height="small"
          showText={false}
          className="mb-4"
        />

        <p className="text-sm text-gray-400">
          This may take a few moments as we analyze your goals and create your
          personalized schedule
        </p>

        {error && (
          <div className="mt-4">
            <button
              onClick={() => navigate({ to: "/goals" })}
              className="text-blue-400 hover:text-blue-300 underline"
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
