-- ============================================================
-- HostelDesk Schema
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

create table profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  email text not null,
  room_number text,
  role text not null default 'resident' check (role in ('resident', 'incharge')),
  created_at timestamptz default now()
);

create table complaints (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  topic text not null,
  details text not null,
  category text default 'Other' check (category in ('Maintenance','Food','Hygiene','Security','Internet','Noise','Other')),
  priority_score int check (priority_score between 1 and 10),
  priority_reason text,
  ai_summary text,
  status text not null default 'Pending' check (status in ('Pending','In Progress','Resolved')),
  is_public boolean default false,
  upvotes int default 0,
  join_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table complaint_joins (
  id uuid primary key default uuid_generate_v4(),
  complaint_id uuid references complaints(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(complaint_id, user_id)
);

create table upvotes (
  id uuid primary key default uuid_generate_v4(),
  complaint_id uuid references complaints(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(complaint_id, user_id)
);

create table progress_updates (
  id uuid primary key default uuid_generate_v4(),
  complaint_id uuid references complaints(id) on delete cascade not null,
  message text not null,
  updated_by uuid references profiles(id) not null,
  created_at timestamptz default now()
);

create table announcements (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  content text not null,
  created_by uuid references profiles(id) not null,
  created_at timestamptz default now()
);

create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null,
  type text not null,
  message text not null,
  read boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at on complaints
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger complaints_updated_at
  before update on complaints
  for each row execute function update_updated_at();

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, name, email, room_number, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'room_number', ''),
    coalesce(new.raw_user_meta_data->>'role', 'resident')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Increment/decrement join_count on complaints
create or replace function increment_join_count()
returns trigger as $$
begin
  update complaints set join_count = join_count + 1 where id = new.complaint_id;
  return new;
end;
$$ language plpgsql;

create or replace function decrement_join_count()
returns trigger as $$
begin
  update complaints set join_count = join_count - 1 where id = old.complaint_id;
  return old;
end;
$$ language plpgsql;

create trigger on_complaint_join
  after insert on complaint_joins
  for each row execute function increment_join_count();

create trigger on_complaint_leave
  after delete on complaint_joins
  for each row execute function decrement_join_count();

-- Increment/decrement upvotes on complaints
create or replace function increment_upvotes()
returns trigger as $$
begin
  update complaints set upvotes = upvotes + 1 where id = new.complaint_id;
  return new;
end;
$$ language plpgsql;

create or replace function decrement_upvotes()
returns trigger as $$
begin
  update complaints set upvotes = upvotes - 1 where id = old.complaint_id;
  return old;
end;
$$ language plpgsql;

create trigger on_upvote_add
  after insert on upvotes
  for each row execute function increment_upvotes();

create trigger on_upvote_remove
  after delete on upvotes
  for each row execute function decrement_upvotes();

-- ============================================================
-- ENABLE REALTIME
-- ============================================================

alter publication supabase_realtime add table complaints;
alter publication supabase_realtime add table progress_updates;
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table announcements;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table complaints enable row level security;
alter table complaint_joins enable row level security;
alter table upvotes enable row level security;
alter table progress_updates enable row level security;
alter table announcements enable row level security;
alter table notifications enable row level security;

-- profiles
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

create policy "Incharge can view all profiles" on profiles
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'incharge')
  );

-- complaints
create policy "Residents can insert own complaints" on complaints
  for insert with check (auth.uid() = user_id);

create policy "Residents can view own complaints" on complaints
  for select using (auth.uid() = user_id);

create policy "Incharge can view all complaints" on complaints
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'incharge')
  );

create policy "Incharge can update all complaints" on complaints
  for update using (
    exists (select 1 from profiles where id = auth.uid() and role = 'incharge')
  );

create policy "Public complaints visible to all" on complaints
  for select using (is_public = true);

-- complaint_joins
create policy "Residents can join complaints" on complaint_joins
  for insert with check (auth.uid() = user_id);

create policy "Users can see own joins" on complaint_joins
  for select using (auth.uid() = user_id);

create policy "Incharge can view all joins" on complaint_joins
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'incharge')
  );

create policy "Users can remove own joins" on complaint_joins
  for delete using (auth.uid() = user_id);

-- upvotes
create policy "Users can upvote" on upvotes
  for insert with check (auth.uid() = user_id);

create policy "Users can see own upvotes" on upvotes
  for select using (auth.uid() = user_id);

create policy "Users can remove upvote" on upvotes
  for delete using (auth.uid() = user_id);

-- progress_updates
create policy "Incharge can insert progress updates" on progress_updates
  for insert with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'incharge')
  );

create policy "Anyone can view progress updates" on progress_updates
  for select using (true);

-- announcements
create policy "Incharge can insert announcements" on announcements
  for insert with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'incharge')
  );

create policy "All authenticated users can view announcements" on announcements
  for select using (auth.role() = 'authenticated');

-- notifications
create policy "Users can view own notifications" on notifications
  for select using (auth.uid() = user_id);

create policy "Users can mark own notifications read" on notifications
  for update using (auth.uid() = user_id);
