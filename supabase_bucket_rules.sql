-- SQL rules for Supabase bucket named "database"

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('database', 'database', false)
ON CONFLICT (id) DO NOTHING;

-- Create a policy to allow all authenticated users to read files
CREATE POLICY "Allow all users to read files" ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'database');

-- Create a policy to allow users to insert their own files
CREATE POLICY "Allow users to insert their own files" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'database' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Create a policy to allow users to update their own files
CREATE POLICY "Allow users to update their own files" ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'database' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Create a policy to allow users to delete their own files
CREATE POLICY "Allow users to delete their own files" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'database' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Create tables for Garmin data if they don't exist

-- Table for storing Garmin credentials
CREATE TABLE IF NOT EXISTS public.garmin_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    password_encrypted TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.garmin_credentials ENABLE ROW LEVEL SECURITY;

-- Create policies for garmin_credentials table
CREATE POLICY "Users can view their own credentials" ON public.garmin_credentials
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own credentials" ON public.garmin_credentials
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own credentials" ON public.garmin_credentials
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own credentials" ON public.garmin_credentials
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- Table for storing Garmin activities
CREATE TABLE IF NOT EXISTS public.garmin_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_id TEXT NOT NULL,
    activity_name TEXT,
    activity_type TEXT,
    start_time TIMESTAMP WITH TIME ZONE,
    duration NUMERIC,
    distance NUMERIC,
    tcx_file_path TEXT,
    gpx_file_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, activity_id)
);

-- Enable Row Level Security
ALTER TABLE public.garmin_activities ENABLE ROW LEVEL SECURITY;

-- Create policies for garmin_activities table
CREATE POLICY "Users can view their own activities" ON public.garmin_activities
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own activities" ON public.garmin_activities
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own activities" ON public.garmin_activities
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own activities" ON public.garmin_activities
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());