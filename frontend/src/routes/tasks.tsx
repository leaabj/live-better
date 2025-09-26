import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";

interface Task {
  id: number;
  title: string;
  description?: string;
  goalId: number;
  timeSlot: 'morning' | 'afternoon' | 'night';
  specificTime?: string;
  duration: number;
  completed: boolean;
  createdAt: string;
}

export const Route = createFileRoute("/tasks")({
  component: TasksPage,
});

function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    timeSlot: '',
    specificTime: '',
    duration: 30
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/tasks?userId=1");
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
      const task = tasks.find(t => t.id === taskId);
      const response = await fetch(`http://localhost:3000/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          completed: !task?.completed,
          userId: 1,
          title: task?.title,
          description: task?.description,
          goalId: task?.goalId,
          timeSlot: task?.timeSlot,
          specificTime: task?.specificTime,
          duration: task?.duration
        }),
      });
      
      if (response.ok) {
        await fetchTasks(); // Refresh the list
      }
    } catch (error) {
      console.error("Error updating task:", error);
    } finally {
      setUpdating(null);
    }
  };

  const addTask = async () => {
    if (!newTask.title.trim()) return;
    
    setAddingTask(true);
    
    try {
      const response = await fetch('http://localhost:3000/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTask.title.trim(),
          description: newTask.description.trim() || null,
          userId: 1,
          goalId: 0, // Manual tasks don't have a specific goal
          timeSlot: newTask.timeSlot || null,
          specificTime: newTask.specificTime || null,
          duration: Math.max(0, Math.min(480, newTask.duration)),
          aiGenerated: false,
          completed: false,
          fixed: false,
          aiValidated: false
        }),
      });

      if (response.ok) {
        // Reset form and refresh
        setNewTask({
          title: '',
          description: '',
          timeSlot: '',
          specificTime: '',
          duration: 30
        });
        setShowAddForm(false);
        await fetchTasks();
      }
    } catch (error) {
      console.error("Error adding task:", error);
    } finally {
      setAddingTask(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setNewTask(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Group tasks by time slot
  const morningTasks = tasks.filter(task => task.timeSlot === 'morning');
  const afternoonTasks = tasks.filter(task => task.timeSlot === 'afternoon');
  const nightTasks = tasks.filter(task => task.timeSlot === 'night');

  // Format time to HH:MM format
  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    
    // Parse time like "7:00 AM" or "7:00 PM"
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) return timeStr;
    
    let hours = parseInt(match[1]);
    const minutes = match[2];
    const period = match[3]?.toUpperCase();
    
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    
    // Format as HH:MM
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  };

  const TimeSlotSection = ({ title, tasks, icon }: { 
    title: string; 
    tasks: Task[]; 
    icon: string;
  }) => (
    <div className="mb-8">
      <div className="flex items-center mb-4">
        <span className="text-2xl mr-2">{icon}</span>
        <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
        <span className="ml-2 bg-gray-200 text-gray-700 text-sm px-2 py-1 rounded-full">
          {tasks.filter(t => !t.completed).length} remaining
        </span>
      </div>
      
      {tasks.length === 0 ? (
        <div className="text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
          No tasks scheduled
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`p-4 rounded-lg border transition-all ${
                task.completed 
                  ? 'bg-gray-50 border-gray-200 opacity-75' 
                  : 'bg-white border-gray-200 shadow-sm'
              }`}
            >
              <div className="flex items-start">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => toggleTaskCompletion(task.id)}
                  disabled={updating === task.id}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="ml-3 flex-1">
                  <h4 className={`font-medium ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                    {task.title}
                  </h4>
                  {task.description && (
                    <p className={`text-sm mt-1 ${task.completed ? 'text-gray-400' : 'text-gray-600'}`}>
                      {task.description}
                    </p>
                  )}
                  <div className="flex items-center mt-2 text-xs text-gray-500">
                    <span>{task.duration} min</span>
                    {task.specificTime && (
                      <span className="mx-2">•</span>
                    )}
                    {task.specificTime && (
                      <span>{formatTime(task.specificTime)}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link 
            to="/" 
            className="text-blue-500 hover:text-blue-600 mb-4 inline-block"
          >
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Daily Tasks</h1>
          <p className="text-gray-600">
            Complete your tasks and build better habits
          </p>
        </div>

        {/* Progress Overview */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">Today's Progress</h3>
            <span className="text-lg font-bold text-blue-600">
              {completedCount} / {totalCount}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-blue-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {progressPercentage === 100 ? 'All tasks completed! Great job!' : `${Math.round(progressPercentage)}% complete`}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No tasks yet</h3>
            <p className="text-gray-600 mb-4">Generate tasks from your goals to get started</p>
            <Link
              to="/goals"
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors inline-block"
            >
              Go to Goals
            </Link>
          </div>
        ) : (
          <div>
            <TimeSlotSection 
              title="Morning" 
              tasks={morningTasks} 
              icon="🌅"
            />
            <TimeSlotSection 
              title="Afternoon" 
              tasks={afternoonTasks} 
              icon="☀️"
            />
            <TimeSlotSection 
              title="Night" 
              tasks={nightTasks} 
              icon="🌙"
            />
          </div>
        )}

        {/* Add Task Button */}
        <div className="text-center mb-8">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center gap-2 mx-auto"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {showAddForm ? 'Cancel' : 'Add Task'}
          </button>
        </div>

        {/* Add Task Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Task</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
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
                  onChange={(e) => handleInputChange('description', e.target.value)}
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
                    onChange={(e) => handleInputChange('timeSlot', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="">Select time slot</option>
                    <option value="morning">🌅 Morning</option>
                    <option value="afternoon">☀️ Afternoon</option>
                    <option value="night">🌙 Night</option>
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
                    onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specific Time (optional)
                </label>
                <input
                  type="time"
                  value={newTask.specificTime}
                  onChange={(e) => handleInputChange('specificTime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3">
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
        )}
      </div>
    </div>
  );
}