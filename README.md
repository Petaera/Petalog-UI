# Peta Parking UI

A modern parking management system built with React, TypeScript, and Supabase.

## Features

### Scalable Location Management
The application now supports scalable location filtering based on user roles and ownership:

- **Owner Access**: Owners can only see locations that belong to their `own_id` (stored in the `users` table)
- **Manager Access**: Managers can only see their assigned location
- **Automatic Filtering**: Location dropdowns and data queries are automatically filtered based on user permissions

### Database Schema
The system uses the following key relationships:
- `users.own_id` → `locations.own_id` (for owner-based filtering)
- `users.assigned_location` → `locations.id` (for manager-based filtering)

### User Roles
- **Owner**: Can access multiple locations owned by their `own_id`
- **Manager**: Can only access their assigned location

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up your Supabase environment variables in `.env.local`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Start the development server:
```bash
npm run dev
```

## Architecture

### Location Filtering System
The application implements a scalable location filtering system:

1. **AuthContext**: Stores user information including `own_id` and `assigned_location`
2. **Layout Component**: Fetches and filters locations based on user permissions
3. **Utility Functions**: Reusable functions for applying location filters across components
4. **Header Component**: Displays filtered locations in the dropdown

### Key Components
- `src/components/layout/Layout.tsx`: Main layout with location filtering
- `src/components/layout/Header.tsx`: Location dropdown and user interface
- `src/contexts/AuthContext.tsx`: User authentication and role management
- `src/lib/utils.ts`: Utility functions for location filtering

## Database Requirements

Ensure your Supabase database has the following structure:

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  own_id UUID,
  assigned_location UUID,
  status BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Locations Table
```sql
CREATE TABLE locations (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  own_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Development

### Adding New Features
When adding new features that need location filtering:

1. Use the `applyLocationFilter()` utility function
2. Import location filtering utilities from `@/lib/utils`
3. Test with different user roles to ensure proper filtering

### Testing Location Filtering
1. Create test users with different roles
2. Assign `own_id` values to owners
3. Assign `assigned_location` values to managers
4. Verify that location dropdowns show only appropriate locations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with different user roles
5. Submit a pull request
