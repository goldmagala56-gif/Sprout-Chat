# 🌱 Sprout Chat v2.0

A production-grade chat application built with **React + Supabase + Tailwind CSS**, inspired by WhatsApp's architecture and scaling patterns.

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
cd sprout-chat-app
npm install
```

### 2. Set up Supabase

1. Go to [https://supabase.com](https://supabase.com) and create a new project
2. Copy your **Project URL** and **Anon Key** from Settings → API
3. Create `.env` in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

### 3. Run the SQL Schema

Open the Supabase SQL Editor and run everything in `supabase-schema.sql`.

This creates:
- `profiles` table (extends auth.users)
- `conversations` & `conversation_participants`
- `messages` & `message_reads`
- `contacts`
- Row Level Security (RLS) policies
- Realtime subscriptions
- Helper functions

### 4. Enable Realtime

In Supabase Dashboard → Database → Replication:
- Enable `messages`, `conversation_participants`, `profiles` for realtime

### 5. Run the App

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React App     │────▶│   Supabase      │────▶│   PostgreSQL    │
│                 │     │                 │     │                 │
│ • Auth          │◄────│ • Auth          │     │ • Profiles      │
│ • Realtime subs │◄────│ • Realtime      │     │ • Messages      │
│ • Optimistic UI │     │ • REST API      │     │ • Conversations │
│ • File upload   │     │ • Storage       │     │ • Contacts      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### WhatsApp Patterns Adopted

| Pattern | Implementation |
|---------|---------------|
| **Sidebar + Chat** | Desktop: 400px sidebar + flex chat. Mobile: Full-screen with bottom nav |
| **Message Bubbles** | Sent = green (#DCF4E3), Received = white, with tail corners |
| **Checkmarks** | Single gray = sent, Double blue = read (via `message_reads` table) |
| **Chat List** | Avatar, name, last message preview, timestamp, unread badge |
| **Online Status** | Green dot + "Online" text, last seen for offline |
| **Bottom Nav** | Mobile-only: Chats, Status, Contacts, Settings |
| **Optimistic UI** | Messages appear instantly, updated with server ID after confirm |
| **Infinite Scroll** | Messages load 50 at a time, older loaded on scroll |

---

## 📁 Project Structure

```
src/
├── lib/
│   └── supabase.js          # Supabase client + helpers
├── hooks/
│   ├── useAuth.js           # Authentication + profile
│   ├── useConversations.js  # Chat list + create/delete
│   ├── useMessages.js       # Messages + realtime + optimistic
│   └── useContacts.js       # Contact management
├── components/
│   ├── ui/
│   │   └── Avatar.jsx       # Reusable avatar with online dot
│   ├── layout/
│   │   ├── AppShell.jsx     # Main app layout (sidebar + content)
│   │   ├── BottomNav.jsx    # Mobile bottom navigation
│   │   ├── ChatList.jsx     # Chat list container
│   │   └── ChatListItem.jsx # Individual chat row
│   └── chat/
│       ├── ChatWindow.jsx   # Full chat view (header + messages + composer)
│       ├── MessageBubble.jsx # Individual message bubble
│       └── Composer.jsx     # Message input + attach menu
├── pages/
│   ├── LoginPage.jsx
│   ├── RegisterPage.jsx
│   ├── ChatsPage.jsx
│   ├── ChatPage.jsx
│   ├── ContactsPage.jsx
│   ├── NewChatPage.jsx
│   ├── ProfilePage.jsx
│   ├── SettingsPage.jsx
│   └── StatusPage.jsx
├── utils/
│   ├── constants.js         # Colors, sizes, breakpoints
│   └── formatters.js        # Time formatting, initials
└── App.jsx                  # Router + auth guards
```

---

## 📸 Free Photo/Video Hosting Plan

For 4,000 users sharing photos and videos, here's your **zero-cost scaling path**:

### Phase 1: Cloudinary (Free Tier) — Start Here ✅

**Why Cloudinary?**
- **25 GB storage** + **25 GB monthly bandwidth**
- **25,000 transformations/month** (resizing, compression, format conversion)
- **Free forever** for your scale
- Automatic image optimization (WebP, AVIF)
- Video streaming with adaptive bitrate
- CDN delivery worldwide

**Setup:**
1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Get your Cloud Name, API Key, API Secret
3. Use the **Unsigned Upload Preset** for client-side uploads
4. Store the returned URL in Supabase `messages.file_url`

**Code pattern:**
```javascript
// Upload image to Cloudinary
const formData = new FormData();
formData.append('file', imageFile);
formData.append('upload_preset', 'sprout_unsigned');

