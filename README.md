# HostelDesk

A full-stack hostel complaint management web app with AI-powered categorization, duplicate detection, and rewrite suggestions.

## Tech Stack

- **Frontend:** React + Vite
- **Backend:** FastAPI (Python)
- **Database / Auth / Realtime:** Supabase
- **AI:** Groq API (`llama-3.3-70b-versatile`)
- **Styling:** Custom CSS (dark theme, Syne + DM Sans fonts)

---

## Project Structure

```
hosteldesk/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── context/
│   │   ├── supabaseClient.js
│   │   └── App.jsx
│   ├── index.html
│   ├── package.json
│   └── .env.example
└── schema.sql
```

---

## Setup Instructions

### 1. Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project.

2. Once created, go to **SQL Editor** and paste the entire contents of `schema.sql`. Run it. This creates all tables, RLS policies, triggers, and enables realtime.

3. In your Supabase project settings:
   - Go to **Settings → API**
   - Copy your **Project URL** and **anon public key**

4. Enable Email Auth:
   - Go to **Authentication → Providers**
   - Ensure Email is enabled
   - Optionally disable "Confirm email" for local dev (Authentication → Email Templates)

---

### 2. Groq API Key

1. Go to [console.groq.com](https://console.groq.com) and sign up.
2. Create an API key.

---

### 3. Backend Setup

```bash
cd backend

# Copy env file
cp .env.example .env
# Edit .env and add your GROQ_API_KEY

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn main:app --reload --port 8000
```

The backend will be available at `http://localhost:8000`.  
Test it: `http://localhost:8000/health` → `{"status": "ok"}`

---

### 4. Frontend Setup

```bash
cd frontend

# Copy env file
cp .env.example .env
```

Edit `frontend/.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_BACKEND_URL=http://localhost:8000
VITE_INCHARGE_SECRET=mysecret123
```

> `VITE_INCHARGE_SECRET` is a code that incharge accounts must enter during signup to prevent unauthorized access. Set it to anything you want.

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

The app will be at `http://localhost:5173`.

---

## Usage

### Creating accounts

1. Go to `/signup`
2. **Resident:** Choose role "Resident", fill in room number
3. **Incharge:** Choose role "Incharge", enter the secret code (matches `VITE_INCHARGE_SECRET`)

### Resident Flow

1. **Dashboard** — view your complaints and notifications
2. **New Complaint** — fill in topic + details, click "Analyze & Continue" to get AI categorization, priority score, and duplicate detection. Use "AI Rewrite" to improve your complaint text.
3. **My Complaints** — view all your complaints with real-time status updates
4. **Discussions** — see all public complaints, upvote and join others
5. **Announcements** — read announcements from incharge

### Incharge Flow

1. **Dashboard** — stats and charts overview
2. **All Complaints** — sortable/filterable table of every complaint
3. Click any complaint → full detail view with:
   - AI analysis and priority reason
   - Status change controls
   - Add progress updates (notifies all joined residents)
   - List of residents who joined the complaint
4. **Announcements** — post announcements (notifies all residents via in-app notification)

### Public Dashboard

- Visit `/public` — no login required
- Shows stats, charts, and top complaints

---

## Email Notifications (Optional — Resend + Supabase Edge Functions)

Email notifications are handled via in-app notifications by default. To enable actual emails:

1. Sign up at [resend.com](https://resend.com) and get an API key.
2. In your Supabase project, create an Edge Function:
   - Go to **Edge Functions → New Function**
   - Name it `send-email`
3. Deploy a function that calls the Resend API when triggered by database webhooks on the `notifications` table.

Example edge function skeleton:
```typescript
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req) => {
  const { record } = await req.json();
  
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "HostelDesk <noreply@yourdomain.com>",
      to: [record.email],
      subject: `[HostelDesk] ${record.type}`,
      html: `<p>${record.message}</p>`,
    }),
  });

  return new Response("ok");
});
```

Set it up as a database webhook in **Database → Webhooks** triggered on INSERT into `notifications`.

---

## RLS Summary

| Table | Resident | Incharge | Public (anon) |
|-------|----------|----------|---------------|
| profiles | Own only | All | None |
| complaints | Own only | All | is_public=true |
| complaint_joins | Own only | All (read) | None |
| upvotes | Own only | — | None |
| progress_updates | Read all | Insert + Read | None |
| announcements | Read | Insert + Read | None |
| notifications | Own only | — | None |

---

## Building for Production

```bash
# Frontend
cd frontend
npm run build
# Output in frontend/dist/

# Backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

Deploy frontend to Vercel/Netlify, backend to Railway/Render/Fly.io.
