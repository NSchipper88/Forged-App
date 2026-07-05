import { useState, useEffect, useRef, Component } from "react";

// ── Supabase config (live shared backend for cohort) ──────────────────────────
const SUPABASE_URL = "https://dgdcjvbbabrlbxbsrwgj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnZGNqdmJiYWJybGJ4YnNyd2dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NzM4MjcsImV4cCI6MjA5ODM0OTgyN30.IdQPLkA__lKVc3EWVAMtICg0B8h4c28LitvO_NjOtcE";

async function supabaseRequest(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const errText = await res.text().catch(()=> "");
    throw new Error(`Supabase ${res.status}: ${errText}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ── Storage helpers (personal data stays local) ───────────────────────────────
const STORE_KEY = "forge-user-data";

// ── Domain mission system ─────────────────────────────────────────────────────
const DOMAINS = [
  {
    domain:"father", label:"Father", emoji:"👨‍👧", identity_claim:"I am present",
    tiers:{
      good:{ vote_weight:1, actions:[
        {id:"father_good_01",text:"Phone in another room for 15 min of one-on-one time",requires_metric:false},
        {id:"father_good_02",text:"Read one book together, no phone in room",requires_metric:false},
        {id:"father_good_03",text:"Ask one real question about their day and actually listen",requires_metric:false},
        {id:"father_good_04",text:"Play something they chose for 20 minutes, no distractions",requires_metric:false},
      ]},
      better:{ vote_weight:2, actions:[
        {id:"father_better_01",text:"30 min one-on-one, kid picks the activity",requires_metric:false},
        {id:"father_better_02",text:"Full dinner + bedtime routine solo, no phone",requires_metric:false},
        {id:"father_better_03",text:"Teach them one skill or lesson intentionally today",requires_metric:true,metric_prompt:"What did you teach them?"},
        {id:"father_better_04",text:"Have a real conversation about something that matters to them",requires_metric:true,metric_prompt:"What did you talk about?"},
      ]},
      best:{ vote_weight:3, actions:[
        {id:"father_best_01",text:"30 min one-on-one + follow up later on something they mentioned",requires_metric:true,metric_prompt:"What did you follow up on?"},
        {id:"father_best_02",text:"Plan and execute a deliberate experience together — not screen time",requires_metric:true,metric_prompt:"What did you do and how did they respond?"},
        {id:"father_best_03",text:"Tell them specifically what you're proud of about them today",requires_metric:true,metric_prompt:"What did you tell them?"},
      ]},
    },
    rotation_pool_size:4, rotation_refresh_days:14
  },
  {
    domain:"husband", label:"Husband", emoji:"💍", identity_claim:"I am the man she chose",
    tiers:{
      good:{ vote_weight:1, actions:[
        {id:"husband_good_01",text:"Put the phone down during one conversation today",requires_metric:false},
        {id:"husband_good_02",text:"Ask how she's doing and actually wait for the real answer",requires_metric:false},
        {id:"husband_good_03",text:"Handle one task she would have had to ask about",requires_metric:false},
        {id:"husband_good_04",text:"Tell her one specific thing you appreciate about her today",requires_metric:false},
      ]},
      better:{ vote_weight:2, actions:[
        {id:"husband_better_01",text:"15 minutes of undivided attention — no agenda, just presence",requires_metric:false},
        {id:"husband_better_02",text:"Initiate a real conversation about something that matters to her",requires_metric:true,metric_prompt:"What did you talk about?"},
        {id:"husband_better_03",text:"Take something off her plate without being asked",requires_metric:true,metric_prompt:"What did you handle?"},
        {id:"husband_better_04",text:"De-escalate one moment of tension — lower your voice, ask first",requires_metric:false},
      ]},
      best:{ vote_weight:3, actions:[
        {id:"husband_best_01",text:"Plan and execute something for her — not for both of you, for her",requires_metric:true,metric_prompt:"What did you do and how did she respond?"},
        {id:"husband_best_02",text:"Have a direct conversation about something you've been avoiding",requires_metric:true,metric_prompt:"What did you address?"},
        {id:"husband_best_03",text:"Ask her what she needs most from you right now and act on it",requires_metric:true,metric_prompt:"What did she say and what did you do?"},
      ]},
    },
    rotation_pool_size:4, rotation_refresh_days:14
  },
  {
    domain:"businessman", label:"Businessman", emoji:"⚡", identity_claim:"I build wealth through solving real problems",
    tiers:{
      good:{ vote_weight:1, actions:[
        {id:"biz_good_01",text:"Complete one task that moves a current project forward",requires_metric:false},
        {id:"biz_good_02",text:"Spend 30 min learning one skill relevant to your target industry",requires_metric:false},
        {id:"biz_good_03",text:"Review your numbers — revenue, pipeline, or progress metrics",requires_metric:false},
        {id:"biz_good_04",text:"Make one outreach — email, call, or message to someone who matters",requires_metric:false},
      ]},
      better:{ vote_weight:2, actions:[
        {id:"biz_better_01",text:"Complete one revenue-generating or credential-building action",requires_metric:true,metric_prompt:"What did you complete and what's the direct outcome?"},
        {id:"biz_better_02",text:"Run a pre-mortem on a current decision or project",requires_metric:true,metric_prompt:"What vulnerabilities did you find?"},
        {id:"biz_better_03",text:"Have one high-value conversation — recruiter, mentor, potential client",requires_metric:true,metric_prompt:"Who did you talk to and what came from it?"},
        {id:"biz_better_04",text:"Eliminate one inefficiency or distraction from your work environment",requires_metric:true,metric_prompt:"What did you remove or fix?"},
      ]},
      best:{ vote_weight:3, actions:[
        {id:"biz_best_01",text:"Build or advance one system that works without you in it",requires_metric:true,metric_prompt:"What did you build and how does it run without you?"},
        {id:"biz_best_02",text:"Make a hard decision you've been deferring — commit and act",requires_metric:true,metric_prompt:"What was the decision and what did you choose?"},
        {id:"biz_best_03",text:"Produce something that creates future opportunity",requires_metric:true,metric_prompt:"What did you produce?"},
      ]},
    },
    rotation_pool_size:4, rotation_refresh_days:14
  },
  {
    domain:"fitness", label:"Fitness", emoji:"🔥", identity_claim:"My body is my platform",
    tiers:{
      good:{ vote_weight:1, actions:[
        {id:"fitness_good_01",text:"Train for at least 30 minutes — any modality, full effort",requires_metric:false},
        {id:"fitness_good_02",text:"Eat with intention today — no mindless eating, protein first",requires_metric:false},
        {id:"fitness_good_03",text:"7+ hours of sleep targeted — in bed on time tonight",requires_metric:false},
        {id:"fitness_good_04",text:"10 min mobility or McGill Big 3 — protect the platform",requires_metric:false},
      ]},
      better:{ vote_weight:2, actions:[
        {id:"fitness_better_01",text:"Full training session — logged, intentional, progressive",requires_metric:true,metric_prompt:"What did you train and what was one PR or improvement?"},
        {id:"fitness_better_02",text:"Norwegian 4x4 cardio protocol — full execution",requires_metric:true,metric_prompt:"What were your intervals and how did it feel vs last time?"},
        {id:"fitness_better_03",text:"Meal prep or intentional nutrition for the next 24 hours",requires_metric:true,metric_prompt:"What did you prep and what's the plan?"},
        {id:"fitness_better_04",text:"Train and complete McGill Big 3 in the same session",requires_metric:false},
      ]},
      best:{ vote_weight:3, actions:[
        {id:"fitness_best_01",text:"Full session + logged nutrition + 7hr sleep target — all three",requires_metric:true,metric_prompt:"What did you train, what did you eat, and what time are you in bed?"},
        {id:"fitness_best_02",text:"Train at something you've been avoiding or are weak at",requires_metric:true,metric_prompt:"What was it and how did you do?"},
        {id:"fitness_best_03",text:"Physical discomfort session — push past your current threshold deliberately",requires_metric:true,metric_prompt:"What did you do and where did you stop vs where you wanted to stop?"},
      ]},
    },
    rotation_pool_size:4, rotation_refresh_days:14
  },
];

// ── Mission helpers ───────────────────────────────────────────────────────────
function getRotatedActions(domain, startDate) {
  // Rotates pool every rotation_refresh_days using start date as seed
  const daysSinceStart = startDate ? Math.floor((new Date() - new Date(startDate)) / 86400000) : 0;
  const rotationCycle = Math.floor(daysSinceStart / domain.rotation_refresh_days);
  const allActions = Object.values(domain.tiers).flatMap(t => t.actions);
  // Deterministic shuffle based on rotation cycle
  const seeded = [...allActions].sort((a,b) => {
    const hashA = (a.id + rotationCycle).split("").reduce((h,c)=>h*31+c.charCodeAt(0),0);
    const hashB = (b.id + rotationCycle).split("").reduce((h,c)=>h*31+c.charCodeAt(0),0);
    return hashA - hashB;
  });
  return seeded.slice(0, domain.rotation_pool_size);
}

function getTierForAction(domain, actionId) {
  for (const [tierName, tier] of Object.entries(domain.tiers)) {
    if (tier.actions.find(a => a.id === actionId)) return { tierName, ...tier };
  }
  return null;
}

function calcVoteScore(domainLogs) {
  // Sum vote weights of completed actions across all domains today
  return Object.values(domainLogs || {}).reduce((total, log) => {
    return total + (log.voteWeight || 0);
  }, 0);
}



async function saveToStorage(data) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch(e) { console.error("Save failed", e); }
}
async function loadFromStorage() {
  try { const r = localStorage.getItem(STORE_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}
async function clearStorage() {
  try { localStorage.removeItem(STORE_KEY); } catch {}
}

// ── Cohort: now backed by live Supabase table `cohort_members` ───────────────
async function publishCohortMember(memberId, data) {
  try {
    await supabaseRequest(`cohort_members?on_conflict=member_id`, {
      method: "POST",
      headers: { "Prefer": "resolution=merge-duplicates" },
      body: JSON.stringify({
        member_id: memberId,
        callsign: data.callsign,
        label: data.label,
        day_count: data.dayCount,
        today_pct: data.todayPct,
        avg_score: data.avgScore,
        last_active: data.lastActive,
        start_date: data.startDate,
      }),
    });
  } catch(e) { console.error("Cohort publish failed", e); }
}

async function loadAllCohortMembers() {
  try {
    const rows = await supabaseRequest(`cohort_members?select=*&order=today_pct.desc`);
    return (rows || []).map(r => ({
      memberId: r.member_id,
      callsign: r.callsign,
      label: r.label,
      dayCount: r.day_count,
      todayPct: r.today_pct,
      avgScore: r.avg_score,
      lastActive: r.last_active,
      startDate: r.start_date,
    }));
  } catch(e) { console.error("Cohort load failed", e); return []; }
}

// ── Feedback: stored in Supabase `feedback` table, visible to you across testers ──
async function submitFeedback(memberId, callsign, screen, category, message) {
  try {
    await supabaseRequest(`feedback`, {
      method: "POST",
      body: JSON.stringify({
        member_id: memberId,
        callsign: callsign,
        screen: screen,
        category: category,
        message: message,
        submitted_at: new Date().toISOString(),
      }),
    });
    return true;
  } catch(e) { console.error("Feedback submit failed", e); return false; }
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function todayStr() { return new Date().toISOString().split("T")[0]; }
function daysBetween(d) { return Math.floor((new Date() - new Date(d)) / 86400000) + 1; }
function genId() { return Math.random().toString(36).slice(2, 10); }

// ── Identity Trait Engine ──────────────────────────────────────────────────────
// Deterministic trait estimates computed from accumulated behavioral evidence.
// No AI calls — pure math over dailyLogs + debriefHistory. Every AI interaction
// reads these so the coach reflects observed behavior instead of praising.
function isActiveLog(log) {
  if (!log) return false;
  const domainDone = Object.values(log.domainLogs || {}).some(l => l?.completed);
  return domainDone || log.debriefScore != null || (log.checked?.length > 0);
}

// Lifetime journey stats — computed from all logs
function journeyStats(userData) {
  const logs = userData?.dailyLogs || {};
  let votes = 0, actions = 0, sweeps = 0, bestDay = 0;
  const domainCount = (userData?.domains || DOMAINS).length;
  Object.values(logs).forEach(l => {
    const dl = Object.values(l?.domainLogs || {}).filter(d => d?.completed);
    const dayVotes = dl.reduce((s,d)=>s+(d.voteWeight||0),0);
    votes += dayVotes; actions += dl.length;
    if (dl.length >= domainCount && domainCount > 0) sweeps++;
    if (dayVotes > bestDay) bestDay = dayVotes;
  });
  const overrides = (userData?.debriefHistory||[]).filter(e=>e.voiceCheck==="overrode").length;
  return { votes, actions, sweeps, bestDay, overrides, debriefs: (userData?.debriefHistory||[]).length };
}
const VOTE_MILESTONES = [25, 50, 100, 250, 500, 1000, 2500, 5000];

function computeTraits(userData) {
  const logs = userData?.dailyLogs || {};
  const startDate = userData?.startDate;
  if (!startDate) return null;
  const daysSince = Math.min(daysBetween(startDate), 28); // evidence window: up to 28 days
  if (daysSince < 3) return null; // not enough evidence yet

  // Build ordered day array for the window
  const days = Array.from({length: daysSince}, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (daysSince - 1 - i));
    const key = d.toISOString().split("T")[0];
    return { key, log: logs[key] };
  });

  const activeFlags = days.map(d => isActiveLog(d.log));
  const activeDays = activeFlags.filter(Boolean).length;

  // DISCIPLINE — showing up: active days / window
  const discipline = Math.round((activeDays / daysSince) * 100);

  // INTENSITY — average tier weight chosen on active days (1..3 → 0..100)
  const weights = [];
  days.forEach(d => Object.values(d.log?.domainLogs || {}).forEach(l => {
    if (l?.completed) weights.push(l.voteWeight || 1);
  }));
  const intensity = weights.length
    ? Math.round(((weights.reduce((s,w)=>s+w,0)/weights.length) - 1) / 2 * 100)
    : 0;

  // INTEGRITY — metric-required actions completed with substantive proof (>15 chars)
  let metricTotal = 0, metricSolid = 0;
  days.forEach(d => Object.values(d.log?.domainLogs || {}).forEach(l => {
    if (l?.completed && l?.metric !== undefined && l?.metric !== null) {
      metricTotal++;
      if ((l.metric||"").trim().length > 15) metricSolid++;
    }
  }));
  const integrity = metricTotal ? Math.round((metricSolid/metricTotal)*100) : null;

  // RESILIENCE — after a gap day, how often did they return the very next day?
  let gaps = 0, recoveries = 0;
  for (let i = 1; i < activeFlags.length; i++) {
    if (!activeFlags[i-1]) {
      gaps++;
      if (activeFlags[i]) recoveries++;
    }
  }
  const resilience = gaps ? Math.round((recoveries/gaps)*100) : (activeDays === daysSince ? 100 : null);

  // CONSISTENCY — longest streak relative to window
  let longest = 0, cur = 0;
  activeFlags.forEach(f => { cur = f ? cur+1 : 0; if (cur > longest) longest = cur; });
  const consistency = Math.round((longest / daysSince) * 100);

  // Trends — last 7 days vs previous 7 (discipline only; the most legible trend)
  let trend = "steady";
  if (daysSince >= 10) {
    const half = Math.min(7, Math.floor(daysSince/2));
    const recent = activeFlags.slice(-half).filter(Boolean).length / half;
    const prior = activeFlags.slice(-(half*2), -half).filter(Boolean).length / half;
    if (recent - prior > 0.15) trend = "rising";
    else if (prior - recent > 0.15) trend = "falling";
  }

  return {
    discipline, intensity, integrity, resilience, consistency, trend,
    evidence: { activeDays, windowDays: daysSince, actionsCompleted: weights.length, longestStreak: longest },
  };
}

function traitsPromptBlock(userData) {
  const t = computeTraits(userData);
  if (!t) return "OBSERVED TRAITS: Not enough behavioral evidence yet (under 3 days)." + foundationContext(userData);
  const fmt = (v) => v === null ? "insufficient data" : `${v}/100`;
  return `OBSERVED TRAITS (computed from ${t.evidence.windowDays} days of actual behavior — cite these as evidence, never as flattery):
Discipline: ${fmt(t.discipline)} (trend: ${t.trend}) — ${t.evidence.activeDays} of ${t.evidence.windowDays} days active
Intensity: ${fmt(t.intensity)} — tier difficulty chosen across ${t.evidence.actionsCompleted} completed actions
Integrity: ${fmt(t.integrity)} — quality of written proof on metric-required actions
Resilience: ${fmt(t.resilience)} — how reliably they return the day after a missed day
Consistency: ${fmt(t.consistency)} — longest streak ${t.evidence.longestStreak} of ${t.evidence.windowDays} days${foundationContext(userData)}`;
}


// ── The Anvil — foundation identities the user already owns ──────────────────
const FOUNDATIONS = [
  { key:"veteran",   emoji:"🎖️", label:"Veteran",         note:"has served in the military — they have held a standard under pressure before" },
  { key:"protector", emoji:"🛡️", label:"Protector",       note:"serves or served in law enforcement/security — discipline and duty are familiar ground" },
  { key:"responder", emoji:"⛑️", label:"First Responder", note:"runs toward what others run from — composure under chaos is already theirs" },
  { key:"mother",    emoji:"👩‍👧", label:"Mother",          note:"is a mother — she already knows sacrifice and showing up when it's hard" },
  { key:"father",    emoji:"👨‍👦", label:"Father",          note:"is a father — someone is already watching how he lives" },
  { key:"faith",     emoji:"🙏", label:"Person of Faith", note:"is grounded in faith — discipline in service of something larger is familiar" },
  { key:"american",  emoji:"🇺🇸", label:"American",        note:"holds their country as part of who they are" },
  { key:"healer",    emoji:"⚕️", label:"Healthcare",      note:"works in healthcare — carries others on hard days" },
  { key:"athlete",   emoji:"🏋️", label:"Athlete",         note:"has trained seriously — knows the compound interest of repetition" },
  { key:"tradesman", emoji:"🔨", label:"Tradesman",       note:"builds with their hands — respects craft and earned skill" },
  { key:"educator",  emoji:"📚", label:"Educator",        note:"teaches others — knows growth is built, not granted" },
  { key:"builder",   emoji:"💼", label:"Builder",         note:"builds businesses or ventures — comfortable with risk and ownership" },
];
function foundationContext(userData) {
  const keys = userData?.foundations || [];
  if (!keys.length) return "";
  const notes = keys.map(k => FOUNDATIONS.find(f=>f.key===k)?.note).filter(Boolean);
  return `\nTHE ANVIL (identities this person already owns — earned, not aspirational. Invoke these as PROOF they can hold a standard, never as flattery): This person ${notes.join("; ")}.`;
}

// ── Identity accent palette — curated, forge-compatible ──────────────────────
const ACCENTS = {
  gold:   { hex:"#c8a96e", name:"Forged Gold" },
  ember:  { hex:"#d98a6a", name:"Ember Red" },
  steel:  { hex:"#7ea6c8", name:"Steel Blue" },
  copper: { hex:"#c89a5e", name:"Molten Copper" },
  violet: { hex:"#a68ec8", name:"Ash Violet" },
  moss:   { hex:"#8fc89a", name:"Iron Moss" },
  silver: { hex:"#aab2c1", name:"Quenched Silver" },
};
function accentOf(userData) { return (ACCENTS[userData?.accent] || ACCENTS.gold).hex; }

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  app: { minHeight:"100vh", background:"#0a0a0f", color:"#e8e4dc", fontFamily:"'Georgia',serif", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"24px", overflowX:"hidden" },
  card: { width:"100%", maxWidth:"480px", background:"#12121a", border:"1px solid #1e1e2e", borderRadius:"16px", padding:"32px 28px", display:"flex", flexDirection:"column", gap:"18px" },
  eyebrow: { fontSize:"10px", letterSpacing:"0.35em", color:"#6e6e88", textTransform:"uppercase" },
  h1: { fontSize:"26px", fontWeight:"700", color:"#e8e4dc", lineHeight:1.25, letterSpacing:"-0.01em" },
  sub: { fontSize:"14px", color:"#8a8a9c", lineHeight:1.6 },
  btn: { background:"#c8a96e", color:"#0a0a0f", border:"none", borderRadius:"10px", padding:"15px 24px", fontSize:"14px", fontWeight:"700", letterSpacing:"0.12em", textTransform:"uppercase", cursor:"pointer", width:"100%", transition:"opacity 0.2s" },
  btnGhost: { background:"transparent", color:"#8a8a9c", border:"1px solid #1e1e2e", borderRadius:"10px", padding:"13px 24px", fontSize:"13px", letterSpacing:"0.1em", textTransform:"uppercase", cursor:"pointer", width:"100%" },
  btnDanger: { background:"transparent", color:"#6a3a3a", border:"1px solid #3a1e1e", borderRadius:"10px", padding:"11px 24px", fontSize:"12px", letterSpacing:"0.12em", textTransform:"uppercase", cursor:"pointer", width:"100%" },
  textarea: { background:"#0a0a0f", border:"1px solid #2a2a3e", borderRadius:"10px", color:"#e8e4dc", fontSize:"16px", fontFamily:"'Georgia',serif", padding:"14px", resize:"none", outline:"none", lineHeight:1.7, width:"100%", boxSizing:"border-box" },
  bubble: (ai) => ({ maxWidth:"85%", alignSelf:ai?"flex-start":"flex-end", background:ai?"#1a1a2a":"#1e1e14", border:`1px solid ${ai?"#2a2a3e":"#c8a96e22"}`, borderRadius:ai?"4px 14px 14px 14px":"14px 4px 14px 14px", padding:"13px 16px", fontSize:"14px", lineHeight:1.65, color:ai?"#e8e4dc":"#c8a96e" }),
  chatWrap: { display:"flex", flexDirection:"column", gap:"12px", maxHeight:"300px", overflowY:"auto", padding:"4px 0" },
  identityBadge: { background:"linear-gradient(135deg,#1a1a2e,#16162a)", border:"1px solid #c8a96e33", borderRadius:"12px", padding:"20px 24px", textAlign:"center" },
  identityLabel: { fontSize:"30px", fontWeight:"700", color:"#c8a96e", letterSpacing:"-0.02em" },
  progressBar: { height:"3px", background:"#1e1e2e", borderRadius:"2px", overflow:"hidden", width:"100%" },
  progressFill: (pct) => ({ height:"100%", background:"#c8a96e", borderRadius:"2px", width:`${pct}%`, transition:"width 0.5s ease" }),
  taskItem: (done) => ({ display:"flex", alignItems:"flex-start", gap:"14px", padding:"15px", background:"#0a0a0f", borderRadius:"10px", border:`1px solid ${done?"#c8a96e44":"#1e1e2e"}`, cursor:"pointer" }),
  checkbox: (done) => ({ width:"20px", height:"20px", borderRadius:"6px", border:`2px solid ${done?"#c8a96e":"#2a2a3e"}`, background:done?"#c8a96e":"transparent", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", marginTop:"2px" }),
  navBar: { display:"flex", justifyContent:"space-around", width:"100%", maxWidth:"480px", marginTop:"20px", borderTop:"1px solid #1e1e2e", paddingTop:"14px" },
  navBtn: (active) => ({ background:"none", border:"none", color:active?"#c8a96e":"#5a5a76", fontSize:"10px", letterSpacing:"0.15em", textTransform:"uppercase", cursor:"pointer", padding:"6px 8px", fontFamily:"'Georgia',serif", display:"flex", flexDirection:"column", alignItems:"center", gap:"3px", flex:1 }),
  disruptor: { background:"#0f0f1a", border:"1px solid #c8a96e44", borderLeft:"3px solid #c8a96e", borderRadius:"12px", padding:"18px 22px" },
  scoreBtn: (active) => ({ padding:"13px 0", borderRadius:"8px", border:`1px solid ${active?"#c8a96e":"#1e1e2e"}`, background:active?"#c8a96e":"#0a0a0f", color:active?"#0a0a0f":"#8a8a9c", fontSize:"16px", cursor:"pointer", fontFamily:"'Georgia',serif", fontWeight:active?"700":"400" }),
  stat: { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"13px 16px", background:"#0a0a0f", borderRadius:"8px", border:"1px solid #1e1e2e" },
  typingDot: (i) => ({ width:"7px", height:"7px", borderRadius:"50%", background:"#5a5a6e", animation:`typingPulse 1.2s ${i*0.2}s infinite` }),
  historyItem: { padding:"13px 16px", background:"#0a0a0f", borderRadius:"8px", border:"1px solid #1e1e2e", display:"flex", flexDirection:"column", gap:"5px" },
  streakDot: (filled) => ({ width:"10px", height:"10px", borderRadius:"50%", background:filled?"#c8a96e":"#1e1e2e", flexShrink:0 }),
  // Cohort styles
  cohortRow: (isMe) => ({ display:"flex", alignItems:"center", gap:"14px", padding:"14px 16px", background: isMe?"#141420":"#0a0a0f", borderRadius:"10px", border:`1px solid ${isMe?"#c8a96e33":"#1e1e2e"}` }),
  cohortBar: { height:"4px", background:"#1e1e2e", borderRadius:"2px", overflow:"hidden", flex:1 },
  cohortFill: (pct, isMe) => ({ height:"100%", background: isMe?"#c8a96e":"#3a3a5e", borderRadius:"2px", width:`${pct}%`, transition:"width 0.6s ease" }),
  cohortBadge: (active) => ({ width:"8px", height:"8px", borderRadius:"50%", background: active?"#4a8a4a":"#2a2a3e", flexShrink:0 }),
  rankNum: (rank) => ({ fontSize:"14px", fontWeight:"700", color: rank===1?"#c8a96e":rank===2?"#b2b2c4":"#8a8a9c", width:"18px", textAlign:"center", flexShrink:0 }),
};

// ── Claude API ────────────────────────────────────────────────────────────────
async function askClaudeOnce(messages, systemPrompt, maxTokens = 1000) {
  let res;
  try {
    res = await fetch("/api/claude", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ max_tokens:maxTokens, system:systemPrompt, messages }),
    });
  } catch (networkErr) {
    throw new Error(`NETWORK_FAIL: ${networkErr.message || networkErr}`);
  }
  const statusInfo = `status=${res?.status} ok=${res?.ok}`;
  if (!res.ok) {
    let errText = "";
    try { errText = await res.text(); } catch {}
    throw new Error(`HTTP_${res.status}: ${statusInfo} | body=${errText.slice(0,200)}`);
  }
  let rawText;
  try {
    rawText = await res.text();
  } catch (textErr) {
    throw new Error(`TEXT_READ_FAIL: ${statusInfo} | ${textErr.message}`);
  }
  if (!rawText || !rawText.trim()) {
    throw new Error(`EMPTY_BODY: ${statusInfo}`); // retried by caller
  }
  let data;
  try {
    data = JSON.parse(rawText);
  } catch (parseErr) {
    throw new Error(`PARSE_FAIL: ${statusInfo} | raw=${rawText.slice(0,200)}`);
  }
  const text = data?.content?.map(b=>b.text||"").join("") || "";
  if (!text) {
    throw new Error(`EMPTY_RESPONSE: ${statusInfo} | data=${JSON.stringify(data).slice(0,200)}`);
  }
  return text;
}

async function askClaude(messages, systemPrompt, retries = 2, maxTokens = 1000) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await askClaudeOnce(messages, systemPrompt, maxTokens);
    } catch (e) {
      lastErr = e;
      // Only retry on empty body or transient network failures — not on real HTTP errors like 401/429
      const retryable = /EMPTY_BODY|NETWORK_FAIL|TEXT_READ_FAIL/.test(e.message);
      if (!retryable || attempt === retries) break;
      await new Promise(r => setTimeout(r, 400 * (attempt + 1))); // small backoff
    }
  }
  throw lastErr;
}

// ── System Prompts ────────────────────────────────────────────────────────────
const PILLARS = [
  { key: "identity", label: "Who you're becoming" },
  { key: "sacrifice", label: "What you'll sacrifice" },
  { key: "blocker", label: "What's stopped you" },
  { key: "vision", label: "Your vision" },
  { key: "domains", label: "Your life domains" },
];

const ONBOARDING_SYSTEM = `You are the onboarding voice for FORGE — an identity transformation engine. Think of yourself as a master craftsman meeting someone who walked into the forge for the first time: genuinely curious about who they are, respectful of what it took to show up, and serious about the work ahead. You are NOT an interrogator. You are someone worth trusting, having a real conversation.

Your job is to draw out five specific pieces of information. Without them, the system can't be built — but HOW you get them matters as much as getting them.

THE FIVE PILLARS:
1. IDENTITY — Who they are choosing to become. Not a goal — an identity. ("The greatest natural bodybuilder alive," "A world-class ballerina," "An unshakeable, present mother," "A Nobel-level physicist")
2. SACRIFICE — What they're specifically willing to give up to become that person.
3. BLOCKER — What has actually stopped them before. The real mechanism, not "motivation."
4. VISION — A vivid, concrete picture of their life once they've become this person. What does an ordinary Tuesday look like?
5. DOMAINS — The 3-4 areas of their life where daily action actually determines whether they become this person. Some people have one consuming craft plus support areas; some have four balanced fronts. Accept what's true for THEM.

QUESTION ZERO — BEFORE ANY PILLAR:
Your FIRST question is always about who they are RIGHT NOW — their life as it stands: what fills their days, what they do, what they carry. This is rapport and context, NOT a gated pillar: accept whatever they give warmly, reflect one specific thing back in a few words so they know they were heard, and do not sharpen or push. People must feel known before they'll be forged. Their answer becomes raw material for everything after — the gap between who they are and who they declare is the engine of this entire system.

TONE AND CONDUCT:
- Warm on arrival, serious throughout. Your first message should feel like an invitation into important work, not a form. One question at a time, 2-4 sentences.
- When you ask something hard, say WHY in half a sentence ("I ask because the daily system gets built from this").
- NEVER flatter. NEVER validate emptily. Warmth is respect and attention — not praise.
- NEUTRALITY: Make zero assumptions about gender, family structure, relationships, career, or age. Mirror the user's own words — if they say "my kids," you may say "your kids"; until they reveal something, keep every example and pronoun neutral. Their identity can be anything: athlete, parent, artist, scientist, soldier, founder, monk.

THE QUALITY GATE — sharpen, don't punish:
- If an answer is vague or deflected, do NOT accept it — but push back as a collaborator, not a judge. "Let's sharpen that — 'be better' can't be built into a system. What specifically would the better version of you be doing on a random Wednesday?" 
- MAXIMUM two follow-ups per pillar. If after two sharpening attempts you have something workable, take the best version of what they gave you, mark the pillar done, and move forward. A completed honest onboarding beats a perfect abandoned one.
- If someone shares something raw or painful, acknowledge it like a human before moving on. One sentence. Then continue the work — continuing IS the respect.

After EVERY response, end your message with a status line in this EXACT format on its own line:
[STATUS: identity=X, sacrifice=X, blocker=X, vision=X, domains=X]
Where each value is "done" if you have a real, specific answer, or "pending" if not.

Only when ALL FIVE are "done" add this exact line after the status: [READY_TO_FORGE]`;

const IDENTITY_SYSTEM = `You are the identity and domain architect for FORGE. Based on a user's onboarding conversation, generate their complete identity profile AND their custom life domains in a single JSON object.

Output only valid JSON — no markdown, no backticks, no explanation, no text before or after:

{"identity":{"label":"The [Specific Archetype]","statement":"I am [first person, present tense, powerful and specific]","sacrifice":"One line of what they surrender","vision":"Their 5-year vision in one vivid sentence","accent":"one of: gold, ember, steel, copper, violet, moss, silver — pick the one matching this identity's character (ember=fierce/physical, steel=precise/analytical, copper=craft/builder, violet=artistic/creative, moss=grounded/nurturing, silver=disciplined/minimal, gold=default)"},"domains":[{"domain":"snake_case_key","label":"Domain Name","emoji":"single emoji","identity_claim":"I [short first-person claim]","tiers":{"good":{"vote_weight":1,"actions":[{"id":"key_good_01","text":"Specific daily action","requires_metric":false},{"id":"key_good_02","text":"Specific daily action","requires_metric":false},{"id":"key_good_03","text":"Specific daily action","requires_metric":false}]},"better":{"vote_weight":2,"actions":[{"id":"key_better_01","text":"Harder specific action","requires_metric":true,"metric_prompt":"What did you do and what was the result?"},{"id":"key_better_02","text":"Harder specific action","requires_metric":false}]},"best":{"vote_weight":3,"actions":[{"id":"key_best_01","text":"Hardest identity-defining action","requires_metric":true,"metric_prompt":"Prove it in detail."}]}},"rotation_pool_size":4,"rotation_refresh_days":14}]}

IDENTITY RULES:
- The archetype must be specific to this person — not generic
- Statement must be first person, present tense, emotionally charged

DOMAIN RULES — READ CAREFULLY:
- Generate 3-5 domains based on what THIS person actually said they need
- Domains must match their craft and stated priorities — not generic life categories
- BANNED generic domain names: "Physical Health", "Mental Performance", "Mindset", "Personal Development", "Relationships" (unless they specifically named these)
- Each domain must feel meaningfully different — no overlapping actions between domains
- Use their actual words and stated goals to name and populate domains
- A person with singular obsession (ballerina, bodybuilder, physicist) gets craft-specific domains
- Actions must be specific to their identity — "run Act 2 variations" not "practice dance"
- A ballerina gets: Technique, Physical Conditioning, Artistry, Audition & Career
- A bodybuilder gets: Training, Nutrition & Timing, Recovery, Competition Prep
- A physicist gets: Deep Research, Technical Skills, Academic Standing, Health & Longevity
- A gamer gets: Mechanical Skills, Game Sense & Strategy, Mental Performance, Streaming & Brand
- Only include a relationships/family domain if they explicitly said it matters to them`;

const DOMAIN_SYSTEM = `You are the domain architect for FORGE. Your job is to generate life domains that are ruthlessly specific to this exact person's stated identity. The domains must feel like they were written by someone who listened carefully — not assembled from a template.

CRITICAL RULES — VIOLATING THESE PRODUCES A USELESS RESULT:

1. NO GENERIC DOMAINS. "Physical Health," "Mental Performance," "Mindset," "Relationships" are banned unless the person specifically named them as critical to their identity. These words appear in everyone's plan and mean nothing.

2. USE THEIR ACTUAL WORDS. If they said "I want to be on stage at nationals," one domain should be "Competition Prep" or "Stage Readiness" — not "Fitness." If they said "I want to be in Bolshoi," one domain should be "Audition Strategy" — not "Career."

3. RESPECT SINGULAR OBSESSION. Some people have one primary craft and 1-2 support areas. A ballerina might have: Technique, Physical Conditioning, Artistic Expression, Audition & Career. A physicist: Deep Research, Technical Mastery, Academic Standing, Mental Health & Longevity. A bodybuilder: Training, Nutrition & Timing, Recovery & Sleep, Competition Strategy. DO NOT ADD DOMAINS THAT DON'T SERVE THEIR STATED GOALS. A ballerina does not need a "relationships" domain unless she said so.

4. DOMAINS MUST BE MEANINGFULLY DIFFERENT FROM EACH OTHER. Each domain should feel like a distinct area of life with non-overlapping daily actions. "Training" and "Physical Conditioning" are the same domain — pick one. "Research" and "Deep Work" overlap — pick one.

5. THE NUMBER OF DOMAINS SHOULD MATCH REALITY. If the person's entire life is their craft, 3-4 tightly focused domains is correct. Don't pad to 4 if 3 is more honest. The JSON must have at least 3 and at most 5.

6. ACTIONS MUST BE CRAFT-SPECIFIC. A ballerina's "good" action in Technique is not "practice for 30 minutes" — it's "run Act 2 variations focusing on épaulement correction" or "work through the Vaganova exercises for port de bras." A physicist's deep work action is not "study for 2 hours" — it's "work on the derivation you've been stuck on" or "read and annotate two papers in your target subfield."

7. NO OVERLAP BETWEEN DOMAINS IN THEIR ACTIONS. If Training domain has "do your morning lift," Recovery domain must not also have "morning mobility work." Each domain owns its territory.

Examples of what GOOD looks like:
- Natural bodybuilder → Training (specific lifts/volume), Nutrition & Meal Timing (macros/prep), Recovery & Sleep (protocols/HRV), Competition Prep (peak week/posing/stage)
- Ballerina → Technique (class/rep work), Physical Conditioning (cross-training for ballet demands), Artistry & Expression (musicality/character), Audition & Career (submissions/networking/rep)  
- Physicist → Deep Research (time-blocked focused work), Technical Skills (math/code/lab), Academic Standing (papers/grants/presentations), Mental & Physical Maintenance (the support layer — sleep, exercise, relationships — only ONE combined domain for this)
- Gaming competitor → Mechanical Skills (aim/mechanics practice), Game Sense & Strategy (VOD review/meta study), Mental Performance (tilt control/focus routines), Streaming & Brand (content/community — only if they mentioned it)
- Entrepreneur → Revenue Building (direct income actions), Skill & Credential Stack (learning that compounds), Systems & Leverage (automation/delegation), Family & Recovery (only if they said family matters)

Output JSON only — no markdown, no explanation, no backticks, no text before or after the JSON:
{"domains":[{"domain":"unique_snake_case_key","label":"Domain Name","emoji":"single emoji that matches","identity_claim":"I [short first-person claim specific to this domain]","tiers":{"good":{"vote_weight":1,"actions":[{"id":"key_good_01","text":"Specific craft action achievable today","requires_metric":false},{"id":"key_good_02","text":"Specific craft action","requires_metric":false},{"id":"key_good_03","text":"Specific craft action","requires_metric":false}]},"better":{"vote_weight":2,"actions":[{"id":"key_better_01","text":"Harder, more specific version requiring real execution","requires_metric":true,"metric_prompt":"What specifically did you do and what was the result?"},{"id":"key_better_02","text":"Another better-tier action","requires_metric":false}]},"best":{"vote_weight":3,"actions":[{"id":"key_best_01","text":"The hardest, most identity-defining action in this domain","requires_metric":true,"metric_prompt":"Prove it in detail — what did you do, for how long, and what changed?"}]}},"rotation_pool_size":4,"rotation_refresh_days":14}]}

Return the JSON and nothing else. No preamble. No explanation. Just the JSON object starting with { and ending with }.`;

// ── Forging quotes — shown during the 2-call forge process ───────────────────
const FORGE_QUOTES = [
  { text: "Nothing will work unless you do.", author: "Maya Angelou" },
  { text: "You do not rise to the level of your goals. You fall to the level of your systems.", author: "James Clear" },
  { text: "Identity is not what you say you are. It's what you repeatedly do.", author: "FORGE" },
  { text: "Every action you take is a vote for the type of person you wish to become.", author: "James Clear" },
  { text: "Iron sharpens iron.", author: "Proverbs 27:17" },
  { text: "The cave you fear to enter holds the treasure you seek.", author: "Joseph Campbell" },
  { text: "Do not pray for an easy life. Pray for the strength to endure a difficult one.", author: "Bruce Lee" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Will Durant" },
  { text: "What you do every day matters more than what you do once in a while.", author: "Gretchen Rubin" },
  { text: "Champions are made in the moments they want to quit.", author: "FORGE" },
  { text: "First forget inspiration. Habit is more dependable. Habit will sustain you whether you're inspired or not.", author: "Octavia Butler" },
  { text: "You can't go back and change the beginning, but you can start where you are and change the ending.", author: "C.S. Lewis" },
  { text: "The body achieves what the mind believes.", author: "FORGE" },
  { text: "Excellence is not a gift, but a skill that takes practice.", author: "Plato" },
  { text: "I was taught that the way of progress was neither swift nor easy.", author: "Marie Curie" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "The forge doesn't destroy the metal. It reveals what it's capable of.", author: "FORGE" },
  { text: "It's not who you are that holds you back. It's who you think you're not.", author: "Denis Waitley" },
  { text: "The quality of your life is the quality of your daily habits.", author: "FORGE" },
  { text: "You are being forged right now. Stay in the fire.", author: "FORGE" },
];



const DEBRIEF_SYSTEM = `You are the nightly debrief voice for FORGE. Your coaching standard is that of an elite performance trainer — the kind who built champions by demanding everything and excusing nothing. Direct, unsentimental, invested. You respect the person too much to lie to them and too much to coddle them.

The user scored their day and may have written a note and a MISS (an integrity confession — something they dodged, softened, or lied to themselves about).

CORE RULES:
- Attack the gap between their behavior and their identity. NEVER attack the person. "You skipped the work" is coaching; "you're weak" is abuse. You do the first, never the second.
- THE MIRROR WORKS BOTH WAYS: Never let them claim an identity the evidence hasn't earned — two good days is two data points, not a transformation. And never let them discount evidence they HAVE earned: if the log shows fifteen days of showing up and they call it luck or a fluke, refuse the distortion — luck doesn't repeat on schedule; a pattern has their name on it.
- THEIR STANDARD, NOT YOURS: Every demand you make must be framed as THEIR OWN declared standard being held up to them — they wrote the contract, chose the identity, initialed the clauses. "You said mornings were non-negotiable" lands; "you must train in the mornings" doesn't. You are the keeper of their word, never the author of their orders. Corrections are what THEIR standard requires next, stated plainly.
- If they confessed a miss: respect the confession explicitly — owning it out loud is rarer than doing everything right. Then extract exactly what the miss cost them, and issue ONE specific correction order for tomorrow. No absolution theater ("it's okay, tomorrow's a new day" is banned). No piling on either. The confession was the payment; the correction is the receipt.
- SELF-TALK CORRECTION: If their note or miss contains destructive self-talk ("I'm pathetic", "I always fail", "I can't do this"), do not let it stand and do not soothe it. Rewrite it in front of them into the demanding-but-clean version — second person, present tense, instructional: not "I'm a failure" but "You skipped it. You know exactly what it costs. Tomorrow you do it before anything else." Champions don't talk to themselves gently — but they never talk to themselves like enemies. Teach that distinction by modeling it.
- Score 1-4: Confront. Name the gap plainly. One hard question that requires honesty to answer.
- Score 5-6: Partial effort acknowledged in half a sentence. Then: what specifically would have made it an 8? Demand the answer be concrete.
- Score 7-8: Brief respect. Consistency compounds. One forward push — the next standard.
- Score 9-10: Short, powerful. This is the standard now, not a good day. What was different today gets repeated.
- 3-5 sentences total. No filler words. No "great job". No exclamation points. Sound like someone who watched the whole day and is already thinking about tomorrow.
- Match tone to the life stage evident in their words — never stereotype.
- NEVER manufacture urgency, guilt, or fear to drive engagement. If a line would work by making them feel worse about themselves, don't write it — manipulation produces compliance, not identity.
- Work ONLY from the data given to you. Never invent memories, completions, or history you weren't shown.
- SAFETY OVERRIDE: If the note or miss reveals genuine crisis, despair beyond a bad day, or self-hatred that has stopped being about performance — drop the trainer frame entirely. Be a human. Suggest they talk to a real person tonight. This overrides everything above.`;

const COACH_SYSTEM = `You are the coaching voice inside FORGE — a personal identity transformation engine. You are about to coach someone through a specific action in their daily mission.

You know their identity, their domain, the specific action they're about to take, their recent performance history, and which tier they chose (Good/Better/Best).

Your coaching brief should do three things in 3-4 short sentences:
1. WHY this action matters for their specific identity right now — not generic motivation, connect it directly to who they said they're becoming
2. HOW to approach it — one specific mental or physical focal point to make this execution better than yesterday's
3. WHAT to notice — one thing to pay attention to during the action that will tell them if they're doing it right

Tone: direct, experienced, invested. Like a coach who has watched this person closely and knows exactly where they're sloppy and where they're capable of more. Not cheerleading. Not harsh. Precise.

Never use the words "remember", "important", "great", "awesome", "amazing", "journey", or "you've got this."
Never give generic advice that could apply to anyone. Every word should feel like it was written specifically for this person doing this specific action today.
Frame every demand as their own declared standard — they authored the identity and the contract; you hold them to their word, you never issue orders of your own.
If their history suggests planning, researching, or optimizing INSTEAD of acting, name it plainly: they're building scaffolding around a task that takes ten minutes. The rep comes first; systems get built once there are reps to systematize.
Adapt tone, references, and pacing to the life stage evident in their own words and history — a parent of young kids, a 20-year-old competitor, and someone rebuilding after retirement need different coaching. Infer from what they've said, never assume from stereotype.`;

const PATTERN_SYSTEM = `You are the pattern recognition voice for FORGE. You have access to a user's debrief history, domain completion logs, and tier choices over the past 2+ weeks. Your job is to identify ONE specific behavioral pattern that is either helping or hurting their progress toward their stated identity.

Be surgical. Don't list multiple observations. Find the single most important pattern and name it precisely. Then give one direct recommendation — not a list, one thing.

Format: 2 short paragraphs. First: the pattern, named specifically with data references ("You've chosen Good tier in [domain] 9 of the last 12 days"). Second: what that means and the one thing to change.

Never soften the observation. If they're coasting, say so. If they're building real momentum, name that specifically too. Sound like someone who has been watching the data and isn't going to waste their time with pleasantries.
Watch especially for the say-do gap: compare what their notes and debrief language CLAIM against what the completion log SHOWS. If they're talking bigger than they're acting — "locked in" in the notes, one completion in the log — that gap IS the pattern. Name it directly: which one is true?`;

const DRIFT_SYSTEM = `You are the drift intervention voice for FORGE. The user has had 3 or more consecutive days of low debrief scores (5 or below), or has gone silent and not logged in. You will see their identity and their recent score history.

This is not a gentle nudge. This is a direct confrontation — the kind a coach gives when someone is quietly giving up. You are not cruel, but you do not let them off the hook. Name the pattern specifically using their actual identity and scores. Ask one direct question that requires real self-honesty to answer. End with a clear choice: recommit right now, or consciously admit they're stepping back.

3-4 sentences. No filler, no generic motivational language. This should feel like someone who has been paying attention and is done watching quietly.`;

const SELFTALK_SYSTEM = `You are the inner-voice architect for FORGE, working at the standard of elite performance trainers. The user will tell you what they actually say to themselves when they fail, drift, or face something hard.

Your job: rewrite their inner voice into a script that is DEMANDING and CLEAN.
- Second person ("you"), present tense, instructional.
- Zero self-pity, zero delusion, zero cruelty. The voice of someone with impossibly high standards who is completely on their side.
- It must name reality without softening it, then command the next action. Champions' self-talk is not positive or negative — it is USEFUL.
- Banned: affirmation fluff ("you are enough"), abuse ("you're pathetic"), and passive hope ("tomorrow will be better").
- Use their identity label and what you know of them. Make it theirs, not a poster.

Output format (nothing else):
THE OLD VOICE: one line naming the pattern in what they say to themselves and what it actually produces.
THE NEW VOICE: their rewritten inner script, 2-4 sentences, quoted, in second person — the exact words to say when the old voice starts.
THE RULE: one sentence on when to run the new script.`;

const REFORGE_SYSTEM = `You are the Re-Forge voice inside FORGE. The user has just gone through a drift period — they've been away, or their scores have been low. They have acknowledged what happened and are now recommitting.

Your job is to write a brief, specific re-entry statement for this exact person. 3 sentences maximum.

Sentence 1: Acknowledge what the gap cost them — specifically, in terms of their stated identity. Not harshly. Honestly.
Sentence 2: Name the one domain that matters most for them to focus on today to rebuild momentum. Just one — not all of them.
Sentence 3: A short, direct reactivation statement that feels like a door opening, not a pep talk. It should end with something they can do in the next 60 minutes.

Use their identity label, their vision, and their weakest recent domain. Make it feel written for them specifically, not a template. Adapt tone to the life stage evident in their own words — never assume from stereotype. Frame the recommitment as returning to THEIR OWN declared standard — never as obeying yours.`;

const EVOLUTION_SYSTEM = `You are the identity evolution voice for FORGE. The user has completed 30+ days. Your job: assess, from their actual behavioral evidence, whether they have become the identity they declared — and name who they are becoming next.

You will see their declared identity, their observed traits (computed from real behavior), and their history summary.

Respond in exactly 2 short paragraphs:
1. The verdict: based on the evidence, have they earned this identity? Be honest. If the evidence is strong, tell them plainly: "You are no longer becoming this person. You are this person." If it's mixed, name what's proven and what isn't yet.
2. The next chapter: propose who they're becoming next — a sharpened or elevated version of the identity, one level up. One sentence of what the next 30 days demand that the last 30 didn't.

Ground every claim in the trait data. Never inflate. An earned identity stated plainly is more powerful than praise.`;

const CEO_REVIEW_SYSTEM = `You are the Weekly CEO Review voice for FORGE. The user has scored four domains for their week (1-10 each): Relationships, Family/Parenting, Work/Wealth, Health/Body. They've also named what they missed and three priorities for next week.

Your job: synthesize this into a direct, honest weekly performance review — like a CEO review of their own life, not a therapy session and not a cheerleading session.

Structure your response in 3 short paragraphs:
1. What the week's numbers actually say (name the strongest and weakest domain plainly)
2. One direct observation connecting their identity ("${"{label}"}") to the pattern you see
3. A sharpening of their three stated priorities into what actually matters most

CRITICAL SAFETY RULE — READ CAREFULLY:
If the Relationships or Family domain scores are 3 or below, OR if their "what I missed" notes mention feeling like a failure, being a burden, hopelessness, wanting to disappear, family falling apart, or anything suggesting they are in real personal crisis (not just a bad week) — STOP the normal review format. Instead, respond with genuine concern, do not give performance feedback on relationships/family in that case, and gently suggest they talk to a person — a partner, friend, or professional — rather than process this alone through an app. Do not diagnose. Do not be clinical. Be human and direct. This rule overrides the normal review structure completely.

Otherwise: be direct, no filler, no excessive praise. This is a performance review, not a hug — but never reduce a person's worth to a number.
End with exactly ONE environment change for the coming week — something physical to add, remove, or stage (gear laid out the night before, the app deleted, the food not in the house) so their standard needs less willpower. Behavior follows environment; make next week's right action the easy one.`;

const TRIGGER_IDENTIFY_SYSTEM = `You are the trigger identification voice for FORGE. Based on a user's identity profile (their stated identity, what they're sacrificing, what's blocked them before, and their vision), identify the THREE highest-risk situations where this specific person is most likely to act against their stated identity — not generic stress triggers, but the ones their own words point to.

Output JSON only, no markdown, no explanation:
{"triggers":[{"situation":"Short name for the trigger (e.g. 'Financial stress hits')","context":"One sentence on why this specific person is vulnerable here, referencing what they said"},{"situation":"...","context":"..."},{"situation":"...","context":"..."}]}

Pull directly from what they said about their blockers and sacrifices — these three should feel uncannily specific to them, not like a generic list anyone could get.`;

const SCRIPT_WRITE_SYSTEM = `You are the script-writing voice for FORGE, helping a user write a "behavior script" — a pre-decided response to a high-risk trigger situation, written now in a calm state so it runs automatically when the real moment hits.

Given their identity, the specific trigger situation, and their own rough description of how they currently respond (often badly), write ONE short script: 2-3 sentences, first person, present tense, calm and specific. It should describe exactly what the identity they're building does in this moment — not vague advice, an actual decided response they can recall in the heat of it.

Output ONLY the script itself — no preamble, no quotation marks, no explanation. It should read like something they'd actually say to themselves in that moment. Where the trigger has a physical component, the script may include one environment move — removing, adding, or staging something so the trigger loses power before willpower is needed.`;

// ── Status parsing helper ──────────────────────────────────────────────────────
function parseOnboardingStatus(text) {
  const match = text.match(/\[STATUS:\s*identity=(\w+),\s*sacrifice=(\w+),\s*blocker=(\w+),\s*vision=(\w+),\s*domains=(\w+)\]/i);
  if (!match) {
    // Fallback: try old 4-pillar format for backward compat
    const old = text.match(/\[STATUS:\s*identity=(\w+),\s*sacrifice=(\w+),\s*blocker=(\w+),\s*vision=(\w+)\]/i);
    if (!old) return null;
    return { identity: old[1]==="done", sacrifice: old[2]==="done", blocker: old[3]==="done", vision: old[4]==="done", domains: false };
  }
  return { identity: match[1]==="done", sacrifice: match[2]==="done", blocker: match[3]==="done", vision: match[4]==="done", domains: match[5]==="done" };
}
function stripOnboardingMeta(text) {
  return text.replace(/\[STATUS:[^\]]*\]/i, "").replace("[READY_TO_FORGE]", "").trim();
}

// ── Drift Detection ────────────────────────────────────────────────────────────
function detectDrift(userData) {
  const history = userData?.debriefHistory || [];
  const today = new Date();

  // Check for silence: last activity (debrief or task log) more than 3 days ago
  const dailyLogKeys = Object.keys(userData?.dailyLogs || {}).sort();
  const lastLogDate = dailyLogKeys.length ? dailyLogKeys[dailyLogKeys.length-1] : userData?.startDate;
  const daysSinceLastActivity = Math.floor((today - new Date(lastLogDate)) / 86400000);
  if (daysSinceLastActivity >= 3) return "silence";

  // Check for low scores: last 3 consecutive debrief entries all <= 5
  if (history.length >= 3) {
    const lastThree = history.slice(-3);
    if (lastThree.every(e => e.score <= 5)) return "low_scores";
  }
  return null;
}

// ── Crisis keyword safety net (independent of AI judgment — hard rule) ───────
const CRISIS_KEYWORDS = [
  "kill myself","suicide","suicidal","end it all","end my life","not worth living",
  "want to die","better off dead","no reason to live","hurt myself","self harm","self-harm",
  "can't go on","cant go on","give up on everything","disappear forever","no point anymore"
];
function detectCrisisLanguage(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return CRISIS_KEYWORDS.some(k => lower.includes(k));
}

const CRISIS_RESOURCES_MESSAGE = "What you just wrote matters, and it's bigger than this app. Please reach out to the 988 Suicide & Crisis Lifeline — call or text 988 in the US, available 24/7. You don't have to carry this alone right now.";


async function generateDriftMessage(userData, driftType) {
  const history = userData?.debriefHistory || [];
  const recentScores = history.slice(-5).map(e => e.score).join(", ");
  const prompt = driftType === "silence"
    ? `User identity: ${userData?.identity?.label} ("${userData?.identity?.statement}"). They have gone silent — no activity logged in 3+ days. Their recent scores before going quiet: ${recentScores || "none logged"}. Confront the silence directly.`
    : `User identity: ${userData?.identity?.label} ("${userData?.identity?.statement}"). Their last 3 debrief scores: ${recentScores}. They are consistently scoring low. Confront this pattern directly.`;
  try {
    return await askClaude([{role:"user",content:prompt}], DRIFT_SYSTEM);
  } catch {
    return driftType === "silence"
      ? `${userData?.identity?.label} doesn't go quiet for three days. That's not what you said you wanted. What happened?`
      : `Three days of scores at 5 or below. ${userData?.identity?.label} was the standard you set — not the average you're hitting. What's actually going on?`;
  }
}


const CALLSIGNS = ["Ghost","Viper","Rook","Atlas","Forge","Steel","Apex","Delta","Recon","Echo","Titan","Blaze","Cipher","Saxon","Wolfe","Nova","Halo","Grit","Valor","Creed"];
function makeCallsign(id) {
  const idx = parseInt(id.slice(0,4), 36) % CALLSIGNS.length;
  return CALLSIGNS[idx];
}

// ── Main Component ────────────────────────────────────────────────────────────
function Forge() {
  const [screen, setScreen] = useState("loading");
  const [userData, setUserData] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [aiTyping, setAiTyping] = useState(false);
  const [checked, setChecked] = useState([]); // kept for pct compat
  const [domainLogs, setDomainLogs] = useState({}); // { domainKey: { actionId, tier, voteWeight, metric, completed } }
  const [activeDomain, setActiveDomain] = useState(null); // which domain card is expanded
  const [metricInput, setMetricInput] = useState({}); // { actionId: text }
  const [actionTiming, setActionTiming] = useState({}); // { actionId: 'morning'|'midday'|'evening'|'done' } — implementation intention
  const [selectedTier, setSelectedTier] = useState({}); // { domainKey: 'good'|'better'|'best' }
  const [pillarStatus, setPillarStatus] = useState({ identity:false, sacrifice:false, blocker:false, vision:false, domains:false });
  const [driftAlert, setDriftAlert] = useState(null);
  const [reforgeStep, setReforgeStep] = useState(1); // 1=acknowledge 2=single action 3=reentry
  const [reforgeMessage, setReforgeMessage] = useState("");
  const [reforgeLoading, setReforgeLoading] = useState(false);
  const [evolutionText, setEvolutionText] = useState("");
  const [evolutionLoading, setEvolutionLoading] = useState(false);
  const [ceoScores, setCeoScores] = useState({ relationships:null, family:null, work:null, health:null });
  const [ceoMissed, setCeoMissed] = useState("");
  const [ceoPriorities, setCeoPriorities] = useState(["", "", ""]);
  const [ceoResponse, setCeoResponse] = useState("");
  const [ceoCrisisFlag, setCeoCrisisFlag] = useState(false);
  const [ceoSubmitting, setCeoSubmitting] = useState(false);
  const [triggers, setTriggers] = useState(null);
  const [triggersLoading, setTriggersLoading] = useState(false);
  const [activeTriggerIdx, setActiveTriggerIdx] = useState(null);
  const [currentResponseDraft, setCurrentResponseDraft] = useState("");
  const [scriptDrafting, setScriptDrafting] = useState(false);
  const [draftedScript, setDraftedScript] = useState("");
  const [forgingPhase, setForgingPhase] = useState("identity");
  const [coachingBrief, setCoachingBrief] = useState({}); // { actionId: { text, loading } }
  const [patternInsight, setPatternInsight] = useState(null);
  const [patternLoading, setPatternLoading] = useState(false);
  const [forgingQuoteIdx, setForgingQuoteIdx] = useState(0);
  const [hookSlide, setHookSlide] = useState(0);
  const [splashDest, setSplashDest] = useState("hook"); // where splash routes: hook (new) | dashboard | drift
  const [reminderTime, setReminderTime] = useState("21:00");
  const [debriefVoice, setDebriefVoice] = useState(null); // null | "none" | "won" | "overrode"
  const [readyToForge, setReadyToForge] = useState(false);
  const [voteFlash, setVoteFlash] = useState(null); // { weight, tier, sweep } transient celebration
  const [sealDone, setSealDone] = useState(false);
  const [pickedFoundations, setPickedFoundations] = useState([]);
  const [dictating, setDictating] = useState(false);
  const [pledgePhase, setPledgePhase] = useState("offer"); // offer | listening | witnessed
  const [debriefMiss, setDebriefMiss] = useState("");
  const [innerVoiceInput, setInnerVoiceInput] = useState("");
  const [innerVoiceLoading, setInnerVoiceLoading] = useState(false);
  const [ackClauses, setAckClauses] = useState({ statement:false, sacrifice:false, vision:false });
  const [whyOpen, setWhyOpen] = useState({}); // { sectionId: bool } — "Why this works" toggles

  // Point-of-use education: a small expandable rationale on major sections
  function WhyThis({ id, children }) {
    const open = !!whyOpen[id];
    return (
      <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
        <button onClick={()=>setWhyOpen(p=>({...p,[id]:!p[id]}))} style={{background:"none",border:"none",padding:0,textAlign:"left",cursor:"pointer",fontFamily:"'Georgia',serif",fontSize:"10px",color:open?"#c8a96e":"#4a4a6a",letterSpacing:"0.15em",display:"flex",alignItems:"center",gap:"6px",transition:"color 0.2s ease"}}>
          <span style={{fontSize:"9px"}}>◈</span> WHY THIS WORKS {open?"▾":"▸"}
        </button>
        {open && (
          <div style={{fontSize:"13px",color:"#9a9aac",lineHeight:1.7,fontStyle:"italic",borderLeft:"2px solid #c8a96e33",paddingLeft:"12px",animation:"fadeIn 0.3s ease"}}>
            {children}
          </div>
        )}
      </div>
    );
  }
  const pledgeRecRef = useRef(null);
  const recognitionRef = useRef(null);
  const speechSupported = typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const [hookDragX, setHookDragX] = useState(0);
  const [hookDir, setHookDir] = useState("right"); // entrance direction of current slide
  const hookTouchX = useRef(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState("bug");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [debriefScore, setDebriefScore] = useState(null);
  const [debriefNote, setDebriefNote] = useState("");
  const [debriefResponse, setDebriefResponse] = useState("");
  const [disruption, setDisruption] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [cohortMembers, setCohortMembers] = useState([]);
  const [cohortLoading, setCohortLoading] = useState(false);
  const chatEndRef = useRef();

  const disruptions = [
    "What would the person you're becoming do in the next 10 minutes?",
    "Name one thing you're avoiding right now.",
    "Is what you're doing right now moving you toward or away from your identity?",
    "If your future self could see this moment — would they be proud?",
    "The old you would stop here. What does the new you do?",
  ];

  // ── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const saved = await loadFromStorage();
      if (saved?.identity) {
        const today = todayStr();
        setChecked(saved.dailyLogs?.[today]?.checked || []);
        setDomainLogs(saved.dailyLogs?.[today]?.domainLogs || {});
        setSelectedTier(saved.dailyLogs?.[today]?.selectedTier || {});
        setUserData(saved);
        const drift = detectDrift(saved);
        if (drift) {
          setDriftAlert({ type: drift, loading: true, message: "" });
          setSplashDest("drift");
          setScreen("splash");
          const msg = await generateDriftMessage(saved, drift);
          setDriftAlert({ type: drift, loading: false, message: msg });
        } else {
          setSplashDest("dashboard");
          setScreen("splash");
        }
      } else if (saved?.onboardingInProgress) {
        // Resume interrupted onboarding
        const history = saved.onboardingInProgress.chatHistory || [];
        const status = saved.onboardingInProgress.pillarStatus || { identity:false, sacrifice:false, blocker:false, vision:false, domains:false };
        setChatHistory(history);
        setPillarStatus(status);
        setScreen("onboarding");
      } else {
        setScreen("splash");
      }
    })();
  }, []);

  useEffect(() => {
    if (screen !== "splash") return;
    const returning = splashDest !== "hook";
    const t = setTimeout(()=>setScreen(splashDest), returning ? 4600 : 7950);
    return ()=>clearTimeout(t);
  }, [screen, splashDest]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({behavior:"smooth"}); }, [chatHistory, aiTyping]);
  useEffect(() => {
    if (screen==="dashboard") {
      const t=setTimeout(()=>setDisruption(disruptions[Math.floor(Math.random()*disruptions.length)]),5000);
      return ()=>clearTimeout(t);
    }
    if (screen==="cohort") { refreshCohort(); }
  }, [screen]);

  // ── Persist ───────────────────────────────────────────────────────────────
  async function persist(newData) {
    setUserData(newData);
    await saveToStorage(newData);
    // Also publish to cohort shared storage
    if (newData?.memberId && newData?.identity) {
      await publishCohortMember(newData.memberId, {
        memberId: newData.memberId,
        callsign: makeCallsign(newData.memberId),
        label: newData.identity.label,
        dayCount: daysBetween(newData.startDate),
        todayPct: (() => {
          const dl = newData.dailyLogs?.[todayStr()]?.domainLogs || {};
          const completed = Object.values(dl).filter(l=>l?.completed).length;
          const total = (newData.domains || DOMAINS).length || 4;
          return Object.keys(dl).length > 0 ? Math.round((completed/total)*100) : calcPct(newData.dailyLogs?.[todayStr()]?.checked||[], newData.identity?.tasks||[]);
        })(),
        avgScore: calcAvgScore(newData.debriefHistory || []),
        lastActive: todayStr(),
        startDate: newData.startDate,
      });
    }
    setSaveStatus("saved");
    setTimeout(()=>setSaveStatus(""),1500);
  }

  function calcPct(checked, tasks) {
    try {
      const logs = domainLogs || {};
      const completedDomains = Object.values(logs).filter(l=>l?.completed).length;
      const totalDomains = (userData?.domains || DOMAINS).length || 4;
      if (Object.keys(logs).length > 0) {
        return Math.round((completedDomains / totalDomains) * 100);
      }
      return tasks?.length ? Math.round(((checked||[]).length/tasks.length)*100) : 0;
    } catch { return 0; }
  }
  function calcAvgScore(history) {
    if (!history.length) return 0;
    return +(history.reduce((s,e)=>s+e.score,0)/history.length).toFixed(1);
  }

  // ── Cohort refresh ────────────────────────────────────────────────────────
  async function refreshCohort() {
    setCohortLoading(true);
    const all = await loadAllCohortMembers();
    const today = todayStr();
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate()-7);
    const active = all.filter(m => {
      const last = new Date(m.lastActive);
      return last >= sevenDaysAgo;
    }).sort((a,b) => b.todayPct - a.todayPct || b.avgScore - a.avgScore);
    setCohortMembers(active);
    setCohortLoading(false);
  }

  // ── Domain action completion ───────────────────────────────────────────────
  async function completeAction(domainKey, action, tierName, voteWeight) {
    // If requires metric, check metric is filled
    if (action.requires_metric && !metricInput[action.id]?.trim()) return;
    // Implementation intention required — when did/will this happen
    if (!actionTiming[action.id]) return;
    const today = todayStr();
    const newDomainLogs = {
      ...domainLogs,
      [domainKey]: {
        actionId: action.id,
        actionText: action.text,
        tier: tierName,
        voteWeight,
        metric: action.requires_metric ? metricInput[action.id] : null,
        timing: actionTiming[action.id],
        completed: true,
        completedAt: new Date().toISOString(),
      }
    };
    setDomainLogs(newDomainLogs);
    setActiveDomain(null);
    // Celebration flash — the highest-frequency reward moment in the app
    const completedCountNow = Object.values(newDomainLogs).filter(l=>l.completed).length;
    const totalDomains = (userData?.domains||DOMAINS).length;
    // Lifetime vote milestone check — did this action cross a threshold?
    const priorVotes = journeyStats(userData).votes;
    const newTotal = priorVotes + voteWeight;
    const milestone = VOTE_MILESTONES.find(m => priorVotes < m && newTotal >= m) || null;
    const isSweep = completedCountNow === totalDomains;
    setVoteFlash({ weight: voteWeight, tier: tierName, sweep: isSweep, milestone });
    setTimeout(()=>setVoteFlash(null), (isSweep || milestone) ? 3400 : 2000);
    // Keep checked array in sync for legacy pct compat
    const completedCount = Object.values(newDomainLogs).filter(l=>l.completed).length;
    setChecked(Array.from({length:completedCount},(_,i)=>i));
    const updated = {
      ...userData,
      dailyLogs: {
        ...(userData?.dailyLogs||{}),
        [today]: {
          ...(userData?.dailyLogs?.[today]||{}),
          domainLogs: newDomainLogs,
          selectedTier: { ...selectedTier, [domainKey]: tierName },
          date: today,
        }
      }
    };
    await persist(updated);
  }

  async function uncompleteAction(domainKey) {
    const today = todayStr();
    const newDomainLogs = { ...domainLogs };
    delete newDomainLogs[domainKey];
    setDomainLogs(newDomainLogs);
    const completedCount = Object.values(newDomainLogs).filter(l=>l.completed).length;
    setChecked(Array.from({length:completedCount},(_,i)=>i));
    const updated = {
      ...userData,
      dailyLogs: {
        ...(userData?.dailyLogs||{}),
        [today]: { ...(userData?.dailyLogs?.[today]||{}), domainLogs: newDomainLogs, date: today }
      }
    };
    await persist(updated);
  }

  // ── Onboarding ────────────────────────────────────────────────────────────
  async function startOnboarding() {
    setReadyToForge(false);
    setScreen("onboarding");
    setPillarStatus({ identity:false, sacrifice:false, blocker:false, vision:false, domains:false });
    setAiTyping(true);


    try {
      const opening = await askClaude([{role:"user",content:"Begin the onboarding. Start with your opening question."}], ONBOARDING_SYSTEM);
      const status = parseOnboardingStatus(opening);
      if (status) setPillarStatus(status);
      setChatHistory([{role:"assistant",content:stripOnboardingMeta(opening)}]);
    } catch (e) {
      setChatHistory([{role:"assistant",content:`⚠️ Debug info: ${e.message || e}`}]);
    } finally {
      setAiTyping(false);
    }
  }

  async function sendMessage() {
    if (!userInput.trim()||aiTyping) return;
    const msg = userInput.trim(); setUserInput("");
    const newHistory = [...chatHistory, {role:"user",content:msg}];
    setChatHistory(newHistory); setAiTyping(true);
    try {
      const reply = await askClaude(newHistory, ONBOARDING_SYSTEM);
      const isReady = reply.includes("[READY_TO_FORGE]");
      const status = parseOnboardingStatus(reply);
      if (status) setPillarStatus(status);
      const clean = stripOnboardingMeta(reply);
      const fullHistory = [...newHistory, {role:"assistant",content:clean}];
      setChatHistory(fullHistory);
      // Save progress so onboarding can be resumed if interrupted
      await saveToStorage({ onboardingInProgress: { chatHistory: fullHistory, pillarStatus: status || pillarStatus } });
      if (isReady) setReadyToForge(true); // show the forge button — user reads, then chooses the moment
    } catch (e) {
      setChatHistory([...newHistory, {role:"assistant",content:`⚠️ Debug info: ${e.message || e}`}]);
    } finally {
      setAiTyping(false);
    }
  }

  async function forgeIdentity(history) {
    setScreen("forging");
    setForgingPhase("identity");
    setForgingQuoteIdx(0);

    const quoteTimer = setInterval(() => {
      setForgingQuoteIdx(i => (i + 1) % FORGE_QUOTES.length);
    }, 3500);

    const transcript = history.map(m=>`${m.role==="user"?"USER":"FORGE"}: ${m.content}`).join("\n\n");

    // ── Single call: identity + domains together ───────────────────────────
    let identity;
    let domains = null;
    let domainGenError = null;

    try {
      setForgingPhase("domains"); // show domain phase immediately since it's one call
      const prompt = `Here is the onboarding conversation:\n\n${transcript}\n\nGenerate the complete identity profile and custom life domains for this person. Output only the JSON object.`;
      const raw = await askClaude([{role:"user",content:prompt}], IDENTITY_SYSTEM, 2, 4000);
      const cleaned = raw.replace(/```json/gi,"").replace(/```/g,"").trim();
      const parsed = JSON.parse(cleaned);

      // Extract identity
      if (parsed?.identity) {
        identity = parsed.identity;
      } else if (parsed?.label) {
        identity = parsed; // backward compat if only identity returned
      }

      // Extract domains
      if (parsed?.domains?.length >= 3) {
        domains = parsed.domains;
      } else {
        domainGenError = `Domain count was ${parsed?.domains?.length||0}`;
      }
    } catch (e) {
      domainGenError = e.message;
    }

    // Identity fallback
    if (!identity) {
      identity = {
        label: "The Architect",
        statement: "I am becoming a disciplined builder of the life I have chosen.",
        sacrifice: "Comfort and excuses",
        vision: "A life built by design, not default."
      };
    }

    // Domain fallback — identity-aware stubs, not generic hardcoded defaults
    if (!domains) {
      domains = [
        {
          domain:"primary", label:"Primary Craft", emoji:"🎯",
          identity_claim: identity.statement,
          tiers:{
            good:{ vote_weight:1, actions:[
              {id:"primary_good_01",text:"Take one concrete action toward your primary goal today",requires_metric:false},
              {id:"primary_good_02",text:"Spend 45 focused minutes on your craft — no interruptions",requires_metric:false},
              {id:"primary_good_03",text:"Review your progress and identify the one gap to close",requires_metric:false},
            ]},
            better:{ vote_weight:2, actions:[
              {id:"primary_better_01",text:"Complete the hardest task in your craft you've been putting off",requires_metric:true,metric_prompt:"What did you do and what was the outcome?"},
              {id:"primary_better_02",text:"Get feedback from someone further ahead than you",requires_metric:true,metric_prompt:"Who did you talk to and what did you learn?"},
            ]},
            best:{ vote_weight:3, actions:[
              {id:"primary_best_01",text:"Do the single thing that, done consistently, guarantees you become who you said you'd be",requires_metric:true,metric_prompt:"What was it, how long did you do it, and what changed?"},
            ]},
          },
          rotation_pool_size:4, rotation_refresh_days:14
        },
        {
          domain:"body", label:"Physical Foundation", emoji:"💪",
          identity_claim:"My body is my instrument",
          tiers:{
            good:{ vote_weight:1, actions:[
              {id:"body_good_01",text:"Train with full intention for at least 30 minutes",requires_metric:false},
              {id:"body_good_02",text:"Eat to fuel performance — not convenience",requires_metric:false},
              {id:"body_good_03",text:"Protect your sleep — in bed at the right time tonight",requires_metric:false},
            ]},
            better:{ vote_weight:2, actions:[
              {id:"body_better_01",text:"Complete a full planned training session and log it",requires_metric:true,metric_prompt:"What did you train and what metric improved?"},
              {id:"body_better_02",text:"Prepare your nutrition for the next 24 hours deliberately",requires_metric:true,metric_prompt:"What did you prep and what's the plan?"},
            ]},
            best:{ vote_weight:3, actions:[
              {id:"body_best_01",text:"Train + eat precisely + sleep protocol — all three executed today",requires_metric:true,metric_prompt:"Detail exactly what you did across training, nutrition, and sleep."},
            ]},
          },
          rotation_pool_size:4, rotation_refresh_days:14
        },
        {
          domain:"mind", label:"Mental Edge", emoji:"🧠",
          identity_claim:"I think like the person I'm becoming",
          tiers:{
            good:{ vote_weight:1, actions:[
              {id:"mind_good_01",text:"Study one thing directly relevant to your goal for 20 minutes",requires_metric:false},
              {id:"mind_good_02",text:"Identify and eliminate one mental pattern that doesn't serve you",requires_metric:false},
              {id:"mind_good_03",text:"Review your identity statement and score today honestly",requires_metric:false},
            ]},
            better:{ vote_weight:2, actions:[
              {id:"mind_better_01",text:"Apply something you've been learning to a real situation today",requires_metric:true,metric_prompt:"What did you apply and what happened?"},
              {id:"mind_better_02",text:"Do the hardest mental work you've been avoiding",requires_metric:true,metric_prompt:"What was it and what did you produce?"},
            ]},
            best:{ vote_weight:3, actions:[
              {id:"mind_best_01",text:"Spend 90 minutes in deep, uninterrupted study or creative output",requires_metric:true,metric_prompt:"What did you work on and what did you produce or understand?"},
            ]},
          },
          rotation_pool_size:4, rotation_refresh_days:14
        },
        {
          domain:"environment", label:"Environment & Support", emoji:"🌱",
          identity_claim:"I build conditions for who I'm becoming",
          tiers:{
            good:{ vote_weight:1, actions:[
              {id:"env_good_01",text:"Remove one friction point that stands between you and your identity behaviors",requires_metric:false},
              {id:"env_good_02",text:"Spend intentional time with someone who reinforces who you're becoming",requires_metric:false},
              {id:"env_good_03",text:"Organize your space so tomorrow's version of you starts ahead",requires_metric:false},
            ]},
            better:{ vote_weight:2, actions:[
              {id:"env_better_01",text:"Have a real conversation with someone who challenges or elevates you",requires_metric:true,metric_prompt:"Who did you talk to and what came from it?"},
              {id:"env_better_02",text:"Audit and cut one thing in your environment that contradicts your identity",requires_metric:true,metric_prompt:"What did you cut and why?"},
            ]},
            best:{ vote_weight:3, actions:[
              {id:"env_best_01",text:"Build or repair one relationship or system that will compound over time",requires_metric:true,metric_prompt:"What did you build or repair and what's the long-term play?"},
            ]},
          },
          rotation_pool_size:4, rotation_refresh_days:14
        },
      ];
    }

    clearInterval(quoteTimer);

    const memberId = genId();
    const accent = ACCENTS[identity?.accent] ? identity.accent : "gold";
    const newUserData = {
      identity,
      accent,
      domains,
      domainGenError,
      startDate: todayStr(),
      dailyLogs: {},
      debriefHistory: [],
      memberId,
    };
    await persist(newUserData);
    setScreen("contract");
  }

  // ── Debrief ───────────────────────────────────────────────────────────────
  // ── Inner Voice — self-talk rewrite ───────────────────────────────────────
  async function rewriteInnerVoice() {
    if (!innerVoiceInput.trim()) return;
    // Crisis language gets a human response, not a performance script
    if (detectCrisisLanguage(innerVoiceInput)) {
      await persist({ ...userData, innerVoice: { old: innerVoiceInput, script: CRISIS_RESOURCES_MESSAGE, at: new Date().toISOString(), flagged: true } });
      setInnerVoiceInput("");
      return;
    }
    setInnerVoiceLoading(true);
    const prompt = `IDENTITY: ${userData?.identity?.label} — "${userData?.identity?.statement}"
${traitsPromptBlock(userData)}

WHAT THEY SAY TO THEMSELVES WHEN THEY FAIL OR DRIFT:
"${innerVoiceInput}"

Rewrite their inner voice.`;
    try {
      const script = await askClaude([{role:"user",content:prompt}], SELFTALK_SYSTEM);
      await persist({ ...userData, innerVoice: { old: innerVoiceInput, script, at: new Date().toISOString() } });
      setInnerVoiceInput("");
    } catch {}
    setInnerVoiceLoading(false);
  }

  // ── Nightly reminder — one-tap daily calendar alert ───────────────────────
  function downloadReminder() {
    const [h, m] = reminderTime.split(":");
    const now = new Date();
    const dt = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}T${h}${m}00`;
    const ics = [
      "BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//FORGE//Debrief//EN",
      "BEGIN:VEVENT",
      `UID:forge-debrief-${Date.now()}@forgeyourself.app`,
      `DTSTART:${dt}`,
      "DURATION:PT15M",
      "RRULE:FREQ=DAILY",
      "SUMMARY:FORGE — Nightly Debrief",
      "DESCRIPTION:Close the day. Score it against the standard. forgeyourself.app",
      "BEGIN:VALARM","TRIGGER:PT0M","ACTION:DISPLAY","DESCRIPTION:FORGE — close the day","END:VALARM",
      "END:VEVENT","END:VCALENDAR"
    ].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "forge-debrief.ics";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url), 5000);
  }

  // ── The Oath — spoken pledge at the seal ──────────────────────────────────
  function beginOath() {
    setPledgePhase("listening");
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return; // honor-system button handles completion
    try {
      const rec = new SR();
      rec.continuous = true; rec.interimResults = false; rec.lang = "en-US";
      let heard = false;
      rec.onresult = () => { heard = true; };
      rec.onend = () => { if (heard) completeOath(); };
      rec.onerror = () => {};
      pledgeRecRef.current = rec;
      rec.start();
    } catch {}
  }
  async function completeOath() {
    try { pledgeRecRef.current?.stop(); } catch {}
    setPledgePhase("witnessed");
    await persist({ ...userData, oathSwornAt: new Date().toISOString() });
  }

  // ── Spoken Debrief — dictation via Web Speech API ─────────────────────────
  function toggleDictation() {
    if (dictating) {
      recognitionRef.current?.stop();
      setDictating(false);
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (e) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) text += e.results[i][0].transcript;
      }
      if (text) setDebriefNote(prev => (prev ? prev.trim() + " " : "") + text.trim());
    };
    rec.onerror = () => setDictating(false);
    rec.onend = () => setDictating(false);
    recognitionRef.current = rec;
    rec.start();
    setDictating(true);
  }

  async function submitDebrief() {
    if (!debriefScore) return;

    // Bug #4 fix: once-per-day guard — prevent duplicate debriefs corrupting history
    const today = todayStr();
    const alreadyDebriefed = userData?.dailyLogs?.[today]?.debriefScore != null;
    if (alreadyDebriefed) {
      setDebriefResponse("You already closed today. Come back tomorrow — consistency beats intensity.");
      return;
    }

    // Hard safety check before anything else — independent of AI judgment
    if (detectCrisisLanguage(debriefNote) || detectCrisisLanguage(debriefMiss)) {
      setDebriefResponse(CRISIS_RESOURCES_MESSAGE);
      const entry = { date:today, score:debriefScore, note:debriefNote, response:CRISIS_RESOURCES_MESSAGE, dayCount:currentDay(), flagged:true };
      const updated = {
        ...userData,
        debriefHistory: [...(userData?.debriefHistory||[]), entry],
        dailyLogs: { ...(userData?.dailyLogs||{}), [today]: { ...(userData?.dailyLogs?.[today]||{}), debriefScore, debriefNote, date:today } }
      };
      await persist(updated);
      return;
    }

    setAiTyping(true);
    const prompt = `Identity: ${userData?.identity?.label}. Score: ${debriefScore}/10. Note: "${debriefNote||"None."}"
