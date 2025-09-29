import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "../lib/auth";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { SparklingProgress } from "../components/SparklingProgress";

export const Route = createFileRoute("/tasks")({
  component: ProtectedTasksPage,
});

interface Task {
  id: number;
  title: string;
  description?: string;
  goalId: number | null;
  timeSlot: "morning" | "afternoon" | "night" | null;
  specificTime?: string;
  duration: number;
  completed: boolean;
  aiGenerated: boolean;
  aiValidated: boolean;
  aiValidationResponse?: string;
  validationTimestamp?: string;
  photoValidationAttempts: number;
  photoValidationStatus: "pending" | "validated" | "failed";
  photoLastUploadAt?: string;
  createdAt: string;
}

function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [timeConflict, setTimeConflict] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingTaskData, setEditingTaskData] = useState({
    title: "",
    description: "",
    timeSlot: "",
    specificTime: "",
    duration: 30,
  });
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [photoUploadTask, setPhotoUploadTask] = useState<Task | null>(null);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [showValidationResult, setShowValidationResult] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    timeSlot: "",
    specificTime: "",
    duration: 30,
  });
  const { token } = useAuth();

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/tasks", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const responseData = await response.json();
        setTasks(responseData.data || []);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskCompletion = async (taskId: number) => {
    setUpdating(taskId);
    try {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) {
        console.error("Task not found:", taskId);
        return;
      }

      const newCompletedStatus = !task.completed;
      console.log("Toggling task:", taskId, "to:", newCompletedStatus);

      const response = await fetch(
        `http://localhost:3000/api/tasks/${taskId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            completed: newCompletedStatus,
          }),
        },
      );

      if (response.ok) {
        console.log("Task update successful");
        // Update the task locally to maintain position
        setTasks((prevTasks) =>
          prevTasks.map((t) =>
            t.id === taskId ? { ...t, completed: newCompletedStatus } : t,
          ),
        );
      } else {
        const errorData = await response.json();
        console.error("Task update failed:", response.status, errorData);

        setTasks((prevTasks) =>
          prevTasks.map((t) =>
            t.id === taskId ? { ...t, completed: newCompletedStatus } : t,
          ),
        );
      }
    } catch (error) {
      console.error("Error updating task:", error);
    } finally {
      setUpdating(null);
    }
  };

  // Convert time input to ISO format in UTC
  const convertToISOTime = (timeStr: string) => {
    if (!timeStr) return null;

    const [hours, minutes] = timeStr.split(":").map(Number);

    // Create a UTC date to avoid timezone conversion issues
    const utcDate = new Date();
    utcDate.setUTCHours(hours, minutes, 0, 0);

    return utcDate.toISOString();
  };

  const checkTimeConflict = (
    specificTime: string,
    duration: number,
    excludeTaskId?: number,
  ) => {
    if (!specificTime) return null;

    const newTaskStart = new Date(specificTime);
    const newTaskEnd = new Date(newTaskStart.getTime() + duration * 60000); // duration in milliseconds

    const conflictingTasks = tasks.filter((task) => {
      if (task.completed || (excludeTaskId && task.id === excludeTaskId))
        return false;
      if (!task.specificTime || !task.duration) return false;

      const taskStart = new Date(task.specificTime);
      const taskEnd = new Date(taskStart.getTime() + task.duration * 60000);

      return (
        (newTaskStart >= taskStart && newTaskStart < taskEnd) ||
        (newTaskEnd > taskStart && newTaskEnd <= taskEnd) ||
        (newTaskStart <= taskStart && newTaskEnd >= taskEnd)
      );
    });

    return conflictingTasks.length > 0 ? conflictingTasks : null;
  };

  const addTask = async () => {
    if (!newTask.title.trim()) return;

    const isoTime = convertToISOTime(newTask.specificTime);
    if (isoTime) {
      const conflicts = checkTimeConflict(isoTime, newTask.duration);
      if (conflicts) {
        const conflictTitles = conflicts.map((task) => task.title).join(", ");
        setTimeConflict(
          `Attention: There's already a task scheduled for this time: ${conflictTitles}. Please choose a different time.`,
        );
        return;
      }
    }

    setTimeConflict(null);
    setAddingTask(true);

    try {
      const response = await fetch("http://localhost:3000/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newTask.title.trim(),
          description: newTask.description.trim() || null,
          goalId: null, // Manual tasks don't have a specific goal
          timeSlot: newTask.timeSlot || null,
          specificTime: isoTime,
          duration: Math.max(0, Math.min(480, newTask.duration)),
          aiGenerated: false,
          completed: false,
          fixed: false,
          aiValidated: false,
        }),
      });

      if (response.ok) {
        const responseData = await response.json();
        const newTaskData = responseData.data;

        setTasks((prevTasks) => [...prevTasks, newTaskData]);

        setNewTask({
          title: "",
          description: "",
          timeSlot: "",
          specificTime: "",
          duration: 30,
        });
        setShowAddForm(false);
      }
    } catch (error) {
      console.error("Error adding task:", error);
    } finally {
      setAddingTask(false);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setEditingTaskData({
      title: task.title,
      description: task.description || "",
      timeSlot: task.timeSlot || "",
      specificTime: task.specificTime
        ? formatTimeForInput(task.specificTime)
        : "",
      duration: task.duration,
    });
    setShowEditForm(true);
  };

  const handleDeleteTask = (taskId: number) => {
    setTaskToDelete(taskId);
    setShowDeleteConfirm(true);
  };

  const updateTask = async () => {
    if (!editingTask || !editingTaskData.title.trim()) return;

    const isoTime = convertToISOTime(editingTaskData.specificTime);
    if (isoTime) {
      const conflicts = checkTimeConflict(
        isoTime,
        editingTaskData.duration,
        editingTask.id,
      );
      if (conflicts) {
        const conflictTitles = conflicts.map((task) => task.title).join(", ");
        setTimeConflict(
          `Attention: There's already a task scheduled for this time: ${conflictTitles}. Please choose a different time.`,
        );
        return;
      }
    }

    setUpdating(editingTask.id);
    try {
      const response = await fetch(
        `http://localhost:3000/api/tasks/${editingTask.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: editingTaskData.title.trim(),
            description: editingTaskData.description.trim() || null,
            goalId: editingTask.goalId,
            timeSlot: editingTaskData.timeSlot || null,
            specificTime: isoTime,
            duration: Math.max(0, Math.min(480, editingTaskData.duration)),
          }),
        },
      );

      if (response.ok) {
        setTasks((prevTasks) =>
          prevTasks.map((t) =>
            t.id === editingTask.id
              ? {
                  ...t,
                  title: editingTaskData.title.trim(),
                  description: editingTaskData.description.trim() || undefined,
                  timeSlot:
                    (editingTaskData.timeSlot as
                      | "morning"
                      | "afternoon"
                      | "night"
                      | null) || null,
                  specificTime: isoTime || undefined,
                  duration: Math.max(
                    0,
                    Math.min(480, editingTaskData.duration),
                  ),
                }
              : t,
          ),
        );
        setShowEditForm(false);
        setEditingTask(null);
      }
    } catch (error) {
      console.error("Error updating task:", error);
    } finally {
      setUpdating(null);
    }
  };

  const deleteTask = async () => {
    if (!taskToDelete) return;

    try {
      const response = await fetch(
        `http://localhost:3000/api/tasks/${taskToDelete}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        setTasks((prevTasks) => prevTasks.filter((t) => t.id !== taskToDelete));
        setShowDeleteConfirm(false);
        setTaskToDelete(null);
      }
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const formatTimeForInput = (timeStr: string) => {
    if (!timeStr) return "";

    try {
      const date = new Date(timeStr);
      const hours = date.getUTCHours().toString().padStart(2, "0");
      const minutes = date.getUTCMinutes().toString().padStart(2, "0");
      return `${hours}:${minutes}`;
    } catch (error) {
      return "";
    }
  };

  const handlePhotoValidation = (task: Task) => {
    setPhotoUploadTask(task);
    if (
      task.photoValidationStatus === "validated" &&
      task.aiValidationResponse
    ) {
      setValidationResult({
        validated: true,
        response: task.aiValidationResponse,
        confidence: 0.8, // Default confidence for existing validations
        reasoning:
          "This task was validated previously. Upload a new photo to re-validate.",
      });
      setShowValidationResult(true);
    } else {
      // Show upload modal for new validation
      setShowPhotoUpload(true);
      setSelectedFile(null);
      setValidationResult(null);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        alert("Please select a JPEG, PNG, or WebP image file.");
        return;
      }

      // size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert("File size must be less than 10MB.");
        return;
      }

      setSelectedFile(file);
    }
  };

  const uploadPhotoForValidation = async () => {
    if (!photoUploadTask || !selectedFile) return;

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("image", selectedFile);

      const response = await fetch(
        `http://localhost:3000/api/tasks/${photoUploadTask.id}/validate-photo`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      const result = await response.json();

      if (result.success) {
        setValidationResult(result.validation);

        setTasks((prevTasks) =>
          prevTasks.map((t) => (t.id === photoUploadTask.id ? result.task : t)),
        );

        setShowPhotoUpload(false);
        setShowValidationResult(true);
      } else {
        alert(result.error || "Failed to validate photo");
      }
    } catch (error) {
      console.error("Photo validation error:", error);
      alert("Failed to validate photo. Please try again.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setNewTask((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (field === "specificTime" || field === "duration") {
      setTimeConflict(null);
    }
  };

  const morningTasks = tasks
    .filter((task) => task.timeSlot === "morning")
    .sort((a, b) => {
      // Sort by specific time first, then by ID for stable ordering
      if (a.specificTime && b.specificTime) {
        return (
          new Date(a.specificTime).getTime() -
          new Date(b.specificTime).getTime()
        );
      }
      return a.id - b.id;
    });

  const afternoonTasks = tasks
    .filter((task) => task.timeSlot === "afternoon")
    .sort((a, b) => {
      if (a.specificTime && b.specificTime) {
        return (
          new Date(a.specificTime).getTime() -
          new Date(b.specificTime).getTime()
        );
      }
      return a.id - b.id;
    });

  const nightTasks = tasks
    .filter((task) => task.timeSlot === "night")
    .sort((a, b) => {
      if (a.specificTime && b.specificTime) {
        return (
          new Date(a.specificTime).getTime() -
          new Date(b.specificTime).getTime()
        );
      }
      return a.id - b.id;
    });

  const formatTime = (timeStr: string) => {
    if (!timeStr) return "";

    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) return timeStr;

    let hours = parseInt(match[1]);
    const minutes = match[2];
    const period = match[3]?.toUpperCase();

    if (period === "PM" && hours !== 12) {
      hours += 12;
    } else if (period === "AM" && hours === 12) {
      hours = 0;
    }

    return `${hours.toString().padStart(2, "0")}:${minutes}`;
  };

  const TimeSlotSection = ({
    title,
    tasks,
    icon,
  }: {
    title: string;
    tasks: Task[];
    icon: string;
  }) => (
    <div className="mb-8">
      <div className="flex items-center mb-4">
        <span className="text-2xl mr-2">{icon}</span>
        <h3 className="text-xl font-semibold text-white">{title}</h3>
      </div>

      {tasks.length === 0 ? (
        <div className="text-gray-400 text-center py-4 bg-gray-900/50 rounded-lg">
          No tasks scheduled
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`p-4 rounded-lg border transition-all ${
                task.completed
                  ? "bg-gray-900/50 border-gray-700 opacity-75"
                  : "glass border-white/20 shadow-sm"
              }`}
            >
              <div className="flex items-start">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => toggleTaskCompletion(task.id)}
                  disabled={updating === task.id}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-yellow-200 border-gray-300 rounded"
                />
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <h4
                      className={`font-medium ${task.completed ? "line-through text-gray-400" : "text-white"}`}
                    >
                      {task.title}
                    </h4>
                    <div className="flex items-center space-x-2">
                      {task.aiGenerated && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-800 text-gray-300">
                          AI
                        </span>
                      )}
                      {task.photoValidationStatus === "validated" && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-900/50 text-green-300">
                          Validated
                        </span>
                      )}
                      {task.photoValidationStatus === "failed" && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-900/50 text-red-300">
                          Not Validated
                        </span>
                      )}
                    </div>
                  </div>
                  {task.description && (
                    <p
                      className={`text-sm mt-1 ${task.completed ? "text-gray-400" : "text-gray-300"}`}
                    >
                      {task.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center text-xs text-gray-400">
                      <span>{task.duration} min</span>
                      {task.specificTime && <span className="mx-2">•</span>}
                      {task.specificTime && (
                        <span>{formatTime(task.specificTime)}</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePhotoValidation(task)}
                        className={`text-gray-400 hover:text-green-600 transition-colors ${
                          task.photoValidationStatus === "validated"
                            ? "text-green-600"
                            : ""
                        }`}
                        title={
                          task.photoValidationStatus === "validated"
                            ? "Task validated"
                            : "Validate task with photo"
                        }
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
                            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleEditTask(task)}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit task"
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
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete task"
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const progressPercentage =
    totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="min-h-screen bg-black py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="text-white hover:text-blue-300 mb-4 flex items-center"
          >
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">
            Your Daily Tasks
          </h1>
          <p className="text-gray-300">
            Complete your tasks and build better habits
          </p>
        </div>

        {/* Progress Overview */}
        <div className="glass rounded-lg border border-white/20 p-6 mb-8">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-white">Today's Progress</h3>
            <span className="text-lg font-bold text-yellow-100">
              {completedCount} / {totalCount}
            </span>
          </div>
          <SparklingProgress percentage={progressPercentage} height="medium" />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-300">Loading your tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-white mb-2">
              No tasks yet
            </h3>
            <p className="text-gray-300 mb-4">
              Generate tasks from your goals to get started
            </p>
            <Link
              to="/goals"
              className="bg-white hover:bg-gray-100 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors inline-block"
            >
              Go to Goals
            </Link>
          </div>
        ) : (
          <div>
            <TimeSlotSection title="Morning" tasks={morningTasks} icon="" />
            <TimeSlotSection title="Afternoon" tasks={afternoonTasks} icon="" />
            <TimeSlotSection title="Night" tasks={nightTasks} icon="" />
          </div>
        )}

        {/* Add Task Button */}
        <div className="mb-8">
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full bg-white hover:bg-gray-100 text-gray-800 font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Add Task
          </button>
        </div>

        {/* Add Task Modal */}
        {showAddForm && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => setShowAddForm(false)}
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
                  onClick={() => setShowAddForm(false)}
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

                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Add New Task
                </h3>

                {/* Time Conflict Error Message */}
                {timeConflict && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center">
                      <svg
                        className="w-5 h-5 text-red-500 mr-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <p className="text-red-700 text-sm font-medium">
                        {timeConflict}
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Task Title *
                    </label>
                    <input
                      type="text"
                      value={newTask.title}
                      onChange={(e) =>
                        handleInputChange("title", e.target.value)
                      }
                      placeholder="What do you need to do?"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (optional)
                    </label>
                    <textarea
                      value={newTask.description}
                      onChange={(e) =>
                        handleInputChange("description", e.target.value)
                      }
                      placeholder="Add details about your task..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Time Slot (optional)
                      </label>
                      <select
                        value={newTask.timeSlot}
                        onChange={(e) =>
                          handleInputChange("timeSlot", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      >
                        <option value="">Select time slot</option>
                        <option value="morning">Morning</option>
                        <option value="afternoon">Afternoon</option>
                        <option value="night">Night</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Duration (minutes)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="480"
                        value={newTask.duration}
                        onChange={(e) =>
                          handleInputChange(
                            "duration",
                            parseInt(e.target.value) || 0,
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Specific Time
                    </label>
                    <input
                      type="time"
                      value={newTask.specificTime}
                      onChange={(e) =>
                        handleInputChange("specificTime", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={addTask}
                      disabled={!newTask.title.trim() || addingTask}
                      className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg disabled:cursor-not-allowed"
                    >
                      {addingTask ? "Adding..." : "Add Task"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Task Modal */}
        {showEditForm && editingTask && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => setShowEditForm(false)}
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
                  onClick={() => setShowEditForm(false)}
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

                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Edit Task
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Task Title *
                    </label>
                    <input
                      type="text"
                      value={editingTaskData.title}
                      onChange={(e) =>
                        setEditingTaskData((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      placeholder="What do you need to do?"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (optional)
                    </label>
                    <textarea
                      value={editingTaskData.description}
                      onChange={(e) =>
                        setEditingTaskData((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Add details about your task..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Time Slot (optional)
                      </label>
                      <select
                        value={editingTaskData.timeSlot}
                        onChange={(e) =>
                          setEditingTaskData((prev) => ({
                            ...prev,
                            timeSlot: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      >
                        <option value="">Select time slot</option>
                        <option value="morning">Morning</option>
                        <option value="afternoon">Afternoon</option>
                        <option value="night">Night</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Duration (minutes)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="480"
                        value={editingTaskData.duration}
                        onChange={(e) =>
                          setEditingTaskData((prev) => ({
                            ...prev,
                            duration: parseInt(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Specific Time
                    </label>
                    <input
                      type="time"
                      value={editingTaskData.specificTime}
                      onChange={(e) =>
                        setEditingTaskData((prev) => ({
                          ...prev,
                          specificTime: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      onClick={() => setShowEditForm(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={updateTask}
                      disabled={
                        !editingTaskData.title.trim() ||
                        updating === editingTask.id
                      }
                      className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg disabled:cursor-not-allowed"
                    >
                      {updating === editingTask.id
                        ? "Updating..."
                        : "Update Task"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => setShowDeleteConfirm(false)}
            ></div>

            {/* Modal Container */}
            <div className="flex items-center justify-center min-h-screen px-4">
              {/* Modal Content */}
              <div
                className="relative bg-white rounded-lg border border-gray-200 p-6 w-full max-w-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                    <svg
                      className="h-6 w-6 text-red-600"
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
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Delete Task?
                  </h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Are you sure you want to delete this task? This action
                    cannot be undone.
                  </p>
                  <div className="flex justify-center space-x-3">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={deleteTask}
                      className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Photo Upload Modal */}
        {showPhotoUpload && photoUploadTask && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => setShowPhotoUpload(false)}
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
                  onClick={() => setShowPhotoUpload(false)}
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
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                    <svg
                      className="h-6 w-6 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Validate Task
                  </h3>
                  <p className="text-sm text-gray-600">
                    Upload a photo to validate: "{photoUploadTask.title}"
                  </p>
                </div>

                <div className="space-y-4">
                  {!validationResult && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Photo (JPEG, PNG, or WebP, max 10MB)
                      </label>
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleFileSelect}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        disabled={uploadingPhoto}
                      />

                      {selectedFile && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700">
                            Selected: {selectedFile.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            Size: {(selectedFile.size / 1024 / 1024).toFixed(2)}{" "}
                            MB
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {validationResult && (
                    <div
                      className={`p-4 rounded-lg ${
                        validationResult.validated
                          ? "bg-green-50 border border-green-200"
                          : "bg-red-50 border border-red-200"
                      }`}
                    >
                      <div className="flex items-center mb-2">
                        <svg
                          className={`w-5 h-5 mr-2 ${
                            validationResult.validated
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d={
                              validationResult.validated
                                ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                : "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                            }
                          />
                        </svg>
                        <span
                          className={`font-medium ${
                            validationResult.validated
                              ? "text-green-800"
                              : "text-red-800"
                          }`}
                        >
                          {validationResult.validated
                            ? "Task Validated!"
                            : "Validation Failed"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">
                        {validationResult.response}
                      </p>
                      {!validationResult.validated && (
                        <button
                          onClick={() => setValidationResult(null)}
                          className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Try with a different photo
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      onClick={() => {
                        setShowPhotoUpload(false);
                        setPhotoUploadTask(null);
                        setValidationResult(null);
                      }}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                    >
                      {validationResult ? "Done" : "Cancel"}
                    </button>
                    {!validationResult && selectedFile && (
                      <button
                        onClick={uploadPhotoForValidation}
                        disabled={uploadingPhoto}
                        className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg disabled:cursor-not-allowed"
                      >
                        {uploadingPhoto ? "Validating..." : "Validate Photo"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Validation Results Modal */}
        {showValidationResult && validationResult && photoUploadTask && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => setShowValidationResult(false)}
            ></div>

            {/* Modal Container */}
            <div className="flex items-center justify-center min-h-screen px-4">
              {/* Modal Content */}
              <div
                className="relative bg-white rounded-lg border border-gray-200 p-6 w-full max-w-lg"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close button */}
                <button
                  onClick={() => setShowValidationResult(false)}
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
                  <div
                    className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-4 ${
                      validationResult.validated ? "bg-green-100" : "bg-red-100"
                    }`}
                  >
                    <svg
                      className={`h-8 w-8 ${
                        validationResult.validated
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={
                          validationResult.validated
                            ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            : "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                        }
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {validationResult.validated
                      ? "Task Validated Successfully!"
                      : "Validation Review"}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Task: "{photoUploadTask.title}"
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Validation Result */}
                  <div
                    className={`p-4 rounded-lg ${
                      validationResult.validated
                        ? "bg-green-50 border border-green-200"
                        : "bg-red-50 border border-red-200"
                    }`}
                  >
                    <h4 className="font-medium text-gray-900 mb-2">
                      {validationResult.validated
                        ? "Validation Passed"
                        : "❌ Validation Failed"}
                    </h4>
                    <p className="text-sm text-gray-700">
                      {validationResult.response}
                    </p>
                    {validationResult.confidence && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>Confidence Level</span>
                          <span>
                            {Math.round(validationResult.confidence * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              validationResult.validated
                                ? "bg-green-600"
                                : "bg-red-600"
                            }`}
                            style={{
                              width: `${validationResult.confidence * 100}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Detailed Reasoning */}
                  {validationResult.reasoning && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-700 leading-relaxed">
                        {validationResult.reasoning
                          .split("\n")
                          .map((line: string, index: number) => (
                            <p key={index} className="mb-2 last:mb-0">
                              {line}
                            </p>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Validation Info */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">
                      Validation Information
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-blue-700 font-medium">Task:</span>
                        <p className="text-blue-900">{photoUploadTask.title}</p>
                      </div>
                      <div>
                        <span className="text-blue-700 font-medium">
                          Attempts:
                        </span>
                        <p className="text-blue-900">
                          {(photoUploadTask.photoValidationAttempts || 0) + 1}
                        </p>
                      </div>
                      <div>
                        <span className="text-blue-700 font-medium">
                          Status:
                        </span>
                        <p
                          className={`font-medium ${
                            validationResult.validated
                              ? "text-green-700"
                              : "text-red-700"
                          }`}
                        >
                          {validationResult.validated
                            ? "Validated"
                            : "Needs Improvement"}
                        </p>
                      </div>
                      <div>
                        <span className="text-blue-700 font-medium">
                          Validated:
                        </span>
                        <p className="text-blue-900">
                          {new Date().toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-center space-x-3 pt-4">
                    {!validationResult.validated && (
                      <button
                        onClick={() => {
                          setShowValidationResult(false);
                          setShowPhotoUpload(true);
                          setValidationResult(null);
                        }}
                        className="px-4 py-2 text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Try Again with Different Photo
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowValidationResult(false);
                        setPhotoUploadTask(null);
                        setValidationResult(null);
                      }}
                      className={`px-6 py-2 font-medium rounded-lg ${
                        validationResult.validated
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : "bg-gray-600 hover:bg-gray-700 text-white"
                      }`}
                    >
                      {validationResult.validated ? "Awesome!" : "Got It"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProtectedTasksPage() {
  return (
    <ProtectedRoute>
      <TasksPage />
    </ProtectedRoute>
  );
}
