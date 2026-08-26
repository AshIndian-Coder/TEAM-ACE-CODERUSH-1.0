# RuralCare Route — Master Build Prompts (Competition-Grade Edition)

Five prompts, used in order. Paste each one as a fresh, complete message into your coding
tool (Claude Code, Cursor, etc.) — each is self-contained on purpose, so nothing is lost
if you run them in separate sessions or hand one off to a teammate.

**Order:** Prompt 0 (strategy — read it yourself, optionally paste it too) → Prompt 1
(engine) → Prompt 2 (frontend) → Prompt 3 (README) → Prompt 4 (audit pass, run last,
with time still on the clock). Part 5 is the optional networked backend.

---

# PROMPT 0 — STRATEGY BRIEF (read this yourself; also worth pasting first so your coding tool makes the same judgment calls you would)

```
Context for every prompt that follows: this is a 6-hour hackathon build judged on
Algorithmic Correctness (40%), Time & Space Efficiency (20%), Functional Implementation
(15%), Edge Cases & Testing (10%), UI Demonstration (10%), Code Quality (5%). A judge
will look at this project for roughly 3 minutes. Almost every competing submission will
be: a Leaflet map, a hardcoded Dijkstra call, a few colored markers, and a demo that
"just works" once. Your job is to be visibly, provably different in the first 90 seconds
a judge looks at it — not through more features, but through evidence.

The three things that separate the top 1% from everyone else on a project like this:

1. PROOF over CLAIM. Anyone can say "we use A* for efficiency." Almost no one shows the
   receipt. This build must let a judge SEE A* and Dijkstra return the identical optimal
   cost on the same request, side by side, with real millisecond timings — live, not in
   a slide. It must let a judge SEE what a naive "nearest hospital" system would have
   done wrong, right next to what this system did instead. Correctness and the USP both
   become visual facts, not sentences in a README.

2. IT LOOKS LIKE SOFTWARE, NOT A HACKATHON PROJECT. Judges see 40+ of these in a row.
   The overwhelming majority look identical: default fonts, default Tailwind purple,
   default rounded cards, a hero section. The moment this one opens looking like an
   actual operations console — dense, precise, monospace numbers, no wasted motion —
   it reads as "these people have shipped real things before," which quietly raises the
   judge's prior on everything else you show them.

3. IT SURVIVES BEING POKED. Judges reward things that don't break when they click the
   "wrong" button. Every edge-case control must be independently triggerable, at any
   time, in any order, without a page reload — and the decision log must narrate what
   happened in language a non-engineer judge can follow in one read.

Everything in the prompts below exists in service of one of these three things. If you
(the coding assistant) are ever unsure how to resolve an ambiguity, resolve it toward
whichever option makes the correctness/USP more visually provable, makes the UI read as
more precise/operational, or makes an edge case more survivable — in that priority order.
```

---

# PROMPT 1 — ENGINE / "BACKEND" (pure TypeScript, framework-agnostic)

