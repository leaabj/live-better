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

interface UserProfile {
  id: number;
  name: string;
  email: string;
  userContext?: string;
  preferredTimeSlots: string[];
  createdAt: string;
  updatedAt: string;
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

  // User context and preferences state
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [userContext, setUserContext] = useState("");
  const [preferredTimeSlots, setPreferredTimeSlots] = useState<string[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");

  // Daily limit warning state
  const [showDailyLimitWarning, setShowDailyLimitWarning] = useState(false);
  const [checkingDailyLimit, setCheckingDailyLimit] = useState(false);

  const navigate = useNavigate();
  const { token } = useAuth();

  // Fetch existing goals and user profile
  useEffect(() => {
    fetchGoals();
    fetchUserProfile();
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

  const fetchUserProfile = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/auth/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const responseData = await response.json();
        setUserProfile(responseData.data);
        setUserContext(responseData.data.userContext || "");
        setPreferredTimeSlots(
          responseData.data.preferredTimeSlots || [
            "morning",
            "afternoon",
            "night",
          ],
        );
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
      setProfileError("Failed to load user profile");
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

  const handleTimeSlotToggle = (slot: string) => {
    setPreferredTimeSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot],
    );
  };

  const saveUserProfile = async () => {
    setProfileLoading(true);
    setProfileError("");

    try {
      const response = await fetch("http://localhost:3000/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userContext: userContext.trim() || null,
          preferredTimeSlots: preferredTimeSlots,
        }),
      });

