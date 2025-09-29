import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "../lib/auth";

export const Route = createFileRoute("/")({
  component: App,
});

function App() {
  const { user, logout, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Live Better</h1>
          <p className="text-gray-600 mb-8">
            Your Goals. Your Plan. Your Better Life.
          </p>
          <div className="space-x-4">
            <Link
              to="/login"
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors inline-block"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-colors inline-block"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Live Better</h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Welcome, {user.name}</span>
              <button
                onClick={logout}
                className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome to Your Personal Dashboard
          </h2>
          <p className="text-gray-600 mb-8">
            Track your goals and build better habits
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Link
              to="/goals"
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="text-center">
                <div className="text-4xl mb-4"></div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Manage Goals
                </h3>
                <p className="text-gray-600">
                  Set and track your personal goals
                </p>
              </div>
            </Link>
            <Link
              to="/tasks"
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="text-center">
                <div className="text-4xl mb-4"></div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Daily Tasks
                </h3>
                <p className="text-gray-600">
                  View and complete your daily tasks
                </p>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
