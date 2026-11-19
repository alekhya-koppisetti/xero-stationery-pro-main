CREATE TYPE public.app_role AS ENUM ('student', 'staff', 'admin');
CREATE TYPE public.order_status AS ENUM ('pending', 'accepted', 'printing', 'binding', 'ready', 'collected', 'cancelled');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  student_id text,
  phone text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'student',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.print_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_number text NOT NULL UNIQUE DEFAULT ('XE-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  document_name text NOT NULL,
  storage_path text NOT NULL,
  page_count integer NOT NULL CHECK (page_count > 0),
  copies integer NOT NULL DEFAULT 1 CHECK (copies > 0 AND copies <= 100),
  print_color text NOT NULL DEFAULT 'bw' CHECK (print_color IN ('bw', 'color')),
  page_size text NOT NULL DEFAULT 'a4' CHECK (page_size IN ('a4', 'a3')),
  duplex boolean NOT NULL DEFAULT true,
  binding text NOT NULL DEFAULT 'none' CHECK (binding IN ('none', 'staple', 'spiral')),
  notes text,
  status public.order_status NOT NULL DEFAULT 'pending',
  total_amount numeric(10,2) NOT NULL CHECK (total_amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.print_orders TO authenticated;
GRANT ALL ON public.print_orders TO service_role;
ALTER TABLE public.print_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can read own orders" ON public.print_orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Students can create own orders" ON public.print_orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Students can cancel pending own orders" ON public.print_orders FOR UPDATE TO authenticated USING (auth.uid() = user_id AND status = 'pending') WITH CHECK (auth.uid() = user_id AND status IN ('pending', 'cancelled'));
CREATE POLICY "Staff can read all orders" ON public.print_orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff can update all orders" ON public.print_orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX print_orders_user_id_idx ON public.print_orders(user_id);
CREATE INDEX print_orders_status_created_idx ON public.print_orders(status, created_at DESC);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();