      if (response.ok) {
        await fetchUserProfile();
        setEditingProfile(false);
      } else {
        setProfileError("Failed to update profile");
      }
    } catch (err) {
      setProfileError("Error updating profile");
      console.error("Error updating profile:", err);
    } finally {
      setProfileLoading(false);
    }
  };

  const cancelProfileEdit = () => {
    if (userProfile) {
      setUserContext(userProfile.userContext || "");
      setPreferredTimeSlots(
        userProfile.preferredTimeSlots || ["morning", "afternoon", "night"],
      );
    }
    setEditingProfile(false);
    setProfileError("");
  };

  const checkDailyLimitBeforeGenerate = async () => {
    if (goals.length === 0) return;

    setCheckingDailyLimit(true);

    try {
      // Check daily limit using the dedicated endpoint
      const response = await fetch(
        "http://localhost:3000/api/goals/tasks/daily-limit-check",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const result = await response.json();

      if (response.ok && result.success) {
        if (!result.data.canGenerate) {
          setShowDailyLimitWarning(true);
          return;
        }

        // User can generate tasks, proceed to loading page
        navigate({ to: "/loading" });
      } else {
        // If check fails, proceed to loading page and let it handle the error
        console.error("Daily limit check failed:", result.error);
        navigate({ to: "/loading" });
      }
    } catch (error) {
      console.error("Error checking daily limit:", error);
      // If network error, proceed to loading page and let it handle the error
      navigate({ to: "/loading" });
    } finally {
      setCheckingDailyLimit(false);
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

        {/* User Context and Preferences */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">
              Your Context & Preferences
            </h2>
            {!editingProfile && userProfile && (
              <button
                onClick={() => setEditingProfile(true)}
                className="text-blue-400 hover:text-blue-300 text-sm flex items-center"
              >
                <svg
                  className="w-4 h-4 mr-1"
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
                Edit
              </button>
            )}
          </div>

          {editingProfile ? (
            // Edit mode
            <div className="glass p-6 rounded-lg border border-white/20 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Your Context (optional)
                </label>
                <textarea
                  value={userContext}
                  onChange={(e) => setUserContext(e.target.value)}
                  placeholder="Tell us about yourself, your goals, your schedule, or any other context that might help generate better tasks for you..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none bg-gray-900/50 text-white placeholder-gray-400"
                  disabled={profileLoading}
                />
                <p className="text-xs text-gray-400 mt-1">
                  This information helps generate more personalized and relevant
                  tasks for you.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Preferred Time Slots
                </label>
                <div className="flex flex-wrap gap-2">
                  {["morning", "afternoon", "night"].map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => handleTimeSlotToggle(slot)}
                      disabled={profileLoading}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        preferredTimeSlots.includes(slot)
                          ? "bg-blue-500 text-white"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      } disabled:opacity-50`}
                    >
                      {slot.charAt(0).toUpperCase() + slot.slice(1)}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Select when you prefer to work on tasks. Tasks will be
                  scheduled accordingly.
                </p>
              </div>

              {profileError && (
                <p className="text-sm text-red-400">{profileError}</p>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={cancelProfileEdit}
                  disabled={profileLoading}
                  className="px-4 py-2 text-gray-300 hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveUserProfile}
                  disabled={profileLoading}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50"
                >
                  {profileLoading ? "Saving..." : "Save Preferences"}
                </button>
              </div>
            </div>
          ) : (
            // View mode
            <div className="glass p-6 rounded-lg border border-white/20">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">
                    Your Context
                  </h3>
                  {userProfile?.userContext ? (
                    <p className="text-gray-200">{userProfile.userContext}</p>
                  ) : (
                    <p className="text-gray-400 italic">
                      No context provided yet. Click Edit to add information
                      about yourself.
                    </p>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">
                    Preferred Time Slots
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {userProfile?.preferredTimeSlots?.map((slot) => (
                      <span
                        key={slot}
                        className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm"
                      >
                        {slot.charAt(0).toUpperCase() + slot.slice(1)}
                      </span>
                    ))}
                  </div>
                </div>

                {!userProfile?.userContext && (
                  <div className="text-sm text-gray-400 bg-blue-500/10 p-3 rounded-lg">
                    💡 Adding your context and preferences helps generate more
                    personalized tasks that better fit your schedule and goals.
                  </div>
                )}
              </div>
            </div>
          )}
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
            onClick={checkDailyLimitBeforeGenerate}
            disabled={goals.length === 0 || loading || checkingDailyLimit}
            className="bg-white hover:bg-gray-100 disabled:bg-gray-600 disabled:cursor-not-allowed text-gray-800 font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 mx-auto"
          >
            {checkingDailyLimit ? (
              <>
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
                Checking...
              </>
            ) : (
              "Generate Tasks"
            )}
          </button>
          {goals.length === 0 && (
            <p className="mt-2 text-sm text-gray-400">
              Add at least one goal to continue
            </p>
          )}
        </div>
      </div>

      {/* Daily Limit Warning Modal */}
      {showDailyLimitWarning && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setShowDailyLimitWarning(false)}
          ></div>

          {/* Modal Container */}
          <div className="flex items-center justify-center min-h-screen px-4">
            {/* Modal Content */}
            <div
              className="relative bg-white rounded-lg border border-gray-200 p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setShowDailyLimitWarning(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              <div className="text-center mb-6">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
                  <svg
                    className="h-8 w-8 text-yellow-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Daily Limit Reached
                </h3>
                <p className="text-sm text-gray-600">
                  You've already generated tasks for today
                </p>
              </div>

              <div className="space-y-4">
                {/* Warning Message */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    You can only generate AI-powered tasks once per day to
                    maintain focus and prevent overwhelm.
                  </p>
                </div>

                {/* Options */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">
                    What would you like to do?
                  </h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-start">
                      <svg
                        className="w-4 h-4 text-blue-500 mt-0.5 mr-2 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>
                        <strong>Wait until tomorrow</strong> to generate a fresh
                        set of tasks
                      </span>
                    </div>
                    <div className="flex items-start">
                      <svg
                        className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                      <span>
                        <strong>Work with today's tasks</strong> - complete or
                        modify them as needed
                      </span>
                    </div>
                    <div className="flex items-start">
                      <svg
                        className="w-4 h-4 text-red-500 mt-0.5 mr-2 flex-shrink-0"
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
                      <span>
                        <strong>Delete existing tasks</strong> if you want to
                        start fresh (not recommended)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowDailyLimitWarning(false);
                      navigate({ to: "/tasks" });
                    }}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
                  >
                    View Today's Tasks
                  </button>
                  <button
                    onClick={() => setShowDailyLimitWarning(false)}
                    className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                  >
                    Got It
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
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