const res = await fetch('https://api.cloudinary.com/v1_1/YOUR_NAME/image/upload', {
  method: 'POST',
  body: formData,
});
const data = await res.json();
// data.secure_url → save to Supabase message
```

### Phase 2: Supabase Storage (Built-in)

- **1 GB storage** + **2 GB egress/month** on free tier
- Good for small files, avatars, thumbnails
- Use for: User profile pictures, small attachments
- **Limit:** Will hit bandwidth limits at ~500 active users

### Phase 3: Backblaze B2 (When you outgrow free)

- **10 GB free** storage
- **$0.005/GB/month** after (cheapest in industry)
- **$0.01/GB** download (1/10th of AWS S3)
- Integrate with Cloudflare CDN for free bandwidth

### Phase 4: AWS S3 + CloudFront (Enterprise scale)

- Only when you're making revenue
- Most expensive but most reliable

### 📊 Cost Projection for 4K Users

| Service | Free Tier | Your Usage | Cost |
|---------|-----------|------------|------|
| **Supabase** | 500MB DB, 1GB storage | Text chat + metadata | **$0** |
| **Cloudinary** | 25GB storage, 25GB bandwidth | Photos + short videos | **$0** |
| **Total** | | | **$0/month** |

**When you need to pay:**
- At ~5,000+ monthly active users sharing lots of media
- Cloudinary paid plan: **$25/month** for 225GB storage + bandwidth
- That's when you have revenue to cover it

---

## 🔐 Security

- **Row Level Security (RLS)** on all tables
- Users can only read conversations they're in
- Messages are scoped to conversation membership
- Contacts are private per user
- Auth handled by Supabase (JWT, bcrypt, session management)

---

## 📱 Mobile-First Design

- **Responsive:** Works on 320px to 4K screens
- **Bottom navigation** on mobile (WhatsApp-style)
- **Sidebar** on desktop (400px fixed width)
- **Touch-friendly** targets (min 44px)
- **Overscroll disabled** to prevent bounce

---

## 🚀 Deployment

### Frontend (Vercel — Free)

```bash
npm run build
# Drag dist/ folder to vercel.com
```

### Backend (Supabase — Already hosted)

Your backend is Supabase. Zero deployment needed.

### Custom Domain

1. Buy domain (Namecheap ~$10/year)
2. Add to Vercel project settings
3. Add to Supabase Auth → URL Configuration (for redirects)

---

## 🛣️ Roadmap

### v2.1 (Next)
- [ ] Image sharing via Cloudinary
- [ ] Voice messages (Web Audio API recording)
- [ ] Message replies & threads
- [ ] Emoji reactions
- [ ] Push notifications (Firebase Cloud Messaging)

### v2.2
- [ ] Status/Stories (24h disappearing)
- [ ] Voice calls (WebRTC)
- [ ] Video calls (WebRTC)
- [ ] Message search
- [ ] Dark mode toggle

### v3.0
- [ ] React Native mobile app
- [ ] End-to-end encryption (Signal Protocol)
- [ ] AI chatbot integration

---

## 📝 License

MIT — Build something amazing.

Built with 💚 by the Sprout team.
