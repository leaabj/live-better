import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "../lib/auth";
import { useState, useEffect } from "react";
import { WebGLBackground } from "../components/WebGLBackground";

interface UserStats {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  goalsCount: number;
}

interface ProfileData {
  id: number;
  name: string;
  email: string;
  userContext?: string;
  preferredTimeSlots: string[];
  createdAt: string;
  updatedAt: string;
}

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, token, logout } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [userStats, setUserStats] = useState<UserStats>({
    totalTasks: 0,
    completedTasks: 0,
    completionRate: 0,
    goalsCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [userContext, setUserContext] = useState("");
  const [preferredTimeSlots, setPreferredTimeSlots] = useState<string[]>([]);

  const timeSlotOptions = [
    { id: "morning", label: "Morning (6 AM - 12 PM)", icon: "🌅" },
    { id: "afternoon", label: "Afternoon (12 PM - 6 PM)", icon: "☀️" },
    { id: "night", label: "Night (6 PM - 12 AM)", icon: "🌙" },
  ];

  useEffect(() => {
    if (user) {
      fetchProfileData();
      fetchUserStats();
    }
  }, [user]);

  const fetchProfileData = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/auth/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        const profile = data.data;
        setProfileData(profile);
        setName(profile.name);
        setUserContext(profile.userContext || "");
        setPreferredTimeSlots(profile.preferredTimeSlots || []);
      } else {
        setError(data.error || "Failed to fetch profile data");
      }
    } catch (error) {
      setError("Failed to fetch profile data");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      // Fetch all tasks (for overall success rate)
      const tasksResponse = await fetch("http://localhost:3000/api/tasks/all", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const tasksData = await tasksResponse.json();
      if (tasksData.success) {
        const tasks = tasksData.data;
        const completedTasks = tasks.filter((task: any) => task.completed).length;
        const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

        setUserStats({
          totalTasks: tasks.length,
          completedTasks,
          completionRate,
          goalsCount: 0, // We'll need to fetch goals separately
        });
      }

      // Fetch goals count
      const goalsResponse = await fetch("http://localhost:3000/api/goals", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const goalsData = await goalsResponse.json();
      if (goalsData.success) {
        setUserStats(prev => ({
          ...prev,
          goalsCount: goalsData.data.length,
        }));
      }
    } catch (error) {
      console.error("Failed to fetch user stats:", error);
    }
  };

  const handleTimeSlotToggle = (timeSlot: string) => {
    setPreferredTimeSlots(prev => 
      prev.includes(timeSlot)
        ? prev.filter(slot => slot !== timeSlot)
        : [...prev, timeSlot]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("http://localhost:3000/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          userContext,
          preferredTimeSlots,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSuccess("Profile updated successfully!");
        // Update local user data
        setProfileData(data.data);
        
        // Update localStorage
        localStorage.setItem("user", JSON.stringify(data.data));
      } else {
        setError(data.error || "Failed to update profile");
      }
    } catch (error) {
      setError("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-gray-400 mb-6">Please log in to view your profile</p>
          <Link
            to="/login"
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors inline-block"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* WebGL Background */}
      <WebGLBackground />

      {/* Header */}
      <header className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link
              to="/"
              className="text-white hover:text-blue-300 transition-colors"
            >
              ← Back to Dashboard
            </Link>
            <div className="flex items-center space-x-4">
              <span className="text-white">Welcome, {user.name}</span>
              <button
                onClick={logout}
                className="glass px-4 py-2 rounded-lg border border-white/20 hover:border-pink-400/50 hover:bg-pink-500/20 transition-all duration-300 hover:scale-105 text-white flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Your Profile</h1>
          <p className="text-gray-300">Manage your preferences and view your progress</p>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="glass p-6 rounded-xl border border-white/20">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400 mb-2">{userStats.totalTasks}</div>
              <div className="text-sm text-gray-300">Total Tasks</div>
            </div>
          </div>
          <div className="glass p-6 rounded-xl border border-white/20">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">{userStats.completedTasks}</div>
              <div className="text-sm text-gray-300">Completed</div>
            </div>
          </div>
          <div className="glass p-6 rounded-xl border border-white/20">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400 mb-2">{userStats.completionRate}%</div>
              <div className="text-sm text-gray-300">Success Rate</div>
            </div>
          </div>
          <div className="glass p-6 rounded-xl border border-white/20">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-400 mb-2">{userStats.goalsCount}</div>
              <div className="text-sm text-gray-300">Active Goals</div>
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <div className="glass p-8 rounded-2xl border border-white/20 mb-8">
          <h2 className="text-2xl font-semibold text-white mb-6">Profile Settings</h2>
          
          {error && (
            <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-red-400">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
              <p className="text-green-400">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-gray-900/50 text-white placeholder-gray-400"
                placeholder="Your name"
                required
              />
            </div>

            {/* Email (read-only) */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={user.email}
                readOnly
                className="w-full px-4 py-3 border border-gray-600 rounded-lg bg-gray-800/50 text-gray-400 cursor-not-allowed"
              />
              <p className="text-sm text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            {/* User Context */}
            <div>
              <label htmlFor="userContext" className="block text-sm font-medium text-gray-300 mb-2">
                Personal Context & Notes
              </label>
              <textarea
                id="userContext"
                value={userContext}
                onChange={(e) => setUserContext(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors resize-none bg-gray-900/50 text-white placeholder-gray-400"
                placeholder="Add any personal context, preferences, or notes that might help with task generation..."
              />
              <p className="text-sm text-gray-500 mt-1">
                This information will be used to help generate more personalized tasks for you
              </p>
            </div>

            {/* Time Slot Preferences */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-4">
                Preferred Time Slots
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {timeSlotOptions.map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => handleTimeSlotToggle(slot.id)}
                    className={`p-4 rounded-lg border-2 transition-all duration-300 text-left ${
                      preferredTimeSlots.includes(slot.id)
                        ? "border-blue-500 bg-blue-500/20 text-white"
                        : "border-gray-600 bg-gray-900/50 text-gray-300 hover:border-gray-500"
                    }`}
                  >
                    <div className="text-2xl mb-2">{slot.icon}</div>
                    <div className="font-medium">{slot.label}</div>
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Select when you prefer to work on tasks. This will be used when scheduling your daily activities.
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>

        {/* Account Info */}
        <div className="glass p-6 rounded-xl border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4">Account Information</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Member since:</span>
              <span className="text-white">
                {profileData ? new Date(profileData.createdAt).toLocaleDateString() : "Loading..."}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Last updated:</span>
              <span className="text-white">
                {profileData ? new Date(profileData.updatedAt).toLocaleDateString() : "Loading..."}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Account ID:</span>
              <span className="text-white font-mono">{user.id}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}