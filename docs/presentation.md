---
marp: true
theme: default
paginate: true
size: 16:9
header: "FoodVision AI"
footer: "EECS 449 — Final Project"
style: |
  section { font-family: 'Helvetica', sans-serif; font-size: 26px; }
  h1 { color: #ff6633; }
  h2 { color: #3d291e; }
  .hook { font-size: 42px; line-height: 1.35; color: #3d291e; }
  .small { font-size: 20px; color: #805941; }
  code { background: #fff1e5; padding: 2px 6px; border-radius: 4px; }
---

<!-- 
Total time: 10 minutes (including ~4 min live demo).
Slide count: 12 content slides + 1 demo placeholder.
Pacing: ~30 sec per intro/solution slide, demo is the centerpiece.
-->

# FoodVision AI
### Meal planning that learns from you, not your form fields

Yizhong Zhong — EECS 449 Final Project — April 2026

<!--
Speaker note (0:00 — 0:15):
Keep this short. Say your name, one sentence about the project: "A meal planner that takes a photo and recommends a recipe, and learns your taste from what you've cooked."
-->

---

## The fridge problem

<div class="hook">

It's 7pm.
You open the fridge.
You don't know what to make.

</div>

<!--
Speaker note (0:15 — 0:50):
This is the hook. Pause after each line. Almost everyone in the room has had this exact moment. Don't explain it — let it land. Then pivot: "Two things happen next. Either you Google 'quick dinner ideas' and get the same 10 generic recipes everyone gets, or you order takeout. Neither uses the stuff already in your fridge, and neither knows anything about you."
-->

---

## The options today

### Google it
Same 10 recipes everyone else sees.

### Personalized apps
40-field profile before your first meal.

### Even the "smart" ones
Never update after the first week.

<!--
Speaker note (0:50 — 1:30):
Three failure modes. Paraphrase, don't read. Key line: "Every food app is stuck between 'too generic to be useful' and 'too much setup to actually use'. And none of them update once they think they know you. You told some app you liked Italian two years ago; it still thinks that's all you eat."
-->

---

## FoodVision AI

<div class="hook">

Photo in. Recipe out.
Profile builds itself.

</div>

<!--
Speaker note (1:30 — 1:50):
The pitch, said slowly: "Take a photo. Get a recipe. It's tailored to what the AI sees *and* what it has learned about you from every meal you've cooked. The key word is 'learned' — the app starts with zero knowledge about you and gets smarter every time you use it."
-->

---

## Three moments, every time you cook

### 01 · Photo in, recipe out
Vision model reads your fridge.

### 02 · Memory
Last 14 days of meals go into the next prompt.

### 03 · Quiet learning
Cooked Korean three times? Korean shows up in your profile. You never typed it.

<!--
Speaker note (1:50 — 2:40):
Three loops. The punchline is moment 3: the profile is a side effect of using the app, not a prerequisite for using it. Drive this home: "You never open a settings page. The settings page fills itself in."
-->

---

## Landing page

### → Switch to browser

`localhost:3000`

<!--
Speaker note (2:40 — 3:10):
Do NOT describe the landing page from a slide. Alt-tab to the real browser on localhost:3000.

Things to point at on camera, in order:
1. Hero headline — "It's 7pm. You open the fridge. We know what you should cook." — same sentence that opened the talk, so the audience recognizes it.
2. Mock conversation on the right — shows user prompt, AI recipe, and the green "AI learned" badge. This previews the demo before the demo.
3. "How it learns" strip — three steps mirror the next slide, for anyone who scrolls instead of clicking.
4. Single primary CTA "Start Planning →" — click it to transition into the demo.

Keep this under 30 seconds. Don't read the landing page; narrate what's visually obvious.
-->

---

## How it works

```
 ┌──────────────┐   image    ┌─────────────────┐
 │   Browser    │──────────▶│  Jac backend    │
 │ (HTML/JS UI) │   profile  │  (Jaseci)       │
 │              │◀──────────│                 │
 └──────────────┘  recipe    └────────┬────────┘
        ▲                             │
        │                             ▼
        │                     ┌─────────────────┐
        │    learned prefs    │  Qwen3-VL-32B   │
        └─────────────────────│  (OpenRouter)   │
                              └─────────────────┘
```

Jac backend handles auth, graph storage, AI proxying. Browser stays thin.

<!--
Speaker note (3:10 — 3:40):
One diagram. Don't walk through arrows one by one. Just say: "Browser talks to a Jac backend. Jac talks to Qwen3-VL. The backend stores your profile and meal history as a graph, one subgraph per user. JWT auth."
-->

---

## The learning loop

After every meal, we call the AI a second time:

> "Here's the profile. Here are their recent meals.
> Suggest **additive** updates based on patterns."

Additive-only. The AI can never delete what the user set.

Every learned field is tagged. The Profile page shows which preferences came from you, and which came from the AI.

<!--
Speaker note (3:40 — 4:15):
The novel part. Two things to drive home:
1. Additive-only = bad inferences can't erase a user's real preferences.
2. Provenance (ai_learned_fields) is what lets the UI honestly say "this came from you" vs "this came from the AI." Without it, a badge would be a lie.
-->

---

## Demo

### Watch for four things:

1. Real AI call. No cached responses.
2. Three Korean meals, no manual preferences typed.
3. A fourth generation with no cuisine hint still leans Korean.
4. Log out, log back in — the learned preferences are still there.

<!--
Speaker note (4:15 — 8:30):
Four-minute live demo. Follow docs/demo_plan.md segments A through E.

Before starting: switch to incognito browser window, have the backend terminal visible on the right side of the screen, have four food images ready on desktop.

Key moments to narrate during the demo:
- Segment A (first generation): "Notice the generating animation — that's a real API call, not a cached template."
- Segment B (after third Korean meal): "Watch the chat bubble — the backend just told me it learned cuisine preferences from my history. I never typed the word Korean."
- Segment C (fourth generation, cuisine-agnostic image): "I uploaded a plain bowl of rice and asked 'surprise me'. The recommendation still leans Korean because the profile is driving it now."
- Segment D (profile page): "Green pills next to Cuisine Preferences and Flavor Preferences — those are the AI-learned badge. If I'd manually set those, the badge wouldn't be there."
- Segment E (log out, log back in): "Fresh session. Same account. Still learned. That's persistence in the graph, not just localStorage."

If the demo breaks: have a pre-recorded 90-second backup clip ready. Say "Live demos are fragile — here's the same flow from last night." Don't fight it.
-->

---

## What you just saw

4 real AI calls. No cached responses.
0 preference fields typed by hand.
1 learned profile, surviving a full logout/login cycle.

<!--
Speaker note (8:30 — 8:50):
Recap as three numbers. Tie each to a demo moment: "Four generations, four OpenRouter round-trips you watched in the network tab. Zero fields filled out — the profile built itself. One graph, persisted server-side, same pills after re-login." Skip this slide if the demo ran long.
-->

---

## What was hard

### Cross-request visibility
Jac writes in one request weren't visible to queries in the next. Solution: pass the data explicitly.

### AI output reliability
Qwen3-VL sometimes emits broken JSON. Solution: four-layer fallback parser.

### The overwrite bug
First merge clobbered existing preferences. Caught in code review, not QA.

<!--
Speaker note (8:50 — 9:30):
Honest engineering story. The overwrite bug is the interesting one — we shipped it last week thinking it worked (empty-profile test users masked it), and only found it when a reviewer asked "what happens if cuisine_preferences isn't empty?" Fix was a case-insensitive union-dedupe in the backend plus a prompt change asking the model to return just new items.
-->

---

## What's next

Record a reproducible demo video for the submission package.

Add a "forget this preference" button so users can correct the AI's mistakes without having to manually reset the whole profile.

Explore whether the 2-week history window is the right size. Longer windows risk drowning out recent taste changes; shorter windows give the AI less to pattern-match on.

<!--
Speaker note (9:30 — 9:50):
Keep this short. The audience doesn't need a full roadmap. One completed milestone, one short-term item, one open research question.
-->

---

## Thanks

**Code:** github.com/ZhongYeah1/449proj
**Tech:** Jaseci · Jac · Qwen3-VL-32B · OpenRouter
**Contact:** yeszhong@umich.edu

Questions?

<!--
Speaker note (9:50 — 10:00):
End on this slide. If there's time left, take questions. If the demo ran over, skip directly here.

Likely audience questions and prepared answers:
- "Why Jaseci over Flask/FastAPI?" — Graph-native storage with per-user root isolation meant no ORM to write. JWT auth is built in. For a project with "user has a profile and meals" as the whole data model, Jac's walker/function routing saved a lot of boilerplate.
- "Why not fine-tune instead of prompt engineering?" — Fine-tuning Qwen3-VL-32B for a class project is both expensive and overkill. Prompt enrichment with meal history gave us the personalization we needed and is easier to debug.
- "What happens if the AI learns something wrong?" — Users can manually edit their profile; when they do, the field is removed from `ai_learned_fields` so the badge goes away. The AI can only add, never delete, so the blast radius of a bad inference is small.
- "How do you know the personalization is actually working?" — The end-to-end test we ran: user with ["Italian"] in cuisine_preferences plus 3 Korean meals. After evolve_profile, cuisine_preferences became ["Italian", "Korean"] and ai_learned_fields included "cuisine_preferences". Italian was preserved, Korean was learned, provenance was tracked.
-->
