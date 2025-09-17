Users add goals → AI generates a daily plan split into morning / afternoon / night → user completes tasks by uploading a photo → AI validates the photo → pass/fail + feedback.


Software Development Life Cycle (SDLC) model chosen: Agile with TDD
justification:
• Uncertain requirements (AI integration complexity)
• Evolving features (new endpoints, database schema changes)
• Rapid prototyping needed (AI validation, photo upload)
• Iterative feedback (testing API endpoints as you build)

github projects, link issues, branches, pull requests.


bun is the runtime which means it is a lightweight JavaScript runtime built on top of the V8 engine.
hono framework to build apps in typescript.

registering creater user and password hash
to authenticate you create gwt or sessions
gwt:
login create a gwt, send to the client and attach it and send the requests
validated in middleware thru auth
cors to permit which origins can access the server and which endpoints

DONE:
- Install and configure Drizzle ORM with Postgres
- Define database schema for users, goals, tasks
- Create goal management routes (CRUD for user goals)

TODO:
- Create user authentication routes (register, login)
- Create task completion routes with photo upload
- Create photo validation routes (AI feedback placeholder)
- Add middleware for auth, CORS, and file uploads
- CRUD for tasks

middleware is a way to intercept and handle requests and responses in a web application.
authentication, logging, error handling, and data validation.

TABLES:

1. users: user authentication info
2. goals: user goals 1-N
3. tasks: individual tasks based on goals N-N


Database: Drizzle ORM with Postgres schema for users, goals, plans, tasks, validations
podman for database creation and management
tableplus for database viewing and management

ROUTES:
 • /api/users (register/login)
 • /api/goals (CRUD)
 • /api/plans (generate daily plans)
 • /api/tasks (complete with photo)
 • /api/validations (AI feedback)

 gRPC


middleware:
 • auth middleware
 • CORS middleware
 • file upload middleware


TDD:
1. Write test → Test fails with "file not found"
2. Create file → Test fails with "missing export"
3. Fix export → Test will fail with "route not implemented"
4. Fix routes → Test will fail with "database issues"
5. Fix database → Tests pass!


notes:
github action to run tests when push
test CRUD before pushing
fix some CRUD that cause issues in database
10 pass 1 fail???

ai implementation:
platform.open.ai.com -> structured output

try genkit?
