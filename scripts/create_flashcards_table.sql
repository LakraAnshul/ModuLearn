-- Migration: Create flashcards table for storing AI-generated flashcard sets
-- Each row stores one set of flashcards for a specific user + learning path + module combination.

CREATE TABLE IF NOT EXISTS flashcards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  learning_path_id UUID REFERENCES learning_paths(id) ON DELETE CASCADE NOT NULL,
  module_id TEXT NOT NULL,
  cards JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Unique constraint: one flashcard set per user + path + module
ALTER TABLE flashcards ADD CONSTRAINT flashcards_unique_set
  UNIQUE (user_id, learning_path_id, module_id);

-- Enable Row Level Security
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can only access their own flashcards
CREATE POLICY "Users can manage their own flashcards"
  ON flashcards FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for fast lookups by user + path + module
CREATE INDEX idx_flashcards_user_path_module
  ON flashcards(user_id, learning_path_id, module_id);
