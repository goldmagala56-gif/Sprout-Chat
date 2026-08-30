# Sprout → WhatsApp Feature Parity Roadmap

Honest snapshot as of now, plus the order we're tackling what's missing.
Out of scope for the foreseeable future: **voice/video calls**, **Status/Stories**.

---

## Where things actually stand

**Confirmed working (after recent fixes):**
- Email/password auth (sign up, sign in, sign out)
- Responsive shell — mobile single-column, desktop two-pane like WhatsApp Web
- Text messaging: send, receive, realtime updates, no more duplicate bubbles
- Chat list: correct last-message preview, correct ordering, unread badges
- Starting a direct chat, creating a group
- Contacts: add, remove, search
- Profile editing (name, bio, phone)

**Built but non-functional (looks done, isn't):**
- Voice note recording — mic button is inert
- Photo/attachment sending — Gallery/Camera buttons do nothing
- Avatar upload — camera icon on Profile has no handler
- Dark mode toggle — flips a database flag, no theme actually changes
- Notification/sound settings — same, DB flag only

**Not started at all:**
- Reply/quote a specific message
- Deleting a single message
- Emoji picker
- Real typing indicators
- Real online/last-seen presence
- Group info screen (view/add/remove members, leave group, group photo)
- Mute / archive / pin a conversation
- In-chat and cross-chat message search
- Push notifications
- Block / report a contact
- Per-chat shared-media gallery

---

## Phase 1 — Stabilize the core loop (in progress)
Goal: zero crashes, zero silent failures, in the features that already exist.

- [x] Fix mobile layout so Contacts/Profile/Settings are reachable
- [x] Fix duplicate-message bug on send
- [x] Fix chat list showing wrong/first message instead of latest
- [x] Fix `useAuth` and `useConversations` each needing to be a single shared Context (both were crashing when multiple pages called them independently)
- [x] Fix Profile edit form not syncing with async-loaded data
- [ ] **You are here:** full end-to-end test on the live deployed site — contacts, direct chat, group chat, profile edit, two-way messaging between two accounts
- [ ] Delete-conversation error handling + confirm DB cascade behavior

## Phase 2 — Everyday chat essentials
Goal: it stops feeling like a demo and starts feeling like a chat app.

1. **Real photo sending** — Supabase Storage bucket + upload flow + Gallery picker wiring
2. **Real voice notes** — MediaRecorder API + upload, replacing the fake `duration: '0:30'` stub
3. **Reply/quote a message** — schema already has `reply_to`, needs UI (swipe or long-press to reply, quoted preview above composer, tap-to-jump)
4. **Delete a single message** — soft-delete pattern (`deleted_at` column) so it shows "message deleted" like WhatsApp, not a hard delete
5. **Emoji picker** — wire the existing smiley button to an actual picker component
6. **Real typing indicators** — Supabase Presence channel per conversation (the `typingUsers` state already exists in `useMessages`, currently unused)
7. **Real online/last-seen** — Presence channel updating `profiles.online`/`last_seen`, replacing the static field

## Phase 3 — Group & chat management
1. Group info screen — member list, add/remove (admin-only), leave group, set group photo
2. Mute / archive / pin a conversation — new columns on `conversation_participants`
3. In-chat message search
4. Cross-chat search (find a conversation or message from anywhere)

## Phase 4 — Account & polish
1. Dark mode — actual theme switching (Tailwind dark: classes + a toggle in a top-level context)
2. Push notifications (browser Push API + service worker)
3. Block / report a contact
4. Per-chat media gallery (all shared photos/files in one view)

---

## How we'll work through this
One item at a time, in order, unless you want to jump ahead. For each: I give you the code, you apply and deploy, we test on your phone against the live site, then move to the next. If something breaks, we fix it before adding the next feature on top — that's what caused most of today's confusion, several changes stacked before testing any of them.