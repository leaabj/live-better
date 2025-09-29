import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "../lib/auth";
import { WebGLBackground } from "../components/WebGLBackground";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  component: App,
});

function App() {
  const { user, logout, loading } = useAuth();
  const [showButtons, setShowButtons] = useState(false);
  const [titleVisible, setTitleVisible] = useState(false);

  useEffect(() => {
    // Title animation after short delay
    const titleTimer = setTimeout(() => {
      setTitleVisible(true);
    }, 500);

    // Show buttons after scroll or delay
    const handleScroll = () => {
      if (window.scrollY > 100) {
        setShowButtons(true);
      }
    };

    const buttonTimer = setTimeout(() => {
      setShowButtons(true);
    }, 3000);

    window.addEventListener("scroll", handleScroll);

    return () => {
      clearTimeout(titleTimer);
      clearTimeout(buttonTimer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

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
      <div className="min-h-[200vh] relative overflow-hidden bg-black">
        {/* WebGL Background */}
        <WebGLBackground />

        {/* Hero Section - Full viewport */}
        <div
          className="min-h-screen flex items-center justify-center relative"
          style={{ zIndex: 10 }}
        >
          <div className="text-center">
            {/* Animated Title */}
            <h1
              className={`text-6xl md:text-8xl font-bold text-black mb-6 transition-all duration-2000 transform ${
                titleVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-20"
              }`}
              style={{
                textShadow:
                  "0 0 30px rgba(255, 255, 255, 255), 0 0 60px rgba(59, 130, 246, 0.3)",
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}
            >
              Live Better
            </h1>

            {/* Subtitle with staggered animation */}
            <p
              className={`text-xl md:text-2xl text-gray-200 mb-8 transition-all duration-2000 delay-500 transform ${
                titleVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-20"
              }`}
              style={{
                textShadow: "0 0 20px rgba(0, 0, 0, 0.5)",
              }}
            >
              Your Goals. Your Plan. Your Better Life.
            </p>

            {/* Scroll indicator */}
            <div
              className={`animate-bounce transition-all duration-1000 delay-1000 ${
                titleVisible ? "opacity-100" : "opacity-0"
              }`}
            >
              <svg
                className="w-6 h-6 text-white mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
              <p className="text-white text-sm mt-2">Scroll to continue</p>
            </div>
          </div>
        </div>

        {/* Reveal Section - Sign In/Up Cards */}
        <div
          className="min-h-screen flex items-center justify-center px-4 relative"
          style={{ zIndex: 10 }}
        >
          <div
            className={`w-full max-w-4xl transition-all duration-2000 transform ${
              showButtons
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-20"
            }`}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              {/* Sign In Card */}
              <div className="glass p-8 rounded-2xl shadow-2xl border-2 border-white/30 hover:shadow-purple-500/30 transition-all duration-500 hover:scale-105 hover:border-white/50">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-white mb-4">
                    Welcome Back
                  </h2>
                  <p className="text-white/80 mb-6">
                    Sign in to continue your journey
                  </p>
                  <Link
                    to="/login"
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-300 inline-block transform hover:scale-105 shadow-lg"
                  >
                    Sign In
                  </Link>
                </div>
              </div>

              {/* Sign Up Card */}
              <div className="glass p-8 rounded-2xl shadow-2xl border-2 border-white/30 hover:shadow-blue-500/30 transition-all duration-500 hover:scale-105 hover:border-white/50">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-white mb-4">
                    Join Us
                  </h2>
                  <p className="text-white/80 mb-6">
                    Start your journey to a better life
                  </p>
                  <Link
                    to="/signup"
                    className="w-full bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-300 inline-block transform hover:scale-105 shadow-lg"
                  >
                    Sign Up
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* WebGL Background */}
      <WebGLBackground />

      {/* Header */}
      <header className="glass p-1 shadow-2xl border-2 border-white/20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-white -900">Live Better</h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-500">Welcome, {user.name}</span>
              <button
                onClick={logout}
                className="bg-pink-400 hover:bg-pink-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="text-center">
          <h2
            className="text-4xl font-bold text-white mb-6"
            style={{
              textShadow:
                "0 0 30px rgba(147, 51, 234, 0.5), 0 0 60px rgba(59, 130, 246, 0.3)",
            }}
          >
            Welcome to Your Personal Dashboard
          </h2>
          <p
            className="text-xl text-gray-200 mb-12"
            style={{
              textShadow: "0 0 20px rgba(0, 0, 0, 0.5)",
            }}
          >
            Track your goals and build better habits
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Link
              to="/goals"
              className="glass p-8 rounded-2xl shadow-xl border border-white/20 hover:shadow-purple-500/20 transition-all duration-500 hover:scale-105 group"
            >
              <div className="text-center">
                <h3 className="text-2xl font-semibold text-white mb-3 group-hover:text-purple-300 transition-colors">
                  Manage Goals
                </h3>
                <p className="text-gray-200 group-hover:text-white transition-colors">
                  Set and track your personal goals
                </p>
              </div>
            </Link>
            <Link
              to="/tasks"
              className="glass p-8 rounded-2xl shadow-xl border border-white/20 hover:shadow-blue-500/20 transition-all duration-500 hover:scale-105 group"
            >
              <div className="text-center">
                <h3 className="text-2xl font-semibold text-white mb-3 group-hover:text-blue-300 transition-colors">
                  Daily Tasks
                </h3>
                <p className="text-gray-200 group-hover:text-white transition-colors">
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
