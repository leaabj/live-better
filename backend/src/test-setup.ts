/**
 * Test setup file
 * This file is loaded before all tests to set up the test environment
 */

// Ensure environment variables are loaded
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = '077c410cac079f98d0ebb76ceb3baa84';
}

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://livebetter:livebetter@localhost:5432/livebetter';
}

if (!process.env.OPENAI_API_KEY) {
  process.env.OPENAI_API_KEY = 'test-key';
}
