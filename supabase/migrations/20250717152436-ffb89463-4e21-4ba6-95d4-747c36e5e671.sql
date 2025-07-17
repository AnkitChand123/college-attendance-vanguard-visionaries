-- Create attendance records table
CREATE TABLE public.attendance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prn TEXT NOT NULL,
  full_name TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  location JSONB NOT NULL,
  distance NUMERIC NOT NULL,
  success BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create attendance settings table
CREATE TABLE public.attendance_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create attendance sessions table
CREATE TABLE public.attendance_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_open BOOLEAN NOT NULL DEFAULT true,
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  created_by TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for attendance_records (allow all operations for now - can be restricted later)
CREATE POLICY "Allow all operations on attendance_records" 
ON public.attendance_records 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create policies for attendance_settings (allow all operations for now)
CREATE POLICY "Allow all operations on attendance_settings" 
ON public.attendance_settings 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create policies for attendance_sessions (allow all operations for now)
CREATE POLICY "Allow all operations on attendance_sessions" 
ON public.attendance_sessions 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_attendance_settings_updated_at
BEFORE UPDATE ON public.attendance_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_attendance_sessions_updated_at
BEFORE UPDATE ON public.attendance_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial settings
INSERT INTO public.attendance_settings (setting_key, setting_value) VALUES 
('allowed_location', '{"lat": 0, "lng": 0, "radius": 100}'),
('attendance_window', 'true');

-- Insert initial session
INSERT INTO public.attendance_sessions (is_open, created_by) VALUES (true, 'system');

-- Enable realtime for all tables
ALTER TABLE public.attendance_records REPLICA IDENTITY FULL;
ALTER TABLE public.attendance_settings REPLICA IDENTITY FULL;
ALTER TABLE public.attendance_sessions REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_sessions;