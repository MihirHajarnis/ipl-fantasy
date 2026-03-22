# 🏏 IPL Fantasy League — Setup Guide

Complete guide to get this running on GitHub + Vercel + Supabase (all free).

---

## Stack

| Layer    | Service         | Cost |
|----------|-----------------|------|
| Frontend | Vercel          | Free |
| Database | Supabase        | Free |
| Hosting  | GitHub → Vercel | Free |
| Realtime | Supabase        | Free |

---

## Step 1 — Set up Supabase (database)

1. Go to **https://supabase.com** and create a free account
2. Click **New Project** — choose a name like `ipl-fantasy`, set a strong DB password, pick a region close to you
3. Wait ~2 minutes for the project to spin up
4. Go to **SQL Editor** (left sidebar)
5. Click **New Query**, paste the entire contents of `supabase/migrations/001_schema.sql`, and click **Run**
6. You should see "Success" — this creates all tables, views, and RLS policies

### Get your Supabase credentials

Go to **Settings → API** in your Supabase project:

- Copy **Project URL** → this is your `VITE_SUPABASE_URL`
- Copy **anon / public** key → this is your `VITE_SUPABASE_ANON_KEY`

---

## Step 2 — Set up GitHub repo

```bash
# In the ipl-fantasy folder:
git init
git add .
git commit -m "Initial commit — IPL Fantasy League"

# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/ipl-fantasy.git
git branch -M main
git push -u origin main
```

---

## Step 3 — Deploy to Vercel

1. Go to **https://vercel.com** and sign in with GitHub
2. Click **Add New → Project**
3. Import your `ipl-fantasy` GitHub repo
4. In **Environment Variables**, add:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
5. Click **Deploy**
6. Done! Vercel gives you a URL like `ipl-fantasy.vercel.app`

### Auto-deploy on push
Every `git push` to `main` will automatically redeploy. No action needed.

---

## Step 4 — Change admin credentials (important!)

Open `src/lib/supabase.js` and change these two lines:

```js
export const ADMIN_USERNAME = 'commissioner'   // change this
export const ADMIN_PASSWORD = 'ipl2025admin'   // change this to something strong
```

Commit and push. The new credentials will deploy automatically.

---

## Step 5 — Run the Draft

1. Log in as admin (username + password you set above)
2. Go to **Draft Picker**
3. Click **Next Cycle** 5 times — each cycle randomly assigns one slot to each participant
4. Click **Commit & Start Season** to lock in teams
5. Participants can now log in and see their squads

---

## Step 6 — Entering scores after each match

1. Log in as admin
2. Go to **Enter Scores**
3. Click **+ New Match** and create the match (e.g. "M1", home/away teams, date)
4. Select the match from the list
5. Enter **runs** for any slots that batted (filter by team or participant to find quickly)
   - Balls, Fours, Sixes are optional — they only affect visualizations
6. Click **Save Draft** to save without showing participants
7. Click **Publish Scores** to make it live — leaderboard updates in real time for everyone

---

## How participants log in

Each participant has a unique access code:

| Name       | Code   |
|------------|--------|
| Ashay      | ASH001 |
| Kunal      | KUN002 |
| Tanmay     | TAN003 |
| Mihir      | MIH004 |
| Pratik     | PRA005 |
| Santosh    | SAN006 |
| Tushar     | TUS007 |
| Pratham    | PTH008 |
| Padmanabh  | PAD009 |
| Vishal     | VIS010 |
| Arvind     | ARV011 |
| Mit        | MIT012 |

Share the Vercel URL and their code. They enter the code on the login screen.

---

## Scoring rules

- **Points = Runs only** — 1 run = 1 point
- Each participant's score = total runs across all 5 of their batting slots
- Runs accumulate across every published match (no reset)
- Balls, Fours, Sixes are tracked for stats/visualization but do not affect points

---

## Data safety

- All data is stored in Supabase Postgres — persistent, not in-memory
- Realtime subscriptions mean all users see score updates within seconds of publishing
- No data is ever lost — every match score is a permanent record
- You can always query the database directly in Supabase if needed

---

## Local development

```bash
# Install dependencies
npm install

# Create local env file
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Start dev server
npm run dev
# Open http://localhost:5173
```

---

## File structure

```
ipl-fantasy/
├── src/
│   ├── context/
│   │   └── AppContext.jsx      # Global state + realtime
│   ├── lib/
│   │   ├── supabase.js         # Client + constants
│   │   └── api.js              # All DB functions
│   ├── components/
│   │   ├── Layout.jsx          # Sidebar nav
│   │   └── ui.jsx              # Shared atoms
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── Dashboard.jsx       # Leaderboard
│   │   ├── AdminDashboard.jsx  # Admin overview
│   │   ├── AdminScores.jsx     # Score entry
│   │   ├── MySquad.jsx
│   │   ├── AllSlots.jsx
│   │   ├── SlotDetail.jsx
│   │   ├── Verification.jsx
│   │   └── DraftPicker.jsx
│   ├── App.jsx
│   └── main.jsx
├── supabase/
│   └── migrations/
│       └── 001_schema.sql      # Run this in Supabase SQL Editor
├── public/
│   └── cricket.svg
├── .env.example                # Copy to .env.local
├── .gitignore
├── index.html
├── package.json
├── vite.config.js
└── README.md
```
