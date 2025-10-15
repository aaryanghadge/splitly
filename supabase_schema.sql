-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Groups table
CREATE TABLE public.groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '💰',
  description TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Group members table
CREATE TABLE public.group_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Expenses table
CREATE TABLE public.expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  category TEXT DEFAULT '🍕',
  paid_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expense splits table (who owes what for each expense)
CREATE TABLE public.expense_splits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  expense_id UUID REFERENCES public.expenses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  share_amount NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Balances table (simplified view of who owes whom)
CREATE TABLE public.balances (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, from_user_id, to_user_id)
);

-- Row Level Security Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Groups policies
CREATE POLICY "Users can view groups they're members of" ON public.groups FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_members.group_id = groups.id 
    AND group_members.user_id = auth.uid()
  ));

CREATE POLICY "Users can create groups" ON public.groups FOR INSERT 
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update groups they created" ON public.groups FOR UPDATE 
  USING (auth.uid() = created_by);

-- Group members policies
CREATE POLICY "Users can view group members" ON public.group_members FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.group_members gm 
    WHERE gm.group_id = group_members.group_id 
    AND gm.user_id = auth.uid()
  ));

CREATE POLICY "Users can add members to groups" ON public.group_members FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.groups 
    WHERE groups.id = group_members.group_id 
    AND groups.created_by = auth.uid()
  ));

-- Expenses policies
CREATE POLICY "Users can view expenses in their groups" ON public.expenses FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_members.group_id = expenses.group_id 
    AND group_members.user_id = auth.uid()
  ));

CREATE POLICY "Users can create expenses in their groups" ON public.expenses FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_members.group_id = expenses.group_id 
    AND group_members.user_id = auth.uid()
  ));

-- Expense splits policies
CREATE POLICY "Users can view expense splits" ON public.expense_splits FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.expenses e
    JOIN public.group_members gm ON gm.group_id = e.group_id
    WHERE e.id = expense_splits.expense_id 
    AND gm.user_id = auth.uid()
  ));

CREATE POLICY "Users can create expense splits" ON public.expense_splits FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.expenses e
    JOIN public.group_members gm ON gm.group_id = e.group_id
    WHERE e.id = expense_splits.expense_id 
    AND gm.user_id = auth.uid()
  ));

-- Balances policies
CREATE POLICY "Users can view balances in their groups" ON public.balances FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_members.group_id = balances.group_id 
    AND group_members.user_id = auth.uid()
  ));

CREATE POLICY "Users can update balances" ON public.balances FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_members.group_id = balances.group_id 
    AND group_members.user_id = auth.uid()
  ));

-- Function to update group total when expense is added
CREATE OR REPLACE FUNCTION update_group_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.groups 
  SET updated_at = NOW() 
  WHERE id = NEW.group_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER expense_update_group_timestamp
AFTER INSERT OR UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION update_group_updated_at();