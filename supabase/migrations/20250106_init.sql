Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  upi_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Groups table
CREATE TABLE public.groups (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  emoji text,
  description text,
  color text,
  created_by uuid references auth.users(id) not null
);

-- Enable RLS
alter table public.groups enable row level security;

-- Groups policies
create policy "Users can create groups" on groups
  for insert to authenticated
  with check (true);

create policy "Users can view groups they are members of" on groups
  for select using (
    exists (
      select 1 from group_members
      where group_members.group_id = groups.id
      and group_members.user_id = auth.uid()
    )
  );

-- Group members table
CREATE TABLE public.group_members (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  group_id uuid references public.groups(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null,
  unique(group_id, user_id)
);

alter table public.group_members enable row level security;

-- Group members policies
create policy "Users can view group members" on group_members
  for select using (true);

create policy "Users can add group members" on group_members
  for insert to authenticated
  with check (true);

-- Expenses table
CREATE TABLE expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  category TEXT DEFAULT '🍕',
  description TEXT,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  paid_by_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view expenses in their groups"
  ON expenses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = expenses.group_id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can create expenses"
  ON expenses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = expenses.group_id
      AND group_members.user_id = auth.uid()
    )
  );

-- Expense Splits table
CREATE TABLE expense_splits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  is_paid BOOLEAN DEFAULT FALSE,
  UNIQUE(expense_id, user_id)
);

ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their expense splits"
  ON expense_splits FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM expenses e
      JOIN group_members gm ON e.group_id = gm.group_id
      WHERE e.id = expense_splits.expense_id
      AND gm.user_id = auth.uid()
    )
  );

-- Payments table
CREATE TABLE payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  amount DECIMAL(10, 2) NOT NULL,
  from_user_id UUID REFERENCES auth.users(id),
  to_user_id UUID REFERENCES auth.users(id),
  group_id UUID REFERENCES groups(id),
  upi_transaction_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  method TEXT DEFAULT 'upi' CHECK (method IN ('upi', 'cash', 'other')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their payments"
  ON payments FOR SELECT
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

CREATE POLICY "Users can create payments"
  ON payments FOR INSERT
  WITH CHECK (from_user_id = auth.uid());

-- Analytics table
CREATE TABLE analytics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  group_id UUID REFERENCES groups(id),
  category TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their analytics"
  ON analytics FOR SELECT
  USING (user_id = auth.uid());

-- Functions for automatic profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to calculate balances
CREATE OR REPLACE FUNCTION calculate_group_balances(p_group_id UUID)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  total_paid DECIMAL,
  total_owed DECIMAL,
  balance DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gm.user_id,
    p.name as user_name,
    COALESCE(SUM(CASE WHEN e.paid_by_id = gm.user_id THEN e.amount ELSE 0 END), 0) as total_paid,
    COALESCE(SUM(es.amount), 0) as total_owed,
    COALESCE(SUM(CASE WHEN e.paid_by_id = gm.user_id THEN e.amount ELSE 0 END), 0) - COALESCE(SUM(es.amount), 0) as balance
  FROM group_members gm
  JOIN profiles p ON p.id = gm.user_id
  LEFT JOIN expenses e ON e.group_id = gm.group_id
  LEFT JOIN expense_splits es ON es.expense_id = e.id AND es.user_id = gm.user_id
  WHERE gm.group_id = p_group_id
  GROUP BY gm.user_id, p.name;
END;
$$ LANGUAGE plpgsql;

-- Indexes for performance
CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_expenses_group ON expenses(group_id);
CREATE INDEX idx_expense_splits_user ON expense_splits(user_id);
CREATE INDEX idx_payments_users ON payments(from_user_id, to_user_id);




