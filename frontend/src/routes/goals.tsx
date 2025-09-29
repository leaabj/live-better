import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "../lib/auth";
import { ProtectedRoute } from "../components/ProtectedRoute";

interface Goal {
  id: number;
  title: string;
  description?: string;
  createdAt: string;
}

export const Route = createFileRoute("/goals")({
  component: ProtectedGoalsPage,
});

function GoalsPage() {
  const [newGoal, setNewGoal] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editing, setEditing] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const navigate = useNavigate();
  const { token } = useAuth();

  // Fetch existing goals
  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/goals", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const responseData = await response.json();
        setGoals(responseData.data || []);
      }
    } catch (err) {
      console.error("Error fetching goals:", err);
      setGoals([]);
    }
  };

  const handleAddGoal = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && newGoal.trim()) {
      // Prevent Enter key in textarea from triggering this
      if ((e.target as HTMLElement).tagName === "TEXTAREA") {
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await fetch("http://localhost:3000/api/goals", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: newGoal.trim(),
            description: newDescription.trim() || null,
          }),
        });

        if (response.ok) {
          setNewGoal("");
          setNewDescription("");
          await fetchGoals();
        } else {
          setError("Failed to add goal");
        }
      } catch (err) {
        setError("Error adding goal");
        console.error("Error adding goal:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAddGoalClick = async () => {
    if (newGoal.trim()) {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("http://localhost:3000/api/goals", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: newGoal.trim(),
            description: newDescription.trim() || null,
          }),
        });

        if (response.ok) {
          setNewGoal("");
          setNewDescription("");
          await fetchGoals(); // Refresh the list
        } else {
          setError("Failed to add goal");
        }
      } catch (err) {
        setError("Error adding goal");
        console.error("Error adding goal:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const startEditing = (goal: Goal) => {
    setEditingId(goal.id);
    setEditTitle(goal.title);
    setEditDescription(goal.description || "");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle("");
    setEditDescription("");
  };

  const saveEdit = async () => {
    if (!editingId || !editTitle.trim()) return;

    setEditing(true);
    try {
      const response = await fetch(
        `http://localhost:3000/api/goals/${editingId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: editTitle.trim(),
            description: editDescription.trim() || null,
          }),
        },
      );

      if (response.ok) {
        await fetchGoals();
        cancelEditing();
      } else {
        setError("Failed to update goal");
      }
    } catch (err) {
      setError("Error updating goal");
      console.error("Error updating goal:", err);
    } finally {
      setEditing(false);
    }
  };

  const deleteGoal = async (goalId: number) => {
    setDeletingId(goalId);
    try {
      const response = await fetch(
        `http://localhost:3000/api/goals/${goalId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        await fetchGoals();
      } else {
        setError("Failed to delete goal");
      }
    } catch (err) {
      setError("Error deleting goal");
      console.error("Error deleting goal:", err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-black py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="text-white hover:text-blue-300 mb-4 flex items-center"
          >
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">My Goals</h1>
          <p className="text-gray-300">
            Add your goals and track your progress
          </p>
        </div>

        {/* Goal Input */}
        <div className="mb-8">
          <label
            htmlFor="goal-input"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            Add a new goal
          </label>
          <input
            id="goal-input"
            type="text"
            value={newGoal}
            onChange={(e) => setNewGoal(e.target.value)}
            onKeyDown={handleAddGoal}
            placeholder="Goal title..."
            className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors mb-3 bg-gray-900/50 text-white placeholder-gray-400"
            disabled={loading}
          />

          <label
            htmlFor="goal-description"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            Description (optional)
          </label>
          <textarea
            id="goal-description"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Add details about your goal..."
            rows={3}
            className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors resize-none bg-gray-900/50 text-white placeholder-gray-400"
            disabled={loading}
          />

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-400">
              Press Enter in title field or click Add Goal to save
            </p>
            <button
              onClick={handleAddGoalClick}
              disabled={!newGoal.trim() || loading}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {loading ? "Adding..." : "Add Goal"}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </div>

        {/* Goals List */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Your Goals</h2>
          {goals.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No goals yet. Add your first goal above!
            </div>
          ) : (
            <div className="space-y-3">
              {goals.map((goal) => (
                <div
                  key={goal.id}
                  className="glass p-4 rounded-lg border border-white/20 shadow-sm"
                >
                  {editingId === goal.id ? (
                    // Edit mode
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-900/50 text-white placeholder-gray-400"
                        placeholder="Goal title..."
                        disabled={editing}
                      />
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none bg-gray-900/50 text-white placeholder-gray-400"
                        placeholder="Description..."
                        disabled={editing}
                      />
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={cancelEditing}
                          disabled={editing}
                          className="px-3 py-1 text-gray-300 hover:text-white text-sm disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={saveEdit}
                          disabled={editing || !editTitle.trim()}
                          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded disabled:opacity-50"
                        >
                          {editing ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <div>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-medium text-white">
                            {goal.title}
                          </h3>
                          {goal.description && (
                            <p className="text-gray-300 mt-2 text-sm leading-relaxed">
                              {goal.description}
                            </p>
                          )}
                          <p className="text-sm text-gray-400 mt-2">
                            Added:{" "}
                            {new Date(goal.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => startEditing(goal)}
                            className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                            title="Edit goal"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteGoal(goal.id)}
                            disabled={deletingId === goal.id}
                            className="p-1 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
                            title="Delete goal"
                          >
                            {deletingId === goal.id ? (
                              <svg
                                className="w-4 h-4 animate-spin"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Continue Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate({ to: "/loading" })}
            disabled={goals.length === 0 || loading}
            className="bg-white hover:bg-gray-100 disabled:bg-gray-600 disabled:cursor-not-allowed text-gray-800 font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Continue to Generate Tasks
          </button>
          {goals.length === 0 && (
            <p className="mt-2 text-sm text-gray-400">
              Add at least one goal to continue
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProtectedGoalsPage() {
  return (
    <ProtectedRoute>
      <GoalsPage />
    </ProtectedRoute>
  );
}
