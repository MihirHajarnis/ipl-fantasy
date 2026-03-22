import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// ── App-wide constants ─────────────────────────────────────────

export const IPL_TEAMS = ['MI','RCB','KKR','DC','SRH','PBKS','RR','CSK','LSG','GT']

export const TEAM_META = {
  MI:   { color:'#004BA0', accent:'#5B9BD5', label:'Mumbai Indians'          },
  RCB:  { color:'#CC0000', accent:'#FF6B5B', label:'Royal Challengers Bangalore' },
  KKR:  { color:'#3B0067', accent:'#9B59B6', label:'Kolkata Knight Riders'   },
  DC:   { color:'#00388C', accent:'#4A90D9', label:'Delhi Capitals'          },
  SRH:  { color:'#E86A00', accent:'#FFA95A', label:'Sunrisers Hyderabad'     },
  PBKS: { color:'#AA1F2E', accent:'#E85A6A', label:'Punjab Kings'            },
  RR:   { color:'#B22082', accent:'#F06FAF', label:'Rajasthan Royals'        },
  CSK:  { color:'#F5A623', accent:'#FFD066', label:'Chennai Super Kings'     },
  LSG:  { color:'#00909E', accent:'#6ECBA3', label:'Lucknow Super Giants'    },
  GT:   { color:'#1C4490', accent:'#4A6A9F', label:'Gujarat Titans'         },
}

// All 60 batting slot IDs
export const ALL_SLOTS = IPL_TEAMS.flatMap(t =>
  Array.from({ length: 6 }, (_, i) => `${t}${i + 1}`)
)

export const PARTICIPANT_COLORS = [
  '#22C55E','#3B82F6','#F59E0B','#A855F7','#EF4444','#06B6D4',
  '#EC4899','#14B8A6','#F97316','#84CC16','#8B5CF6','#E11D48',
]

// Admin credentials — checked client-side (gate) + Supabase service key does real auth
export const ADMIN_USERNAME = 'humadminhai'
export const ADMIN_PASSWORD = 'tujhepasswordnahibataunga@#'   // change before deploy!