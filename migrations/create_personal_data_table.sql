-- Create personal_data table for storing user physical data
CREATE TABLE IF NOT EXISTS personal_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    height INTEGER, -- Height in cm
    weight DECIMAL(5,2), -- Weight in kg (max 999.99 kg)
    gender VARCHAR(10) CHECK (gender IN ('Homme', 'Femme', 'Autre')),
    age INTEGER CHECK (age > 0 AND age < 150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one record per user
    UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE personal_data ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only access their own data
CREATE POLICY "Users can view their own personal data" ON personal_data
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own personal data" ON personal_data
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own personal data" ON personal_data
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own personal data" ON personal_data
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_personal_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_personal_data_updated_at
    BEFORE UPDATE ON personal_data
    FOR EACH ROW
    EXECUTE FUNCTION update_personal_data_updated_at();

-- Add indexes for better performance
CREATE INDEX idx_personal_data_user_id ON personal_data(user_id);
CREATE INDEX idx_personal_data_updated_at ON personal_data(updated_at);