```
You are a senior algorithms engineer. Build the simulation and dispatch engine for
"RuralCare Route" — a rural emergency healthcare routing system — as a standalone,
framework-agnostic TypeScript package with ZERO React/UI code and ZERO server/HTTP code.
It will be imported directly into a React frontend built separately, so every export
must be a plain function or class, fully unit-testable in isolation, TypeScript strict
mode, zero `any`.

CONTEXT
A decentralized rural healthcare network connects villages to hospitals with scarce
specialists, limited ambulances, and volatile medicine stock. Given an emergency request,
the engine must find the cheapest FEASIBLE hospital (not nearest), reserve its resources,
assign an ambulance, compute a route, and live-reroute when conditions change mid-transit.
This engine must also be able to PROVE its own correctness and efficiency on demand —
that proof capability is graded, so build it in, don't bolt it on later.

DELIVERABLE: a `/engine` folder with this exact structure —

engine/
  graph/
    Graph.ts              — adjacency-list weighted graph; add/remove nodes & edges,
                             open/close an edge, neighbors(nodeId)
    BinaryHeap.ts          — generic binary min-heap (push, pop, peek, size, decreaseKey)
    dijkstra.ts            — reference shortest-path implementation
    astar.ts               — primary path-finder, f(n)=g(n)+h(n), Euclidean heuristic
    syntheticGraph.ts       — generateSyntheticGraph(nodeCount, avgDegree, seed): builds
                             a plausible ROAD-LIKE network (not random noise) by scattering
                             points via Poisson-disc-ish spacing, connecting each node to
                             its k-nearest neighbors, then running a union-find pass to
                             guarantee full connectivity (stitch any disconnected
                             component to its nearest neighbor in another component).
                             Deterministic given a seed. This powers the benchmark mode —
                             it must be able to produce a 50,000-node / 200,000-edge graph
                             in well under a second.
  domain/
    types.ts               — all entity interfaces (see Data Model below)
    PriorityQueue.ts        — emergency triage queue, wraps BinaryHeap,
                             key = (urgencyRank, waitingTimeMs), tie-break by createdAt
  resources/
    HospitalRegistry.ts     — CRUD + reserve/release/consume beds & medicine, ATOMIC
    AmbulanceRegistry.ts    — state machine AVAILABLE→ASSIGNED→EN_ROUTE→ARRIVED
  dispatch/
    facilityFilter.ts       — hard-constraint filter, in this exact order, short-circuit:
                             (1) specialist available (2) bed available (3) medicine
                             available if required (4) reachable (astar returns a path)
    costFunction.ts          — Score = α*(travel/maxTravel) + β*(wait/maxWait), α=0.6,
                             β=0.4, BOTH runtime-configurable, never hardcoded constants
                             buried in the function
    naiveBaseline.ts         — naiveNearestHospitalAssign(request, hospitals): distance-
                             only assignment that completely IGNORES specialty/bed/
                             medicine constraints. Used ONLY by the comparison view to
                             show a judge what would have gone wrong — never used for
                             real dispatch. Must return enough detail (which constraint
                             it silently violated) for the UI to explain the failure.
    DispatchEngine.ts        — orchestrates: intake → queue → filter → score → reserve →
                             assign ambulance → route → dispatch. Exposes handleRequest(),
                             handleConditionChange(), compareWithNaive(request) (runs both
                             the real pipeline and naiveBaseline on the same request and
                             returns both outcomes for the UI to render side by side), and
                             subscribe() for state-change events.
  simulation/
    EventEngine.ts           — programmatic triggers: blockRoad(), reopenRoad(),
                             setSpecialistStatus(), fillBeds(), depleteMedicine(),
                             occupyAmbulance(), freeAmbulance(), generateRequest(),
                             generateConcurrentBurst(count) — fires N requests in the
                             same tick to stress-test the queue and resource locking
  benchmark/
    runBenchmark.ts           — given a graph size, runs astar and dijkstra across a
                             batch of random origin/destination pairs, and returns
                             { avgMs, p95Ms, nodesVisitedAvg, requestsPerSecond } for
                             both algorithms plus a boolean costsMatch across all pairs.
                             This is what powers the live "proof" panel in the UI —
                             it must actually execute, not return canned numbers.
  decisionLog/
    DecisionLog.ts            — append-only, typed log entries generated FROM REAL ENGINE
                             OUTPUT ONLY. Never hardcode a log string anywhere. Each entry
                             carries: timestamp, requestId, event type, the specific
                             hospitals evaluated with their pass/fail per constraint, and
                             the numeric cost of the winner.
  __tests__/
    (see Correctness Requirements below — write these as you build, not after)

DATA MODEL (types.ts) — implement exactly these entities:
- GraphNode: id, lat, lng, type: 'village' | 'hospital'
- RoadEdge: from, to, travelTime, distance, status: 'open' | 'closed'
- Hospital: id, nodeId, specialists: string[], bedsTotal, bedsAvailable, bedsReserved,
  medicines: Record<string, { available: number; reserved: number }>, status
- Doctor: id, specialty, facilityId, shiftStatus: 'on-duty' | 'off-duty'
- Ambulance: id, nodeId, status: 'AVAILABLE'|'ASSIGNED'|'EN_ROUTE'|'ARRIVED',
  currentRequestId: string | null
- PatientRequest: id, patientId, originNode, emergencyType, urgency:
  'CRITICAL'|'HIGH'|'MEDIUM'|'LOW', specialtyRequired, medicineRequired?, medicineQty?,
  createdAt, status: 'QUEUED'|'ASSIGNED'|'EN_ROUTE'|'COMPLETED'|'REROUTING'

ALGORITHM REQUIREMENTS (non-negotiable)
1. Closed edges are structurally skipped inside both dijkstra.ts and astar.ts (never
   filtered after the fact from a full result).
2. astar.ts accepts a heuristic function parameter (default: Euclidean using lat/lng)
   and returns { path, totalCost, visitedNodes, executionTimeMs }. dijkstra.ts returns
   the identical shape so results are directly comparable.
3. facilityFilter.ts excludes before scoring, never down-weights after.
4. Reserve is one atomic registry method moving a unit from `available` to `reserved` —
   never two mutations a re-render or concurrent call could interleave. release() and
   consume() are the only ways out of `reserved`.
5. handleConditionChange(event): detect any in-flight request whose reserved hospital is
   no longer feasible, release() its resources, re-run filter+score+assign for that
   request only, and emit log entries for both the invalidation and the new pick. This
   must actually execute the full pipeline again — it is not allowed to special-case or
   mock this path.
6. PriorityQueue: CRITICAL < HIGH < MEDIUM < LOW as heap keys, tie-broken by earliest
   createdAt, deterministic under identical input.
7. syntheticGraph.ts and runBenchmark.ts must be genuinely performant — generating and
   pathing a 50k-node graph should complete in a few seconds max on a normal laptop.
   Comment the actual Big-O of each stage inline (this is quoted directly in the README
   later, so make it accurate, not aspirational).

CORRECTNESS TEST SUITE (Vitest — this is graded, do not skip or stub)
- astar cost equals dijkstra cost on at least 3 different static test graphs, including
  one with a closed edge on the otherwise-shortest path
- a route through a closed edge is never returned by either algorithm
- a hospital missing the required specialist/bed/medicine is never selected
- two simultaneous CRITICAL requests (via generateConcurrentBurst) never reserve the
  same bed or medicine unit — write this as an actual concurrent-call test
- CRITICAL always dequeues before HIGH/MEDIUM/LOW regardless of insertion order
- handleConditionChange() correctly releases and reassigns when the reserved hospital
  becomes infeasible mid-transit
- identical input state produces an identical decision (determinism test)
- compareWithNaive() returns a naive outcome that visibly violates at least one
  constraint on a request where the real pipeline succeeds (this is the test that
  proves the USP demo will actually show something meaningful)
- syntheticGraph produces a fully connected graph (no isolated components) at 1k, 10k,
  and 50k node sizes

DO NOT: add Express, HTTP routes, a database, or any I/O. This package must run
identically inside a browser tab or a Node test runner with no external dependencies
besides TypeScript. Never hardcode a decision-log sentence — every string is templated
from values the engine actually computed.

Output: the full file tree above, fully implemented, the test suite, and a short usage
example at the bottom of DispatchEngine.ts showing subscribe(), handleRequest(), and
compareWithNaive().
```

