-- Team members table for agency workspace
CREATE TABLE IF NOT EXISTS team_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  role text DEFAULT 'Editor',
  status text DEFAULT 'Pending',
  created_at timestamptz DEFAULT now()
);
