# FoodVision AI — 3-Minute Video Demo Plan

Total runtime: 180 seconds. Four scenes. Every action, click, and spoken line is mapped to a second.

## Preflight checklist (do before hitting record)

- Backend running: `cd todo_app/backend && jac serve main.jac --host 0.0.0.0 --port 8000` (stdout redirected to `backend.out`).
- Frontend running: `cd todo_app && python3 frontend_server.py 8080`.
- Both ports forwarded to local machine if demoing over SSH.
- Browser: Chrome, full-screen, one tab only, zoom at 100%.
- DevTools closed. Cookies and localStorage cleared: `localStorage.clear()` in console, then close DevTools.
- Fridge photo ready on disk: `~/demo_assets/fridge.jpg` (visible ingredients: tomatoes, pasta, eggs, cheese).
- Second photo: `~/demo_assets/leftovers.jpg` (rice, soy sauce bottle, scallions — primes a Korean/Asian suggestion that'll conflict with the cuisine we manually edit).
- Test account: `demo@foodvision.ai` / password `demoPass2026` (pre-registered but with empty prefs; no meal history).
- Qwen API key loaded in `.env`. Hit `curl -X POST localhost:8000/function/health` — confirm 200.
- Audio: close Slack, silence phone, test mic level once.

---

## Scene 1 — Hook + Sign In (00:00 – 00:25)

**Goal:** Land on the home page, sign in, arrive on the planner with a clean slate.

| Time | Action | Notes |
|------|--------|-------|
| 00:00 | Start screen recording. Browser is already on `http://localhost:8080/index.html`. | Topbar reads "Sign Up / Login". Session chip reads "Visitor (not signed in)". |
| 00:02 | Scroll is at top. Let the hero copy sit on screen for ~3 seconds while the voiceover opens. | Don't move the mouse. |
| 00:05 | Mouse moves to "Sign Up / Login" in the top right. Click. | Modal opens. |
| 00:08 | Type `demo@foodvision.ai` into the email field. Tab. Type `demoPass2026`. | Use a real keystroke, not paste — keystrokes look genuine on camera. |
| 00:14 | Click "Login with Email". | Modal shows "Signing in…" then "Login successful." then closes. |
| 00:18 | Land back on the home page. Topbar now reads "Logout". Session chip reads "Signed in — demo@foodvision.ai". | Pause 1 second so the viewer registers the state change. |
| 00:22 | Click the "Planner" link in the nav. | |
| 00:25 | On `/calories.html`. Empty state: no meals in history. | Scene 2 begins. |

---

## Scene 2 — First Meal, AI Learns (00:25 – 01:25)

**Goal:** Upload a fridge photo, get a recipe, show the profile page updating itself.

| Time | Action | Notes |
|------|--------|-------|
| 00:25 | Planner page is visible. Drop zone on the left, chat/result on the right. | |
| 00:28 | Click the upload zone (or drag `fridge.jpg` onto it). | Thumbnail appears. |
| 00:33 | Click in the message box. Type: `i like italian food, what can i make tonight`. | Short, casual, lowercase — sounds like a real user. |
| 00:40 | Click the "Generate" button. | The image is revealed in the result pane. "Generating…" skeleton animation. |
| 00:45 | Wait. The actual Qwen call takes roughly 15–25s. Keep the mouse still — do NOT narrate dead air; the voiceover explains the profile graph during this window. | If it exceeds 30s live, do a jump cut in the edit. |
| 01:10 | Recipe card renders: dish name, reason, ingredients, steps, macros. A "Profile updated" chip appears with the fields the AI added (cuisine_preferences + Italian, flavor_preferences + savory, etc.). | Hover the chip so the viewer sees the added items. |
| 01:15 | Scroll down briefly to show the nutrition grid. Scroll back up. | |
| 01:20 | Click "Profile" in the nav. | |
| 01:25 | `/profile.html` renders. Cuisine Preferences card has a green border and "AI learned" pill. Flavor Preferences has the same. | Scene 3. |

---

## Scene 3 — Manual Override (01:25 – 02:20)

**Goal:** Show the user correcting what the AI inferred, and saving it.

| Time | Action | Notes |
|------|--------|-------|
| 01:25 | Hover over the green "Cuisine Preferences" card. Point out the "AI learned" badge. | |
| 01:30 | Click the orange "✎ Edit preferences" button in the top-right of the preferences panel. | All cards flip into input mode. Save + Cancel appear. |
| 01:35 | Click into the Cuisine Preferences input. The value reads `Italian`. | |
| 01:38 | Select all, type `Japanese, Korean`. | The inline hint under the field reads "Your edits override the AI-inferred value." |
| 01:44 | Click into Allergies. Type `peanuts`. | First-hand user input, not inferred. |
| 01:50 | Change the Cooking Skill Level dropdown from `Intermediate` to `Advanced`. | |
| 01:55 | Click the orange "Save" button. | Status area flashes "Saving…" then "Preferences updated." |
| 02:00 | Cards re-render. Cuisine now shows `Japanese`, `Korean` as regular (orange) tags — the green border is gone, the "AI learned" pill is gone. Allergies shows `peanuts`. Skill level shows `Advanced`. | This is the money moment. Keep it on screen for 3 seconds. |
| 02:10 | Click "Planner" in the nav. | Scene 4. |
| 02:15 | Back on `/calories.html`. | |
| 02:20 | | Scene 4. |

---

## Scene 4 — Second Meal Uses Edited Profile (02:20 – 03:00)

**Goal:** Prove the manual edits actually flow into the next Qwen call.

| Time | Action | Notes |
|------|--------|-------|
| 02:20 | Drag `leftovers.jpg` onto the upload zone. | Picks up rice + scallions — the AI would naturally suggest Korean/Asian based on the image. |
| 02:24 | Type in the message box: `something quick for dinner`. | Deliberately leave out cuisine — we want the profile to do the work. |
| 02:30 | Click Generate. | |
| 02:32 | While it generates, briefly open DevTools (F12), Network tab, click the `/function/analyze_meal` request, switch to the Payload tab. The `user_profile` body contains `cuisine_preferences: ["Japanese", "Korean"]`, `allergies: ["peanuts"]`, `cooking_skill_level: "Advanced"`. | This is the proof. 4–5 seconds on screen. |
| 02:40 | Close DevTools. | |
| 02:45 | Result lands. Dish is Japanese or Korean (biased by the edited profile, not by the image alone). Recipe avoids peanuts. | |
| 02:52 | Cursor moves to nav. Click "Delivery" for one second so the viewer knows it exists. | Don't dwell — this is the wrap. |
| 02:55 | OSM restaurant grid visible. Location chip says "Your location: …". | |
| 02:58 | Cut back to home. | |
| 03:00 | Stop recording. | |

---

## Cuts, polish, and edit-room notes

- The Qwen call in Scene 2 is the one unpredictable gap. Film the full generation live once; if it runs over 25s, jump-cut from "Generating…" spinner to the rendered card.
- Highlight cursor: enable a cursor highlighter in the screen recorder so clicks are visible.
- Zoom-ins: when pointing at the "AI learned" pill (01:30) and the DevTools payload (02:32), crop into a 150% zoom for 2 seconds.
- Lower-third captions (optional): "Jac graph · per-user root", "Qwen3-VL-32B", "Edited prefs → next prompt".
- Outro card: a single frame — "FoodVision AI · jac + Qwen3-VL-32B" — 1 second over the last frame. No logo animation.

---

## Failure-mode rehearsal

- Login error → we demonstrate the fix: "Wrong password" now blocks the modal from closing. Don't do this in the real take; keep it for a B-roll cut.
- Qwen 502 / timeout → if the first call errors out, the backend returns an error string. Cut and retry, don't show it in the final.
- Stale JWT → if the demo account JWT has expired, re-login before recording. `FoodAuth.ready()` has a 5s timeout; rehearse the login sequence twice to warm it up.