---

# PROMPT 2 — FRONTEND (React + Vite + TypeScript)

```
You are a senior frontend engineer known for hand-crafted, information-dense operational
dashboards (Grafana, Datadog, aviation mission-control, a trading terminal) — NOT
marketing-site SaaS UIs. Build the UI for "RuralCare Route" in React + Vite + TypeScript
+ Tailwind CSS, consuming an already-built `/engine` package (Graph, DispatchEngine,
PriorityQueue, DecisionLog, EventEngine, runBenchmark, compareWithNaive — import these,
do not reimplement any algorithm). Your entire job is the interface, and it must look and
feel like it was built by someone who has shipped real production software, not generated
in one shot by an AI. A judge will look at this for about 3 minutes — every screen must
read as precise and deliberate in that window.

═══════════════════════════════════════════════════════════════
HARD ANTI-PATTERNS — VIOLATING ANY OF THESE IS A FAILED SUBMISSION
═══════════════════════════════════════════════════════════════
- NO purple-to-pink or blue-to-purple gradient backgrounds, anywhere.
- NO floating blurred gradient "blob" decorations.
- NO glassmorphism on every panel (backdrop-blur allowed on ONE thing max: a modal
  overlay scrim — nowhere else).
- NO Inter font, no default system-ui as the primary display font.
- NO rounded-full pill buttons as the default button shape.
- NO oversized rounded-3xl / rounded-[2rem] cards — radius is 6–8px for panels, 4px for
  buttons/inputs. This is a precision instrument, not a mobile app.
- NO emoji used as UI icons. lucide-react line icons only.
- NO generic marketing hero with a centered gradient headline and a CTA — this opens
  straight into the live dashboard.
- NO `animate-pulse` as a substitute for a real, purposeful animation.
- NO `transition-all duration-300` as your only animation technique.
- NO stacked/blurred shadow-2xl on every card — depth is a 1px hairline border plus one
  subtle single-layer shadow, nothing more.
- NO placeholder marketing copy ("Empowering rural communities through the power of
  AI…") — every string is functional, operational language, written like it ships in a
  real ops tool.
- NO silent failure states — every empty/loading/error state is explicitly designed,
  never a blank div.

═══════════════════════════════════════════════════════════════
DESIGN SYSTEM — EXACT VALUES, DO NOT SUBSTITUTE TAILWIND DEFAULTS
═══════════════════════════════════════════════════════════════

FONTS (real font files via @font-face / Google Fonts / Fontshare, not a fallback stack
pretending to be these):
- Display / headings / panel titles: "Cabinet Grotesk" (Fontshare, free), 700/600.
- Body / UI text / labels: "IBM Plex Sans", 400/500/600.
- Data / telemetry / IDs / timestamps / decision log / all numbers: "JetBrains Mono",
  400/500, tabular-nums. Numbers in this app are ALWAYS in this font, never in the
  display or body font — apply this rule with zero exceptions; it's the single biggest
  lever for reading as "real."

COLOR TOKENS (CSS variables in :root, wired into Tailwind theme.extend — never reference
Tailwind's default palette names like slate-900/purple-600 directly in components):
  --bg-canvas:      #0A0E13
  --bg-surface:     #12161D
  --bg-surface-2:   #1A2029
  --bg-surface-3:   #212836
  --border-hair:    #232A35
  --border-strong:  #313A48
  --text-primary:   #E8ECF1
  --text-secondary: #8B96A5
  --text-tertiary:  #57616F
  --accent:         #12A594   /* one brand teal — primary buttons, active route line,
                                  selected hospital ring, focus outline. ONE accent-
                                  colored element per view region, never five at once. */
  --accent-dim:     #0D2E2B
  --status-critical:#E5484D
  --status-high:    #F76B15
  --status-medium:  #F5B700
  --status-low:     #6C7684
  --status-success: #2FBF71
  --status-blocked: #4B5563

Urgency badges: 1px border + 15%-opacity background tint of the same status color +
full-opacity text. Never a solid filled badge — too loud at this information density.

LAYOUT
- CSS Grid dashboard, three regions: left rail (Simulation Controls, ~260px fixed),
  center (Interactive Map, flexible), right rail (Live Telemetry above, Decision Log
  below, ~340px fixed). Stack under 1100px; desktop-first is explicitly in scope.
- 8px spacing grid throughout (4px for tight data rows). No arbitrary spacing values.
- Panel headers: small, uppercase, letter-spaced, text-secondary, 11px — instrument-panel
  labels, not friendly section titles.

CORE COMPONENTS
1. `<MapPanel>` — React-Leaflet. Villages = small circle markers (text-tertiary fill).
   Hospitals = square markers colored by status (green ring = has capacity, red ring =
   full/just-rejected). Ambulances = custom SVG marker that visibly points in its
   direction of travel, not the default Leaflet pin. Roads render as thin lines; a
   closed road renders dashed in --status-blocked with a small "X" glyph at its midpoint.
2. `<TelemetryPanel>` — dense stat ROWS, not big glanceable KPI cards: ambulance
   available/busy, per-hospital bed and medicine numbers, active-request counts by
   urgency — JetBrains Mono, tabular-nums, right-aligned like a real data table.
3. `<DecisionLog>` — scrollable, monospace, terminal-like, rendered directly from the
   engine's DecisionLog entries (subscribe, never hardcode). Rejected hospitals render in
   text-tertiary with a left border in --status-critical; the selected hospital's line
   renders in text-primary with a left border in --accent. Give this an
   `aria-live="polite"` region so it's also a genuine accessibility feature, not just a
   visual one.
4. `<SimulationControls>` — grouped buttons: Generate Emergency, Generate Concurrent
   Burst, Block Road, Fill Beds, Deplete Medicine, Doctor Unavailable, Occupy/Free
   Ambulance, Reset. Small (32-36px), 4px radius, hairline border, text-secondary →
   text-primary on hover. No colorful gradient CTAs.
5. `<RequestIntakeForm>` — the doctor-entry modal (emergency type, urgency, specialist,
   medicine). Centered panel, backdrop-blur(4px) scrim (the one place blur is allowed).
   Compact fields, labels above in the 11px uppercase style.
6. `<ComparisonPanel>` — THE key differentiator, build this with real care: on any
   completed request, a toggle reveals `compareWithNaive()`'s two outcomes side by side —
   left column "Naive nearest-hospital" (shows the constraint it silently violated, in
   --status-critical), right column "RuralCare Route" (shows the actual feasible pick and
   its cost). This is what makes the USP a fact a judge sees, not a line they read.
7. `<BenchmarkPanel>` — lets a judge pick a graph size (1k / 10k / 50k nodes) and press
   Run: calls the real runBenchmark(), shows A* vs Dijkstra avgMs/p95Ms/requests-per-
   second live, and a green "Costs match across N pairs" line once verified. This is the
   direct, undeniable answer to "Algorithmic Correctness" and "Time & Space Efficiency" —
   don't bury it in a tab, put it one click away from the main view.
8. `<CommandPalette>` — Cmd/Ctrl+K opens a fuzzy-searchable list of every simulation
   action and panel (use the `cmdk` package — the same primitive Linear and Vercel ship
   with, a real and current senior-dev choice, not a novelty). This is a small feature
   that disproportionately signals engineering taste to a technical judge.
9. `<BootSequence>` — on first load only, a brief (under 1.2s total) terminal-style
   sequence in the center panel: 3-4 lines appearing in JetBrains Mono ("Loading road
   network...", "Indexing facilities...", "Engine ready.") before the map fades in.
   Skippable on any keypress/click. This is a cheap, high-leverage detail that no
   competing team will have and instantly signals intent over auto-generation.
10. `<PresentationToggle>` — a keyboard shortcut (press "P") that hides the left rail and
    scales up map/log typography for screen-sharing to a projector. Trivial to build,
    directly useful during your actual judging slot.

ANIMATION SPEC — exact numbers, using framer-motion, tied to real state changes only:
- Route draw-on: animate the route polyline via stroke-dashoffset (SVG overlay on the
  map) from full-offset to 0 over 700ms, cubic-bezier(0.22, 1, 0.36, 1). Never "appear."
- Ambulance movement: interpolate lat/lng along the path with requestAnimationFrame (not
  a CSS transition on top/left). Speed proportional to the edge's travelTime, scaled so a
  full demo route takes roughly 5-12s on screen.
- Decision Log entries: opacity 0/translateY 6px → opacity 1/translateY 0 over 220ms; a
  40ms stagger between entries arriving in the same tick; the winning line appears ~150ms
  after the last rejection, visually distinct as the "conclusion."
- Hospital rejection flash: marker ring pulses to --status-critical and back, ONE cycle,
  400ms ease-in-out — never an infinite pulse loop.
- Hospital selection: marker ring stroke-dashoffset "draw" 0%→100% over 500ms in
  --accent, then holds solid.
- Live reallocation (choreograph this deliberately, it's the differentiator moment):
  (a) infeasible hospital's ring flashes critical, (b) the in-flight route fades out over
  200ms, (c) a 150ms beat — nothing happens, on purpose, it reads as "the system
  noticed" — (d) the new route draws on per the spec above.
- Numeric counters (beds, queue counts) tween via framer-motion's `animate`/`useSpring`
  over 300ms — never a hard-cut update.
- Priority queue reordering: framer-motion `layout` on queue rows so re-prioritized
  requests visibly slide (~350ms), never pop to a new position.
- Buttons: press scales to 0.97 over 100ms. No hover glow/bloom. Focus states: 2px
  --accent outline, 2px offset — accessible and deliberate.
- Panel entrance on load (after BootSequence): each of the three regions fades/slides in
  from 8px with a 60ms stagger, 300ms duration — a one-time flourish, not repeated.

Every animation must be traceable to a real engine state change. If you're animating
something purely because it looks nice with no underlying data event, cut it.

OPTIONAL, TASTEFUL SOUND (skip if time-constrained, but cheap if you have 15 minutes):
synthesize two short tones with the Web Audio API (no audio files needed) — a soft
~150ms sine blip on successful dispatch, a brief two-tone alert on a CRITICAL request
arriving. Muted by default with a visible toggle in the top bar. This is a detail almost
no competing team will include.

ENGINEERING HYGIENE (checked in the audit pass, Prompt 4 — build it right the first time)
TypeScript strict mode, zero console errors/warnings at runtime, all interactive elements
keyboard-reachable with visible focus states, meaningful empty states for every panel
before the first request, page `<title>` and favicon set (not the Vite default), 60fps
during all animations (profile the ambulance-movement rAF loop specifically).

INTEGRATION
Import the engine package from the companion prompt. Wire `DispatchEngine.subscribe()`
into a React context/reducer feeding MapPanel, TelemetryPanel, DecisionLog, and
ComparisonPanel. Components only render engine state and call engine methods
(handleRequest, compareWithNaive, EventEngine triggers, runBenchmark) — never duplicate
algorithmic logic inside a component.

Output: full component tree, Tailwind config with the color tokens and fonts wired in as
theme extensions, and the root App layout implementing the grid, boot sequence, and
command palette described above.
```

