-- Add fixed column to tasks table for dynamic rescheduling
ALTER TABLE tasks ADD COLUMN fixed boolean DEFAULT false;