THE MISS (integrity confession): "${debriefMiss||"Nothing confessed."}"
VOICE CHECK: ${debriefVoice==="overrode"?"The old inner voice showed up today and they ACTED ANYWAY — honor this explicitly; acting with the thought present is one of the heaviest votes there is.":debriefVoice==="won"?"The old inner voice showed up and won today. Treat this as reconnaissance, never shame — now they know the trigger. One line on what the override looks like next time.":debriefVoice==="none"?"The old voice didn't show up today.":"Not reported."}
${(()=>{const prev=(userData?.debriefHistory||[]).slice(-1)[0];return prev?.acknowledged&&prev?.response?`YESTERDAY'S ORDER — THEY TAPPED "HOLD ME TO IT" ON THIS (check whether they executed; if they did, mark it; if they didn't, that's the gap tonight): "${prev.response.slice(0,300)}"`:"";})()}
${userData?.innerVoice?.script && !userData?.innerVoice?.flagged ? `THEIR REBUILT INNER-VOICE SCRIPT (reinforce it if their self-talk slips): ${userData.innerVoice.script.slice(0,400)}` : ""}

${traitsPromptBlock(userData)}`;
    const response = await askClaude([{role:"user",content:prompt}], DEBRIEF_SYSTEM);
    setDebriefResponse(response); setAiTyping(false);
    const entry = { date:today, score:debriefScore, note:debriefNote, miss:debriefMiss, voiceCheck:debriefVoice, response, dayCount:currentDay() };
    const updated = {
      ...userData,
      debriefHistory: [...(userData?.debriefHistory||[]), entry],
      dailyLogs: { ...(userData?.dailyLogs||{}), [today]: { ...(userData?.dailyLogs?.[today]||{}), debriefScore, debriefNote, date:today } }
    };
    await persist(updated);
  }

  // ── Weekly CEO Review ────────────────────────────────────────────────────────
  async function submitCeoReview() {
    const { relationships, family, work, health } = ceoScores;
    if ([relationships, family, work, health].some(v => v === null)) return;

    // Hard safety net — checked in code, not left to the AI alone
    const combinedText = `${ceoMissed} ${ceoPriorities.join(" ")}`;
    const lowRelationalScore = relationships <= 3 || family <= 3;
    const crisisLanguage = detectCrisisLanguage(combinedText);

    if (crisisLanguage) {
      setCeoCrisisFlag(true);
      setCeoResponse(CRISIS_RESOURCES_MESSAGE);
      await saveCeoEntry({ flagged: true });
      return;
    }

    setCeoSubmitting(true);
    const prompt = `Identity: ${userData?.identity?.label} ("${userData?.identity?.statement}").
