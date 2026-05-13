# Result Management Backend

This backend provides a multi-tenant student result management system for a university with roles such as:
- system admin
- university admin
- exam officer
- dean
- hod
- lecturer
- student

## Folder structure

- `index.js` - application entrypoint
- `src/config` - tenant and role configuration
- `src/controllers` - route handlers
- `src/models` - data models
- `src/routes` - express routers
- `src/middleware` - authentication and tenant checks
- `src/services` - business logic services
- `src/utils` - helpers and constants
- `src/data` - seed and role data
- `src/validators` - request validation
- `tests` - backend tests

## Getting started

1. Copy `.env.example` to `.env`
2. Install dependencies with `npm install`
3. Start the server with `node index.js` or `nodemon index.js`
