-- ============================================================
-- SPROUT MIGRATION — address-book contacts, critical RLS fixes,
-- mute/archive/pin, soft-delete messages, media storage,
-- and groundwork for blocking + push notifications
-- (safe to re-run — drops policies before recreating them)
-- ============================================================

-- ------------------------------------------------------------
-- 1. CRITICAL FIX: missing RLS policies
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "Participants can delete conversations" ON conversations;
CREATE POLICY "Participants can delete conversations" ON conversations
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Leave group or admin removes member" ON conversation_participants;
CREATE POLICY "Leave group or admin removes member" ON conversation_participants
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
        AND cp.user_id = auth.uid() AND cp.is_admin = TRUE
    )
  );

DROP POLICY IF EXISTS "Admins can add members to existing groups" ON conversation_participants;
CREATE POLICY "Admins can add members to existing groups" ON conversation_participants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
        AND cp.user_id = auth.uid() AND cp.is_admin = TRUE
    )
  );

CREATE OR REPLACE FUNCTION create_group_conversation(group_name TEXT, member_ids UUID[], creator_id UUID)
RETURNS UUID AS $$
DECLARE
  conv_id UUID;
  member UUID;
BEGIN
  INSERT INTO conversations (name, is_group, created_by) VALUES (group_name, TRUE, creator_id) RETURNING id INTO conv_id;
  INSERT INTO conversation_participants (conversation_id, user_id, is_admin) VALUES (conv_id, creator_id, TRUE);

  FOREACH member IN ARRAY member_ids LOOP
    IF member <> creator_id THEN
      INSERT INTO conversation_participants (conversation_id, user_id, is_admin)
      VALUES (conv_id, member, FALSE)
      ON CONFLICT (conversation_id, user_id) DO NOTHING;
    END IF;
  END LOOP;

  RETURN conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------
-- 2. CONTACTS REDESIGN — address-book style
-- ------------------------------------------------------------

ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_owner_id_contact_id_key;
ALTER TABLE contacts ALTER COLUMN contact_id DROP NOT NULL;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '';

UPDATE contacts c SET phone = p.phone, name = p.name
FROM profiles p
WHERE c.contact_id = p.id AND c.phone = '' AND p.phone IS NOT NULL;

ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_owner_phone_unique;
ALTER TABLE contacts ADD CONSTRAINT contacts_owner_phone_unique UNIQUE (owner_id, phone);

CREATE OR REPLACE FUNCTION link_contacts_on_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE contacts
  SET contact_id = NEW.id
  WHERE phone = NEW.phone AND contact_id IS NULL AND NEW.phone IS NOT NULL AND NEW.phone <> '';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_profile_created_link_contacts
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION link_contacts_on_new_profile();

-- ------------------------------------------------------------
-- 3. CONVERSATION PARTICIPANTS — mute / archive / pin
-- ------------------------------------------------------------

ALTER TABLE conversation_participants ADD COLUMN IF NOT EXISTS is_muted BOOLEAN DEFAULT FALSE;
ALTER TABLE conversation_participants ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE conversation_participants ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE conversation_participants ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;

-- ------------------------------------------------------------
-- 4. MESSAGES — soft delete
-- ------------------------------------------------------------

ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

DROP POLICY IF EXISTS "Senders can edit or soft-delete their own messages" ON messages;
CREATE POLICY "Senders can edit or soft-delete their own messages" ON messages
  FOR UPDATE USING (sender_id = auth.uid());

-- ------------------------------------------------------------
-- 5. STORAGE — photo/voice attachments + profile avatars
-- ------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public) VALUES ('chat-media', 'chat-media', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Chat media is publicly readable" ON storage.objects;
CREATE POLICY "Chat media is publicly readable" ON storage.objects FOR SELECT USING (bucket_id = 'chat-media');
DROP POLICY IF EXISTS "Authenticated users can upload chat media" ON storage.objects;
CREATE POLICY "Authenticated users can upload chat media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-media' AND auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Users can delete their own chat media" ON storage.objects;
CREATE POLICY "Users can delete their own chat media" ON storage.objects FOR DELETE USING (bucket_id = 'chat-media' AND owner = auth.uid());

DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
CREATE POLICY "Avatars are publicly readable" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Users can replace their own avatar" ON storage.objects;
CREATE POLICY "Users can replace their own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND owner = auth.uid());

-- ------------------------------------------------------------
-- 6. GROUNDWORK for Phase 4
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  blocked_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(owner_id, blocked_id)
);
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View own blocks" ON blocked_users;
CREATE POLICY "View own blocks" ON blocked_users FOR SELECT USING (owner_id = auth.uid());
DROP POLICY IF EXISTS "Insert own blocks" ON blocked_users;
CREATE POLICY "Insert own blocks" ON blocked_users FOR INSERT WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS "Delete own blocks" ON blocked_users;
CREATE POLICY "Delete own blocks" ON blocked_users FOR DELETE USING (owner_id = auth.uid());

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View own push subs" ON push_subscriptions;
CREATE POLICY "View own push subs" ON push_subscriptions FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Insert own push subs" ON push_subscriptions;
CREATE POLICY "Insert own push subs" ON push_subscriptions FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Delete own push subs" ON push_subscriptions;
CREATE POLICY "Delete own push subs" ON push_subscriptions FOR DELETE USING (user_id = auth.uid());