Weekly scores — Relationships: ${relationships}/10, Family: ${family}/10, Work/Wealth: ${work}/10, Health: ${health}/10.
What they missed this week: "${ceoMissed || "Nothing noted."}"
Next week's three priorities: ${ceoPriorities.filter(p=>p.trim()).join("; ") || "None set."}
${lowRelationalScore ? "NOTE: Relationships or Family scored 3 or below — apply the safety rule." : ""}`;

    let response;
    try {
      response = await askClaude([{role:"user",content:prompt}], CEO_REVIEW_SYSTEM);
    } catch {
      response = "Review unavailable right now — your scores are saved. Try again shortly.";
    }
    setCeoSubmitting(false);
    setCeoResponse(response);
    await saveCeoEntry({ flagged: false });
  }

  async function saveCeoEntry(meta) {
    const entry = {
      date: todayStr(),
      week: Math.ceil(currentDay()/7),
      scores: { ...ceoScores },
      missed: ceoMissed,
      priorities: ceoPriorities,
      response: ceoResponse,
      ...meta,
    };
    const updated = { ...userData, ceoReviews: [...(userData?.ceoReviews||[]), entry] };
    await persist(updated);
  }

  function resetCeoForm() {
    setCeoScores({ relationships:null, family:null, work:null, health:null });
    setCeoMissed(""); setCeoPriorities(["","",""]); setCeoResponse(""); setCeoCrisisFlag(false);
  }

  // ── Re-Forge ──────────────────────────────────────────────────────────────────
  async function startReforge() {
    setReforgeLoading(true);
    setReforgeStep(2);

    // Find weakest recent domain
    const logs = Object.values(userData?.dailyLogs||{}).slice(-7);
    const domainCounts = {};
    logs.forEach(log => {
      (userData?.domains||DOMAINS).forEach(d => {
        if (!log.domainLogs?.[d.domain]?.completed) {
          domainCounts[d.domain] = (domainCounts[d.domain]||0) + 1;
        }
      });
    });
    const weakestKey = Object.entries(domainCounts).sort((a,b)=>b[1]-a[1])[0]?.[0];
    const weakestDomain = (userData?.domains||DOMAINS).find(d=>d.domain===weakestKey);

    const recentScores = (userData?.debriefHistory||[]).slice(-5).map(e=>`${e.score}/10`).join(", ");

    const prompt = `Identity: ${userData?.identity?.label} ("${userData?.identity?.statement}")
5-year vision: "${userData?.identity?.vision}"
Recent debrief scores: ${recentScores||"none"}
Weakest domain recently: ${weakestDomain?.label||"unknown"}
Days since last active: ${driftAlert?.type==="silence"?"3+":"scores have been low"}

${traitsPromptBlock(userData)}

