-- Create student_profiles table linked to auth.users
CREATE TABLE public.student_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  prn TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add user_id to attendance_records table
ALTER TABLE public.attendance_records 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX idx_student_profiles_user_id ON public.student_profiles(user_id);
CREATE INDEX idx_student_profiles_prn ON public.student_profiles(prn);
CREATE INDEX idx_attendance_records_user_id ON public.attendance_records(user_id);

-- Enable RLS on student_profiles
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for student_profiles
CREATE POLICY "Students can view their own profile" 
ON public.student_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" 
ON public.student_profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Students can update their own profile" 
ON public.student_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all profiles" 
ON public.student_profiles 
FOR ALL 
USING (true);

-- Update attendance_records RLS policies
DROP POLICY IF EXISTS "Allow all operations on attendance_records" ON public.attendance_records;

CREATE POLICY "Students can view their own attendance" 
ON public.attendance_records 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Students can insert their own attendance" 
ON public.attendance_records 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all attendance records" 
ON public.attendance_records 
FOR ALL 
USING (true);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  student_prn TEXT;
  student_name TEXT;
BEGIN
  -- Extract PRN and name from user metadata
  student_prn := NEW.raw_user_meta_data ->> 'prn';
  student_name := NEW.raw_user_meta_data ->> 'full_name';
  
  -- Only create profile if PRN is provided (student registration)
  IF student_prn IS NOT NULL THEN
    INSERT INTO public.student_profiles (user_id, prn, full_name, email)
    VALUES (NEW.id, student_prn, student_name, NEW.email);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE TRIGGER update_student_profiles_updated_at
  BEFORE UPDATE ON public.student_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();