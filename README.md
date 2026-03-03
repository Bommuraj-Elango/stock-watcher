# Stock Watcher (MongoDB)

This project now uses:
- React + Vite frontend
- Express API backend
- MongoDB database (`stock_watcher_app`) with collections:
  - `users`
  - `profiles`
  - `user_roles`
  - `stocks`
  - `transactions`

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create env file:
```bash
cp .env.example .env
```

3. Ensure MongoDB is running and `.env` points to it:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/stock_watcher_app
MONGODB_DB_NAME=stock_watcher_app
JWT_SECRET=replace_with_a_secure_random_secret
```

4. Run frontend + backend together:
```bash
npm run dev:full
```

Frontend: `http://localhost:8080`  
Backend: `http://localhost:4000`

## Notes

- The backend auto-creates the required MongoDB collections and indexes on startup.
- Signup/login, stock CRUD, purchase flow, company analytics, and buyer portfolio now use MongoDB APIs.