---

# PROMPT 3 — README (paste after the app works; this is directly graded, don't rush it)

```
Write the README.md for "RuralCare Route" — a rural emergency healthcare routing engine
built for CodeRush 1.0. Read the actual /engine and /frontend source before writing a
single line; every technical claim in this README must be verifiably true of the code
that exists, not aspirational. This is graded directly (submission checklist requires a
detailed README explaining algorithmic design), so treat it as a deliverable, not
boilerplate.

STRUCTURE, in this order:
1. One-paragraph pitch ending in the USP line: "We don't route patients to the nearest
   hospital — we route them to the nearest hospital actually capable of treating them,
   and we keep re-routing them the moment that stops being true."
2. Problem statement (2-3 sentences, taken from the actual brief, not padded).
3. Architecture diagram (ASCII, matching Prompt 1's real file tree — do not invent
   modules that don't exist).
4. Algorithm design: explain Dijkstra vs A* choice, the admissible heuristic used, the
   exact cost function with its real default weights, the hard-constraint filter order,
   and the reservation-not-decrement resource model. State the real, verified Big-O for
   each stage — pull these from the inline comments in the actual code, don't estimate.
5. "Proof, not claims" section: describe exactly how to reproduce the A*-vs-Dijkstra
   parity check and the naive-vs-optimal comparison live in the running app — this is
   your strongest section, make it concrete and specific (which button, which panel).
6. Edge cases handled — table format, one row per control button, matching what's
   actually wired in SimulationControls.
7. Tech stack table with a one-line justification per row (reuse the real stack: React,
   Vite, TypeScript, Tailwind, React-Leaflet, framer-motion, cmdk, Vitest).
8. Setup instructions that a stranger can follow verbatim: clone, install, dev command,
   test command, build command. Test these commands actually work before writing them.
9. Live deployment link (placeholder if not yet deployed — flag clearly as TODO).
10. Scalability note: state plainly that the demo runs a small hand-authored graph for
    reliability, but that syntheticGraph.ts + runBenchmark.ts prove the same engine
    handles 50,000-node / 200,000-edge graphs within the O((V+E) log V) bound — and give
    the real benchmark numbers your BenchmarkPanel produced when you ran it.
11. Honest "Known limitations / Out of scope" section (in-memory only, no auth, no real
    map-routing API) — judges trust a team more, not less, for stating this plainly.
12. Future scope, kept to one short paragraph, not a bullet wishlist.

TONE: precise, technical, written the way an engineer documents something they actually
built and are proud of — not marketing copy, no exclamation points, no "revolutionary,"
no emoji as bullet markers (use "-"). Every number quoted must come from a real run of
the code, never invented for effect.
```

