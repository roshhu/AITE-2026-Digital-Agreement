# 🚀 Deployment Guide: AITE-2026 Volunteer System

This project is configured for **Vercel** or **Netlify**. Follow these steps to make your URLs live.

## 1. Prerequisites
- A **GitHub** or **GitLab** account.
- A **Vercel** account (https://vercel.com).
- Access to your **GoDaddy** DNS panel.

## 2. Push Code to GitHub
1. Create a new repository on GitHub (e.g., `aite-2026-portal`).
2. Push all files from this project to that repository.

## 3. Deploy to Vercel
1. Log in to **Vercel Dashboard**.
2. Click **"Add New..."** -> **"Project"**.
3. Import your `aite-2026-portal` repository.
4. **Build Settings**: Vercel usually detects Vite automatically.
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Click **Deploy**.

## 4. Configure Domains (Dual Portal)
Once the project is deployed, go to **Settings** -> **Domains** in Vercel.

### A. Add Volunteer Domain
1. Enter: `volunteers.tgaite2026.site`
2. Vercel will give you a **CNAME** value (usually `cname.vercel-dns.com`).
3. Go to GoDaddy -> DNS Management for `tgaite2026.site`.
4. Add Record:
   - Type: **CNAME**
   - Name: `volunteers`
   - Value: `cname.vercel-dns.com`

### B. Add Admin Domain
1. Enter: `admin.tgaite2026.site`
2. Vercel will give you the same CNAME value.
3. Go to GoDaddy.
4. Add Record:
   - Type: **CNAME**
   - Name: `admin`
   - Value: `cname.vercel-dns.com`

## 5. Verify Environment Variables
In Vercel **Settings** -> **Environment Variables**, add:
- `VITE_SUPABASE_URL`: (Your Supabase URL)
- `VITE_SUPABASE_ANON_KEY`: (Your Supabase Anon Key)

## 6. Troubleshooting "Service Unavailable"
If you see this error:
- **Check DNS**: Propagation can take up to 48 hours, but usually 30 mins.
- **Check Deployment**: Ensure Vercel shows "Ready" (Green).
- **Check Console**: Open browser DevTools (F12) to see if there are build errors.

---
**Status**: The code is production-ready. Once you complete Step 3 & 4, the system will be live.
