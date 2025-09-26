import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: App,
});

function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Live Better</h1>
        <p className="text-gray-600 mb-8">
          Your Goals. Your Plan. Your Better Life.
        </p>
        <Link
          to="/goals"
          className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors inline-block"
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}