---

# PROMPT 4 — FINAL AUDIT PASS (run this last, only if time remains — high leverage even at 15 minutes)

```
Do a full audit pass on the RuralCare Route codebase before submission. Go through each
item below, actually check it against the running app (not just the source), and fix
what fails. Report a short checklist of what you found and fixed.

CORRECTNESS
- [ ] Open BenchmarkPanel, run it at 10k nodes: does the "costs match" indicator go
      green for real, using live-computed numbers?
- [ ] Trigger a mid-transit hospital failure: does the Decision Log narrate release →
      re-filter → re-select → reserve, with real hospital names/costs, not placeholder
      text?
- [ ] Fire generateConcurrentBurst(5) with 2+ CRITICAL requests: confirm in the UI that
      no two requests show the same reserved bed/ambulance.
- [ ] Click every single SimulationControls button, in a random order, twice each: does
      anything throw, freeze, or silently no-op?

VISUAL / ANTI-VIBECODED CHECK
- [ ] Screenshot the app at 100% zoom. Does anything read as a default Tailwind
      template — default indigo/purple, default rounded-xl cards, Inter font? If yes,
      fix it against the exact tokens in Prompt 2.
- [ ] Confirm every number on screen (beds, queue counts, timestamps, costs, ms timings)
      renders in JetBrains Mono, not the body font. This is checked file-by-file.
- [ ] Confirm no animation loops infinitely without a state reason (audit every
      `animate-pulse`, every `repeat: Infinity` in framer-motion — each one must map to
      an ongoing real condition, e.g., "ambulance en route," not decoration).
- [ ] Open DevTools console during a full demo run: zero errors, zero warnings.

ACCESSIBILITY & POLISH
- [ ] Tab through the entire UI with a keyboard only — every control reachable, every
      focus state visible.
- [ ] Confirm the Decision Log's aria-live region actually announces new entries (test
      with a screen reader or the accessibility tree inspector).
- [ ] Confirm page `<title>` and favicon are set, not Vite defaults.
- [ ] Confirm the BootSequence is skippable and doesn't block interaction past 1.2s.

SUBMISSION HYGIENE
- [ ] Commit history is incremental (not one giant commit) and the last few messages are
      readable, not "wip" / "fix".
- [ ] README's claimed benchmark numbers match a fresh run of BenchmarkPanel right now.
- [ ] The deployed Vercel link works in a fresh incognito window, with no console errors.
- [ ] Time a full run of the Judge Demo Script end-to-end: does it fit comfortably under
      3 minutes?
```

