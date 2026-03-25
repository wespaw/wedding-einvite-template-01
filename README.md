# Wedding Invitation Template

This project is now set up for a `Cloudflare Pages + Supabase` workflow.

Public pages:

- [`index.html`](./index.html): invitation frontend
- [`admin.html`](./admin.html): admin dashboard for updating content and tracking RSVPs

Backend files:

- [`supabase-schema.sql`](./supabase-schema.sql): database schema and policies
- [`supabase-config.js`](./supabase-config.js): frontend/admin connection config
- [`admin.js`](./admin.js): admin page logic

## Recommended Hosting

- Host the invitation on a subdomain like `invite.yourdomain.com` with Cloudflare Pages
- Keep the admin on the same subdomain at `/admin.html`, or move it later to `admin.yourdomain.com`
- Use Supabase for:
  - editable invitation content
  - RSVP storage
  - admin authentication

## Setup Steps

1. Create a Supabase project
2. Open the SQL editor in Supabase
3. Run [`supabase-schema.sql`](./supabase-schema.sql)
4. In Supabase, create an admin user with email/password auth
5. The SQL also creates a public storage bucket called `invitation-assets`
6. Open [`supabase-config.js`](./supabase-config.js)
6. Replace:
   - `YOUR_SUPABASE_URL`
   - `YOUR_SUPABASE_ANON_KEY`
7. Deploy the project to Cloudflare Pages

## What The Backend Stores

`site_settings`

- couple names
- hero date line
- hero venue line
- wedding datetime
- background music URL
- story text
- quote
- venue name
- venue address
- map embed URL
- map link URL
- dress code title and text
- dress code colors
- gallery images
- event timeline
- section visibility settings

`rsvps`

- guest name
- email
- attendance status
- guest count
- message
- submission timestamp

## How To Edit Content

1. Open [`admin.html`](./admin.html)
2. Log in with your Supabase admin email/password
3. Use the `Content` section to:
   - update hero, story, venue, and music fields
   - directly upload gallery images into the content editor
   - add or remove gallery photos
   - add or remove event timeline items
   - add or remove dress code colors
   - show or hide sections on the frontend
4. Save changes
5. Refresh the public invitation page

## Asset Library

The admin dashboard now includes an `Assets` section.

Use it to:

- upload images
- upload videos
- upload music/audio
- copy public asset URLs
- set an uploaded audio file as the background music
- delete unused assets

The `Content` section also has its own direct gallery image upload shortcut, which uploads selected images and appends them to the gallery list automatically.

Uploaded files go into the public Supabase Storage bucket:

- `invitation-assets`

This makes them easy to use directly from your Cloudflare-hosted invitation subdomain.

## How RSVP Works

- The public form in [`index.html`](./index.html) now submits directly to Supabase
- Responses appear in the RSVP table inside [`admin.html`](./admin.html)
- Public visitors can submit RSVPs
- Only authenticated admin users can read RSVP data in the dashboard

## Notes

- If Supabase is not configured yet, the invitation still shows the current hardcoded content
- Once configured, the page will load live content from Supabase
- The public invitation uses the anon key, which is normal for Supabase frontend apps
- If uploads fail with `bucket not found`, create a public Storage bucket named `invitation-assets` in Supabase manually, then rerun [`supabase-schema.sql`](./supabase-schema.sql)

## Local Files Not Required For Setup

- [`content.js`](./content.js) is currently not used
- [`styles.css`](./styles.css) is not the main live invitation stylesheet
- backup files in [`bk`](./bk) are for reference only
