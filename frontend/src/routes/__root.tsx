import { Outlet, createRootRoute, Link } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="text-xl font-bold text-gray-900">Live Better</Link>
            <div className="flex space-x-4">
              <Link to="/goals" className="text-gray-600 hover:text-gray-900 transition-colors">Goals</Link>
              <Link to="/tasks" className="text-gray-600 hover:text-gray-900 transition-colors">Tasks</Link>
            </div>
          </div>
        </div>
      </nav>
      <Outlet />
    </div>
  ),
});