---

# PART 5 — OPTIONAL REAL BACKEND (only if Prompts 1-4 are done with time to spare)

```
You are a backend engineer adding an OPTIONAL real-time sync layer on top of an existing,
fully-working client-side engine (already built — do not reimplement its logic). Goal:
let a second browser (e.g. a judge's laptop) watch the same live simulation a presenter
is driving, nothing more.

Build a minimal Node.js + Express + Socket.IO server that:
- Hosts a single in-memory instance of the SAME engine package (import it directly).
- On a client `join` event, sends the current full state snapshot.
- Relays every DispatchEngine.subscribe() event to all connected clients over a
  `state:update` socket event.
- Accepts control actions only from a socket whose handshake carries
  `role: 'presenter'`; rejects control events from `role: 'viewer'` sockets server-side,
  not just hidden in the UI.
- No database, no auth beyond that role flag, no persistence. Keep it under ~150 lines.
- Provide a one-line `npm run dev` and a Vercel/Render-compatible start script.

This is explicitly a stretch goal. If you are inside the 6-hour window, do not build
this — ship the client-side-only version from Prompts 1-4 first.
```

---

## Why this version is sharper than a generic build prompt

- **Proof beats claims.** The `compareWithNaive` panel and the live `BenchmarkPanel`
  turn your two biggest scoring criteria (Correctness 40%, Efficiency 20% = 60% of the
  rubric) into things a judge *sees happen*, not sentences they have to take on trust.
- **The reallocation moment is choreographed, not just functional** — the flash → fade
  → beat → redraw sequence in Prompt 2 is specifically designed to read as intelligence,
  because it's the single most memorable 3 seconds of your demo.
- **The audit pass (Prompt 4) exists because most teams run out of time and submit
  Draft 1.** A 15-minute pass catching console errors, dead animations, and default-
  Tailwind residue is disproportionately high-leverage this late in a hackathon clock.
- **The README prompt runs last and reads the real code** — so it can never accidentally
  overclaim, which is exactly the kind of gap a judge who reads carefully will catch.
