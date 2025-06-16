# Livion Task Management System

A task management system with user authentication and data persistence using Supabase.

## Features

- User authentication with Supabase Auth
- Task management with categories
- Daily schedule planning
- Note taking
- Responsive UI with modern design

## Tech Stack

- React + TypeScript
- Tailwind CSS for styling
- Supabase for authentication and database
- Framer Motion for animations

## Setup

### Prerequisites

- Node.js and npm
- Supabase account

### Supabase Setup

1. Create a new Supabase project
2. Set up the database schema:
   - Go to SQL Editor in Supabase
   - Copy and execute the SQL statements from `supabase-schema.sql`
   - This will create the necessary tables and security policies

3. Set up authentication:
   - Go to Authentication > Settings
   - Enable Email auth provider
   - Optionally disable email confirmations for development

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`

## Creating the Noah User

1. Launch the application
2. On the login screen, click the "创建 Noah 账户" button at the bottom
3. This will create a user with:
   - Email: noah@example.com
   - Password: NOVA-E
4. Log in with these credentials

## Database Structure

- **categories**: Stores task categories (e.g., "side", "daily")
- **tasks**: Stores task details
- **schedule_entries**: Stores daily scheduled tasks
- **notes**: Stores user notes

Each table has Row Level Security (RLS) policies to ensure users can only access their own data.

## Development

### Adding New Features

When adding new features, make sure to:

1. Define database models in the `database.ts` file
2. Update the `DbContext.tsx` to include the new functionality
3. Create API endpoints in Supabase if needed
4. Update any affected components

### Authentication

Authentication is handled through the `AuthContext.tsx` which provides user state and authentication methods to the entire application. 