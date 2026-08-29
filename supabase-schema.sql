-- ============================================================
-- SPROUT CHAT - SUPABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  initials TEXT GENERATED ALWAYS AS (UPPER(LEFT(name, 1)) || COALESCE(UPPER(SUBSTRING(name FROM '\s(.)')), '')) STORED,
  avatar_url TEXT,
  bio TEXT DEFAULT 'Hey there! I am using Sprout. 🌱',
  phone TEXT,
  status TEXT DEFAULT 'Online',
  online BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  settings JSONB DEFAULT '{"notifications": true, "sound": true, "darkMode": false, "readReceipts": true, "typingIndicators": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'name', 'Sprout User'), new.phone);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- CONVERSATIONS
-- ============================================================
CREATE TABLE conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT,
  is_group BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CONVERSATION PARTICIPANTS
-- ============================================================
CREATE TABLE conversation_participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  unread_count INTEGER DEFAULT 0,
  is_admin BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  text TEXT NOT NULL DEFAULT '',
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'voice', 'file')),
  file_url TEXT,
  duration TEXT,
  reply_to UUID REFERENCES messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast message queries
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);

-- ============================================================
-- MESSAGE READS (read receipts)
-- ============================================================
CREATE TABLE message_reads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- ============================================================
-- CONTACTS
-- ============================================================
CREATE TABLE contacts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(owner_id, contact_id)
);

-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all profiles (for contacts/search), update own
CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Conversations: view if participant
CREATE POLICY "View conversations if participant" ON conversations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = id AND user_id = auth.uid())
  );

-- Conversation participants: view if in same conversation
CREATE POLICY "View participants if in conversation" ON conversation_participants
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM conversation_participants cp2 WHERE cp2.conversation_id = conversation_id AND cp2.user_id = auth.uid())
  );
CREATE POLICY "Users can update own participant row" ON conversation_participants
  FOR UPDATE USING (user_id = auth.uid());

-- Messages: view if in conversation, insert if in conversation
CREATE POLICY "View messages if in conversation" ON messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
  );
CREATE POLICY "Insert messages if in conversation" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
  );

-- Message reads: view if in conversation
CREATE POLICY "View reads if in conversation" ON message_reads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
      WHERE m.id = message_reads.message_id AND cp.user_id = auth.uid()
    )
  );

-- Contacts: view own contacts
CREATE POLICY "View own contacts" ON contacts
  FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Insert own contacts" ON contacts
  FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Delete own contacts" ON contacts
  FOR DELETE USING (owner_id = auth.uid());

-- ============================================================
-- REALTIME SETUP
-- ============================================================
-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- ============================================================
-- FUNCTIONS
-- ============================================================
-- Get or create direct conversation
CREATE OR REPLACE FUNCTION get_or_create_direct_conversation(user1 UUID, user2 UUID)
RETURNS UUID AS $$
DECLARE
  conv_id UUID;
BEGIN
  -- Check if direct conversation exists
  SELECT c.id INTO conv_id
  FROM conversations c
  WHERE c.is_group = FALSE
    AND EXISTS (SELECT 1 FROM conversation_participants p WHERE p.conversation_id = c.id AND p.user_id = user1)
    AND EXISTS (SELECT 1 FROM conversation_participants p WHERE p.conversation_id = c.id AND p.user_id = user2)
    AND (SELECT COUNT(*) FROM conversation_participants p WHERE p.conversation_id = c.id) = 2
  LIMIT 1;

  IF conv_id IS NOT NULL THEN
    RETURN conv_id;
  END IF;

  -- Create new conversation
  INSERT INTO conversations (is_group) VALUES (FALSE) RETURNING id INTO conv_id;
  INSERT INTO conversation_participants (conversation_id, user_id) VALUES (conv_id, user1);
  INSERT INTO conversation_participants (conversation_id, user_id) VALUES (conv_id, user2);

  RETURN conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(conv_id UUID, reader_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Insert read records for unread messages
  INSERT INTO message_reads (message_id, user_id)
  SELECT m.id, reader_id
  FROM messages m
  WHERE m.conversation_id = conv_id
    AND m.sender_id != reader_id
    AND NOT EXISTS (
      SELECT 1 FROM message_reads mr WHERE mr.message_id = m.id AND mr.user_id = reader_id
    );

  -- Reset unread count
  UPDATE conversation_participants
  SET unread_count = 0
  WHERE conversation_id = conv_id AND user_id = reader_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
