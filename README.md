# JobPortal 🚀

A modern job board application built with the SERN stack (Supabase, Express, React, Node.js).

## 🏗️ Architecture

- **Frontend**: React + TypeScript + Vite
- **Backend**: Express + Node.js + TypeScript
- **Database**: Supabase (PostgreSQL)
- **Monorepo**: Workspace-based with npm

## 📁 Project Structure

```
jobportal/
├── backend/           # Express API server
│   ├── src/
│   │   └── index.ts   # Main server file
│   ├── package.json
│   └── tsconfig.json
├── frontend/          # React application
│   ├── src/
│   │   ├── App.tsx    # Main React component
│   │   ├── App.css    # Styles
│   │   └── main.tsx   # React entry point
│   ├── package.json
│   └── vite.config.ts
├── supabase/          # Database migrations and config
│   ├── migrations/
│   │   └── 001_create_jobs_table.sql
│   ├── seed.sql
│   └── config.toml
├── package.json       # Root workspace config
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account (for production) or Docker (for local development)

### 1. Install Dependencies

```bash
# Install all dependencies for the entire monorepo
npm run install:all
```

### 2. Environment Setup

Copy the environment template and fill in your values:

```bash
cp env.example .env
```

Update `.env` with your Supabase credentials:

```env
# Backend Environment Variables
PORT=3001
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Frontend Environment Variables
VITE_API_URL=http://localhost:3001
```

### 3. Database Setup

#### Option A: Using Supabase Cloud

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the migration:
   ```sql
   -- Copy and paste the contents of supabase/migrations/001_create_jobs_table.sql
   ```
3. Optionally seed with sample data:
   ```sql
   -- Copy and paste the contents of supabase/seed.sql
   ```

#### Option B: Using Local Supabase (Docker)

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Start local Supabase:
   ```bash
   supabase start
   ```

3. Run migrations:
   ```bash
   supabase db reset
   ```

### 4. Start Development Servers

```bash
# Start both frontend and backend in development mode
npm run dev
```

This will start:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

### 5. Alternative: Start Services Individually

```bash
# Backend only
npm run dev:backend

# Frontend only  
npm run dev:frontend
```

## 📜 Available Scripts

### Root Level Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run start` - Start both frontend and backend in production mode
- `npm run build` - Build both frontend and backend
- `npm run install:all` - Install dependencies for all workspaces

### Backend Scripts (from `backend/` directory)

- `npm run dev` - Start development server with hot reload
- `npm run start` - Start production server
- `npm run build` - Build TypeScript to JavaScript
- `npm run type-check` - Run TypeScript type checking

### Frontend Scripts (from `frontend/` directory)

- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run start` - Preview production build
- `npm run type-check` - Run TypeScript type checking

## 🗄️ Database Schema

The application uses a simple `jobs` table with the following structure:

```sql
CREATE TABLE jobs (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  salary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔌 API Endpoints

- `GET /health` - Health check endpoint
- `GET /api/jobs` - Get all jobs
- `POST /api/jobs` - Create a new job

## 🛠️ Development

### Adding New Features

1. **Backend**: Add new routes in `backend/src/index.ts`
2. **Frontend**: Add new components in `frontend/src/`
3. **Database**: Create new migrations in `supabase/migrations/`

### TypeScript

Both frontend and backend are configured with TypeScript:
- Strict type checking enabled
- Source maps for debugging
- Declaration files generated

### Code Style

- ESLint and Prettier recommended
- Consistent formatting across the monorepo
- TypeScript strict mode enabled

## 🚀 Deployment

### Backend Deployment

1. Build the backend:
   ```bash
   npm run build:backend
   ```

2. Deploy the `backend/dist/` folder to your hosting service

### Frontend Deployment

1. Build the frontend:
   ```bash
   npm run build:frontend
   ```

2. Deploy the `frontend/dist/` folder to your hosting service

### Environment Variables

Make sure to set the following environment variables in production:

- `PORT` - Backend server port
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key

## 📝 License

MIT License - feel free to use this project as a starting point for your own job board application!

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

If you encounter any issues or have questions, please open an issue on GitHub.