Write the re-entry statement.`;

    try {
      const msg = await askClaude([{role:"user",content:prompt}], REFORGE_SYSTEM);
      setReforgeMessage(msg);
    } catch {
      setReforgeMessage(`The gap is real. ${weakestDomain?.label||"Your primary domain"} is where you start today — not all four, just that one. ${userData?.identity?.label} doesn't wait for the perfect moment. Open it now.`);
    }
    setReforgeLoading(false);
    setReforgeStep(3);
  }

  // ── Identity Evolution (30-day assessment) ────────────────────────────────────
  async function getEvolution() {
    setEvolutionLoading(true);
    const debriefSummary = (userData?.debriefHistory||[]).slice(-10).map(d=>`Day ${d.dayCount}: ${d.score}/10`).join(", ");
    const prompt = `DECLARED IDENTITY: ${userData?.identity?.label} — "${userData?.identity?.statement}"
5-YEAR VISION: "${userData?.identity?.vision}"
DAYS IN THE FORGE: ${currentDay()}

${traitsPromptBlock(userData)}

RECENT DEBRIEFS: ${debriefSummary || "none"}

Assess whether they have earned this identity and name who they are becoming next.`;
    try {
      const text = await askClaude([{role:"user",content:prompt}], EVOLUTION_SYSTEM);
      setEvolutionText(text);
    } catch {
      setEvolutionText("The evidence is in your traits and your day count — read them on the Mirror. Thirty days of showing up is not a coincidence. The next chapter starts with the same question the first one did: who are you choosing to become now?");
    }
    setEvolutionLoading(false);
  }

  // ── Coaching ──────────────────────────────────────────────────────────────────
  async function getCoachingBrief(domain, action, tierName) {
    const actionId = action.id;
    setCoachingBrief(prev => ({ ...prev, [actionId]: { text:"", loading:true } }));

    // Build context from recent history
    const recentDebriefs = (userData?.debriefHistory || []).slice(-5);
    const domainHistory = Object.entries(userData?.dailyLogs || {})
      .slice(-7)
      .map(([date, log]) => {
        const dl = log.domainLogs?.[domain.domain];
        return dl ? `${date}: ${dl.tier} tier — "${dl.actionText}"${dl.metric ? ` → "${dl.metric}"` : ""}` : `${date}: not completed`;
      }).join("\n");

    const prompt = `IDENTITY: ${userData?.identity?.label}
IDENTITY STATEMENT: ${userData?.identity?.statement}
DOMAIN: ${domain.label} — "${domain.identity_claim}"
ACTION THEY'RE ABOUT TO TAKE: ${action.text}
TIER CHOSEN: ${tierName} (vote weight: ${domain.tiers[tierName]?.vote_weight})
DAYS ACTIVE: ${currentDay()}

RECENT DOMAIN HISTORY (last 7 days):
${domainHistory || "No history yet — this is early in their journey."}

RECENT DEBRIEF SCORES: ${recentDebriefs.map(d=>`Day ${d.dayCount}: ${d.score}/10`).join(", ") || "None yet"}

${traitsPromptBlock(userData)}

Give them a coaching brief for this specific action right now.`;

    try {
      const brief = await askClaude([{role:"user",content:prompt}], COACH_SYSTEM);
      setCoachingBrief(prev => ({ ...prev, [actionId]: { text:brief, loading:false } }));
    } catch(e) {
      setCoachingBrief(prev => ({ ...prev, [actionId]: { text:`Coach unavailable right now. Execute the action anyway — that's the point.`, loading:false } }));
    }
  }

  async function getPatternInsight() {
    if ((userData?.debriefHistory||[]).length < 5) return;
    setPatternLoading(true);

    const debriefSummary = (userData?.debriefHistory||[]).slice(-14).map(d=>
      `Day ${d.dayCount} (${d.date}): score ${d.score}/10 — "${d.note||"no note"}"`
    ).join("\n");

    const domainSummary = Object.entries(userData?.dailyLogs||{}).slice(-14).map(([date, log])=>{
      const dl = log.domainLogs || {};
      const entries = Object.entries(dl).map(([key, l])=>`${key}: ${l.tier||"—"}`).join(", ");
      return `${date}: ${entries || "no domains completed"}`;
    }).join("\n");

    const prompt = `IDENTITY: ${userData?.identity?.label} — "${userData?.identity?.statement}"
DAYS ACTIVE: ${currentDay()}
AVG DEBRIEF SCORE: ${avgScore() || "—"}

DEBRIEF HISTORY (last 14 days):
${debriefSummary || "Not enough data yet."}

DOMAIN COMPLETION (last 14 days):
${domainSummary || "Not enough data yet."}

${traitsPromptBlock(userData)}

Identify the single most important behavioral pattern you see.`;

    try {
      const insight = await askClaude([{role:"user",content:prompt}], PATTERN_SYSTEM);
      setPatternInsight(insight);
    } catch(e) {
      setPatternInsight(null);
    }
    setPatternLoading(false);
  }

  // ── Feedback ──────────────────────────────────────────────────────────────────
  async function handleSubmitFeedback() {
    if (!feedbackMessage.trim()) return;
    setFeedbackSubmitting(true);
    const callsign = userData?.memberId ? makeCallsign(userData.memberId) : "unknown";
    const ok = await submitFeedback(userData?.memberId || "anonymous", callsign, screen, feedbackCategory, feedbackMessage.trim());
    setFeedbackSubmitting(false);
    if (ok) {
      setFeedbackSent(true);
      setTimeout(()=>{ setFeedbackOpen(false); setFeedbackSent(false); setFeedbackMessage(""); setFeedbackCategory("bug"); }, 1800);
    } else {
      setFeedbackMessage(prev => prev); // keep their text so they don't lose it
    }
  }

  // ── Behavior Scripting ────────────────────────────────────────────────────────
  async function identifyTriggers() {
    setTriggersLoading(true);
    const prompt = `Identity: ${userData?.identity?.label} ("${userData?.identity?.statement}").
What they're sacrificing: "${userData?.identity?.sacrifice}".
Their 5-year vision: "${userData?.identity?.vision}".
Identify their three highest-risk trigger situations.`;
    let result;
    try {
      const raw = await askClaude([{role:"user",content:prompt}], TRIGGER_IDENTIFY_SYSTEM);
      result = JSON.parse(raw.replace(/```json|```/g,"").trim());
    } catch {
      result = { triggers: [
        { situation:"Stress or setback hits", context:"A common pressure point worth having a decided response for." },
        { situation:"Conflict with someone close to you", context:"Reactive responses here often contradict stated identity." },
        { situation:"Fatigue or low motivation", context:"The gap between intention and action widens most here." },
      ]};
    }
    setTriggers(result.triggers);
    setTriggersLoading(false);
  }

  async function draftScript(trigger, responseDescription) {
    setScriptDrafting(true);
    const prompt = `Identity: ${userData?.identity?.label} ("${userData?.identity?.statement}").
Trigger situation: "${trigger.situation}" — ${trigger.context}
How they currently tend to respond: "${responseDescription || "They haven't described this yet — write a strong default script for someone with this identity facing this trigger."}"
Write the script.`;
    let script;
    try {
      script = await askClaude([{role:"user",content:prompt}], SCRIPT_WRITE_SYSTEM);
    } catch {
      script = `I notice the trigger. I do not decide anything from this state. I take one action consistent with ${userData?.identity?.label}, then I reassess.`;
    }
    setScriptDrafting(false);
    setDraftedScript(script.trim());
  }

  async function saveScript(triggerIdx) {
    const trigger = triggers[triggerIdx];
    const entry = { situation: trigger.situation, context: trigger.context, currentResponse: currentResponseDraft, script: draftedScript, savedAt: todayStr() };
    const existingScripts = userData?.behaviorScripts || [];
    const updatedScripts = [...existingScripts.filter(s => s.situation !== trigger.situation), entry];
    const updated = { ...userData, behaviorScripts: updatedScripts };
    await persist(updated);
    setActiveTriggerIdx(null);
    setCurrentResponseDraft("");
    setDraftedScript("");
  }

  // ── Computed ──────────────────────────────────────────────────────────────
  function currentDay() { return userData?.startDate ? daysBetween(userData.startDate) : 1; }
  function daysUntilExpiry() { return Math.max(0, 30 - currentDay()); }
  const tasks = userData?.identity?.tasks || [];
  const pct = calcPct(checked, tasks);

  // Total active days (domain action or debrief logged) — used for loyalty milestones
  function totalActiveDays() {
    const logs = userData?.dailyLogs || {};
    return Object.values(logs).filter(isActiveLog).length;
  }

  // Loyalty tier: what the member has earned based on total active days
  function loyaltyTier() {
    const days = totalActiveDays();
    if (days >= 365) return { tier:"hoodie", label:"Hoodie", days:365, emoji:"🔥", unlocked:true };
    if (days >= 90)  return { tier:"shirt",  label:"T-Shirt", days:90, emoji:"⚡", unlocked:true };
    if (days >= 30)  return { tier:"wristband", label:"Wristband", days:30, emoji:"🔗", unlocked:true };
    return { tier:"none", label:"None yet", days:30, emoji:"◈", unlocked:false, nextAt:30, daysLeft:30-days };
  }

  // 30-day ceremony: show if just hit day 30 and hasn't seen it yet
  function shouldShowCeremony() {
    return currentDay() >= 30 && !userData?.ceremonySeen30;
  }

  function getStreakDots() {
    const logs = userData?.dailyLogs || {};
    return Array.from({length:7},(_,i)=>{
      const d = new Date(); d.setDate(d.getDate()-6+i);
      const key = d.toISOString().split("T")[0];
      return { date:key, filled: isActiveLog(logs[key]) };
    });
  }

  function avgScore() {
    const h = userData?.debriefHistory||[];
    if (!h.length) return null;
    return (h.reduce((s,e)=>s+e.score,0)/h.length).toFixed(1);
  }



  async function resetApp() {
    setResetConfirmOpen(false);
    await clearStorage();
    setUserData(null); setChatHistory([]); setChecked([]); setDebriefScore(null);
    setDebriefNote(""); setDebriefResponse(""); setDomainLogs({}); setSelectedTier({});
    setActiveDomain(null); setMetricInput({}); setActionTiming({}); setCoachingBrief({});
    setPatternInsight(null); setEvolutionText(""); setScreen("splash");
  }

  const myCallsign = userData?.memberId ? makeCallsign(userData.memberId) : "—";

  // ── CSS ───────────────────────────────────────────────────────────────────
  const CSS = `
    @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
    @keyframes slideInRight { 0%{opacity:0;transform:translateX(70px) scale(0.96)} 60%{opacity:1} 100%{opacity:1;transform:translateX(0) scale(1)} }
    @keyframes slideInLeft { 0%{opacity:0;transform:translateX(-70px) scale(0.96)} 60%{opacity:1} 100%{opacity:1;transform:translateX(0) scale(1)} }
    @keyframes iconForge { 0%{transform:scale(0.4) rotate(-12deg);opacity:0} 55%{transform:scale(1.18) rotate(3deg);opacity:1} 75%{transform:scale(0.94) rotate(-1deg)} 100%{transform:scale(1) rotate(0)} }
    @keyframes emberGlow { 0%,100%{text-shadow:0 0 12px rgba(200,169,110,0.25)} 50%{text-shadow:0 0 32px rgba(200,169,110,0.75), 0 0 60px rgba(200,120,40,0.35)} }
    @keyframes dotFill { from{transform:scaleX(0.3);opacity:0.5} to{transform:scaleX(1);opacity:1} }
    @keyframes strike { 0%{transform:translateY(-60px) rotate(-25deg);opacity:0} 45%{transform:translateY(0) rotate(0);opacity:1} 55%{transform:translateY(0) scale(1.06)} 100%{transform:translateY(0) scale(1)} }
    @keyframes burnIn { 0%{opacity:0;letter-spacing:0.3em;filter:blur(6px)} 100%{opacity:1;letter-spacing:-0.02em;filter:blur(0)} }
    @keyframes votePop { 0%{transform:translateY(14px) scale(0.7);opacity:0} 35%{transform:translateY(0) scale(1.12);opacity:1} 55%{transform:scale(0.97)} 100%{transform:scale(1);opacity:1} }
    @keyframes sweepGlow { 0%{box-shadow:0 0 0 rgba(200,169,110,0)} 40%{box-shadow:0 0 60px rgba(200,169,110,0.5)} 100%{box-shadow:0 0 18px rgba(200,169,110,0.2)} }
    @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
    @keyframes dreamFade { 0%{opacity:1;filter:blur(0)} 100%{opacity:0;filter:blur(5px);transform:scale(1.04)} }
    @keyframes dreamIn { 0%{opacity:0;filter:blur(4px);transform:translateY(10px)} 100%{opacity:1;filter:blur(0);transform:translateY(0)} }
    @keyframes emphasize { from{color:#5a5a6e;text-shadow:none;transform:scale(1);-webkit-text-stroke:0px transparent} to{color:#f4f1ea;text-shadow:0 0 26px rgba(232,228,220,0.4);transform:scale(1.06);-webkit-text-stroke:0.35px #f4f1ea} }
    @keyframes emphasizeGold { from{color:#8a7450;text-shadow:none;transform:scale(1);-webkit-text-stroke:0px transparent} to{color:#f0d49a;text-shadow:0 0 32px rgba(200,169,110,0.7);transform:scale(1.08);-webkit-text-stroke:0.4px #f0d49a} }
    @keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:1} }
    @keyframes typingPulse { 0%,100%{transform:translateY(0);opacity:0.4} 50%{transform:translateY(-4px);opacity:1} }
    ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:#0a0a0f} ::-webkit-scrollbar-thumb{background:#2a2a3e;border-radius:2px}
  `;

  // ── SCREENS ───────────────────────────────────────────────────────────────

  if (screen==="loading") return (
    <div style={S.app}><style>{CSS}</style>
      {screen!=="loading"&&screen!=="splash"&&(
        <button onClick={()=>setFeedbackOpen(true)} style={{position:"fixed",bottom:"20px",right:"20px",zIndex:50,background:"#1a1a2a",border:"1px solid #2a2a3e",borderRadius:"50%",width:"44px",height:"44px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:"16px",color:"#c8a96e",boxShadow:"0 4px 12px rgba(0,0,0,0.4)"}}>💬</button>
      )}
      {feedbackOpen && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}} onClick={()=>!feedbackSubmitting&&setFeedbackOpen(false)}>
          <div style={{...S.card,maxWidth:"380px"}} onClick={e=>e.stopPropagation()}>
            {!feedbackSent ? (
              <>
                <div style={S.eyebrow}>Send Feedback</div>
                <div style={{...S.h1,fontSize:"18px"}}>Something broken? Confusing? Tell us.</div>
                <div style={{display:"flex",gap:"8px"}}>
                  {["bug","confusing","idea","other"].map(c=>(
                    <button key={c} onClick={()=>setFeedbackCategory(c)} style={{flex:1,padding:"8px 0",borderRadius:"8px",border:`1px solid ${feedbackCategory===c?"#c8a96e":"#1e1e2e"}`,background:feedbackCategory===c?"#c8a96e":"#0a0a0f",color:feedbackCategory===c?"#0a0a0f":"#8a8a9c",fontSize:"12px",textTransform:"capitalize",cursor:"pointer",fontFamily:"'Georgia',serif"}}>{c}</button>
                  ))}
                </div>
                <textarea style={{...S.textarea,minHeight:"90px"}} placeholder="What happened? Be specific if it's a bug — what were you doing when it broke?" value={feedbackMessage} onChange={e=>setFeedbackMessage(e.target.value)} rows={4}/>
                <button style={{...S.btn,opacity:feedbackMessage.trim()&&!feedbackSubmitting?1:0.4}} disabled={!feedbackMessage.trim()||feedbackSubmitting} onClick={handleSubmitFeedback}>
                  {feedbackSubmitting?"Sending...":"Send Feedback"}
                </button>
                <button style={S.btnGhost} onClick={()=>setFeedbackOpen(false)}>Cancel</button>
              </>
            ) : (
              <div style={{textAlign:"center",padding:"20px 0"}}>
                <div style={{fontSize:"32px",marginBottom:"12px"}}>✓</div>
                <div style={{fontSize:"14px",color:"#c8a96e"}}>Sent. Thank you.</div>
              </div>
            )}
          </div>
        </div>
      )}
      {resetConfirmOpen && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}} onClick={()=>setResetConfirmOpen(false)}>
          <div style={{...S.card,maxWidth:"360px",border:"1px solid #4a2a2a"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:"10px",letterSpacing:"0.3em",color:"#8a5a5a",textTransform:"uppercase"}}>This Cannot Be Undone</div>
            <div style={{...S.h1,fontSize:"19px"}}>Reset your identity?</div>
            <div style={S.sub}>Your identity, debrief history, scripts, and progress will be permanently erased. You'll start over from onboarding.</div>
            <button style={{...S.btn,background:"#8a3a3a"}} onClick={resetApp}>Yes, Erase Everything</button>
            <button style={S.btnGhost} onClick={()=>setResetConfirmOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
      <div style={{display:"flex",gap:"7px"}}>{[0,1,2].map(i=><div key={i} style={{width:"7px",height:"7px",borderRadius:"50%",background:"#c8a96e",animation:`pulse 1.4s ${i*0.22}s infinite`}}/>)}</div>
    </div>
  );

  if (screen==="splash") return (
    <div style={S.app}><style>{CSS}</style>
      {screen!=="loading"&&screen!=="splash"&&(
        <button onClick={()=>setFeedbackOpen(true)} style={{position:"fixed",bottom:"20px",right:"20px",zIndex:50,background:"#1a1a2a",border:"1px solid #2a2a3e",borderRadius:"50%",width:"44px",height:"44px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:"16px",color:"#c8a96e",boxShadow:"0 4px 12px rgba(0,0,0,0.4)"}}>💬</button>
      )}
      {feedbackOpen && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}} onClick={()=>!feedbackSubmitting&&setFeedbackOpen(false)}>
          <div style={{...S.card,maxWidth:"380px"}} onClick={e=>e.stopPropagation()}>
            {!feedbackSent ? (
              <>
                <div style={S.eyebrow}>Send Feedback</div>
                <div style={{...S.h1,fontSize:"18px"}}>Something broken? Confusing? Tell us.</div>
                <div style={{display:"flex",gap:"8px"}}>
                  {["bug","confusing","idea","other"].map(c=>(
                    <button key={c} onClick={()=>setFeedbackCategory(c)} style={{flex:1,padding:"8px 0",borderRadius:"8px",border:`1px solid ${feedbackCategory===c?"#c8a96e":"#1e1e2e"}`,background:feedbackCategory===c?"#c8a96e":"#0a0a0f",color:feedbackCategory===c?"#0a0a0f":"#8a8a9c",fontSize:"12px",textTransform:"capitalize",cursor:"pointer",fontFamily:"'Georgia',serif"}}>{c}</button>
                  ))}
                </div>
                <textarea style={{...S.textarea,minHeight:"90px"}} placeholder="What happened? Be specific if it's a bug — what were you doing when it broke?" value={feedbackMessage} onChange={e=>setFeedbackMessage(e.target.value)} rows={4}/>
                <button style={{...S.btn,opacity:feedbackMessage.trim()&&!feedbackSubmitting?1:0.4}} disabled={!feedbackMessage.trim()||feedbackSubmitting} onClick={handleSubmitFeedback}>
                  {feedbackSubmitting?"Sending...":"Send Feedback"}
                </button>
                <button style={S.btnGhost} onClick={()=>setFeedbackOpen(false)}>Cancel</button>
              </>
            ) : (
              <div style={{textAlign:"center",padding:"20px 0"}}>
                <div style={{fontSize:"32px",marginBottom:"12px"}}>✓</div>
                <div style={{fontSize:"14px",color:"#c8a96e"}}>Sent. Thank you.</div>
              </div>
            )}
          </div>
        </div>
      )}
      {resetConfirmOpen && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}} onClick={()=>setResetConfirmOpen(false)}>
          <div style={{...S.card,maxWidth:"360px",border:"1px solid #4a2a2a"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:"10px",letterSpacing:"0.3em",color:"#8a5a5a",textTransform:"uppercase"}}>This Cannot Be Undone</div>
            <div style={{...S.h1,fontSize:"19px"}}>Reset your identity?</div>
            <div style={S.sub}>Your identity, debrief history, scripts, and progress will be permanently erased. You'll start over from onboarding.</div>
            <button style={{...S.btn,background:"#8a3a3a"}} onClick={resetApp}>Yes, Erase Everything</button>
            <button style={S.btnGhost} onClick={()=>setResetConfirmOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"14px",animation:splashDest==="hook"?"fadeIn 1.2s ease, dreamFade 1.2s 6.75s ease both":"fadeIn 0.8s ease, dreamFade 1.0s 3.6s ease both"}}>
        <div style={{fontSize:"10px",letterSpacing:"0.4em",color:"#8a8a9c",textTransform:"uppercase"}}>Identity Engine</div>
        <div style={{fontSize:"56px",fontWeight:"700",letterSpacing:"-0.03em",color:"#e8e4dc",lineHeight:1}}>FORGE</div>
        <div style={{fontSize:"13px",letterSpacing:"0.18em",textTransform:"uppercase",animation:splashDest==="hook"?"emphasize 2.6s 3.0s ease both":"emphasize 1.6s 1.2s ease both"}}>Become who you choose to be</div>
        <div style={{fontSize:"13px",letterSpacing:"0.14em",marginTop:"4px",animation:splashDest==="hook"?"fadeIn 1s 0.9s ease both, emphasizeGold 2.2s 4.0s ease both":"fadeIn 0.7s 0.5s ease both, emphasizeGold 1.5s 1.9s ease both"}}>Decide who you are. Prove it daily.</div>
        <div style={{marginTop:"28px",display:"flex",gap:"7px"}}>{[0,1,2].map(i=><div key={i} style={{width:"7px",height:"7px",borderRadius:"50%",background:"#c8a96e",animation:`pulse 1.4s ${i*0.22}s infinite`}}/>)}</div>
      </div>
    </div>
  );

  if (screen==="hook") return (
    <div style={S.app}><style>{CSS}</style>
      <div style={{...S.card,maxWidth:"420px",minHeight:"480px",justifyContent:"space-between",overflow:"hidden",animation:"dreamIn 1.1s ease both"}}>
        <div style={{fontSize:"10px",letterSpacing:"0.4em",color:"#8a8a9c",textTransform:"uppercase",textAlign:"center"}}>FORGE — Identity Engine</div>

        {(() => {
          const slides = [
            { icon:"◈", title:"You already know who you want to become.", text:"The problem isn't the goal. It's that knowing and becoming are two completely different things." },
            { icon:"⚒", title:"Desire was never the issue.", text:"Most people fail not because they lack desire — but because they have no system that holds them accountable to their own identity." },
            { icon:"🔥", title:"One principle.", text:"FORGE is built on one principle: you become who you prove yourself to be through daily behavior. Not intention. Evidence." },
          ];
          const s = slides[hookSlide];
          const isLast = hookSlide === slides.length - 1;
          const go = (next, dir) => { setHookDir(dir); setHookSlide(next); setHookDragX(0); };
          return (
            <>
              <div
                key={hookSlide}
                style={{
                  flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",gap:"22px",padding:"20px 8px",
                  cursor:"pointer",userSelect:"none",touchAction:"pan-y",
                  transform:`translateX(${hookDragX}px) rotate(${hookDragX*0.02}deg)`,
                  opacity: 1 - Math.min(0.5, Math.abs(hookDragX)/400),
                  transition: hookDragX===0 ? "transform 0.35s cubic-bezier(0.22,1,0.36,1), opacity 0.3s ease" : "none",
                  animation: `${hookDir==="right"?"slideInRight":"slideInLeft"} 0.45s cubic-bezier(0.22,1,0.36,1)`,
                }}
                onTouchStart={e=>{hookTouchX.current = e.touches[0].clientX;}}
                onTouchMove={e=>{
                  if (hookTouchX.current === null) return;
                  const dx = e.touches[0].clientX - hookTouchX.current;
                  // resist dragging past the ends
                  const atStart = hookSlide===0 && dx>0, atEnd = isLast && dx<0;
                  setHookDragX((atStart||atEnd) ? dx*0.25 : dx*0.85);
                }}
                onTouchEnd={e=>{
                  if (hookTouchX.current === null) return;
                  const dx = e.changedTouches[0].clientX - hookTouchX.current;
                  hookTouchX.current = null;
                  if (dx < -120 && !isLast) go(hookSlide+1, "right");
                  else if (dx > 120 && hookSlide > 0) go(hookSlide-1, "left");
                  else setHookDragX(0); // snap back
                }}
                onClick={()=>{ if (!isLast && hookDragX===0) go(hookSlide+1, "right"); }}
              >
                <div style={{fontSize:"52px",animation:"iconForge 0.6s cubic-bezier(0.34,1.56,0.64,1), emberGlow 2.4s 0.6s ease-in-out infinite"}}>{s.icon}</div>
                <div style={{fontSize:"20px",fontWeight:"700",color:"#c8a96e",lineHeight:1.3,letterSpacing:"-0.01em"}}>{s.title}</div>
                <div style={{fontSize:"15px",color:"#b2b2c4",lineHeight:1.8,maxWidth:"320px"}}>{s.text}</div>
              </div>

              {/* Dots */}
              <div style={{display:"flex",justifyContent:"center",gap:"8px",padding:"4px 0"}}>
                {slides.map((_,i)=>(
                  <div key={i} onClick={()=>go(i, i>hookSlide?"right":"left")} style={{width:i===hookSlide?"26px":"8px",height:"8px",borderRadius:"4px",background:i===hookSlide?"#c8a96e":i<hookSlide?"#7a6a4e":"#2a2a3e",boxShadow:i===hookSlide?"0 0 10px rgba(200,169,110,0.5)":"none",cursor:"pointer",transition:"all 0.3s cubic-bezier(0.22,1,0.36,1)",transformOrigin:"left",animation:i===hookSlide?"dotFill 0.35s ease":"none"}}/>
                ))}
              </div>

              {/* Action */}
              {isLast ? (
                <button style={{...S.btn,animation:"fadeIn 0.5s 0.25s ease both"}} onClick={startOnboarding}>I'm Ready →</button>
              ) : (
                <button style={S.btnGhost} onClick={()=>go(hookSlide+1,"right")}>Next →</button>
              )}
              <div style={{fontSize:"10px",color:"#6e6e88",textAlign:"center",letterSpacing:"0.1em"}}>{isLast ? "The conversation matters. Take it seriously." : "Swipe or tap to continue"}</div>
            </>
          );
        })()}
      </div>
    </div>
  );


  if (screen==="onboarding") return (
    <div style={S.app}><style>{CSS}</style>
      {screen!=="loading"&&screen!=="splash"&&(
        <button onClick={()=>setFeedbackOpen(true)} style={{position:"fixed",bottom:"20px",right:"20px",zIndex:50,background:"#1a1a2a",border:"1px solid #2a2a3e",borderRadius:"50%",width:"44px",height:"44px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:"16px",color:"#c8a96e",boxShadow:"0 4px 12px rgba(0,0,0,0.4)"}}>💬</button>
      )}
      {feedbackOpen && (<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}} onClick={()=>!feedbackSubmitting&&setFeedbackOpen(false)}><div style={{...S.card,maxWidth:"380px"}} onClick={e=>e.stopPropagation()}>{!feedbackSent?(<><div style={S.eyebrow}>Send Feedback</div><div style={{...S.h1,fontSize:"18px"}}>Something broken? Confusing? Tell us.</div><div style={{display:"flex",gap:"8px"}}>{["bug","confusing","idea","other"].map(c=>(<button key={c} onClick={()=>setFeedbackCategory(c)} style={{flex:1,padding:"8px 0",borderRadius:"8px",border:`1px solid ${feedbackCategory===c?"#c8a96e":"#1e1e2e"}`,background:feedbackCategory===c?"#c8a96e":"#0a0a0f",color:feedbackCategory===c?"#0a0a0f":"#8a8a9c",fontSize:"12px",textTransform:"capitalize",cursor:"pointer",fontFamily:"'Georgia',serif"}}>{c}</button>))}</div><textarea style={{...S.textarea,minHeight:"90px"}} placeholder="What happened? Be specific if it's a bug — what were you doing when it broke?" value={feedbackMessage} onChange={e=>setFeedbackMessage(e.target.value)} rows={4}/><button style={{...S.btn,opacity:feedbackMessage.trim()&&!feedbackSubmitting?1:0.4}} disabled={!feedbackMessage.trim()||feedbackSubmitting} onClick={handleSubmitFeedback}>{feedbackSubmitting?"Sending...":"Send Feedback"}</button><button style={S.btnGhost} onClick={()=>setFeedbackOpen(false)}>Cancel</button></>):(<div style={{textAlign:"center",padding:"20px 0"}}><div style={{fontSize:"32px",marginBottom:"12px"}}>✓</div><div style={{fontSize:"14px",color:"#c8a96e"}}>Sent. Thank you.</div></div>)}</div></div>)}
      {resetConfirmOpen && (<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}} onClick={()=>setResetConfirmOpen(false)}><div style={{...S.card,maxWidth:"360px",border:"1px solid #4a2a2a"}} onClick={e=>e.stopPropagation()}><div style={{fontSize:"10px",letterSpacing:"0.3em",color:"#8a5a5a",textTransform:"uppercase"}}>This Cannot Be Undone</div><div style={{...S.h1,fontSize:"19px"}}>Reset your identity?</div><div style={S.sub}>Your identity, debrief history, scripts, and progress will be permanently erased. You'll start over from onboarding.</div><button style={{...S.btn,background:"#8a3a3a"}} onClick={resetApp}>Yes, Erase Everything</button><button style={S.btnGhost} onClick={()=>setResetConfirmOpen(false)}>Cancel</button></div></div>)}
      <div style={S.card}>
        <div><div style={S.eyebrow}>Identity Intake</div><div style={{...S.h1,fontSize:"18px",marginTop:"6px"}}>FORGE is listening.</div></div>
        <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
          {PILLARS.map(p=>(
            <div key={p.key} style={{display:"flex",alignItems:"center",gap:"6px",padding:"6px 10px",borderRadius:"20px",background:pillarStatus[p.key]?"#1a2a1a":"#0a0a0f",border:`1px solid ${pillarStatus[p.key]?"#4a8a4a55":"#1e1e2e"}`}}>
              <div style={{width:"6px",height:"6px",borderRadius:"50%",background:pillarStatus[p.key]?"#4a8a4a":"#2a2a3e"}}/>
              <div style={{fontSize:"10px",color:pillarStatus[p.key]?"#7aaa7a":"#4a4a6a",letterSpacing:"0.04em"}}>{p.label}</div>
            </div>
          ))}
        </div>
        <div style={S.chatWrap}>
          {chatHistory.map((m,i)=>(
            <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
              <div style={S.bubble(m.role==="assistant")}>{m.content}</div>
            </div>
          ))}
          {aiTyping&&<div style={{display:"flex",justifyContent:"flex-start"}}><div style={S.bubble(true)}><div style={{display:"flex",gap:"5px",alignItems:"center",padding:"2px 0"}}>{[0,1,2].map(i=><div key={i} style={S.typingDot(i)}/>)}</div></div></div>}
          <div ref={chatEndRef}/>
        </div>
        {readyToForge ? (
          <div style={{display:"flex",flexDirection:"column",gap:"8px",animation:"fadeIn 0.6s ease both"}}>
            <button style={{...S.btn,animation:"emberGlow 2.2s ease-in-out infinite"}} onClick={()=>forgeIdentity(chatHistory)}>⚒ Forge My Identity →</button>
            <div style={{fontSize:"10px",color:"#6e6e88",textAlign:"center"}}>Read the message above — then step into the forge when you're ready.</div>
          </div>
        ) : (
        <div style={{display:"flex",gap:"10px"}}>
          <textarea style={{...S.textarea,minHeight:"60px",flex:1}} placeholder="Speak honestly..." value={userInput} onChange={e=>setUserInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}}} rows={2}/>
          <button style={{...S.btn,width:"auto",padding:"0 20px",opacity:userInput.trim()&&!aiTyping?1:0.4}} onClick={sendMessage} disabled={!userInput.trim()||aiTyping}>→</button>
        </div>
        )}
        <div style={{fontSize:"12px",color:"#5a5a76",textAlign:"center"}}>Specific and honest beats polished — FORGE may ask you to sharpen an answer, because the system gets built from this</div>
        <div style={{fontSize:"10px",color:"#6e6e88",textAlign:"center",lineHeight:1.5}}>🔒 No human reads this. Your record lives on your device — your words go only to the AI coach, encrypted, never sold.</div>
        <div style={{fontSize:"12px",color:"#5a5a76",textAlign:"center"}}>{Object.values(pillarStatus).filter(Boolean).length} of {PILLARS.length} pillars locked in</div>
      </div>
    </div>
  );

  if (screen==="forging") return (
    <div style={S.app}><style>{CSS}</style>
      {screen!=="loading"&&screen!=="splash"&&(
        <button onClick={()=>setFeedbackOpen(true)} style={{position:"fixed",bottom:"20px",right:"20px",zIndex:50,background:"#1a1a2a",border:"1px solid #2a2a3e",borderRadius:"50%",width:"44px",height:"44px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:"16px",color:"#c8a96e",boxShadow:"0 4px 12px rgba(0,0,0,0.4)"}}>💬</button>
      )}
      {feedbackOpen && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}} onClick={()=>!feedbackSubmitting&&setFeedbackOpen(false)}>
          <div style={{...S.card,maxWidth:"380px"}} onClick={e=>e.stopPropagation()}>
            {!feedbackSent ? (
              <>
                <div style={S.eyebrow}>Send Feedback</div>
                <div style={{...S.h1,fontSize:"18px"}}>Something broken? Confusing? Tell us.</div>
                <div style={{display:"flex",gap:"8px"}}>
                  {["bug","confusing","idea","other"].map(c=>(
                    <button key={c} onClick={()=>setFeedbackCategory(c)} style={{flex:1,padding:"8px 0",borderRadius:"8px",border:`1px solid ${feedbackCategory===c?"#c8a96e":"#1e1e2e"}`,background:feedbackCategory===c?"#c8a96e":"#0a0a0f",color:feedbackCategory===c?"#0a0a0f":"#8a8a9c",fontSize:"12px",textTransform:"capitalize",cursor:"pointer",fontFamily:"'Georgia',serif"}}>{c}</button>
                  ))}
                </div>
                <textarea style={{...S.textarea,minHeight:"90px"}} placeholder="What happened? Be specific if it's a bug — what were you doing when it broke?" value={feedbackMessage} onChange={e=>setFeedbackMessage(e.target.value)} rows={4}/>
                <button style={{...S.btn,opacity:feedbackMessage.trim()&&!feedbackSubmitting?1:0.4}} disabled={!feedbackMessage.trim()||feedbackSubmitting} onClick={handleSubmitFeedback}>
                  {feedbackSubmitting?"Sending...":"Send Feedback"}
                </button>
                <button style={S.btnGhost} onClick={()=>setFeedbackOpen(false)}>Cancel</button>
              </>
            ) : (
              <div style={{textAlign:"center",padding:"20px 0"}}>
                <div style={{fontSize:"32px",marginBottom:"12px"}}>✓</div>
                <div style={{fontSize:"14px",color:"#c8a96e"}}>Sent. Thank you.</div>
              </div>
            )}
          </div>
        </div>
      )}
      {resetConfirmOpen && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}} onClick={()=>setResetConfirmOpen(false)}>
          <div style={{...S.card,maxWidth:"360px",border:"1px solid #4a2a2a"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:"10px",letterSpacing:"0.3em",color:"#8a5a5a",textTransform:"uppercase"}}>This Cannot Be Undone</div>
            <div style={{...S.h1,fontSize:"19px"}}>Reset your identity?</div>
            <div style={S.sub}>Your identity, debrief history, scripts, and progress will be permanently erased. You'll start over from onboarding.</div>
            <button style={{...S.btn,background:"#8a3a3a"}} onClick={resetApp}>Yes, Erase Everything</button>
            <button style={S.btnGhost} onClick={()=>setResetConfirmOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"0",maxWidth:"360px",width:"100%",padding:"0 24px"}}>

        {/* Phase indicator */}
        <div style={{display:"flex",gap:"8px",marginBottom:"40px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
            <div style={{width:"8px",height:"8px",borderRadius:"50%",background:"#c8a96e"}}/>
            <div style={{fontSize:"10px",color:"#c8a96e",letterSpacing:"0.2em",textTransform:"uppercase"}}>Identity</div>
          </div>
          <div style={{fontSize:"10px",color:"#2a2a3e",padding:"0 4px"}}>→</div>
          <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
            <div style={{width:"8px",height:"8px",borderRadius:"50%",background:forgingPhase==="domains"?"#c8a96e":"#2a2a3e"}}/>
            <div style={{fontSize:"10px",color:forgingPhase==="domains"?"#c8a96e":"#2a2a3e",letterSpacing:"0.2em",textTransform:"uppercase"}}>Domains</div>
          </div>
        </div>

        {/* Hammer */}
        <div style={{fontSize:"52px",marginBottom:"32px",animation:"pulse 2s infinite"}}>⚒</div>

        {/* Rotating quote */}
        <div style={{textAlign:"center",minHeight:"120px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"16px"}}>
          <div style={{fontSize:"17px",color:"#e8e4dc",lineHeight:1.7,fontStyle:"italic",textAlign:"center",transition:"opacity 0.5s ease"}}>
            "{FORGE_QUOTES[forgingQuoteIdx].text}"
          </div>
          <div style={{fontSize:"12px",color:"#8a8a9c",letterSpacing:"0.2em",textTransform:"uppercase"}}>
            — {FORGE_QUOTES[forgingQuoteIdx].author}
          </div>
        </div>

        {/* Phase label */}
        <div style={{marginTop:"40px",fontSize:"12px",color:"#5a5a76",letterSpacing:"0.25em",textTransform:"uppercase",textAlign:"center"}}>
          {forgingPhase === "identity" ? "Synthesizing your identity..." : "Building your personal domain system..."}
        </div>
        <div style={{display:"flex",gap:"6px",marginTop:"16px"}}>
          {[0,1,2].map(i=><div key={i} style={{width:"6px",height:"6px",borderRadius:"50%",background:"#c8a96e",animation:`pulse 1.4s ${i*0.22}s infinite`}}/>)}
        </div>

      </div>
    </div>
  );

  if (screen==="drift") return (
    <div style={S.app}><style>{CSS}</style>
      {screen!=="loading"&&screen!=="splash"&&(
        <button onClick={()=>setFeedbackOpen(true)} style={{position:"fixed",bottom:"20px",right:"20px",zIndex:50,background:"#1a1a2a",border:"1px solid #2a2a3e",borderRadius:"50%",width:"44px",height:"44px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:"16px",color:"#c8a96e",boxShadow:"0 4px 12px rgba(0,0,0,0.4)"}}>💬</button>
      )}
      {feedbackOpen && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}} onClick={()=>!feedbackSubmitting&&setFeedbackOpen(false)}>
          <div style={{...S.card,maxWidth:"380px"}} onClick={e=>e.stopPropagation()}>
            {!feedbackSent ? (
              <>
                <div style={S.eyebrow}>Send Feedback</div>
                <div style={{...S.h1,fontSize:"18px"}}>Something broken? Confusing? Tell us.</div>
                <div style={{display:"flex",gap:"8px"}}>
                  {["bug","confusing","idea","other"].map(c=>(
                    <button key={c} onClick={()=>setFeedbackCategory(c)} style={{flex:1,padding:"8px 0",borderRadius:"8px",border:`1px solid ${feedbackCategory===c?"#c8a96e":"#1e1e2e"}`,background:feedbackCategory===c?"#c8a96e":"#0a0a0f",color:feedbackCategory===c?"#0a0a0f":"#8a8a9c",fontSize:"12px",textTransform:"capitalize",cursor:"pointer",fontFamily:"'Georgia',serif"}}>{c}</button>
                  ))}
                </div>
                <textarea style={{...S.textarea,minHeight:"90px"}} placeholder="What happened? Be specific if it's a bug — what were you doing when it broke?" value={feedbackMessage} onChange={e=>setFeedbackMessage(e.target.value)} rows={4}/>
                <button style={{...S.btn,opacity:feedbackMessage.trim()&&!feedbackSubmitting?1:0.4}} disabled={!feedbackMessage.trim()||feedbackSubmitting} onClick={handleSubmitFeedback}>
                  {feedbackSubmitting?"Sending...":"Send Feedback"}
                </button>
                <button style={S.btnGhost} onClick={()=>setFeedbackOpen(false)}>Cancel</button>
              </>
            ) : (
              <div style={{textAlign:"center",padding:"20px 0"}}>
                <div style={{fontSize:"32px",marginBottom:"12px"}}>✓</div>
                <div style={{fontSize:"14px",color:"#c8a96e"}}>Sent. Thank you.</div>
              </div>
            )}
          </div>
        </div>
      )}
      {resetConfirmOpen && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}} onClick={()=>setResetConfirmOpen(false)}>
          <div style={{...S.card,maxWidth:"360px",border:"1px solid #4a2a2a"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:"10px",letterSpacing:"0.3em",color:"#8a5a5a",textTransform:"uppercase"}}>This Cannot Be Undone</div>
            <div style={{...S.h1,fontSize:"19px"}}>Reset your identity?</div>
            <div style={S.sub}>Your identity, debrief history, scripts, and progress will be permanently erased. You'll start over from onboarding.</div>
            <button style={{...S.btn,background:"#8a3a3a"}} onClick={resetApp}>Yes, Erase Everything</button>
            <button style={S.btnGhost} onClick={()=>setResetConfirmOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
      <div style={{...S.card, border:`1px solid ${reforgeStep===1?"#4a2a2a":"#1e1e2e"}`, background:reforgeStep===1?"#160d0d":"#12121a"}}>

        {/* Step 1 — Confrontation */}
        {reforgeStep === 1 && (
          <>
            <div style={{fontSize:"10px",letterSpacing:"0.35em",color:"#8a5a5a",textTransform:"uppercase"}}>
              {driftAlert?.type === "silence" ? "You've Gone Quiet" : "Pattern Detected"}
            </div>
            <div style={{fontSize:"22px",fontWeight:"700",color:"#e8e4dc",lineHeight:1.3}}>
              {userData?.identity?.label} is on the line.
            </div>
            {driftAlert?.loading ? (
              <div style={{display:"flex",gap:"6px",padding:"12px 0"}}>{[0,1,2].map(i=><div key={i} style={S.typingDot(i)}/>)}</div>
            ) : (
              <div style={{fontSize:"14px",color:"#d8c4c4",lineHeight:1.75,padding:"4px 0"}}>{driftAlert?.message}</div>
            )}
            {/* Step progress */}
            <div style={{display:"flex",gap:"6px",alignItems:"center",margin:"4px 0"}}>
              {[1,2,3].map(s=><div key={s} style={{height:"2px",flex:1,borderRadius:"1px",background:s<=reforgeStep?"#c8a96e":"#2a2a3e"}}/>)}
            </div>
            <div style={{fontSize:"10px",color:"#6e6e88",letterSpacing:"0.2em",textTransform:"uppercase",textAlign:"center"}}>Step 1 of 3 — Acknowledge</div>
            <div style={{fontSize:"12px",color:"#9a9aac",lineHeight:1.65,fontStyle:"italic",textAlign:"center"}}>Everyone drifts. The research is blunt: people with a recovery ritual rebuild — people with shame quit. This is the ritual.</div>
            <div style={{display:"flex",flexDirection:"column",gap:"10px",marginTop:"4px"}}>
              <button style={{...S.btn,background:"#c8a96e"}} onClick={()=>{setReforgeStep(2);startReforge();}} disabled={driftAlert?.loading}>
                I acknowledge what happened. I'm back.
              </button>
              <button style={S.btnGhost} onClick={()=>{setDriftAlert(null);setScreen("debrief");setDebriefScore(null);setDebriefResponse("");setDebriefNote("");setDebriefMiss("");setDebriefVoice(null);}} disabled={driftAlert?.loading}>
                Let me be honest in a debrief first
              </button>
            </div>
          </>
        )}

        {/* Step 2 — Loading Re-Forge message */}
        {reforgeStep === 2 && (
          <>
            <div style={{fontSize:"10px",letterSpacing:"0.35em",color:"#c8a96e",textTransform:"uppercase"}}>Re-Forge</div>
            <div style={{fontSize:"18px",fontWeight:"700",color:"#e8e4dc"}}>Building your re-entry...</div>
            <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
              {[1,2,3].map(s=><div key={s} style={{height:"2px",flex:1,borderRadius:"1px",background:s<=2?"#c8a96e":"#2a2a3e"}}/>)}
            </div>
            <div style={{display:"flex",justifyContent:"center",gap:"6px",padding:"16px 0"}}>
              {[0,1,2].map(i=><div key={i} style={S.typingDot(i)}/>)}
            </div>
            <div style={{fontSize:"13px",color:"#5a5a76",textAlign:"center"}}>Analyzing your history and building your specific re-entry path...</div>
          </>
        )}

        {/* Step 3 — Re-entry with single focus domain */}
        {reforgeStep === 3 && (
          <>
            <div style={{fontSize:"10px",letterSpacing:"0.35em",color:"#c8a96e",textTransform:"uppercase"}}>Re-Forge Complete</div>
            <div style={{fontSize:"20px",fontWeight:"700",color:"#c8a96e"}}>{userData?.identity?.label}</div>
            <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
              {[1,2,3].map(s=><div key={s} style={{height:"2px",flex:1,borderRadius:"1px",background:"#c8a96e"}}/>)}
            </div>
            <div style={{background:"#0a0a0f",border:"1px solid #c8a96e22",borderLeft:"2px solid #c8a96e",borderRadius:"0 10px 10px 0",padding:"16px 18px"}}>
              <div style={{fontSize:"9px",color:"#c8a96e",letterSpacing:"0.3em",textTransform:"uppercase",marginBottom:"10px"}}>Your Re-Entry</div>
              <div style={{fontSize:"14px",color:"#d8d4cc",lineHeight:1.8}}>{reforgeMessage}</div>
            </div>
            <div style={{padding:"12px 14px",background:"#0a0a0f",borderRadius:"8px",border:"1px solid #1e1e2e",fontSize:"13px",color:"#8a8a9c",lineHeight:1.6}}>
              Today: one domain only. Build the streak back one day at a time. Don't try to recover everything at once.
            </div>
            <button style={S.btn} onClick={()=>{setDriftAlert(null);setReforgeStep(1);setReforgeMessage("");setScreen("dashboard");}}>
              Start Today →
            </button>
          </>
        )}

      </div>

    </div>
  );


  if (screen==="contract") return (
    <div style={S.app}><style>{CSS}</style>
      {screen!=="loading"&&screen!=="splash"&&(
        <button onClick={()=>setFeedbackOpen(true)} style={{position:"fixed",bottom:"20px",right:"20px",zIndex:50,background:"#1a1a2a",border:"1px solid #2a2a3e",borderRadius:"50%",width:"44px",height:"44px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:"16px",color:"#c8a96e",boxShadow:"0 4px 12px rgba(0,0,0,0.4)"}}>💬</button>
      )}
      {feedbackOpen && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}} onClick={()=>!feedbackSubmitting&&setFeedbackOpen(false)}>
          <div style={{...S.card,maxWidth:"380px"}} onClick={e=>e.stopPropagation()}>
            {!feedbackSent ? (
              <>
                <div style={S.eyebrow}>Send Feedback</div>
                <div style={{...S.h1,fontSize:"18px"}}>Something broken? Confusing? Tell us.</div>
                <div style={{display:"flex",gap:"8px"}}>
                  {["bug","confusing","idea","other"].map(c=>(
                    <button key={c} onClick={()=>setFeedbackCategory(c)} style={{flex:1,padding:"8px 0",borderRadius:"8px",border:`1px solid ${feedbackCategory===c?"#c8a96e":"#1e1e2e"}`,background:feedbackCategory===c?"#c8a96e":"#0a0a0f",color:feedbackCategory===c?"#0a0a0f":"#8a8a9c",fontSize:"12px",textTransform:"capitalize",cursor:"pointer",fontFamily:"'Georgia',serif"}}>{c}</button>
                  ))}
                </div>
                <textarea style={{...S.textarea,minHeight:"90px"}} placeholder="What happened? Be specific if it's a bug — what were you doing when it broke?" value={feedbackMessage} onChange={e=>setFeedbackMessage(e.target.value)} rows={4}/>
                <button style={{...S.btn,opacity:feedbackMessage.trim()&&!feedbackSubmitting?1:0.4}} disabled={!feedbackMessage.trim()||feedbackSubmitting} onClick={handleSubmitFeedback}>
                  {feedbackSubmitting?"Sending...":"Send Feedback"}
                </button>
                <button style={S.btnGhost} onClick={()=>setFeedbackOpen(false)}>Cancel</button>
              </>
            ) : (
              <div style={{textAlign:"center",padding:"20px 0"}}>
                <div style={{fontSize:"32px",marginBottom:"12px"}}>✓</div>
                <div style={{fontSize:"14px",color:"#c8a96e"}}>Sent. Thank you.</div>
              </div>
            )}
          </div>
        </div>
      )}
      {resetConfirmOpen && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}} onClick={()=>setResetConfirmOpen(false)}>
          <div style={{...S.card,maxWidth:"360px",border:"1px solid #4a2a2a"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:"10px",letterSpacing:"0.3em",color:"#8a5a5a",textTransform:"uppercase"}}>This Cannot Be Undone</div>
            <div style={{...S.h1,fontSize:"19px"}}>Reset your identity?</div>
            <div style={S.sub}>Your identity, debrief history, scripts, and progress will be permanently erased. You'll start over from onboarding.</div>
            <button style={{...S.btn,background:"#8a3a3a"}} onClick={resetApp}>Yes, Erase Everything</button>
            <button style={S.btnGhost} onClick={()=>setResetConfirmOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
      <div style={S.card}>
        <div style={S.eyebrow}>Your Identity — Forged</div>
        <div style={S.identityBadge}>
          <div style={{fontSize:"10px",color:"#8a8a9c",letterSpacing:"0.3em",textTransform:"uppercase",marginBottom:"8px"}}>You are</div>
          <div style={{...S.identityLabel, color:accentOf(userData)}}>{userData?.identity?.label}</div>
          <div style={{fontSize:"14px",color:"#b2b2c4",marginTop:"12px",lineHeight:1.65,fontStyle:"italic"}}>"{userData?.identity?.statement}"</div>
        </div>
        <div style={{fontSize:"10px",color:"#6e6e88",letterSpacing:"0.15em",lineHeight:1.6}}>TAP EACH CLAUSE TO INITIAL IT — a contract you haven't read isn't a contract.</div>
        {[
          {key:"statement", label:"Your statement", value:userData?.identity?.statement},
          {key:"sacrifice", label:"What you surrender", value:userData?.identity?.sacrifice},
          {key:"vision", label:"Where you're going", value:userData?.identity?.vision},
        ].map((r)=>{
          const acked = ackClauses[r.key];
          return (
            <div key={r.key} onClick={()=>setAckClauses(p=>({...p,[r.key]:!p[r.key]}))} style={{padding:"12px 14px",background:acked?"#0f0d08":"#0a0a0f",borderRadius:"8px",border:`1px solid ${acked?"#c8a96e55":"#1e1e2e"}`,borderLeft:acked?"3px solid #c8a96e":"1px solid #1e1e2e",cursor:"pointer",display:"flex",gap:"12px",alignItems:"flex-start",transition:"all 0.25s ease"}}>
              <div style={{width:"20px",height:"20px",borderRadius:"50%",border:`1.5px solid ${acked?"#c8a96e":"#2a2a3e"}`,background:acked?"#c8a96e":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:"2px",transition:"all 0.25s ease"}}>
                {acked && <span style={{color:"#0a0a0f",fontSize:"12px",fontWeight:"700"}}>✓</span>}
              </div>
              <div>
                <div style={{fontSize:"9px",color:acked?"#c8a96e":"#4a4a6a",letterSpacing:"0.3em",textTransform:"uppercase",marginBottom:"5px",transition:"color 0.25s ease"}}>{r.label}</div>
                <div style={{fontSize:"14px",color:acked?"#e8e4dc":"#9a9aae",fontWeight:acked?"700":"400",lineHeight:1.55,transition:"all 0.25s ease"}}>{r.value}</div>
              </div>
            </div>
          );
        })}
        <div style={{padding:"12px 14px",background:"#0a0a0f",borderRadius:"8px",border:"1px solid #c8a96e22"}}>
          <div style={{fontSize:"9px",color:"#6e6e88",letterSpacing:"0.3em",textTransform:"uppercase",marginBottom:"5px"}}>Your Cohort Callsign</div>
          <div style={{fontSize:"18px",fontWeight:"700",color:"#c8a96e",letterSpacing:"0.05em"}}>{myCallsign}</div>
          <div style={{fontSize:"12px",color:"#5a5a76",marginTop:"4px"}}>Anonymous. Others see your progress, not your name.</div>
        </div>
        <div style={{fontSize:"13px",color:"#8a8a9c",lineHeight:1.7,borderLeft:"2px solid #c8a96e33",paddingLeft:"14px"}}>
          This is not a goal. This is who you are choosing to be starting now. Your old self has 30 days left.
        </div>

        {/* Domain preview — shows what was generated */}
        <div style={{padding:"14px 16px",background:"#0a0a0f",borderRadius:"10px",border:"1px solid #1e1e2e"}}>
          <div style={{fontSize:"9px",color:"#6e6e88",letterSpacing:"0.3em",textTransform:"uppercase",marginBottom:"10px"}}>
            Your Domains {userData?.domainGenError ? "⚠️ Fallback" : "✓ AI-Generated"}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
            {(userData?.domains || DOMAINS).map((d,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:"10px"}}>
                <span style={{fontSize:"16px"}}>{d.emoji}</span>
                <div>
                  <div style={{fontSize:"14px",color:"#e8e4dc"}}>{d.label}</div>
                  <div style={{fontSize:"12px",color:"#6e6e88",fontStyle:"italic"}}>"{d.identity_claim}"</div>
                </div>
              </div>
            ))}
          </div>
          {userData?.domainGenError && (
            <div style={{fontSize:"10px",color:"#6a4a4a",marginTop:"10px",lineHeight:1.5}}>
              Domain AI failed: {userData.domainGenError.slice(0,100)} — using smart fallback. Start Over to retry.
            </div>
          )}
        </div>

        {(()=>{ const allAcked = ackClauses.statement && ackClauses.sacrifice && ackClauses.vision; return (
        <button style={{...S.btn,opacity:allAcked?1:0.35,cursor:allAcked?"pointer":"default"}} disabled={!allAcked} onClick={async()=>{setSealDone(false);setPledgePhase("offer");setScreen("seal");setTimeout(()=>setSealDone(true),2600);}}>{allAcked?"I Accept This Identity":`Initial all clauses to seal (${Object.values(ackClauses).filter(Boolean).length}/3)`}</button>
        );})()}
        <button style={S.btnGhost} onClick={async()=>{await clearStorage();setUserData(null);setChatHistory([]);setAckClauses({statement:false,sacrifice:false,vision:false});setPickedFoundations([]);startOnboarding();}}>Start Over</button>
      </div>
    </div>
  );

  if (screen==="seal") return (
    <div style={S.app}><style>{CSS}</style>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"26px",textAlign:"center",padding:"0 32px"}}>
        <div style={{fontSize:"58px",animation:"strike 0.9s cubic-bezier(0.34,1.56,0.64,1)"}}>⚒</div>
        <div style={{fontSize:"10px",letterSpacing:"0.45em",color:"#8a8a9c",textTransform:"uppercase",animation:"fadeIn 0.6s 0.7s ease both"}}>Contract Sealed</div>
        <div style={{fontSize:"34px",fontWeight:"700",color:accentOf(userData),animation:"burnIn 1.1s 0.9s ease both"}}>{userData?.identity?.label}</div>
        <div style={{fontSize:"14px",color:"#8a8a9c",lineHeight:1.7,maxWidth:"300px",animation:"fadeIn 0.7s 1.6s ease both"}}>The old version of you has 30 days left. Every action from here is evidence.</div>
        {!sealDone && <div style={{height:"49px"}}/>}

        {/* The Oath — optional spoken pledge */}
        {sealDone && pledgePhase === "offer" && (
          <div style={{display:"flex",flexDirection:"column",gap:"14px",maxWidth:"320px",width:"100%",animation:"fadeIn 0.5s ease both"}}>
            <div style={{padding:"16px 18px",background:"#12121a",border:"1px solid #c8a96e33",borderRadius:"12px",textAlign:"left"}}>
              <div style={{fontSize:"9px",color:"#c8a96e",letterSpacing:"0.35em",textTransform:"uppercase",marginBottom:"8px"}}>One More Thing</div>
              <div style={{fontSize:"14px",color:"#b2b2c4",lineHeight:1.75}}>
                Signed contracts get filed. <span style={{color:"#e8e4dc"}}>Spoken oaths get kept.</span> Every vow that ever mattered — enlistments, weddings, testimony — was said out loud. Words that leave the body are filed by the brain as something that <i>happened</i>, not something you read.
              </div>
              <div style={{fontSize:"13px",color:"#8a8a9c",lineHeight:1.6,marginTop:"10px"}}>
                Your oath is one sentence — say it aloud, once, wherever you are. No one hears it but you.
              </div>
              <div style={{marginTop:"12px",padding:"12px 14px",background:"#0a0a0f",borderRadius:"8px",borderLeft:"2px solid #c8a96e"}}>
                <div style={{fontSize:"8px",color:"#c8a96e",letterSpacing:"0.35em",textTransform:"uppercase",marginBottom:"6px"}}>Your Oath</div>
                <div style={{fontSize:"14px",color:"#e8e4dc",lineHeight:1.7,fontStyle:"italic"}}>"{userData?.identity?.statement || `I am ${userData?.identity?.label||"who I choose to be"}.`}"</div>
              </div>
            </div>
            <button style={S.btn} onClick={beginOath}>🎙 Swear It Aloud</button>
            <button style={{background:"none",border:"none",color:"#5a5a76",fontSize:"12px",cursor:"pointer",fontFamily:"'Georgia',serif",letterSpacing:"0.1em",padding:"6px"}} onClick={()=>setScreen("dashboard")}>continue in silence</button>
          </div>
        )}

        {sealDone && pledgePhase === "listening" && (
          <div style={{display:"flex",flexDirection:"column",gap:"18px",maxWidth:"320px",width:"100%",alignItems:"center",animation:"fadeIn 0.4s ease both"}}>
            <div style={{width:"64px",height:"64px",borderRadius:"50%",border:"1px solid #c8a96e",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"24px",animation:"pulse 1.4s infinite",boxShadow:"0 0 30px rgba(200,169,110,0.3)"}}>🎙</div>
            <div style={{fontSize:"10px",color:"#c8a96e",letterSpacing:"0.4em",textTransform:"uppercase"}}>Say these words</div>
            <div style={{fontSize:"17px",color:accentOf(userData),lineHeight:1.8,fontStyle:"italic",fontWeight:"700",textShadow:"0 0 20px rgba(200,169,110,0.3)"}}>"{userData?.identity?.statement || `I am ${userData?.identity?.label||"who I choose to be"}.`}"</div>
            <div style={{fontSize:"12px",color:"#8a8a9c"}}>Out loud. Like you mean it.</div>
            <button style={{...S.btnGhost,maxWidth:"260px"}} onClick={completeOath}>I've spoken it</button>
          </div>
        )}

        {sealDone && pledgePhase === "witnessed" && (
          <div style={{display:"flex",flexDirection:"column",gap:"16px",maxWidth:"320px",width:"100%",alignItems:"center",animation:"fadeIn 0.5s ease both"}}>
            <div style={{fontSize:"12px",letterSpacing:"0.45em",color:"#c8a96e",textTransform:"uppercase",animation:"emberGlow 2s ease-in-out infinite"}}>⚒ Oath Witnessed</div>
            <div style={{fontSize:"13px",color:"#8a8a9c",lineHeight:1.6,textAlign:"center"}}>Spoken and sealed. Very few people ever say it out loud — you just did.</div>
            <button style={{...S.btn,maxWidth:"280px"}} onClick={()=>setScreen("dashboard")}>Day 1 Begins Now →</button>
          </div>
        )}
      </div>
    </div>
  );

  if (screen==="dashboard") return (
    <div style={S.app}><style>{CSS}</style>
      {screen!=="loading"&&screen!=="splash"&&(
        <button onClick={()=>setFeedbackOpen(true)} style={{position:"fixed",bottom:"20px",right:"20px",zIndex:50,background:"#1a1a2a",border:"1px solid #2a2a3e",borderRadius:"50%",width:"44px",height:"44px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:"16px",color:"#c8a96e",boxShadow:"0 4px 12px rgba(0,0,0,0.4)"}}>💬</button>
      )}
      {feedbackOpen && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}} onClick={()=>!feedbackSubmitting&&setFeedbackOpen(false)}>
          <div style={{...S.card,maxWidth:"380px"}} onClick={e=>e.stopPropagation()}>
            {!feedbackSent ? (
              <>
                <div style={S.eyebrow}>Send Feedback</div>
                <div style={{...S.h1,fontSize:"18px"}}>Something broken? Confusing? Tell us.</div>
                <div style={{display:"flex",gap:"8px"}}>
                  {["bug","confusing","idea","other"].map(c=>(
                    <button key={c} onClick={()=>setFeedbackCategory(c)} style={{flex:1,padding:"8px 0",borderRadius:"8px",border:`1px solid ${feedbackCategory===c?"#c8a96e":"#1e1e2e"}`,background:feedbackCategory===c?"#c8a96e":"#0a0a0f",color:feedbackCategory===c?"#0a0a0f":"#8a8a9c",fontSize:"12px",textTransform:"capitalize",cursor:"pointer",fontFamily:"'Georgia',serif"}}>{c}</button>
                  ))}
                </div>
                <textarea style={{...S.textarea,minHeight:"90px"}} placeholder="What happened? Be specific if it's a bug — what were you doing when it broke?" value={feedbackMessage} onChange={e=>setFeedbackMessage(e.target.value)} rows={4}/>
                <button style={{...S.btn,opacity:feedbackMessage.trim()&&!feedbackSubmitting?1:0.4}} disabled={!feedbackMessage.trim()||feedbackSubmitting} onClick={handleSubmitFeedback}>
                  {feedbackSubmitting?"Sending...":"Send Feedback"}
                </button>
                <button style={S.btnGhost} onClick={()=>setFeedbackOpen(false)}>Cancel</button>
              </>
            ) : (
              <div style={{textAlign:"center",padding:"20px 0"}}>
                <div style={{fontSize:"32px",marginBottom:"12px"}}>✓</div>
                <div style={{fontSize:"14px",color:"#c8a96e"}}>Sent. Thank you.</div>
              </div>
            )}
          </div>
        </div>
      )}
      {resetConfirmOpen && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}} onClick={()=>setResetConfirmOpen(false)}>
          <div style={{...S.card,maxWidth:"360px",border:"1px solid #4a2a2a"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:"10px",letterSpacing:"0.3em",color:"#8a5a5a",textTransform:"uppercase"}}>This Cannot Be Undone</div>
            <div style={{...S.h1,fontSize:"19px"}}>Reset your identity?</div>
            <div style={S.sub}>Your identity, debrief history, scripts, and progress will be permanently erased. You'll start over from onboarding.</div>
            <button style={{...S.btn,background:"#8a3a3a"}} onClick={resetApp}>Yes, Erase Everything</button>
            <button style={S.btnGhost} onClick={()=>setResetConfirmOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
      {/* Vote celebration overlay */}
      {voteFlash && (
        <div style={{position:"fixed",inset:0,zIndex:70,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",background:voteFlash.sweep?"rgba(10,10,15,0.82)":"rgba(10,10,15,0.55)"}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"14px",animation:"votePop 0.55s cubic-bezier(0.34,1.56,0.64,1)"}}>
            {voteFlash.sweep ? (
              <>
                <div style={{fontSize:"56px",animation:"strike 0.7s cubic-bezier(0.34,1.56,0.64,1), emberGlow 1.6s 0.7s ease-in-out infinite"}}>🔥</div>
                <div style={{fontSize:"13px",letterSpacing:"0.45em",color:"#c8a96e",textTransform:"uppercase"}}>Full Sweep</div>
                <div style={{fontSize:"26px",fontWeight:"700",color:"#e8e4dc"}}>Every domain. One day.</div>
                <div style={{fontSize:"14px",color:"#b2b2c4"}}>{calcVoteScore(domainLogs)} votes today · This is what {userData?.identity?.label} looks like.</div>
              </>
            ) : voteFlash.milestone ? (
              <>
                <div style={{fontSize:"52px",animation:"strike 0.7s cubic-bezier(0.34,1.56,0.64,1), emberGlow 1.6s 0.7s ease-in-out infinite"}}>⚒</div>
                <div style={{fontSize:"13px",letterSpacing:"0.45em",color:"#c8a96e",textTransform:"uppercase"}}>Milestone</div>
                <div style={{fontSize:"30px",fontWeight:"700",color:"#e8e4dc"}}>{voteFlash.milestone.toLocaleString()}th vote cast</div>
                <div style={{fontSize:"14px",color:"#b2b2c4"}}>{voteFlash.milestone.toLocaleString()} pieces of evidence. The belief is earning itself.</div>
              </>
            ) : (
              <>
                <div style={{fontSize:"44px",animation:"emberGlow 1.4s ease-in-out infinite"}}>⚒</div>
                <div style={{fontSize:"30px",fontWeight:"700",color:accentOf(userData)}}>+{voteFlash.weight} {voteFlash.weight===1?"VOTE":"VOTES"}</div>
                <div style={{fontSize:"12px",letterSpacing:"0.35em",color:"#b2b2c4",textTransform:"uppercase"}}>{voteFlash.tier} tier · evidence logged</div>
              </>
            )}
          </div>
        </div>
      )}

      {/* The Method — one-time overlay on first dashboard arrival */}
      {!userData?.methodSeen && (
        <div style={{position:"fixed",inset:0,zIndex:65,background:"rgba(10,10,15,0.93)",display:"flex",alignItems:"center",justifyContent:"center",padding:"24px",overflowY:"auto"}}>
          <div style={{...S.card,maxWidth:"420px"}}>
            <div style={S.eyebrow}>The Method</div>
            <div style={{...S.h1,fontSize:"21px"}}>How you actually change — and how FORGE bridges it.</div>
            {[
              {n:"1",t:"Declare",d:"You named who you're becoming. Done — that was your contract."},
              {n:"2",t:"Vote",d:"Every daily action is a vote for that person. Harder tiers carry more weight. This is your Mission."},
              {n:"3",t:"Witness",d:"The nightly Debrief and your Forged Traits reflect who the evidence says you are — not who you hope you are."},
              {n:"4",t:"Recover",d:"You will drift. Everyone does. Returning fast is the skill — Re-Forge exists for exactly that."},
              {n:"5",t:"Become",d:"At day 30 the old self retires. Your identity evolves and the next chapter begins."},
            ].map((s,i)=>(
              <div key={i} style={{display:"flex",gap:"14px",alignItems:"flex-start"}}>
                <div style={{width:"26px",height:"26px",borderRadius:"50%",border:"1px solid #c8a96e55",color:"#c8a96e",fontSize:"13px",fontWeight:"700",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{s.n}</div>
                <div>
                  <div style={{fontSize:"14px",fontWeight:"700",color:"#e8e4dc"}}>{s.t}</div>
                  <div style={{fontSize:"13px",color:"#8a8a9c",lineHeight:1.6,marginTop:"2px"}}>{s.d}</div>
                </div>
              </div>
            ))}
            <div style={{fontSize:"12px",color:"#5a5a76",fontStyle:"italic",lineHeight:1.6}}>Belief follows evidence. FORGE is the bridge between the person you are and the one you declared — one vote at a time.</div>
            <button style={S.btn} onClick={async()=>{await persist({...userData, methodSeen:true});}}>{currentDay() <= 1 ? "Cast My First Vote →" : "Back to the Work →"}</button>
          </div>
        </div>
      )}

      <div style={{width:"100%",maxWidth:"480px",display:"flex",flexDirection:"column",gap:"14px",animation:"dreamIn 0.9s ease both"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={S.eyebrow}>Day {currentDay()} — Mission Brief</div>
            <div style={{fontSize:"22px",fontWeight:"700",color:accentOf(userData),marginTop:"5px"}}>{userData?.identity?.label}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:"28px",fontWeight:"700",color:pct===100?"#c8a96e":"#e8e4dc"}}>{pct}%</div>
            <div style={{fontSize:"9px",color:"#5a5a76",letterSpacing:"0.2em"}}>COMPLETE</div>
            {(()=>{
              const y = new Date(); y.setDate(y.getDate()-1);
              const yLog = userData?.dailyLogs?.[y.toISOString().split("T")[0]];
              const yVotes = yLog?.domainLogs ? Object.values(yLog.domainLogs).reduce((s,l)=>s+(l?.completed?(l.voteWeight||0):0),0) : 0;
              return yVotes > 0 ? <div style={{fontSize:"9px",color:"#7a6a4e",letterSpacing:"0.1em",marginTop:"3px"}}>YESTERDAY: {yVotes} VOTES</div> : null;
            })()}
          </div>
        </div>
        <div style={S.progressBar}><div style={S.progressFill(pct)}/></div>
        {/* Nightly reminder — the cue the habit loop needs */}
        {!userData?.reminderHandled && (
          <div style={{...S.disruptor,borderColor:"#c8a96e55"}}>
            <div style={{fontSize:"9px",color:"#c8a96e",letterSpacing:"0.3em",textTransform:"uppercase",marginBottom:"8px"}}>⏰ The Cue</div>
            <div style={{fontSize:"14px",color:"#e8e4dc",lineHeight:1.65,marginBottom:"10px"}}>Habits need a trigger — willpower won't remember the debrief on a hard Tuesday. Pick your hour and add a nightly reminder to your phone in one tap.</div>
            <div style={{display:"flex",gap:"10px",alignItems:"center"}}>
              <input type="time" value={reminderTime} onChange={e=>setReminderTime(e.target.value)} style={{background:"#0a0a0f",border:"1px solid #2a2a3e",borderRadius:"8px",color:"#e8e4dc",fontSize:"16px",fontFamily:"'Georgia',serif",padding:"8px 10px",outline:"none"}}/>
              <button style={{...S.btn,flex:1,padding:"10px 0"}} onClick={async()=>{downloadReminder();await persist({...userData,reminderHandled:true});}}>Add Nightly Reminder</button>
            </div>
            <button style={{background:"none",border:"none",color:"#5a5a76",fontSize:"10px",cursor:"pointer",fontFamily:"'Georgia',serif",marginTop:"8px",padding:0}} onClick={async()=>{await persist({...userData,reminderHandled:true});}}>I'll set my own alarm</button>
          </div>
        )}

        {/* Day 14 — The Valley: teach the lag before it kills them */}
        {currentDay() >= 14 && !userData?.day14Seen && (
          <div style={{...S.disruptor,borderColor:"#c8a96e",cursor:"pointer"}} onClick={async()=>{await persist({...userData,day14Seen:true});}}>
            <div style={{fontSize:"9px",color:"#c8a96e",letterSpacing:"0.3em",textTransform:"uppercase",marginBottom:"8px"}}>⚒ The Valley — read once</div>
            <div style={{fontSize:"14px",color:"#e8e4dc",lineHeight:1.7}}>Around now, effort starts outrunning visible results. That lag is not failure — it's how compounding works: the votes are accumulating beneath the surface before anything shows. This valley is where most people quit, two weeks before it pays. You have {journeyStats(userData).votes} votes banked. Keep casting. <span style={{color:"#6e6e88"}}>(tap to close)</span></div>
          </div>
        )}

        {/* Day 7 milestone — one week of evidence, traits now visible */}
        {currentDay() >= 7 && !userData?.day7Seen && (
          <div style={{...S.disruptor,borderColor:"#c8a96e",cursor:"pointer",animation:"sweepGlow 1.4s ease both"}} onClick={async()=>{await persist({...userData,day7Seen:true});setScreen("mirror");}}>
            <div style={{fontSize:"9px",color:"#c8a96e",letterSpacing:"0.3em",textTransform:"uppercase",marginBottom:"8px"}}>⚒ One Week of Evidence</div>
            <div style={{fontSize:"14px",color:"#e8e4dc",lineHeight:1.6}}>Seven days ago this was a declaration. Now it's a record. Your Forged Traits are live — see who the evidence says you are. →</div>
          </div>
        )}
        {new Date().getDay()===0 && (
          <div style={{...S.disruptor, borderColor:"#c8a96e", cursor:"pointer"}} onClick={()=>{resetCeoForm();setScreen("ceoReview");}}>
            <div style={{fontSize:"9px",color:"#c8a96e",letterSpacing:"0.3em",textTransform:"uppercase",marginBottom:"8px"}}>It's Sunday</div>
            <div style={{fontSize:"14px",color:"#e8e4dc",lineHeight:1.6}}>Run your Weekly Review — step out of the days and look at the whole week like an owner, not a passenger. Score it honestly, set three priorities. →</div>
          </div>
        )}
        <div style={{display:"flex",alignItems:"center",gap:"8px",padding:"10px 14px",background:"#0a0a0f",borderRadius:"8px",border:"1px solid #1e1e2e"}}>
          <div style={{fontSize:"10px",color:"#6e6e88",letterSpacing:"0.25em",textTransform:"uppercase",marginRight:"4px"}}>7d</div>
          {getStreakDots().map((d,i)=><div key={i} style={S.streakDot(d.filled)}/>)}
          {saveStatus&&<div style={{fontSize:"10px",color:"#c8a96e",marginLeft:"auto",letterSpacing:"0.2em"}}>SAVED ✓</div>}
        </div>

        {/* ── Domain Mission Cards ── */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
          <div style={{fontSize:"10px",color:"#5a5a76",letterSpacing:"0.22em",textTransform:"uppercase"}}>Today's Domains</div>
          <div style={{fontSize:"10px",color:"#6e6e88"}}>One action each · Good tier counts</div>
        </div>
        <WhyThis id="domains">Every completed action is a vote for the person you declared — and research on identity-framed habits shows framing actions as "who I am" instead of "what I want" raises follow-through by about a third. The Good/Better/Best tiers exist so hard days still count: the system bends, so you don't break.</WhyThis>
        {(userData?.domains || DOMAINS).map(domain => {
          const log = domainLogs[domain.domain];
          const isCompleted = log?.completed;
          const isExpanded = activeDomain === domain.domain;
          const currentTier = selectedTier[domain.domain] || "good";
          const tierData = domain.tiers[currentTier];
          const rotatedActions = getRotatedActions(domain, userData?.startDate);
          const tierActions = rotatedActions.filter(a => getTierForAction(domain, a.id)?.tierName === currentTier);

          return (
            <div key={domain.domain} style={{background:"#0a0a0f",borderRadius:"12px",border:`1px solid ${isCompleted?"#c8a96e44":"#1e1e2e"}`,overflow:"hidden"}}>
              {/* Domain header — always visible */}
              <div style={{display:"flex",alignItems:"center",gap:"12px",padding:"14px 16px",cursor:"pointer"}} onClick={()=>setActiveDomain(isExpanded?null:domain.domain)}>
                <span style={{fontSize:"20px"}}>{domain.emoji}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:"14px",fontWeight:"700",color:isCompleted?"#c8a96e":"#e8e4dc"}}>{domain.label}</div>
                  <div style={{fontSize:"12px",color:"#6e6e88",marginTop:"2px",fontStyle:"italic"}}>"{domain.identity_claim}"</div>
                </div>
                {isCompleted ? (
                  <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                    <div style={{fontSize:"9px",color:"#4a8a4a",letterSpacing:"0.15em",textTransform:"uppercase"}}>{log.tier}</div>
                    <div style={{width:"20px",height:"20px",borderRadius:"50%",background:"#c8a96e",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",fontWeight:"700",color:"#0a0a0f"}}>✓</div>
                  </div>
                ) : (
                  <div style={{fontSize:"18px",color:"#2a2a3e"}}>{isExpanded?"▲":"▽"}</div>
                )}
              </div>

              {/* Behavior Scripts shortcut — visible when expanded, if scripts exist for this domain context */}
              {isExpanded && !isCompleted && userData?.behaviorScripts?.length > 0 && (
                <div style={{borderTop:"1px solid #1a1a2e",padding:"8px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer"}} onClick={()=>setScreen("scripting")}>
                  <div style={{fontSize:"10px",color:"#6e6e88",letterSpacing:"0.15em"}}>📋 My behavior scripts</div>
                  <div style={{fontSize:"10px",color:"#c8a96e"}}>{userData.behaviorScripts.length} saved →</div>
                </div>
              )}

              {/* Expanded domain — tier selector + actions */}
              {isExpanded && !isCompleted && (
                <div style={{borderTop:"1px solid #1e1e2e",padding:"14px 16px",display:"flex",flexDirection:"column",gap:"12px"}}>
                  {/* Tier selector */}
                  <div style={{display:"flex",gap:"8px"}}>
                    {["good","better","best"].map(t=>(
                      <button key={t} onClick={()=>setSelectedTier(p=>({...p,[domain.domain]:t}))} style={{flex:1,padding:"9px 0",borderRadius:"8px",border:`1px solid ${currentTier===t?accentOf(userData):"#1e1e2e"}`,background:currentTier===t?accentOf(userData):"#0a0a0f",color:currentTier===t?"#0a0a0f":"#8a8a9c",fontSize:"12px",fontWeight:currentTier===t?"700":"400",textTransform:"capitalize",cursor:"pointer",fontFamily:"'Georgia',serif"}}>
                        {t==="good"?"Good ①":t==="better"?"Better ②":"Best ③"}
                      </button>
                    ))}
                  </div>
                  <div style={{fontSize:"12px",color:"#5a5a76"}}>Vote weight: {domain.tiers[currentTier].vote_weight}x · Pick one action below</div>

                  {/* Future Self Flash — appears when Best tier is chosen */}
                  {currentTier === "best" && userData?.identity?.vision && (
                    <div style={{background:"#0a0a12",border:"1px solid #c8a96e22",borderRadius:"8px",padding:"12px 14px",display:"flex",gap:"10px",alignItems:"flex-start"}}>
                      <div style={{fontSize:"16px",flexShrink:0}}>🔭</div>
                      <div style={{display:"flex",flexDirection:"column",gap:"3px"}}>
                        <div style={{fontSize:"9px",color:"#c8a96e",letterSpacing:"0.25em",textTransform:"uppercase"}}>Your future self</div>
                        <div style={{fontSize:"13px",color:"#b2b2c4",lineHeight:1.6,fontStyle:"italic"}}>"{userData.identity.vision}"</div>
                        <div style={{fontSize:"10px",color:"#5a5a76",marginTop:"2px"}}>This action is a vote for that person.</div>
                      </div>
                    </div>
                  )}

                  {/* Actions for selected tier */}
                  {tierActions.length === 0 ? (
                    <div style={{fontSize:"13px",color:"#5a5a76",fontStyle:"italic"}}>Rotate back in {domain.rotation_refresh_days} days for new actions at this tier.</div>
                  ) : tierActions.map(action => (
                    <div key={action.id} style={{padding:"14px",background:"#12121a",borderRadius:"10px",border:"1px solid #1e1e2e",display:"flex",flexDirection:"column",gap:"10px"}}>
                      <div style={{fontSize:"14px",color:"#e8e4dc",lineHeight:1.6}}>{action.text}</div>

                      {/* Coach Me button + brief */}
                      {!coachingBrief[action.id] && (
                        <button
                          style={{background:"transparent",border:"1px solid #c8a96e33",borderRadius:"8px",padding:"9px 14px",fontSize:"12px",color:"#c8a96e",cursor:"pointer",fontFamily:"'Georgia',serif",textAlign:"left",letterSpacing:"0.05em"}}
                          onClick={()=>getCoachingBrief(domain, action, currentTier)}
                        >
                          ⚒ Coach me through this →
                        </button>
                      )}
                      {coachingBrief[action.id]?.loading && (
                        <div style={{display:"flex",alignItems:"center",gap:"8px",padding:"8px 0"}}>
                          <div style={{display:"flex",gap:"4px"}}>{[0,1,2].map(i=><div key={i} style={{width:"5px",height:"5px",borderRadius:"50%",background:"#c8a96e",animation:`typingPulse 1.2s ${i*0.2}s infinite`}}/>)}</div>
                          <div style={{fontSize:"12px",color:"#6e6e88"}}>Coach is reading your history...</div>
                        </div>
                      )}
                      {coachingBrief[action.id]?.text && !coachingBrief[action.id]?.loading && (
                        <div style={{background:"#0a0a0f",border:"1px solid #c8a96e22",borderLeft:"2px solid #c8a96e",borderRadius:"0 8px 8px 0",padding:"12px 14px"}}>
                          <div style={{fontSize:"9px",color:"#c8a96e",letterSpacing:"0.3em",textTransform:"uppercase",marginBottom:"8px"}}>Coach</div>
                          <div style={{fontSize:"14px",color:"#d8d4cc",lineHeight:1.75}}>{coachingBrief[action.id].text}</div>
                        </div>
                      )}

                      {action.requires_metric && (
                        <textarea
                          style={{...{background:"#0a0a0f",border:"1px solid #2a2a3e",borderRadius:"8px",color:"#e8e4dc",fontSize:"16px",fontFamily:"'Georgia',serif",padding:"10px",resize:"none",outline:"none",lineHeight:1.6,width:"100%",boxSizing:"border-box"},minHeight:"60px"}}
                          placeholder={action.metric_prompt}
                          value={metricInput[action.id]||""}
                          onChange={e=>setMetricInput(p=>({...p,[action.id]:e.target.value}))}
                          rows={2}
                        />
                      )}

                      {/* Implementation intention — mandatory: when does/did this happen */}
                      <div>
                        <div style={{fontSize:"10px",color:"#6e6e88",letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:"3px"}}>When? <span style={{color:"#c8a96e"}}>*</span></div>
                        <div style={{fontSize:"10px",color:"#5a5a76",fontStyle:"italic",marginBottom:"6px"}}>Deciding when doubles the odds it happens — a plan beats willpower.</div>
                        <div style={{display:"flex",gap:"6px"}}>
                          {/* why: implementation intentions */}
                          {[["morning","Morning"],["midday","Midday"],["evening","Evening"],["done","Already done"]].map(([k,l])=>(
                            <button key={k} onClick={()=>setActionTiming(p=>({...p,[action.id]:k}))} style={{flex:1,padding:"8px 0",borderRadius:"7px",border:`1px solid ${actionTiming[action.id]===k?"#c8a96e":"#1e1e2e"}`,background:actionTiming[action.id]===k?"#c8a96e":"transparent",color:actionTiming[action.id]===k?"#0a0a0f":"#5a5a6e",fontSize:"10px",cursor:"pointer",fontFamily:"'Georgia',serif"}}>{l}</button>
                          ))}
                        </div>
                      </div>

                      <button
                        style={{background:"#c8a96e",color:"#0a0a0f",border:"none",borderRadius:"8px",padding:"11px",fontSize:"13px",fontWeight:"700",letterSpacing:"0.1em",textTransform:"uppercase",cursor:"pointer",opacity:((action.requires_metric&&!metricInput[action.id]?.trim())||!actionTiming[action.id])?0.4:1}}
                        disabled={(action.requires_metric&&!metricInput[action.id]?.trim())||!actionTiming[action.id]}
                        onClick={()=>completeAction(domain.domain, action, currentTier, domain.tiers[currentTier].vote_weight)}
                      >
                        Mark Complete
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Completed state — show what was done */}
              {isCompleted && isExpanded && (
                <div style={{borderTop:"1px solid #1e1e2e",padding:"14px 16px",display:"flex",flexDirection:"column",gap:"8px"}}>
                  <div style={{fontSize:"14px",color:"#8a8a9c",lineHeight:1.6}}>{log.actionText}</div>
                  {log.metric && <div style={{fontSize:"13px",color:"#6e6e88",fontStyle:"italic"}}>→ "{log.metric}"</div>}
                  <button style={{background:"transparent",border:"1px solid #2a2a3e",borderRadius:"8px",padding:"9px",fontSize:"12px",color:"#8a8a9c",cursor:"pointer",fontFamily:"'Georgia',serif"}} onClick={()=>uncompleteAction(domain.domain)}>Undo</button>
                </div>
              )}
            </div>
          );
        })}

        {/* Vote score summary */}
        {Object.keys(domainLogs).length > 0 && (
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",background:"#0a0a0f",borderRadius:"8px",border:"1px solid #1e1e2e"}}>
            <div style={{fontSize:"12px",color:"#6e6e88",letterSpacing:"0.2em",textTransform:"uppercase"}}>Today's Vote Score</div>
            <div style={{fontSize:"20px",fontWeight:"700",color:accentOf(userData)}}>{calcVoteScore(domainLogs)}<span style={{fontSize:"12px",color:"#8a8a9c",marginLeft:"4px"}}>pts</span></div>
          </div>
        )}

        {disruption&&(
          <div style={S.disruptor}>
            <div style={{fontSize:"9px",color:"#c8a96e",letterSpacing:"0.3em",textTransform:"uppercase",marginBottom:"8px"}}>Pattern Interrupt</div>
            <div style={{fontSize:"14px",color:"#e8e4dc",lineHeight:1.65,fontStyle:"italic"}}>"{disruption}"</div>
          </div>
        )}
        {/* Quick-access scripts from dashboard */}
        {userData?.behaviorScripts?.length>0 && (
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 14px",background:"#0a0a0f",borderRadius:"8px",border:"1px solid #1e1e2e",cursor:"pointer"}} onClick={()=>setScreen("scripting")}>
            <div style={{fontSize:"13px",color:"#8a8a9c"}}>My Behavior Scripts</div>
            <div style={{fontSize:"13px",color:"#c8a96e"}}>{userData.behaviorScripts.length} saved →</div>
          </div>
        )}

        {/* 30-day ceremony trigger */}
        {shouldShowCeremony() && (
          <div style={{...S.disruptor,borderColor:"#c8a96e",cursor:"pointer",textAlign:"center"}} onClick={async()=>{await persist({...userData,ceremonySeen30:true});setScreen("ceremony");}}>
            <div style={{fontSize:"20px",marginBottom:"8px"}}>🔥</div>
            <div style={{fontSize:"14px",color:"#c8a96e",fontWeight:"700",marginBottom:"4px"}}>Day 30 Reached</div>
            <div style={{fontSize:"13px",color:"#e8e4dc"}}>Your old self has officially expired. Tap to claim your identity. →</div>
          </div>
        )}
        {/* Store loyalty teaser */}
        {totalActiveDays()>=30 && (
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 14px",background:"#0a0a0f",borderRadius:"8px",border:"1px solid #c8a96e22",cursor:"pointer"}} onClick={()=>setScreen("store")}>
            <div style={{fontSize:"13px",color:"#8a8a9c"}}>FORGE Store {loyaltyTier().emoji}</div>
            <div style={{fontSize:"13px",color:"#c8a96e"}}>{loyaltyTier().label} unlocked →</div>
          </div>
        )}
        <div style={S.navBar}>
          <button style={S.navBtn(true)}><span>⚡</span>Mission</button>
          <button style={S.navBtn(false)} onClick={()=>{setDebriefScore(null);setDebriefResponse("");setDebriefNote("");setDebriefMiss("");setDebriefVoice(null);setScreen("debrief");}}><span>🌙</span>Debrief</button>
          <button style={S.navBtn(false)} onClick={()=>setScreen("cohort")}><span>👥</span>Cohort</button>
          <button style={S.navBtn(false)} onClick={()=>setScreen("mirror")}><span>◈</span>Profile</button>
        </div>
      </div>
    </div>
  );

  if (screen==="ceremony") return (
    <div style={S.app}><style>{CSS}</style>
      {screen!=="loading"&&screen!=="splash"&&(<button onClick={()=>setFeedbackOpen(true)} style={{position:"fixed",bottom:"20px",right:"20px",zIndex:50,background:"#1a1a2a",border:"1px solid #2a2a3e",borderRadius:"50%",width:"44px",height:"44px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:"16px",color:"#c8a96e",boxShadow:"0 4px 12px rgba(0,0,0,0.4)"}}>💬</button>)}
      {feedbackOpen && (<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}} onClick={()=>!feedbackSubmitting&&setFeedbackOpen(false)}><div style={{...S.card,maxWidth:"380px"}} onClick={e=>e.stopPropagation()}>{!feedbackSent?(<><div style={S.eyebrow}>Send Feedback</div><div style={{...S.h1,fontSize:"18px"}}>Something broken? Confusing? Tell us.</div><div style={{display:"flex",gap:"8px"}}>{["bug","confusing","idea","other"].map(c=>(<button key={c} onClick={()=>setFeedbackCategory(c)} style={{flex:1,padding:"8px 0",borderRadius:"8px",border:`1px solid ${feedbackCategory===c?"#c8a96e":"#1e1e2e"}`,background:feedbackCategory===c?"#c8a96e":"#0a0a0f",color:feedbackCategory===c?"#0a0a0f":"#8a8a9c",fontSize:"12px",textTransform:"capitalize",cursor:"pointer",fontFamily:"'Georgia',serif"}}>{c}</button>))}</div><textarea style={{...S.textarea,minHeight:"90px"}} placeholder="What happened? Be specific if it's a bug — what were you doing when it broke?" value={feedbackMessage} onChange={e=>setFeedbackMessage(e.target.value)} rows={4}/><button style={{...S.btn,opacity:feedbackMessage.trim()&&!feedbackSubmitting?1:0.4}} disabled={!feedbackMessage.trim()||feedbackSubmitting} onClick={handleSubmitFeedback}>{feedbackSubmitting?"Sending...":"Send Feedback"}</button><button style={S.btnGhost} onClick={()=>setFeedbackOpen(false)}>Cancel</button></>):(<div style={{textAlign:"center",padding:"20px 0"}}><div style={{fontSize:"32px",marginBottom:"12px"}}>✓</div><div style={{fontSize:"14px",color:"#c8a96e"}}>Sent. Thank you.</div></div>)}</div></div>)}
      {resetConfirmOpen && (<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}} onClick={()=>setResetConfirmOpen(false)}><div style={{...S.card,maxWidth:"360px",border:"1px solid #4a2a2a"}} onClick={e=>e.stopPropagation()}><div style={{fontSize:"10px",letterSpacing:"0.3em",color:"#8a5a5a",textTransform:"uppercase"}}>This Cannot Be Undone</div><div style={{...S.h1,fontSize:"19px"}}>Reset your identity?</div><div style={S.sub}>Your identity, debrief history, scripts, and progress will be permanently erased. You'll start over from onboarding.</div><button style={{...S.btn,background:"#8a3a3a"}} onClick={resetApp}>Yes, Erase Everything</button><button style={S.btnGhost} onClick={()=>setResetConfirmOpen(false)}>Cancel</button></div></div>)}
      <div style={S.card}>
        <div style={{textAlign:"center",padding:"12px 0 4px"}}>
          <div style={{fontSize:"52px",marginBottom:"12px"}}>⚒</div>
          <div style={{fontSize:"10px",letterSpacing:"0.4em",color:"#8a8a9c",textTransform:"uppercase",marginBottom:"8px"}}>Day 30</div>
          <div style={{fontSize:"28px",fontWeight:"700",color:"#c8a96e",letterSpacing:"-0.02em",lineHeight:1.2}}>The old version of you is officially retired.</div>
        </div>
        <div style={S.identityBadge}>
          <div style={{fontSize:"10px",color:"#8a8a9c",letterSpacing:"0.3em",textTransform:"uppercase",marginBottom:"8px"}}>You became</div>
          <div style={{fontSize:"26px",fontWeight:"700",color:accentOf(userData)}}>{userData?.identity?.label}</div>
          <div style={{fontSize:"13px",color:"#b2b2c4",marginTop:"10px",fontStyle:"italic",lineHeight:1.6}}>"{userData?.identity?.statement}"</div>
        </div>
        <div style={{fontSize:"14px",color:"#8a8a9c",lineHeight:1.75,textAlign:"center"}}>
          30 days of showing up. That's not motivation — that's identity. What you've built in the last 30 days is permanent. What you build next is up to you.
        </div>
        <div style={{padding:"14px 16px",background:"#0a0a0f",borderRadius:"10px",border:"1px solid #c8a96e33",textAlign:"center"}}>
          <div style={{fontSize:"10px",color:"#c8a96e",letterSpacing:"0.3em",textTransform:"uppercase",marginBottom:"6px"}}>Loyalty Reward Unlocked</div>
          <div style={{fontSize:"22px",marginBottom:"4px"}}>🔗</div>
          <div style={{fontSize:"14px",color:"#e8e4dc",fontWeight:"700"}}>FORGE Wristband</div>
          <div style={{fontSize:"12px",color:"#8a8a9c",marginTop:"4px"}}>Claim it in the FORGE Store</div>
        </div>
        {/* Identity Evolution — has the identity been earned, and who's next */}
        {!evolutionText && !evolutionLoading && (
          <button style={{...S.btnGhost,borderColor:"#c8a96e44",color:"#c8a96e"}} onClick={getEvolution}>
            ⚒ Assess my evolution — who am I becoming next?
          </button>
        )}
        {evolutionLoading && (
          <div style={{display:"flex",alignItems:"center",gap:"10px",padding:"14px",background:"#0a0a0f",borderRadius:"8px",border:"1px solid #1e1e2e"}}>
            <div style={{display:"flex",gap:"4px"}}>{[0,1,2].map(i=><div key={i} style={{width:"5px",height:"5px",borderRadius:"50%",background:"#c8a96e",animation:`typingPulse 1.2s ${i*0.2}s infinite`}}/>)}</div>
            <div style={{fontSize:"13px",color:"#6e6e88"}}>Reading 30 days of evidence...</div>
          </div>
        )}
        {evolutionText && (
          <div style={{background:"#0a0a0f",border:"1px solid #c8a96e22",borderLeft:"2px solid #c8a96e",borderRadius:"0 10px 10px 0",padding:"16px 18px"}}>
            <div style={{fontSize:"9px",color:"#c8a96e",letterSpacing:"0.3em",textTransform:"uppercase",marginBottom:"10px"}}>The Verdict</div>
            <div style={{fontSize:"14px",color:"#d8d4cc",lineHeight:1.8,whiteSpace:"pre-line"}}>{evolutionText}</div>
          </div>
        )}

        <button style={S.btn} onClick={()=>setScreen("store")}>Go to FORGE Store →</button>
        <button style={S.btnGhost} onClick={()=>setScreen("dashboard")}>Back to Mission</button>
      </div>
    </div>
  );

  if (screen==="store") return (
    <div style={S.app}><style>{CSS}</style>
      {screen!=="loading"&&screen!=="splash"&&(<button onClick={()=>setFeedbackOpen(true)} style={{position:"fixed",bottom:"20px",right:"20px",zIndex:50,background:"#1a1a2a",border:"1px solid #2a2a3e",borderRadius:"50%",width:"44px",height:"44px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:"16px",color:"#c8a96e",boxShadow:"0 4px 12px rgba(0,0,0,0.4)"}}>💬</button>)}
      {feedbackOpen && (<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}} onClick={()=>!feedbackSubmitting&&setFeedbackOpen(false)}><div style={{...S.card,maxWidth:"380px"}} onClick={e=>e.stopPropagation()}>{!feedbackSent?(<><div style={S.eyebrow}>Send Feedback</div><div style={{...S.h1,fontSize:"18px"}}>Something broken? Confusing? Tell us.</div><div style={{display:"flex",gap:"8px"}}>{["bug","confusing","idea","other"].map(c=>(<button key={c} onClick={()=>setFeedbackCategory(c)} style={{flex:1,padding:"8px 0",borderRadius:"8px",border:`1px solid ${feedbackCategory===c?"#c8a96e":"#1e1e2e"}`,background:feedbackCategory===c?"#c8a96e":"#0a0a0f",color:feedbackCategory===c?"#0a0a0f":"#8a8a9c",fontSize:"12px",textTransform:"capitalize",cursor:"pointer",fontFamily:"'Georgia',serif"}}>{c}</button>))}</div><textarea style={{...S.textarea,minHeight:"90px"}} placeholder="What happened? Be specific if it's a bug — what were you doing when it broke?" value={feedbackMessage} onChange={e=>setFeedbackMessage(e.target.value)} rows={4}/><button style={{...S.btn,opacity:feedbackMessage.trim()&&!feedbackSubmitting?1:0.4}} disabled={!feedbackMessage.trim()||feedbackSubmitting} onClick={handleSubmitFeedback}>{feedbackSubmitting?"Sending...":"Send Feedback"}</button><button style={S.btnGhost} onClick={()=>setFeedbackOpen(false)}>Cancel</button></>):(<div style={{textAlign:"center",padding:"20px 0"}}><div style={{fontSize:"32px",marginBottom:"12px"}}>✓</div><div style={{fontSize:"14px",color:"#c8a96e"}}>Sent. Thank you.</div></div>)}</div></div>)}
      {resetConfirmOpen && (<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}} onClick={()=>setResetConfirmOpen(false)}><div style={{...S.card,maxWidth:"360px",border:"1px solid #4a2a2a"}} onClick={e=>e.stopPropagation()}><div style={{fontSize:"10px",letterSpacing:"0.3em",color:"#8a5a5a",textTransform:"uppercase"}}>This Cannot Be Undone</div><div style={{...S.h1,fontSize:"19px"}}>Reset your identity?</div><div style={S.sub}>Your identity, debrief history, scripts, and progress will be permanently erased. You'll start over from onboarding.</div><button style={{...S.btn,background:"#8a3a3a"}} onClick={resetApp}>Yes, Erase Everything</button><button style={S.btnGhost} onClick={()=>setResetConfirmOpen(false)}>Cancel</button></div></div>)}
      <div style={S.card}>
        <div style={S.eyebrow}>FORGE Store</div>
        <div style={S.h1}>Forgers only.</div>
        <WhyThis id="store">Symbols you earn work differently than things you buy — they're public evidence of a private standard. Every threshold here is measured in active days, so the gear can only ever mean one thing: you kept showing up.</WhyThis>
        <div style={S.sub}>Earned, never bought. Gear marks Forgers who kept showing up. The longer you stay in the forge, the more you unlock.</div>

        {/* Loyalty status */}
        <div style={{padding:"14px 16px",background:"#0a0a0f",borderRadius:"10px",border:"1px solid #c8a96e22"}}>
          <div style={{fontSize:"9px",color:"#6e6e88",letterSpacing:"0.3em",textTransform:"uppercase",marginBottom:"6px"}}>Your Status</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:"15px",fontWeight:"700",color:"#c8a96e"}}>{loyaltyTier().emoji} {loyaltyTier().label}</div>
            <div style={{fontSize:"13px",color:"#8a8a9c"}}>{totalActiveDays()} active days</div>
          </div>
          {!loyaltyTier().unlocked && (
            <div style={{fontSize:"12px",color:"#5a5a76",marginTop:"6px"}}>{loyaltyTier().daysLeft} more active days to unlock your first reward</div>
          )}
        </div>

        {/* Product tiers */}
        {[
          { days:30,  emoji:"🔗", label:"FORGE Wristband", desc:"Forged in brass. Worn as a daily reminder of who you chose to become.", unlocked: totalActiveDays()>=30 },
          { days:90,  emoji:"⚡", label:"FORGE T-Shirt",   desc:"Heavyweight cotton. The FORGE mark on your chest. Earned, not bought.", unlocked: totalActiveDays()>=90 },
          { days:365, emoji:"🔥", label:"FORGE Hoodie",    desc:"A full year in the forge. This one means something.", unlocked: totalActiveDays()>=365 },
        ].map((item,i)=>(
          <div key={i} style={{padding:"16px",background:"#0a0a0f",borderRadius:"10px",border:`1px solid ${item.unlocked?"#c8a96e44":"#1e1e2e"}`,display:"flex",flexDirection:"column",gap:"8px",opacity:item.unlocked?1:0.5}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                <span style={{fontSize:"22px"}}>{item.emoji}</span>
                <div style={{fontSize:"14px",fontWeight:"700",color: item.unlocked?"#e8e4dc":"#5a5a6e"}}>{item.label}</div>
              </div>
              <div style={{fontSize:"10px",color:item.unlocked?"#4a8a4a":"#5a5a76",letterSpacing:"0.15em",textTransform:"uppercase"}}>{item.unlocked?"Unlocked":"Day "+item.days}</div>
            </div>
            <div style={{fontSize:"13px",color:"#8a8a9c",lineHeight:1.5}}>{item.desc}</div>
            {item.unlocked && (
              <a href="https://forgeshop.myshopify.com" target="_blank" rel="noopener noreferrer" style={{...S.btn,textDecoration:"none",textAlign:"center",display:"block",padding:"13px 0",fontSize:"13px"}}>
                Claim in FORGE Store →
              </a>
            )}
          </div>
        ))}

        <div style={{fontSize:"12px",color:"#6e6e88",textAlign:"center",lineHeight:1.6}}>
          Store opens in a new tab · Rewards verified by active day count · Worn only by Forgers
        </div>

        <div style={S.navBar}>
          <button style={S.navBtn(false)} onClick={()=>setScreen("dashboard")}><span>⚡</span>Mission</button>
          <button style={S.navBtn(false)} onClick={()=>{setDebriefScore(null);setDebriefResponse("");setDebriefNote("");setDebriefMiss("");setDebriefVoice(null);setScreen("debrief");}}><span>🌙</span>Debrief</button>
          <button style={S.navBtn(false)} onClick={()=>setScreen("cohort")}><span>👥</span>Cohort</button>
          <button style={S.navBtn(false)} onClick={()=>setScreen("mirror")}><span>◈</span>Profile</button>
        </div>
      </div>
    </div>
  );

  if (screen==="cohort") return (
    <div style={S.app}><style>{CSS}</style>
      {screen!=="loading"&&screen!=="splash"&&(<button onClick={()=>setFeedbackOpen(true)} style={{position:"fixed",bottom:"20px",right:"20px",zIndex:50,background:"#1a1a2a",border:"1px solid #2a2a3e",borderRadius:"50%",width:"44px",height:"44px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:"16px",color:"#c8a96e",boxShadow:"0 4px 12px rgba(0,0,0,0.4)"}}>💬</button>)}
      {feedbackOpen && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}} onClick={()=>!feedbackSubmitting&&setFeedbackOpen(false)}>
          <div style={{...S.card,maxWidth:"380px"}} onClick={e=>e.stopPropagation()}>
            {!feedbackSent ? (
              <>
                <div style={S.eyebrow}>Send Feedback</div>
                <div style={{...S.h1,fontSize:"18px"}}>Something broken? Confusing? Tell us.</div>
                <div style={{display:"flex",gap:"8px"}}>
                  {["bug","confusing","idea","other"].map(c=>(
                    <button key={c} onClick={()=>setFeedbackCategory(c)} style={{flex:1,padding:"8px 0",borderRadius:"8px",border:`1px solid ${feedbackCategory===c?"#c8a96e":"#1e1e2e"}`,background:feedbackCategory===c?"#c8a96e":"#0a0a0f",color:feedbackCategory===c?"#0a0a0f":"#8a8a9c",fontSize:"12px",textTransform:"capitalize",cursor:"pointer",fontFamily:"'Georgia',serif"}}>{c}</button>
                  ))}
                </div>
                <textarea style={{...S.textarea,minHeight:"90px"}} placeholder="What happened? Be specific if it's a bug — what were you doing when it broke?" value={feedbackMessage} onChange={e=>setFeedbackMessage(e.target.value)} rows={4}/>
                <button style={{...S.btn,opacity:feedbackMessage.trim()&&!feedbackSubmitting?1:0.4}} disabled={!feedbackMessage.trim()||feedbackSubmitting} onClick={handleSubmitFeedback}>
                  {feedbackSubmitting?"Sending...":"Send Feedback"}
                </button>
                <button style={S.btnGhost} onClick={()=>setFeedbackOpen(false)}>Cancel</button>
              </>
            ) : (
              <div style={{textAlign:"center",padding:"20px 0"}}>
                <div style={{fontSize:"32px",marginBottom:"12px"}}>✓</div>
                <div style={{fontSize:"14px",color:"#c8a96e"}}>Sent. Thank you.</div>
              </div>
            )}
          </div>
        </div>
      )}
      {resetConfirmOpen && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}} onClick={()=>setResetConfirmOpen(false)}>
          <div style={{...S.card,maxWidth:"360px",border:"1px solid #4a2a2a"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:"10px",letterSpacing:"0.3em",color:"#8a5a5a",textTransform:"uppercase"}}>This Cannot Be Undone</div>
            <div style={{...S.h1,fontSize:"19px"}}>Reset your identity?</div>
            <div style={S.sub}>Your identity, debrief history, scripts, and progress will be permanently erased. You'll start over from onboarding.</div>
            <button style={{...S.btn,background:"#8a3a3a"}} onClick={resetApp}>Yes, Erase Everything</button>
            <button style={S.btnGhost} onClick={()=>setResetConfirmOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
      <div style={S.card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={S.eyebrow}>The Forgers</div>
            <WhyThis id="cohort">Watching others hold the standard makes holding it feel normal — and a 2025 meta-analysis of 42 studies found people with accountability structures were 2.8x more likely to keep new habits. Nobody here knows your name. Everybody here knows if you showed up.</WhyThis>
            <div style={{...S.h1,fontSize:"20px",marginTop:"6px"}}>Who's showing up today.</div>
          </div>
          <button style={{...S.btnGhost,width:"auto",padding:"8px 14px",fontSize:"10px"}} onClick={refreshCohort}>↻ Refresh</button>
        </div>

        <div style={{fontSize:"13px",color:"#5a5a76",lineHeight:1.6}}>
          You're not a customer here. You're a Forger — one of the people doing the work. Anonymous callsigns, no feeds, no noise. Just who showed up.
        </div>

        {/* Your position */}
        <div style={{padding:"12px 14px",background:"#0a0a0f",borderRadius:"8px",border:"1px solid #c8a96e22"}}>
          <div style={{fontSize:"9px",color:"#c8a96e",letterSpacing:"0.3em",textTransform:"uppercase",marginBottom:"4px"}}>You — {myCallsign}</div>
          <div style={{fontSize:"13px",color:"#b2b2c4"}}>{userData?.identity?.label} · Day {currentDay()} · {pct}% today</div>
        </div>

        {cohortLoading && (
          <div style={{display:"flex",justifyContent:"center",gap:"6px",padding:"16px 0"}}>
            {[0,1,2].map(i=><div key={i} style={S.typingDot(i)}/>)}
          </div>
        )}

        {!cohortLoading && cohortMembers.length === 0 && (
          <div style={{fontSize:"14px",color:"#5a5a76",textAlign:"center",padding:"20px 0",lineHeight:1.7}}>
            No active members yet.<br/>
            Complete your first task to appear on the board.<br/>
            <span style={{fontSize:"12px",color:"#6e6e88"}}>Others using FORGE will show here as they log in.</span>
          </div>
        )}

        {!cohortLoading && cohortMembers.length > 0 && (
          <div style={{display:"flex",flexDirection:"column",gap:"10px",maxHeight:"320px",overflowY:"auto"}}>
            {cohortMembers.map((m,i)=>{
              const isMe = m.memberId === userData?.memberId;
              const isActiveToday = m.lastActive === todayStr();
              return (
                <div key={m.memberId} style={S.cohortRow(isMe)}>
                  <div style={S.rankNum(i+1)}>{i+1}</div>
                  <div style={S.cohortBadge(isActiveToday)}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:"6px"}}>
                      <div style={{fontSize:"14px",fontWeight:"700",color:isMe?"#c8a96e":"#e8e4dc"}}>{m.callsign}{isMe?" (you)":""}</div>
                      <div style={{fontSize:"13px",color:"#8a8a9c"}}>{m.todayPct}%</div>
                    </div>
                    <div style={S.cohortBar}><div style={S.cohortFill(m.todayPct, isMe)}/></div>
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:"5px"}}>
                      <div style={{fontSize:"10px",color:"#5a5a76"}}>{m.label}</div>
                      <div style={{fontSize:"10px",color:"#5a5a76"}}>Day {m.dayCount} · avg {m.avgScore||"—"}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{fontSize:"12px",color:"#6e6e88",textAlign:"center",lineHeight:1.6}}>
          Sorted by today's completion · Updated when members log tasks or debriefs
        </div>

        <div style={S.navBar}>
          <button style={S.navBtn(false)} onClick={()=>setScreen("dashboard")}><span>⚡</span>Mission</button>
          <button style={S.navBtn(false)} onClick={()=>{setDebriefScore(null);setDebriefResponse("");setDebriefNote("");setDebriefMiss("");setDebriefVoice(null);setScreen("debrief");}}><span>🌙</span>Debrief</button>
          <button style={S.navBtn(true)}><span>👥</span>Cohort</button>
          <button style={S.navBtn(false)} onClick={()=>setScreen("mirror")}><span>◈</span>Profile</button>
        </div>
      </div>
    </div>
  );

  if (screen==="scripting") return (
    <div style={S.app}><style>{CSS}</style>
      {screen!=="loading"&&screen!=="splash"&&(
        <button onClick={()=>setFeedbackOpen(true)} style={{position:"fixed",bottom:"20px",right:"20px",zIndex:50,background:"#1a1a2a",border:"1px solid #2a2a3e",borderRadius:"50%",width:"44px",height:"44px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:"16px",color:"#c8a96e",boxShadow:"0 4px 12px rgba(0,0,0,0.4)"}}>💬</button>
      )}
      {feedbackOpen && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}} onClick={()=>!feedbackSubmitting&&setFeedbackOpen(false)}>
          <div style={{...S.card,maxWidth:"380px"}} onClick={e=>e.stopPropagation()}>
            {!feedbackSent ? (
              <>
                <div style={S.eyebrow}>Send Feedback</div>
                <div style={{...S.h1,fontSize:"18px"}}>Something broken? Confusing? Tell us.</div>
                <div style={{display:"flex",gap:"8px"}}>
                  {["bug","confusing","idea","other"].map(c=>(
                    <button key={c} onClick={()=>setFeedbackCategory(c)} style={{flex:1,padding:"8px 0",borderRadius:"8px",border:`1px solid ${feedbackCategory===c?"#c8a96e":"#1e1e2e"}`,background:feedbackCategory===c?"#c8a96e":"#0a0a0f",color:feedbackCategory===c?"#0a0a0f":"#8a8a9c",fontSize:"12px",textTransform:"capitalize",cursor:"pointer",fontFamily:"'Georgia',serif"}}>{c}</button>
                  ))}
                </div>
                <textarea style={{...S.textarea,minHeight:"90px"}} placeholder="What happened? Be specific if it's a bug — what were you doing when it broke?" value={feedbackMessage} onChange={e=>setFeedbackMessage(e.target.value)} rows={4}/>
                <button style={{...S.btn,opacity:feedbackMessage.trim()&&!feedbackSubmitting?1:0.4}} disabled={!feedbackMessage.trim()||feedbackSubmitting} onClick={handleSubmitFeedback}>
                  {feedbackSubmitting?"Sending...":"Send Feedback"}
                </button>
                <button style={S.btnGhost} onClick={()=>setFeedbackOpen(false)}>Cancel</button>
              </>
            ) : (
              <div style={{textAlign:"center",padding:"20px 0"}}>
                <div style={{fontSize:"32px",marginBottom:"12px"}}>✓</div>
                <div style={{fontSize:"14px",color:"#c8a96e"}}>Sent. Thank you.</div>
              </div>
            )}
          </div>
        </div>
      )}
      {resetConfirmOpen && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}} onClick={()=>setResetConfirmOpen(false)}>
          <div style={{...S.card,maxWidth:"360px",border:"1px solid #4a2a2a"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:"10px",letterSpacing:"0.3em",color:"#8a5a5a",textTransform:"uppercase"}}>This Cannot Be Undone</div>
            <div style={{...S.h1,fontSize:"19px"}}>Reset your identity?</div>
            <div style={S.sub}>Your identity, debrief history, scripts, and progress will be permanently erased. You'll start over from onboarding.</div>
            <button style={{...S.btn,background:"#8a3a3a"}} onClick={resetApp}>Yes, Erase Everything</button>
            <button style={S.btnGhost} onClick={()=>setResetConfirmOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
      <div style={S.card}>
        <div style={S.eyebrow}>Behavior Scripts</div>
        <WhyThis id="scripts">Deciding your response before the trigger arrives — "when X happens, I do Y" — is one of the most replicated effects in behavior science; willpower in the moment loses to a decision already made. These scripts are your pre-made decisions.</WhyThis>
        <div style={S.h1}>Decide now. Execute automatically later.</div>
        <div style={S.sub}>Write your response to high-risk moments while calm — so it runs on its own when the moment actually hits.</div>

        {!triggers && !triggersLoading && (
          <button style={S.btn} onClick={identifyTriggers}>Identify My Triggers</button>
        )}

        {triggersLoading && (
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"14px",padding:"20px 0"}}>
            <div style={{display:"flex",gap:"6px"}}>{[0,1,2].map(i=><div key={i} style={S.typingDot(i)}/>)}</div>
            <div style={{fontSize:"13px",color:"#5a5a76"}}>Analyzing your highest-risk moments...</div>
          </div>
        )}

        {triggers && activeTriggerIdx===null && (
          <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
            {triggers.map((t,i)=>{
              const saved = userData?.behaviorScripts?.find(s=>s.situation===t.situation);
              return (
                <div key={i} style={{...S.taskItem(false), cursor:"pointer", flexDirection:"column", alignItems:"stretch", gap:"8px"}} onClick={()=>{setActiveTriggerIdx(i);setCurrentResponseDraft(saved?.currentResponse||"");setDraftedScript(saved?.script||"");}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{fontSize:"14px",fontWeight:"700",color:"#e8e4dc"}}>{t.situation}</div>
                    {saved && <div style={{fontSize:"9px",color:"#4a8a4a",letterSpacing:"0.15em",textTransform:"uppercase"}}>Scripted ✓</div>}
                  </div>
                  <div style={{fontSize:"13px",color:"#8a8a9c",lineHeight:1.5}}>{t.context}</div>
                </div>
              );
            })}
          </div>
        )}

        {triggers && activeTriggerIdx!==null && (
          <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
            <div style={{padding:"14px 16px",background:"#0a0a0f",borderRadius:"10px",border:"1px solid #1e1e2e"}}>
              <div style={{fontSize:"9px",color:"#6e6e88",letterSpacing:"0.25em",textTransform:"uppercase",marginBottom:"6px"}}>Trigger</div>
              <div style={{fontSize:"15px",fontWeight:"700",color:"#e8e4dc"}}>{triggers[activeTriggerIdx].situation}</div>
            </div>

            {!draftedScript && (
              <>
                <textarea style={{...S.textarea,minHeight:"70px"}} placeholder="How do you currently tend to respond in this moment? (Optional — honest answers make a better script)" value={currentResponseDraft} onChange={e=>setCurrentResponseDraft(e.target.value)} rows={3}/>
                <button style={{...S.btn,opacity:scriptDrafting?0.4:1}} disabled={scriptDrafting} onClick={()=>draftScript(triggers[activeTriggerIdx], currentResponseDraft)}>
                  {scriptDrafting?"Drafting your script...":"Write My Script"}
                </button>
              </>
            )}

            {scriptDrafting && <div style={{display:"flex",justifyContent:"center",gap:"6px"}}>{[0,1,2].map(i=><div key={i} style={S.typingDot(i)}/>)}</div>}

            {draftedScript && (
              <>
                <div style={S.disruptor}>
                  <div style={{fontSize:"9px",color:"#c8a96e",letterSpacing:"0.3em",textTransform:"uppercase",marginBottom:"10px"}}>Your Script</div>
                  <div style={{fontSize:"14px",color:"#e8e4dc",lineHeight:1.75,fontStyle:"italic"}}>"{draftedScript}"</div>
                </div>
                <button style={S.btn} onClick={()=>saveScript(activeTriggerIdx)}>Lock This Script In</button>
                <button style={S.btnGhost} onClick={()=>{setDraftedScript("");}}>Rewrite</button>
              </>
            )}

            <button style={S.btnGhost} onClick={()=>{setActiveTriggerIdx(null);setDraftedScript("");setCurrentResponseDraft("");}}>← Back to Triggers</button>
          </div>
        )}

        <div style={S.navBar}>
          <button style={S.navBtn(false)} onClick={()=>setScreen("dashboard")}><span>⚡</span>Mission</button>
          <button style={S.navBtn(false)} onClick={()=>{setDebriefScore(null);setDebriefResponse("");setDebriefNote("");setDebriefMiss("");setDebriefVoice(null);setScreen("debrief");}}><span>🌙</span>Debrief</button>
          <button style={S.navBtn(false)} onClick={()=>setScreen("cohort")}><span>👥</span>Cohort</button>
          <button style={S.navBtn(true)} onClick={()=>setScreen("mirror")}><span>◈</span>Profile</button>
        </div>
      </div>
    </div>
  );

  if (screen==="ceoReview") return (
    <div style={S.app}><style>{CSS}</style>
      {screen!=="loading"&&screen!=="splash"&&(
        <button onClick={()=>setFeedbackOpen(true)} style={{position:"fixed",bottom:"20px",right:"20px",zIndex:50,background:"#1a1a2a",border:"1px solid #2a2a3e",borderRadius:"50%",width:"44px",height:"44px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:"16px",color:"#c8a96e",boxShadow:"0 4px 12px rgba(0,0,0,0.4)"}}>💬</button>
      )}
      {feedbackOpen && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}} onClick={()=>!feedbackSubmitting&&setFeedbackOpen(false)}>
          <div style={{...S.card,maxWidth:"380px"}} onClick={e=>e.stopPropagation()}>
            {!feedbackSent ? (
              <>
                <div style={S.eyebrow}>Send Feedback</div>
                <div style={{...S.h1,fontSize:"18px"}}>Something broken? Confusing? Tell us.</div>
                <div style={{display:"flex",gap:"8px"}}>
                  {["bug","confusing","idea","other"].map(c=>(
                    <button key={c} onClick={()=>setFeedbackCategory(c)} style={{flex:1,padding:"8px 0",borderRadius:"8px",border:`1px solid ${feedbackCategory===c?"#c8a96e":"#1e1e2e"}`,background:feedbackCategory===c?"#c8a96e":"#0a0a0f",color:feedbackCategory===c?"#0a0a0f":"#8a8a9c",fontSize:"12px",textTransform:"capitalize",cursor:"pointer",fontFamily:"'Georgia',serif"}}>{c}</button>
                  ))}
                </div>
                <textarea style={{...S.textarea,minHeight:"90px"}} placeholder="What happened? Be specific if it's a bug — what were you doing when it broke?" value={feedbackMessage} onChange={e=>setFeedbackMessage(e.target.value)} rows={4}/>
                <button style={{...S.btn,opacity:feedbackMessage.trim()&&!feedbackSubmitting?1:0.4}} disabled={!feedbackMessage.trim()||feedbackSubmitting} onClick={handleSubmitFeedback}>
                  {feedbackSubmitting?"Sending...":"Send Feedback"}
                </button>
                <button style={S.btnGhost} onClick={()=>setFeedbackOpen(false)}>Cancel</button>
              </>
            ) : (
              <div style={{textAlign:"center",padding:"20px 0"}}>
                <div style={{fontSize:"32px",marginBottom:"12px"}}>✓</div>
                <div style={{fontSize:"14px",color:"#c8a96e"}}>Sent. Thank you.</div>
              </div>
            )}
          </div>
        </div>
      )}
      {resetConfirmOpen && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}} onClick={()=>setResetConfirmOpen(false)}>
          <div style={{...S.card,maxWidth:"360px",border:"1px solid #4a2a2a"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:"10px",letterSpacing:"0.3em",color:"#8a5a5a",textTransform:"uppercase"}}>This Cannot Be Undone</div>
            <div style={{...S.h1,fontSize:"19px"}}>Reset your identity?</div>
            <div style={S.sub}>Your identity, debrief history, scripts, and progress will be permanently erased. You'll start over from onboarding.</div>
            <button style={{...S.btn,background:"#8a3a3a"}} onClick={resetApp}>Yes, Erase Everything</button>
            <button style={S.btnGhost} onClick={()=>setResetConfirmOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
      <div style={S.card}>
        <div style={S.eyebrow}>Weekly CEO Review — Week {Math.ceil(currentDay()/7)}</div>
        <WhyThis id="ceo">Days are where you execute; weeks are where you steer. A deliberate weekly review — honest scores, what got missed, three priorities — is the feedback loop that turns effort into direction. You run the review like an owner, because you are one.</WhyThis>
        <div style={S.h1}>You are the CEO of your life.</div>
        <div style={S.sub}>Score the week honestly. This isn't about feeling good — it's about seeing clearly.</div>

        {!ceoResponse && (
          <>
            {[
              { key:"relationships", label:"Relationships" },
              { key:"family", label:"Family / Parenting" },
              { key:"work", label:"Work / Wealth" },
              { key:"health", label:"Health / Body" },
            ].map(domain=>(
              <div key={domain.key} style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                <div style={{fontSize:"13px",color:"#b2b2c4"}}>{domain.label}</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"6px"}}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n=>(
                    <button key={n} style={S.scoreBtn(ceoScores[domain.key]===n)} onClick={()=>setCeoScores(p=>({...p,[domain.key]:n}))}>{n}</button>
                  ))}
                </div>
              </div>
            ))}

            <textarea style={{...S.textarea,minHeight:"70px"}} placeholder="What did you miss this week? Be honest." value={ceoMissed} onChange={e=>setCeoMissed(e.target.value)} rows={3}/>

            <div style={{fontSize:"10px",color:"#5a5a76",letterSpacing:"0.2em",textTransform:"uppercase"}}>Next Week's Three Non-Negotiables</div>
            {[0,1,2].map(i=>(
              <input key={i} style={{...S.textarea,minHeight:"unset",padding:"12px 14px"}} placeholder={`Priority ${i+1}`} value={ceoPriorities[i]} onChange={e=>setCeoPriorities(p=>{const n=[...p];n[i]=e.target.value;return n;})}/>
            ))}

            <button
              style={{...S.btn, opacity: [ceoScores.relationships,ceoScores.family,ceoScores.work,ceoScores.health].every(v=>v!==null) && !ceoSubmitting ? 1 : 0.4}}
              disabled={[ceoScores.relationships,ceoScores.family,ceoScores.work,ceoScores.health].some(v=>v===null) || ceoSubmitting}
              onClick={submitCeoReview}
            >
              {ceoSubmitting ? "FORGE is reviewing..." : "Submit Review"}
            </button>
          </>
        )}

        {ceoSubmitting && <div style={{display:"flex",justifyContent:"center",gap:"6px",padding:"8px 0"}}>{[0,1,2].map(i=><div key={i} style={S.typingDot(i)}/>)}</div>}

        {ceoResponse && (
          <>
            <div style={ceoCrisisFlag ? {...S.disruptor, border:"1px solid #6a8a9a", borderLeft:"3px solid #6a8a9a", background:"#0d1418"} : S.disruptor}>
              <div style={{fontSize:"9px",color:ceoCrisisFlag?"#8aaaba":"#c8a96e",letterSpacing:"0.3em",textTransform:"uppercase",marginBottom:"10px"}}>
                {ceoCrisisFlag ? "Before Anything Else" : "Your CEO Review"}
              </div>
              <div style={{fontSize:"14px",color:"#e8e4dc",lineHeight:1.75}}>{ceoResponse}</div>
            </div>
            <button style={S.btn} onClick={()=>setScreen("dashboard")}>Close Review</button>
          </>
        )}

        <div style={S.navBar}>
          <button style={S.navBtn(false)} onClick={()=>setScreen("dashboard")}><span>⚡</span>Mission</button>
          <button style={S.navBtn(false)} onClick={()=>{setDebriefScore(null);setDebriefResponse("");setDebriefNote("");setDebriefMiss("");setDebriefVoice(null);setScreen("debrief");}}><span>🌙</span>Debrief</button>
          <button style={S.navBtn(false)} onClick={()=>setScreen("cohort")}><span>👥</span>Cohort</button>
          <button style={S.navBtn(true)} onClick={()=>setScreen("mirror")}><span>◈</span>Profile</button>
        </div>
      </div>
    </div>
  );

  if (screen==="forgecard") return (
    <div style={S.app}><style>{CSS}</style>
      <div style={{display:"flex",flexDirection:"column",gap:"16px",alignItems:"center",width:"100%",maxWidth:"400px"}}>
        {(() => {
          const j = journeyStats(userData);
          const t = computeTraits(userData);
          const topTrait = t ? Object.entries({Discipline:t.discipline,Intensity:t.intensity,Integrity:t.integrity,Resilience:t.resilience,Consistency:t.consistency}).filter(([,v])=>v!==null).sort((a,b)=>b[1]-a[1])[0] : null;
          return (
            <div style={{width:"100%",background:"linear-gradient(160deg,#12121c 0%,#0a0a0f 55%,#141018 100%)",border:`1px solid ${accentOf(userData)}55`,borderRadius:"20px",padding:"36px 30px",display:"flex",flexDirection:"column",alignItems:"center",gap:"18px",textAlign:"center",boxShadow:"0 0 50px rgba(200,169,110,0.12)"}}>
              <div style={{fontSize:"34px",animation:"emberGlow 2.4s ease-in-out infinite"}}>⚒</div>
              <div>
                <div style={{fontSize:"9px",letterSpacing:"0.5em",color:"#8a8a9c",textTransform:"uppercase",marginBottom:"10px"}}>Forged Identity</div>
                <div style={{fontSize:"27px",fontWeight:"700",color:accentOf(userData),letterSpacing:"-0.01em",lineHeight:1.2}}>{userData?.identity?.label}</div>
                {(userData?.foundations||[]).length>0 && (
                  <div style={{fontSize:"12px",color:"#7a6a4e",letterSpacing:"0.15em",textTransform:"uppercase",marginTop:"8px"}}>
                    {userData.foundations.map(k=>FOUNDATIONS.find(x=>x.key===k)?.label).filter(Boolean).join("  ·  ")}
                  </div>
                )}
              </div>
              <div style={{width:"46px",height:"1px",background:"#c8a96e44"}}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px 34px",width:"100%"}}>
                {[
                  {v:`Day ${currentDay()}`, l:"In the forge"},
                  {v:j.votes.toLocaleString(), l:"Votes cast"},
                  {v:j.actions.toLocaleString(), l:"Actions completed"},
                  {v: topTrait ? `${topTrait[0]} ${topTrait[1]}` : "—", l:"Strongest trait"},
                ].map((s,i)=>(
                  <div key={i}>
                    <div style={{fontSize:"19px",fontWeight:"700",color:"#e8e4dc"}}>{s.v}</div>
                    <div style={{fontSize:"9px",color:"#6e6e88",letterSpacing:"0.18em",textTransform:"uppercase",marginTop:"3px"}}>{s.l}</div>
                  </div>
                ))}
              </div>
              <div style={{width:"46px",height:"1px",background:"#c8a96e44"}}/>
              <div style={{fontSize:"12px",color:"#8a8a9c",fontStyle:"italic",lineHeight:1.6}}>"Evidence, not intention."</div>
              {userData?.oathSwornAt && (
                <div style={{fontSize:"9px",color:"#7a6a4e",letterSpacing:"0.25em",textTransform:"uppercase"}}>Oath sworn {new Date(userData.oathSwornAt).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</div>
              )}
              <div style={{fontSize:"10px",letterSpacing:"0.3em",color:"#7a6a4e",textTransform:"uppercase"}}>forgeyourself.app</div>
            </div>
          );
        })()}
        <div style={{fontSize:"12px",color:"#5a5a76",textAlign:"center",lineHeight:1.6}}>Screenshot this card to share your progress.</div>
        <button style={S.btnGhost} onClick={()=>setScreen("mirror")}>← Back to Profile</button>
      </div>
    </div>
  );

  if (screen==="mirror") return (
    <div style={S.app}><style>{CSS}</style>
      {screen!=="loading"&&screen!=="splash"&&(
        <button onClick={()=>setFeedbackOpen(true)} style={{position:"fixed",bottom:"20px",right:"20px",zIndex:50,background:"#1a1a2a",border:"1px solid #2a2a3e",borderRadius:"50%",width:"44px",height:"44px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:"16px",color:"#c8a96e",boxShadow:"0 4px 12px rgba(0,0,0,0.4)"}}>💬</button>
      )}
      {feedbackOpen && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}} onClick={()=>!feedbackSubmitting&&setFeedbackOpen(false)}>
          <div style={{...S.card,maxWidth:"380px"}} onClick={e=>e.stopPropagation()}>
            {!feedbackSent ? (
              <>
                <div style={S.eyebrow}>Send Feedback</div>
                <div style={{...S.h1,fontSize:"18px"}}>Something broken? Confusing? Tell us.</div>
                <div style={{display:"flex",gap:"8px"}}>
                  {["bug","confusing","idea","other"].map(c=>(
                    <button key={c} onClick={()=>setFeedbackCategory(c)} style={{flex:1,padding:"8px 0",borderRadius:"8px",border:`1px solid ${feedbackCategory===c?"#c8a96e":"#1e1e2e"}`,background:feedbackCategory===c?"#c8a96e":"#0a0a0f",color:feedbackCategory===c?"#0a0a0f":"#8a8a9c",fontSize:"12px",textTransform:"capitalize",cursor:"pointer",fontFamily:"'Georgia',serif"}}>{c}</button>
                  ))}
                </div>
                <textarea style={{...S.textarea,minHeight:"90px"}} placeholder="What happened? Be specific if it's a bug — what were you doing when it broke?" value={feedbackMessage} onChange={e=>setFeedbackMessage(e.target.value)} rows={4}/>
                <button style={{...S.btn,opacity:feedbackMessage.trim()&&!feedbackSubmitting?1:0.4}} disabled={!feedbackMessage.trim()||feedbackSubmitting} onClick={handleSubmitFeedback}>
                  {feedbackSubmitting?"Sending...":"Send Feedback"}
                </button>
                <button style={S.btnGhost} onClick={()=>setFeedbackOpen(false)}>Cancel</button>
              </>
            ) : (
              <div style={{textAlign:"center",padding:"20px 0"}}>
                <div style={{fontSize:"32px",marginBottom:"12px"}}>✓</div>
                <div style={{fontSize:"14px",color:"#c8a96e"}}>Sent. Thank you.</div>
              </div>
            )}
          </div>
        </div>
      )}
      {resetConfirmOpen && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}} onClick={()=>setResetConfirmOpen(false)}>
          <div style={{...S.card,maxWidth:"360px",border:"1px solid #4a2a2a"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:"10px",letterSpacing:"0.3em",color:"#8a5a5a",textTransform:"uppercase"}}>This Cannot Be Undone</div>
            <div style={{...S.h1,fontSize:"19px"}}>Reset your identity?</div>
            <div style={S.sub}>Your identity, debrief history, scripts, and progress will be permanently erased. You'll start over from onboarding.</div>
            <button style={{...S.btn,background:"#8a3a3a"}} onClick={resetApp}>Yes, Erase Everything</button>
            <button style={S.btnGhost} onClick={()=>setResetConfirmOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
      <div style={S.card}>
        <div style={S.eyebrow}>The Mirror · who the evidence says you are — Day {currentDay()}</div>
        <div style={S.h1}>Who your actions say you are</div>
        <div style={S.identityBadge}>
          <div style={{fontSize:"10px",color:"#8a8a9c",letterSpacing:"0.3em",marginBottom:"8px",textTransform:"uppercase"}}>Declared Identity</div>
          <div style={{fontSize:"22px",fontWeight:"700",color:accentOf(userData)}}>{userData?.identity?.label}</div>
          <div style={{fontSize:"13px",color:"#8a8a9c",marginTop:"8px",fontStyle:"italic"}}>"{userData?.identity?.statement}"</div>
        </div>

        {/* The Journey — distance traveled */}
        {(() => {
          const j = journeyStats(userData);
          if (j.actions === 0) return null;
          // 5-week heatmap (35 days ending today)
          const cells = Array.from({length:35},(_,i)=>{
            const d = new Date(); d.setDate(d.getDate()-(34-i));
            const key = d.toISOString().split("T")[0];
            const l = userData?.dailyLogs?.[key];
            const v = l?.domainLogs ? Object.values(l.domainLogs).reduce((s,x)=>s+(x?.completed?(x.voteWeight||0):0),0) : 0;
            return { key, v, active: isActiveLog(l) };
          });
          const maxV = Math.max(1, ...cells.map(c=>c.v));
          return (
            <div style={{padding:"16px",background:"#0a0a0f",borderRadius:"10px",border:"1px solid #c8a96e22",display:"flex",flexDirection:"column",gap:"14px"}}>
              <div style={{fontSize:"9px",color:"#c8a96e",letterSpacing:"0.3em",textTransform:"uppercase"}}>The Journey</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"10px"}}>
                {[
                  {v:j.votes.toLocaleString(), l:"Lifetime votes"},
                  {v:j.actions.toLocaleString(), l:"Actions done"},
                  {v:j.sweeps, l:"Full sweeps"},
                  {v:j.bestDay, l:"Best day"},
                  ...(j.overrides>0?[{v:j.overrides, l:"Voice overrides"}]:[]),
                ].map((s,i)=>(
                  <div key={i} style={{textAlign:"center"}}>
                    <div style={{fontSize:"20px",fontWeight:"700",color:accentOf(userData)}}>{s.v}</div>
                    <div style={{fontSize:"9px",color:"#6e6e88",letterSpacing:"0.1em",textTransform:"uppercase",marginTop:"2px"}}>{s.l}</div>
                  </div>
                ))}
              </div>
              {/* 5-week heatmap */}
              <div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"4px"}}>
                  {cells.map((c,i)=>(
                    <div key={i} title={c.key} style={{aspectRatio:"1",borderRadius:"3px",background:c.v>0?`rgba(200,169,110,${0.25+0.75*(c.v/maxV)})`:c.active?"#2a2a3e":"#16161f",border:"1px solid #1a1a26"}}/>
                  ))}
                </div>
                <div style={{fontSize:"9px",color:"#5a5a76",marginTop:"6px",textAlign:"right"}}>Last 5 weeks · brighter = more votes</div>
              </div>
            </div>
          );
        })()}

        {/* Forged Traits — who the evidence says you are */}
        {(() => {
          const t = computeTraits(userData);
          if (!t) return (
            <div style={{padding:"14px 16px",background:"#0a0a0f",borderRadius:"10px",border:"1px solid #1e1e2e"}}>
              <div style={{fontSize:"9px",color:"#6e6e88",letterSpacing:"0.3em",textTransform:"uppercase",marginBottom:"6px"}}>Forged Traits</div>
              <div style={{fontSize:"13px",color:"#8a8a9c",lineHeight:1.6}}>Your traits are computed from behavioral evidence, not self-report. Come back after 3 days of activity — the evidence will start speaking.</div>
            </div>
          );
          const rows = [
            {label:"Discipline", value:t.discipline, hint:`${t.evidence.activeDays}/${t.evidence.windowDays} days active`},
            {label:"Intensity", value:t.intensity, hint:"tier difficulty chosen"},
            {label:"Integrity", value:t.integrity, hint:"quality of written proof"},
            {label:"Resilience", value:t.resilience, hint:"return after missed days"},
            {label:"Consistency", value:t.consistency, hint:`longest streak ${t.evidence.longestStreak}d`},
          ];
          return (
            <div style={{padding:"16px",background:"#0a0a0f",borderRadius:"10px",border:"1px solid #c8a96e22",display:"flex",flexDirection:"column",gap:"12px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:"9px",color:"#c8a96e",letterSpacing:"0.3em",textTransform:"uppercase"}}>Forged Traits</div>
                <WhyThis id="traits">Self-perception research says belief follows evidence: you come to see yourself as disciplined by repeatedly watching yourself act disciplined. These numbers are computed only from what you actually did — never from what you said. That's why they're worth believing — and why they move. Nothing here is fixed; every trait is a running tally that today's action can raise.</WhyThis>
                <div style={{fontSize:"10px",color:t.trend==="rising"?"#4a8a4a":t.trend==="falling"?"#8a5a5a":"#4a4a6a",letterSpacing:"0.15em",textTransform:"uppercase"}}>
                  {t.trend==="rising"?"▲ Rising":t.trend==="falling"?"▼ Cooling":"— Steady"}
                </div>
              </div>
              {rows.map((r,i)=>(
                <div key={i}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px"}}>
                    <div style={{fontSize:"12px",color:"#b2b2c4"}}>{r.label}</div>
                    <div style={{fontSize:"12px",color:r.value===null?"#5a5a76":"#c8a96e",fontWeight:"700"}}>{r.value===null?"—":r.value}</div>
                  </div>
                  <div style={{height:"3px",background:"#1a1a2a",borderRadius:"2px",overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${r.value||0}%`,background:"#c8a96e",borderRadius:"2px",transition:"width 0.6s ease"}}/>
                  </div>
                  <div style={{fontSize:"9px",color:"#5a5a76",marginTop:"3px"}}>{r.hint}</div>
                </div>
              ))}
              <div style={{fontSize:"10px",color:"#5a5a76",lineHeight:1.5,fontStyle:"italic"}}>Computed from your logged behavior — not self-report. Your coach reads these.</div>
            </div>
          );
        })()}

        {[
          {label:"Today's Completion",value:`${pct}%`},
          {label:"Days Active",value:`${currentDay()} days`},
          {label:"Old Self Expires",value:`${daysUntilExpiry()} days`},
          {label:"Avg Debrief Score",value:avgScore()?`${avgScore()} / 10`:"—"},
          {label:"CEO Reviews Completed",value:`${userData?.ceoReviews?.length||0}`},
          {label:"Cohort Callsign",value:myCallsign},
        ].map((s,i)=>(
          <div key={i} style={S.stat}>
            <div style={{fontSize:"13px",color:"#8a8a9c"}}>{s.label}</div>
            <div style={{fontSize:"18px",fontWeight:"700",color:"#c8a96e"}}>{s.value}</div>
          </div>
        ))}
        <button style={S.btnGhost} onClick={()=>{resetCeoForm();setScreen("ceoReview");}}>Run Weekly CEO Review</button>
        <button style={S.btnGhost} onClick={()=>setScreen("scripting")}>My Behavior Scripts{userData?.behaviorScripts?.length?` (${userData.behaviorScripts.length})`:""}</button>
        <button style={S.btnGhost} onClick={()=>setScreen("history")}>Activity Log</button>
        <button style={S.btnGhost} onClick={()=>setScreen("store")}>FORGE Store {loyaltyTier().emoji}</button>
        <button style={S.btnGhost} onClick={async()=>{await persist({...userData,methodSeen:false});setScreen("dashboard");}}>The Method — how change works</button>
        <button style={{...S.btnGhost,borderColor:"#c8a96e33",color:"#c8a96e"}} onClick={()=>setScreen("forgecard")}>⚒ My Forge Card</button>

        {/* Private by Design */}
        <div style={{padding:"14px 16px",background:"#0a0a0f",borderRadius:"10px",border:"1px solid #1e1e2e"}}>
          <div style={{fontSize:"9px",color:"#6e6e88",letterSpacing:"0.3em",textTransform:"uppercase",marginBottom:"8px"}}>🔒 Private by Design</div>
          <div style={{fontSize:"12px",color:"#8a8a9c",lineHeight:1.7}}>Your identity, debriefs, misses, and inner voice live in your device's storage — there is no account and no server database of your entries. No human reads what you write. Your words are sent securely to the AI coach only to generate its response, and are never sold or used to advertise to you. The cohort sees only an anonymous callsign. Deleting the app, or Start Over, erases your record.</div>
        </div>

        {/* Identity accent — curated palette, AI-assigned, user-overridable */}
        <div style={{padding:"14px 16px",background:"#0a0a0f",borderRadius:"10px",border:"1px solid #1e1e2e"}}>
          <div style={{fontSize:"9px",color:"#6e6e88",letterSpacing:"0.3em",textTransform:"uppercase",marginBottom:"10px"}}>Identity Accent · {(ACCENTS[userData?.accent]||ACCENTS.gold).name}</div>
          <div style={{display:"flex",gap:"10px",justifyContent:"space-between"}}>
            {Object.entries(ACCENTS).map(([key,a])=>(
              <div key={key} onClick={async()=>{await persist({...userData, accent:key});}} style={{width:"30px",height:"30px",borderRadius:"50%",background:a.hex,cursor:"pointer",border:(userData?.accent||"gold")===key?"2px solid #e8e4dc":"2px solid transparent",boxShadow:(userData?.accent||"gold")===key?`0 0 12px ${a.hex}88`:"none",transition:"all 0.2s ease"}}/>
            ))}
          </div>
        </div>

        {/* Inner Voice — self-talk coaching */}
        <div style={{padding:"14px 16px",background:"#0a0a0f",borderRadius:"10px",border:"1px solid #c8a96e22",display:"flex",flexDirection:"column",gap:"10px"}}>
          <div style={{fontSize:"9px",color:"#c8a96e",letterSpacing:"0.3em",textTransform:"uppercase"}}>Inner Voice</div>
          {userData?.innerVoice?.script && !innerVoiceLoading ? (
            <>
              <div style={{fontSize:"14px",color:"#d8d4cc",lineHeight:1.75,whiteSpace:"pre-wrap"}}>{userData.innerVoice.script}</div>
              <button style={{background:"transparent",border:"none",color:"#6e6e88",fontSize:"12px",cursor:"pointer",textAlign:"left",padding:0,fontFamily:"'Georgia',serif"}} onClick={async()=>{await persist({...userData, innerVoice:null});}}>Rewrite it ↺</button>
            </>
          ) : innerVoiceLoading ? (
            <div style={{display:"flex",alignItems:"center",gap:"10px",padding:"6px 0"}}>
              <div style={{display:"flex",gap:"4px"}}>{[0,1,2].map(i=><div key={i} style={{width:"5px",height:"5px",borderRadius:"50%",background:"#c8a96e",animation:`typingPulse 1.2s ${i*0.2}s infinite`}}/>)}</div>
              <div style={{fontSize:"12px",color:"#6e6e88"}}>Rebuilding your inner voice...</div>
            </div>
          ) : (
            <>
              <div style={{fontSize:"13px",color:"#8a8a9c",lineHeight:1.65}}>The voice in your head after a failure decides what happens next — it builds or it destroys. Write down what you actually say to yourself when you fail. Your coach will rebuild it into something demanding and clean.</div>
              <textarea style={{...S.textarea,minHeight:"56px",fontSize:"16px"}} placeholder={'"I always do this. I\'m never going to change..."'} value={innerVoiceInput} onChange={e=>setInnerVoiceInput(e.target.value)} rows={2}/>
              <button style={{...S.btn,opacity:innerVoiceInput.trim()?1:0.4}} disabled={!innerVoiceInput.trim()} onClick={rewriteInnerVoice}>Rebuild My Inner Voice</button>
            </>
          )}
        </div>

        {/* The Anvil — editable foundations */}
        <div style={{padding:"14px 16px",background:"#0a0a0f",borderRadius:"10px",border:"1px solid #1e1e2e"}}>
          <div style={{fontSize:"9px",color:"#c8a96e",letterSpacing:"0.3em",textTransform:"uppercase",marginBottom:"10px"}}>The Anvil · identities you already own</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:"8px"}}>
            {FOUNDATIONS.map(f=>{
              const cur = userData?.foundations||[];
              const on = cur.includes(f.key);
              return (
                <button key={f.key} onClick={async()=>{const next = on?cur.filter(k=>k!==f.key):(cur.length<3?[...cur,f.key]:cur);await persist({...userData, foundations:next});}} style={{display:"flex",alignItems:"center",gap:"6px",padding:"7px 11px",borderRadius:"18px",border:`1px solid ${on?"#c8a96e":"#1e1e2e"}`,background:on?"#c8a96e18":"#0a0a0f",color:on?"#c8a96e":"#8a8a9c",fontSize:"12px",cursor:"pointer",fontFamily:"'Georgia',serif"}}>
                  <span>{f.emoji}</span>{f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Pattern insight — available after 5+ debriefs */}
        {(userData?.debriefHistory||[]).length >= 5 && (
          <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
            {!patternInsight && !patternLoading && (
              <button style={{...S.btnGhost,borderColor:"#c8a96e33",color:"#c8a96e"}} onClick={getPatternInsight}>
                ⚒ Analyze my patterns →
              </button>
            )}
            {patternLoading && (
              <div style={{display:"flex",alignItems:"center",gap:"10px",padding:"14px",background:"#0a0a0f",borderRadius:"8px",border:"1px solid #1e1e2e"}}>
                <div style={{display:"flex",gap:"4px"}}>{[0,1,2].map(i=><div key={i} style={{width:"5px",height:"5px",borderRadius:"50%",background:"#c8a96e",animation:`typingPulse 1.2s ${i*0.2}s infinite`}}/>)}</div>
                <div style={{fontSize:"13px",color:"#6e6e88"}}>Reading your last 14 days...</div>
              </div>
            )}
            {patternInsight && (
              <div style={{background:"#0a0a0f",border:"1px solid #c8a96e22",borderLeft:"2px solid #c8a96e",borderRadius:"0 10px 10px 0",padding:"16px 18px",display:"flex",flexDirection:"column",gap:"10px"}}>
                <div style={{fontSize:"9px",color:"#c8a96e",letterSpacing:"0.3em",textTransform:"uppercase"}}>Pattern Analysis</div>
                <div style={{fontSize:"14px",color:"#d8d4cc",lineHeight:1.75}}>{patternInsight}</div>
                <button style={{background:"transparent",border:"none",color:"#6e6e88",fontSize:"12px",cursor:"pointer",textAlign:"left",padding:0,fontFamily:"'Georgia',serif"}} onClick={()=>setPatternInsight(null)}>Refresh ↺</button>
              </div>
            )}
          </div>
        )}

        <div style={{fontSize:"14px",color:"#8a8a9c",lineHeight:1.7,fontStyle:"italic",borderLeft:"2px solid #c8a96e33",paddingLeft:"14px"}}>
          "{userData?.identity?.label} would've already done this."
        </div>
        <button style={S.btnDanger} onClick={()=>setResetConfirmOpen(true)}>Reset Identity</button>
        <div style={S.navBar}>
          <button style={S.navBtn(false)} onClick={()=>setScreen("dashboard")}><span>⚡</span>Mission</button>
          <button style={S.navBtn(false)} onClick={()=>{setDebriefScore(null);setDebriefResponse("");setDebriefNote("");setDebriefMiss("");setDebriefVoice(null);setScreen("debrief");}}><span>🌙</span>Debrief</button>
          <button style={S.navBtn(false)} onClick={()=>setScreen("cohort")}><span>👥</span>Cohort</button>
          <button style={S.navBtn(true)}><span>◈</span>Profile</button>
        </div>
      </div>
    </div>
  );

  if (screen==="debrief") return (
    <div style={S.app}><style>{CSS}</style>
      {screen!=="loading"&&screen!=="splash"&&(
        <button onClick={()=>setFeedbackOpen(true)} style={{position:"fixed",bottom:"20px",right:"20px",zIndex:50,background:"#1a1a2a",border:"1px solid #2a2a3e",borderRadius:"50%",width:"44px",height:"44px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:"16px",color:"#c8a96e",boxShadow:"0 4px 12px rgba(0,0,0,0.4)"}}>💬</button>
      )}
      {feedbackOpen && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}} onClick={()=>!feedbackSubmitting&&setFeedbackOpen(false)}>
          <div style={{...S.card,maxWidth:"380px"}} onClick={e=>e.stopPropagation()}>
            {!feedbackSent ? (
              <>
                <div style={S.eyebrow}>Send Feedback</div>
                <div style={{...S.h1,fontSize:"18px"}}>Something broken? Confusing? Tell us.</div>
                <div style={{display:"flex",gap:"8px"}}>
                  {["bug","confusing","idea","other"].map(c=>(
                    <button key={c} onClick={()=>setFeedbackCategory(c)} style={{flex:1,padding:"8px 0",borderRadius:"8px",border:`1px solid ${feedbackCategory===c?"#c8a96e":"#1e1e2e"}`,background:feedbackCategory===c?"#c8a96e":"#0a0a0f",color:feedbackCategory===c?"#0a0a0f":"#8a8a9c",fontSize:"12px",textTransform:"capitalize",cursor:"pointer",fontFamily:"'Georgia',serif"}}>{c}</button>
                  ))}
                </div>
                <textarea style={{...S.textarea,minHeight:"90px"}} placeholder="What happened? Be specific if it's a bug — what were you doing when it broke?" value={feedbackMessage} onChange={e=>setFeedbackMessage(e.target.value)} rows={4}/>
                <button style={{...S.btn,opacity:feedbackMessage.trim()&&!feedbackSubmitting?1:0.4}} disabled={!feedbackMessage.trim()||feedbackSubmitting} onClick={handleSubmitFeedback}>
                  {feedbackSubmitting?"Sending...":"Send Feedback"}
                </button>
                <button style={S.btnGhost} onClick={()=>setFeedbackOpen(false)}>Cancel</button>
              </>
            ) : (
              <div style={{textAlign:"center",padding:"20px 0"}}>
                <div style={{fontSize:"32px",marginBottom:"12px"}}>✓</div>
                <div style={{fontSize:"14px",color:"#c8a96e"}}>Sent. Thank you.</div>
              </div>
            )}
          </div>
        </div>
      )}
      {resetConfirmOpen && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}} onClick={()=>setResetConfirmOpen(false)}>
          <div style={{...S.card,maxWidth:"360px",border:"1px solid #4a2a2a"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:"10px",letterSpacing:"0.3em",color:"#8a5a5a",textTransform:"uppercase"}}>This Cannot Be Undone</div>
            <div style={{...S.h1,fontSize:"19px"}}>Reset your identity?</div>
            <div style={S.sub}>Your identity, debrief history, scripts, and progress will be permanently erased. You'll start over from onboarding.</div>
            <button style={{...S.btn,background:"#8a3a3a"}} onClick={resetApp}>Yes, Erase Everything</button>
            <button style={S.btnGhost} onClick={()=>setResetConfirmOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
      <div style={S.card}>
        <div style={S.eyebrow}>Nightly Debrief — Day {currentDay()}</div>
        <WhyThis id="debrief">People who track their behavior with honest feedback achieve their goals at roughly double the rate of people who don't — the score forces one moment of truth per day. Speaking or writing what happened also consolidates it: named experience gets encoded; vague days evaporate.</WhyThis>
        {(() => {
          const todayLog = userData?.dailyLogs?.[todayStr()];
          if (todayLog?.debriefScore != null && !debriefResponse) {
            const entry = (userData?.debriefHistory||[]).slice().reverse().find(e=>e.date===todayStr());
            return (
              <>
                <div style={S.h1}>Today is closed.</div>
                <div style={S.sub}>You scored today a {todayLog.debriefScore}/10. Tomorrow's debrief opens at midnight.</div>
                {entry?.response && (
                  <div style={S.disruptor}>
                    <div style={{fontSize:"9px",color:"#c8a96e",letterSpacing:"0.3em",textTransform:"uppercase",marginBottom:"10px"}}>FORGE Responded</div>
                    <div style={{fontSize:"14px",color:"#e8e4dc",lineHeight:1.7}}>{entry.response}</div>
                  </div>
                )}
              </>
            );
          }
          return (
            <>
              <div style={S.h1}>Did you show up as {userData?.identity?.label} today?</div>
              <div style={S.sub}>No judgment. Just truth.</div>
            </>
          );
        })()}
        {(userData?.dailyLogs?.[todayStr()]?.debriefScore == null || debriefResponse) && (
        <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"8px"}}>
            {[1,2,3,4,5,6,7,8,9,10].map(n=>(
              <button key={n} style={S.scoreBtn(debriefScore===n)} onClick={()=>{setDebriefScore(n);setDebriefResponse("");}}>
                {n}
              </button>
            ))}
          </div>
          {/* Anchored meaning — the number is a judgment against a standard, not a mood */}
          <div style={{fontSize:"12px",color:debriefScore?"#c8a96e":"#5a5a76",textAlign:"center",minHeight:"16px",letterSpacing:"0.08em",transition:"color 0.2s ease"}}>
            {debriefScore==null ? "Only the score is required — everything below it sharpens the coaching" :
             debriefScore<=2 ? "Didn't show up. The day happened to you." :
             debriefScore<=4 ? "Below your standard — you know where it slipped." :
             debriefScore<=6 ? "Went through the motions. Present, not forged." :
             debriefScore<=8 ? "Showed up as the real thing. Repeatable." :
             "The standard itself. This is who you said you'd be."}
          </div>
        </div>
        )}

        {/* Future Self Flash — appears on low scores before they write their note */}
        {debriefScore && debriefScore <= 5 && !debriefResponse && userData?.identity?.vision && (
          <div style={{background:"#0a0a12",border:"1px solid #c8a96e22",borderRadius:"10px",padding:"14px 16px",display:"flex",gap:"12px",alignItems:"flex-start"}}>
            <div style={{fontSize:"18px",flexShrink:0}}>🔭</div>
            <div>
              <div style={{fontSize:"9px",color:"#c8a96e",letterSpacing:"0.25em",textTransform:"uppercase",marginBottom:"6px"}}>Remember why this matters</div>
              <div style={{fontSize:"14px",color:"#b2b2c4",lineHeight:1.7,fontStyle:"italic"}}>"{userData.identity.vision}"</div>
              <div style={{fontSize:"12px",color:"#5a5a76",marginTop:"6px"}}>One day doesn't define {userData.identity.label}. Tomorrow does.</div>
            </div>
          </div>
        )}

        {userData?.dailyLogs?.[todayStr()]?.debriefScore == null && (
        <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
          <div style={{position:"relative"}}>
            <textarea style={{...S.textarea,minHeight:"70px",paddingRight:speechSupported?"52px":"14px"}} placeholder={dictating?"Listening — speak your debrief...":"What happened today worth remembering?"} value={debriefNote} onChange={e=>setDebriefNote(e.target.value)} rows={3}/>
            {speechSupported && (
              <button onClick={toggleDictation} style={{position:"absolute",right:"10px",top:"10px",width:"36px",height:"36px",borderRadius:"50%",border:`1px solid ${dictating?"#c8a96e":"#2a2a3e"}`,background:dictating?"#c8a96e22":"#0a0a0f",color:dictating?"#c8a96e":"#8a8a9c",fontSize:"16px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",animation:dictating?"pulse 1.2s infinite":"none"}}>
                {dictating?"■":"🎙"}
              </button>
            )}
          </div>
          <div style={{fontSize:"10px",color:"#6e6e88",lineHeight:1.5,fontStyle:"italic"}}>
            Speak it if you can — verbalizing the day encodes it deeper than thinking it. Your coach reads every word.
          </div>

          {/* The Miss — integrity confession */}
          <div style={{padding:"12px 14px",background:"#0f0d0a",border:"1px solid #3a2e1e",borderRadius:"10px",display:"flex",flexDirection:"column",gap:"8px"}}>
            <div style={{fontSize:"9px",color:"#c8a96e",letterSpacing:"0.3em",textTransform:"uppercase"}}>The Miss · Integrity Check</div>
            <div style={{fontSize:"12px",color:"#8a8a9c",lineHeight:1.6}}>What did you dodge, soften, or lie to yourself about today? Owning it out loud is rarer than doing everything right — and your coach respects it more. No human ever reads this — it lives on your device and goes only to the AI that writes your response.</div>
            <textarea style={{...S.textarea,minHeight:"56px",fontSize:"16px",background:"#0a0a0f"}} placeholder="No one sees this but you and your coach." value={debriefMiss} onChange={e=>setDebriefMiss(e.target.value)} rows={2}/>
          </div>

          {/* Voice Check — track victories over the old voice, not the thoughts themselves */}
          <div style={{padding:"12px 14px",background:"#0a0a12",border:"1px solid #1e1e2e",borderRadius:"10px",display:"flex",flexDirection:"column",gap:"8px"}}>
            <div style={{fontSize:"9px",color:"#c8a96e",letterSpacing:"0.3em",textTransform:"uppercase"}}>Voice Check · optional</div>
            <div style={{fontSize:"12px",color:"#8a8a9c",lineHeight:1.6}}>Did the old voice show up today — the one that says you can't? Acting with the thought still present is the rep that rewires it.</div>
            <div style={{display:"flex",gap:"6px"}}>
              {[["none","Didn't show"],["won","It won today"],["overrode","I overrode it ⚒"]].map(([k,l])=>(
                <button key={k} onClick={()=>setDebriefVoice(debriefVoice===k?null:k)} style={{flex:1,padding:"9px 4px",borderRadius:"8px",border:`1px solid ${debriefVoice===k?(k==="overrode"?"#c8a96e":"#5a5a6e"):"#1e1e2e"}`,background:debriefVoice===k?(k==="overrode"?"#c8a96e22":"#1a1a24"):"transparent",color:debriefVoice===k?(k==="overrode"?"#c8a96e":"#9a9aae"):"#5a5a6e",fontSize:"10px",cursor:"pointer",fontFamily:"'Georgia',serif",lineHeight:1.3}}>{l}</button>
              ))}
            </div>
          </div>
        </div>
        )}
        {!debriefResponse && userData?.dailyLogs?.[todayStr()]?.debriefScore == null && (
          <button style={{...S.btn,opacity:debriefScore&&!aiTyping?1:0.4}} disabled={!debriefScore||aiTyping} onClick={submitDebrief}>
            {aiTyping?"FORGE is reflecting...":"Get My Debrief"}
          </button>
        )}
        {aiTyping&&!debriefResponse&&<div style={{display:"flex",justifyContent:"center",gap:"6px",padding:"8px 0"}}>{[0,1,2].map(i=><div key={i} style={S.typingDot(i)}/>)}</div>}
        {debriefResponse&&(
          <>
            {(()=>{ const acked = (userData?.debriefHistory||[]).slice(-1)[0]?.acknowledged; return (
            <div style={{...S.disruptor, border:acked?"1px solid #c8a96e88":S.disruptor.border, borderLeft:acked?"4px solid #c8a96e":S.disruptor.borderLeft}}>
              <div style={{fontSize:"9px",color:"#c8a96e",letterSpacing:"0.3em",textTransform:"uppercase",marginBottom:"10px"}}>FORGE Responds{acked?" · Acknowledged ✓":""}</div>
              <div style={{fontSize:"14px",color:"#e8e4dc",lineHeight:1.7,fontWeight:acked?"700":"400"}}>{debriefResponse}</div>
              {!acked && !detectCrisisLanguage(debriefNote) && !detectCrisisLanguage(debriefMiss) && (
                <button style={{marginTop:"12px",background:"transparent",border:"1px solid #c8a96e55",borderRadius:"8px",padding:"10px 16px",fontSize:"12px",color:"#c8a96e",cursor:"pointer",fontFamily:"'Georgia',serif",letterSpacing:"0.1em",width:"100%"}} onClick={async()=>{
                  const hist=[...(userData?.debriefHistory||[])];
                  if(hist.length){hist[hist.length-1]={...hist[hist.length-1],acknowledged:true};await persist({...userData,debriefHistory:hist});}
                }}>⚒ Acknowledged — hold me to it</button>
              )}
            </div>
            );})()}
            <button style={S.btn} onClick={()=>setScreen("dashboard")}>Close the Day</button>
          </>
        )}
        <div style={S.navBar}>
          <button style={S.navBtn(false)} onClick={()=>setScreen("dashboard")}><span>⚡</span>Mission</button>
          <button style={S.navBtn(true)}><span>🌙</span>Debrief</button>
          <button style={S.navBtn(false)} onClick={()=>setScreen("cohort")}><span>👥</span>Cohort</button>
          <button style={S.navBtn(false)} onClick={()=>setScreen("mirror")}><span>◈</span>Profile</button>
        </div>
      </div>
    </div>
  );

  if (screen==="history") return (
    <div style={S.app}><style>{CSS}</style>
      {screen!=="loading"&&screen!=="splash"&&(
        <button onClick={()=>setFeedbackOpen(true)} style={{position:"fixed",bottom:"20px",right:"20px",zIndex:50,background:"#1a1a2a",border:"1px solid #2a2a3e",borderRadius:"50%",width:"44px",height:"44px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:"16px",color:"#c8a96e",boxShadow:"0 4px 12px rgba(0,0,0,0.4)"}}>💬</button>
      )}
      {feedbackOpen && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}} onClick={()=>!feedbackSubmitting&&setFeedbackOpen(false)}>
          <div style={{...S.card,maxWidth:"380px"}} onClick={e=>e.stopPropagation()}>
            {!feedbackSent ? (
              <>
                <div style={S.eyebrow}>Send Feedback</div>
                <div style={{...S.h1,fontSize:"18px"}}>Something broken? Confusing? Tell us.</div>
                <div style={{display:"flex",gap:"8px"}}>
                  {["bug","confusing","idea","other"].map(c=>(
                    <button key={c} onClick={()=>setFeedbackCategory(c)} style={{flex:1,padding:"8px 0",borderRadius:"8px",border:`1px solid ${feedbackCategory===c?"#c8a96e":"#1e1e2e"}`,background:feedbackCategory===c?"#c8a96e":"#0a0a0f",color:feedbackCategory===c?"#0a0a0f":"#8a8a9c",fontSize:"12px",textTransform:"capitalize",cursor:"pointer",fontFamily:"'Georgia',serif"}}>{c}</button>
                  ))}
                </div>
                <textarea style={{...S.textarea,minHeight:"90px"}} placeholder="What happened? Be specific if it's a bug — what were you doing when it broke?" value={feedbackMessage} onChange={e=>setFeedbackMessage(e.target.value)} rows={4}/>
                <button style={{...S.btn,opacity:feedbackMessage.trim()&&!feedbackSubmitting?1:0.4}} disabled={!feedbackMessage.trim()||feedbackSubmitting} onClick={handleSubmitFeedback}>
                  {feedbackSubmitting?"Sending...":"Send Feedback"}
                </button>
                <button style={S.btnGhost} onClick={()=>setFeedbackOpen(false)}>Cancel</button>
              </>
            ) : (
              <div style={{textAlign:"center",padding:"20px 0"}}>
                <div style={{fontSize:"32px",marginBottom:"12px"}}>✓</div>
                <div style={{fontSize:"14px",color:"#c8a96e"}}>Sent. Thank you.</div>
              </div>
            )}
          </div>
        </div>
      )}
      {resetConfirmOpen && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}} onClick={()=>setResetConfirmOpen(false)}>
          <div style={{...S.card,maxWidth:"360px",border:"1px solid #4a2a2a"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:"10px",letterSpacing:"0.3em",color:"#8a5a5a",textTransform:"uppercase"}}>This Cannot Be Undone</div>
            <div style={{...S.h1,fontSize:"19px"}}>Reset your identity?</div>
            <div style={S.sub}>Your identity, debrief history, scripts, and progress will be permanently erased. You'll start over from onboarding.</div>
            <button style={{...S.btn,background:"#8a3a3a"}} onClick={resetApp}>Yes, Erase Everything</button>
            <button style={S.btnGhost} onClick={()=>setResetConfirmOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
      <div style={S.card}>
        <div style={S.eyebrow}>Activity Log</div>
        <div style={S.h1}>Your record.</div>
        <div style={{display:"flex",alignItems:"center",gap:"8px",padding:"10px 14px",background:"#0a0a0f",borderRadius:"8px",border:"1px solid #1e1e2e"}}>
          <div style={{fontSize:"10px",color:"#6e6e88",letterSpacing:"0.25em",textTransform:"uppercase",marginRight:"4px"}}>7 days</div>
          {getStreakDots().map((d,i)=><div key={i} style={S.streakDot(d.filled)}/>)}
        </div>
        {!userData?.debriefHistory?.length&&<div style={{fontSize:"14px",color:"#5a5a76",textAlign:"center",padding:"20px 0"}}>No debriefs yet. Complete your first tonight.</div>}
        <div style={{display:"flex",flexDirection:"column",gap:"10px",maxHeight:"320px",overflowY:"auto"}}>
          {[...(userData?.debriefHistory||[])].reverse().map((e,i)=>{
            const dayLog = userData?.dailyLogs?.[e.date];
            const dayVotes = dayLog?.domainLogs ? Object.values(dayLog.domainLogs).reduce((s,l)=>s+(l?.completed?(l.voteWeight||0):0),0) : 0;
            return (
            <div key={i} style={{...S.historyItem, borderLeft:e.acknowledged?"3px solid #c8a96e":S.historyItem.borderLeft}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:"10px",color:"#6e6e88",letterSpacing:"0.2em",textTransform:"uppercase"}}>Day {e.dayCount} — {e.date}{e.acknowledged?" · ⚒ acknowledged":""}</div>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  {dayVotes>0 && <div style={{fontSize:"10px",color:"#7a6a4e",letterSpacing:"0.1em"}}>{dayVotes} VOTES</div>}
                  <div style={{fontSize:"18px",fontWeight:"700",color:e.score>=8?"#c8a96e":e.score>=5?"#9a9aae":"#6a4a4a"}}>{e.score}/10</div>
                </div>
              </div>
              {e.note&&<div style={{fontSize:"13px",color:"#8a8a9c",lineHeight:1.5,fontStyle:"italic"}}>"{e.note}"</div>}
              {e.miss&&<div style={{fontSize:"12px",color:"#8a6a5a",lineHeight:1.5,padding:"6px 10px",background:"#0f0d0a",borderRadius:"6px",border:"1px solid #3a2e1e"}}>The Miss: "{e.miss}"</div>}
              <div style={{fontSize:"13px",color:"#6e6e88",lineHeight:1.5}}>{e.response}</div>
            </div>
          );})}
        </div>
        <div style={S.navBar}>
          <button style={S.navBtn(false)} onClick={()=>setScreen("dashboard")}><span>⚡</span>Mission</button>
          <button style={S.navBtn(false)} onClick={()=>{setDebriefScore(null);setDebriefResponse("");setDebriefNote("");setDebriefMiss("");setDebriefVoice(null);setScreen("debrief");}}><span>🌙</span>Debrief</button>
          <button style={S.navBtn(false)} onClick={()=>setScreen("cohort")}><span>👥</span>Cohort</button>
          <button style={S.navBtn(true)} onClick={()=>setScreen("mirror")}><span>◈</span>Profile</button>
        </div>
      </div>
    </div>
  );

  return null;
}

// ── Error boundary — crashes show a useful message instead of blank screen ───
class ForgeErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{minHeight:"100vh",background:"#0a0a0f",color:"#e8e4dc",fontFamily:"'Georgia',serif",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px",gap:"16px"}}>
          <div style={{fontSize:"32px"}}>⚒</div>
          <div style={{fontSize:"18px",fontWeight:"700",color:"#c8a96e"}}>FORGE hit an error</div>
          <div style={{fontSize:"13px",color:"#8a8a9c",maxWidth:"320px",textAlign:"center",lineHeight:1.7}}>
            {this.state.error?.message || "Unknown error"}
          </div>
          <button onClick={()=>this.setState({error:null})} style={{background:"#c8a96e",color:"#0a0a0f",border:"none",borderRadius:"10px",padding:"14px 28px",fontSize:"14px",fontWeight:"700",cursor:"pointer",marginTop:"8px"}}>
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const WrappedForge = () => (
  <ForgeErrorBoundary><Forge /></ForgeErrorBoundary>
);
export default WrappedForge;
