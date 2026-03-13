-- Tasks table for global task management
CREATE TABLE IF NOT EXISTS tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  status text DEFAULT 'todo',
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  due_date date,
  assignee text,
  created_at timestamptz DEFAULT now()
);
