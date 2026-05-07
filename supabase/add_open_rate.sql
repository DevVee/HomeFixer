-- Migration: Add is_open_rate to provider_profiles
-- Run this in your Supabase SQL Editor

ALTER TABLE provider_profiles
  ADD COLUMN IF NOT EXISTS is_open_rate BOOLEAN NOT NULL DEFAULT FALSE;
