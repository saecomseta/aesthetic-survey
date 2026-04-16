-- Clean Slate Schema Rebuild (Drop All & Recreate for ASMS v4.5+)

-- 1. Drop existing tables safely using CASCADE
DROP TABLE IF EXISTS responses CASCADE;
DROP TABLE IF EXISTS diagnostic_scripts CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS sectors CASCADE;
DROP TABLE IF EXISTS spaces CASCADE;
DROP TABLE IF EXISTS surveys CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Profiles Table (for Roles)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('SUPER_ADMIN', 'ADMIN')) DEFAULT 'ADMIN',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Create Surveys Table
CREATE TABLE surveys (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  master_templates_json JSONB DEFAULT '{}'::jsonb, -- v4.0 Master Template
  combinations_json JSONB DEFAULT '[]'::jsonb, -- v4.8 Alchemy Combinations
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  is_active BOOLEAN DEFAULT true,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create Sectors Table
CREATE TABLE sectors (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  base_score NUMERIC DEFAULT 0,
  multiplier_20s NUMERIC DEFAULT 1.0,
  multiplier_30s NUMERIC DEFAULT 1.0,
  multiplier_40s NUMERIC DEFAULT 1.0,
  is_common BOOLEAN DEFAULT false, -- v3.0 Common Sector logic
  "order" INTEGER NOT NULL
);

-- Create Questions Table
CREATE TABLE questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
  sector_id UUID REFERENCES sectors(id) ON DELETE CASCADE,
  parent_id UUID, -- v2.5 Recursive Sub Questions
  trigger_value TEXT, -- v2.5 Trigger Option Value
  type TEXT NOT NULL CHECK (type IN ('text', 'radio', 'checkbox', 'o_x', 'multiple_choice')),
  content TEXT NOT NULL,
  options JSONB DEFAULT '[]'::jsonb,
  options_extra_advices JSONB DEFAULT '{}'::jsonb, -- v4.0 Extra Advice Groups
  o_score NUMERIC DEFAULT 0,
  "order" INTEGER NOT NULL,
  is_required BOOLEAN DEFAULT false
);

-- Create Diagnostic Scripts Table
CREATE TABLE diagnostic_scripts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
  sector_id UUID REFERENCES sectors(id) ON DELETE CASCADE,
  min_score NUMERIC NOT NULL,
  max_score NUMERIC NOT NULL,
  variable_name TEXT, -- v4.8 Script-level Mapping
  content TEXT NOT NULL
);

-- Create Responses Table
CREATE TABLE responses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  patient_name TEXT,
  patient_phone TEXT,
  patient_gender TEXT, -- v3.0 Demographics
  patient_age_group TEXT,
  answers JSONB NOT NULL,
  sector_results JSONB DEFAULT '{}'::jsonb,
  space_results JSONB DEFAULT '[]'::jsonb, -- v2.6+ Assembly output injection
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Setup Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT role FROM profiles WHERE id = auth.uid()) = 'SUPER_ADMIN';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT role FROM profiles WHERE id = auth.uid()) = 'ADMIN';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for Profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (id = auth.uid() OR is_super_admin());
CREATE POLICY "SuperAdmins can manage profiles" ON profiles FOR ALL USING (is_super_admin());

-- Policies for Surveys
CREATE POLICY "SuperAdmins can manage surveys" ON surveys FOR ALL USING (is_super_admin());
CREATE POLICY "Public can view active surveys" ON surveys FOR SELECT USING (is_active = true);

-- Policies for Sectors
CREATE POLICY "SuperAdmins can manage sectors" ON sectors FOR ALL USING (is_super_admin());
CREATE POLICY "Public can view sectors of active surveys" ON sectors FOR SELECT USING (
  EXISTS (SELECT 1 FROM surveys WHERE surveys.id = sectors.survey_id AND surveys.is_active = true)
);

-- Policies for Questions
CREATE POLICY "SuperAdmins can manage questions" ON questions FOR ALL USING (is_super_admin());
CREATE POLICY "Public can view questions of active surveys" ON questions FOR SELECT USING (
  EXISTS (SELECT 1 FROM surveys WHERE surveys.id = questions.survey_id AND surveys.is_active = true)
);

-- Policies for Diagnostic Scripts
CREATE POLICY "SuperAdmins can manage scripts" ON diagnostic_scripts FOR ALL USING (is_super_admin());
CREATE POLICY "Public can view scripts of active surveys" ON diagnostic_scripts FOR SELECT USING (
  EXISTS (SELECT 1 FROM surveys WHERE surveys.id = diagnostic_scripts.survey_id AND surveys.is_active = true)
);

-- Policies for Responses
CREATE POLICY "SuperAdmins can view all responses" ON responses FOR SELECT USING (is_super_admin());
CREATE POLICY "Admins can view responses for their QR" ON responses FOR SELECT USING (admin_id = auth.uid() AND is_admin());
CREATE POLICY "Public can insert responses" ON responses FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM surveys WHERE surveys.id = responses.survey_id AND surveys.is_active = true)
);

CREATE POLICY "SuperAdmins can delete all responses" ON responses FOR DELETE USING (is_super_admin());
