# ChatApp — Production Deployment Guide

## Overview

| Layer | Service |
|---|---|
| Frontend + API | Vercel |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Realtime | Supabase Realtime |
| Storage | Supabase Storage |
| Push Notifications | Firebase Cloud Messaging |
| WebRTC | Native browser + STUN/TURN |
| Cron (media cleanup) | Vercel Cron |

---

## 1. Supabase Setup

### 1.1 Create project
1. Go to [supabase.com](https://supabase.com) → New project
2. Choose a strong database password (save it)
3. Region: choose closest to your users

### 1.2 Run migrations
In Supabase SQL editor, run these files **in order**:
1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`
3. `supabase/migrations/003_realtime_and_storage.sql`

### 1.3 Storage buckets
In Supabase dashboard → Storage → Create buckets:

| Bucket | Public | Purpose |
|---|---|---|
| `avatars` | ✅ Yes | User profile photos |
| `group-images` | ✅ Yes | Group cover photos |
| `media` | ❌ No | Chat media (images, videos, audio) |

**Storage RLS policies** (add via dashboard → Storage → Policies):

**avatars bucket:**
```sql
-- Allow authenticated users to upload their own avatar
CREATE POLICY "avatar_upload" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Public read
CREATE POLICY "avatar_read" ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');
```

**group-images bucket:**
```sql
CREATE POLICY "group_img_upload" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'group-images');

CREATE POLICY "group_img_read" ON storage.objects FOR SELECT TO public
USING (bucket_id = 'group-images');
```

**media bucket:**
```sql
-- Users can upload to their own path
CREATE POLICY "media_upload" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Only conversation participants can read media
-- (simplified: allow authenticated users — add stricter logic as needed)
CREATE POLICY "media_read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'media');

-- Service role can delete (for cron cleanup)
CREATE POLICY "media_delete" ON storage.objects FOR DELETE USING (bucket_id = 'media');
```

### 1.4 Auth providers

**Google OAuth:**
1. Supabase → Auth → Providers → Google → Enable
2. Create OAuth app at [console.cloud.google.com](https://console.cloud.google.com)
3. Authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`
4. Paste Client ID + Secret into Supabase

**Apple Sign-In:**
1. Supabase → Auth → Providers → Apple → Enable
2. Requires Apple Developer account
3. Create a Service ID at [developer.apple.com](https://developer.apple.com)
4. Set return URL: `https://your-project.supabase.co/auth/v1/callback`

### 1.5 Realtime
Supabase → Database → Replication → Enable for tables:
- `messages`
- `typing_indicators`
- `calls`
- `call_participants`
- `users`
- `conversation_participants`

---

## 2. Firebase Setup

### 2.1 Create project
1. [console.firebase.google.com](https://console.firebase.google.com) → Add project
2. Project settings → Add web app → Copy config

### 2.2 Enable Cloud Messaging
1. Firebase → Cloud Messaging → Web configuration
2. Generate VAPID key pair → copy the public key

### 2.3 Service account (for server-side send)
1. Firebase → Project settings → Service accounts
2. Generate new private key → download JSON
3. Extract `project_id`, `client_email`, `private_key` for env vars

---

## 3. TURN Server (for WebRTC through NAT/firewalls)

For production with real users behind corporate firewalls, use a TURN server:

**Recommended free-tier providers:**
- [Metered.ca](https://www.metered.ca/tools/openrelay) — free tier available
- [Twilio Network Traversal Service](https://www.twilio.com/stun-turn)
- Self-host [coturn](https://github.com/coturn/coturn)

---

## 4. Vercel Deployment

### 4.1 Import project
```bash
npm i -g vercel
vercel login
vercel
```

Or via GitHub: Vercel dashboard → Import Git repository.

### 4.2 Environment variables
Set these in Vercel → Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL

NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_VAPID_KEY

FIREBASE_ADMIN_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY

NEXT_PUBLIC_STUN_SERVERS
TURN_SERVER_URL             (optional)
TURN_SERVER_USERNAME        (optional)
TURN_SERVER_CREDENTIAL      (optional)

CRON_SECRET
```

**Important:** `FIREBASE_ADMIN_PRIVATE_KEY` must have literal `\n` in the value —
Vercel preserves them correctly if you paste the raw JSON string value.

### 4.3 Cron job
`vercel.json` already configures a daily cleanup at 3am UTC:
```json
"crons": [{ "path": "/api/cron/cleanup-media", "schedule": "0 3 * * *" }]
```
Vercel sends `Authorization: Bearer <CRON_SECRET>` — the route checks `x-cron-secret` header.

> **Note:** Update the cron route to use Vercel's `Authorization` header instead:
> ```ts
> const auth = req.headers.get("authorization");
> if (auth !== `Bearer ${process.env.CRON_SECRET}`) { ... }
> ```

### 4.4 Custom domain
Vercel → Domains → Add your domain → update DNS.

---

## 5. PWA / App-like experience

### iOS (iPhone)
Users can add to Home Screen via Safari → Share → Add to Home Screen.
The app will run in standalone mode with safe area support.

### Android
Chrome will prompt "Add to Home Screen" automatically thanks to the Web App Manifest.

### Icons
Replace placeholder icons at `public/icons/` with your actual app icons:
- `icon-72.png` through `icon-512.png`
- `apple-touch-icon.png` (180×180)

Use a tool like [Real Favicon Generator](https://realfavicongenerator.net).

---

## 6. Security checklist

- [x] Row Level Security on all tables
- [x] Service role key only used server-side (never exposed to client)
- [x] `CRON_SECRET` protects the cleanup endpoint
- [x] Security headers (X-Frame-Options, CSP, etc.) in `next.config.ts`
- [x] Media upload limits enforced server-side (50MB video cap)
- [x] HEIC/HEIF images converted server-side before preview
- [x] WebRTC signalling uses Supabase broadcast channel (no separate signalling server needed)
- [ ] Rotate Supabase service role key periodically
- [ ] Enable Supabase MFA for your admin account
- [ ] Set up Supabase PITR (Point-in-Time Recovery) for production

---

## 7. Post-deployment checklist

- [ ] Run all 3 migrations in Supabase SQL editor
- [ ] Create 3 storage buckets with correct RLS policies
- [ ] Enable Realtime for required tables
- [ ] Configure Google OAuth redirect URIs
- [ ] Configure Apple Sign-In service ID
- [ ] Add all environment variables to Vercel
- [ ] Deploy and verify auth flow
- [ ] Test real-time messaging between two accounts
- [ ] Test media upload (image + video)
- [ ] Test voice recording
- [ ] Test voice/video call
- [ ] Add app to iPhone home screen and test PWA
- [ ] Verify push notifications (requires HTTPS)
- [ ] Trigger cron endpoint manually to verify media cleanup

---

## 8. Local development

```bash
cp .env.local.example .env.local
# fill in your values

npm run dev
# → http://localhost:3000
```

For Supabase local development:
```bash
npm i -g supabase
supabase start
supabase db push
```
