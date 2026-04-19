# FoodVision AI — Full Demo Plan

This is an end-to-end demo script for the adaptive meal recommendation feature. It covers environment setup, the exact user flow to record, what to show on screen, fallback plans if something breaks live, and post-production notes for the submission video.

## 1. What the demo needs to prove

The submission video has to show four concrete claims, in this order of importance. Every step below exists to make one of these claims visible on camera.

1. The meal planner calls a real AI (Qwen3-VL-32B via OpenRouter) and produces a personalized plan from a food image plus a profile.
2. The AI is aware of the user's recent meal history — it avoids repeating recent dishes and notices cuisine patterns.
3. The backend evolves the user's profile from their meal history without the user typing preferences manually.
4. The learned preferences persist across sessions and are visibly attributed to the AI via an "AI learned" badge on the Profile page.

If the video shows all four of these in one uncut segment, the demo is complete. Anything else is supporting material.

## 2. Pre-flight checklist

Run through this before hitting record. Every item is a thing we've actually seen break.

Backend:
- `.env` contains a live `OPENROUTER_API_KEY`. A dead key returns HTTP 401 with `"User not found"` in the error body, which surfaces in the UI as a generic "Generation Failed" and ruins the recording. Test the key with `curl -s https://openrouter.ai/api/v1/models -H "Authorization: Bearer $KEY" | head -c 100` before starting.
- `jac start main.jac --port 8000` is running in a terminal that will stay visible on a second monitor. We want to glance at its stdout to confirm endpoint hits during the demo.
- The backend log should show `🚀 Server ready` and no tracebacks. Call `POST /function/health` once manually to confirm it returns `{"ok":true}`.

Frontend:
- Serve the `todo_app/` directory with a static server on `http://localhost:3000`. `python3 -m http.server 3000 --directory todo_app` works. `file://` URLs will break the `fetch` calls due to CORS.
- Open the site in a fresh incognito window. sessionStorage and localStorage need to be empty at the start, otherwise the "AI learned" badges from a previous run bleed into the video.
- Browser DevTools console open, Network tab visible, filtered on `localhost:8000`. Any evaluator who pauses the video can verify real HTTP traffic to the backend.

Recording:
- 1920x1080, 30fps, screen-only capture is enough. No webcam.
- Close Slack, mail, and notifications. Mute the OS.
- Pre-position two food images on the desktop: one Korean (bibimbap is ideal because it's visually obvious), one non-Korean (pasta or a salad for the contrast shot at the end).

## 3. Demo script (target length: 3 minutes)

The script below lists what happens, what to say (if narrating), and what to capture visually. Time stamps are approximate; do two dry runs before the real take.

### Segment A — Fresh user, first generation (00:00 — 00:40)

Register a new account by clicking Sign Up / Login and using credentials like `demo_20260418` / `demopass`. Land on the Planner page. Upload the Korean food image (bibimbap). In the prompt box type something open-ended like "What should I cook for dinner tonight?" — avoid the word "Korean" so the AI has to pick it up from the image alone. Click Generate.

On screen: the upload preview appears immediately, then the output panel shows a generating animation, then the structured result. Pause the video for half a second on the "Dish Name" field to make sure the viewer reads it. The backend terminal should show `analyze_meal` then `save_meal` log lines.

Narration point: "The AI just called Qwen3-VL with the image and returned a recipe. It also saved this meal to my history."

### Segment B — Second and third generations, same cuisine (00:40 — 01:40)

Without reloading the page, upload two more Korean images (kimchi jjigae, then Korean BBQ). For each, use a different open-ended prompt like "Something warm" and "Something for a group" — still no mention of cuisine. Generate each.

Between generations, briefly scroll to the top of the Planner page to show the meal chip count increasing if we have that UI, or just let the generations stack. The point is to build up three Korean meals in the user's graph.

After the third generation, the backend terminal should show `evolve_profile` firing and returning. Watch for the chat bubble text `"Profile updated (cuisine_preferences, flavor_preferences): learned from your meal patterns."` — this is the on-camera proof that the AI evolved the profile on its own.

### Segment C — Fourth generation, no cuisine hint (01:40 — 02:15)

Upload a neutral image (a plain bowl of rice, or a grocery bag). Prompt: "Surprise me." Generate. The output should lean Korean because the system prompt now includes the meal history summary, and the user's cuisine_preferences includes Korean (added by evolve_profile last time). Pause on the dish name to let the viewer read it.

Narration: "Notice I didn't say Korean anywhere, but the recommendation leaned Korean because it learned from the last three meals."

### Segment D — Profile page, AI learned badges (02:15 — 02:35)

Click the Profile tab. The food preferences card at the bottom should show green "AI learned" pills next to Cuisine Preferences and Flavor Preferences. Hover over the Korean tag to show it's persisted as a real value, not a hardcoded example.

### Segment E — Cross-session persistence (02:35 — 03:00)

Click Logout. Sign in again with the same demo credentials. Go straight to Profile. The "AI learned" badges are still there because the state lives in the Jac graph, not in localStorage alone. This segment is short but it's the most important one — it's the only one that proves persistence, not just in-session state.

Final narration: "Different session, same account, learned preferences are still attributed to the AI. That's the full loop."

## 4. Data to prepare in advance

Three to four food images are enough. Good picks and why:
- Bibimbap — colorful, obviously Korean to the model.
- Kimchi jjigae — red, hot, hits the "spicy" flavor signal.
- Korean BBQ — the word "Korean" often appears in the model's dish name, which makes the pattern obvious.
- Rice bowl or grocery bag — neutral image for segment C. If the fourth recommendation still leans Korean off a cuisine-agnostic image, the viewer sees the personalization working without any image-level shortcut.

Demo credentials: use a username with today's date like `demo_20260418`. Never reuse credentials across recordings — old profiles from previous takes will have stale `ai_learned_fields`.

## 5. What to capture on the terminal side

Keep the backend terminal partially visible (right-side strip, roughly 30% of screen width). The goal is for a viewer pausing the video to see:
- `POST /function/analyze_meal` lines during generation.
- `POST /function/save_meal` firing right after.
- `POST /function/evolve_profile` firing in the background after the meal is saved.
- 200 status codes on all of the above.

If the terminal is distracting visually, dim its colors but do not hide it entirely. The evaluator should be able to verify that a real backend is handling the requests.

## 6. Failure modes and how to recover on camera

These are the things most likely to go wrong live. Each has a mitigation.

OpenRouter returns 401 or 429. Happens when the key is dead or rate-limited. Mitigation: test the key 60 seconds before starting. If it dies mid-demo, stop the take and restart — do not try to edit around it.

`analyze_meal` returns malformed JSON. The four-layer fallback parser in `helpers.py` catches this silently and the UI still renders. If the regex fallback path fires, the dish name will be present but some nutrition fields may be empty. Acceptable on camera; no need to retake.

`evolve_profile` returns `{"evolved": false, "reason": "No new patterns detected"}`. This is the normal "model decided nothing new" path. It's fine during segments A and B, but if segment C also returns this, the profile won't have updated and segment D's badges will be missing. Mitigation: between generations, let the AI response actually finish saving before clicking Generate again. The default model temperature (0.3 for evolve) is deterministic enough that three identifiably Korean meals almost always produce a cuisine_preferences update.

Session storage carries over between takes. If you recorded a dry run, the browser already has a JWT and a populated profile. Mitigation: always open incognito for the real take.

Backend silent-dies. Unlikely, but possible if the OS OOM-kills the Jac process. Mitigation: have the terminal visible so you see the prompt come back. If it dies, stop the take.

## 7. Supporting artifacts for the submission

Beyond the video itself, the submission package should include:
- `docs/feature.md` — the feature writeup.
- `docs/specs/2026-04-08-adaptive-meal-recommendations-design.md` — the design doc.
- `weekly_snippets.txt` — the weekly progress entries covering both the initial build and this week's debug/validation pass.
- A short `README` section (or a dedicated `RUN.md`) with the three commands needed to reproduce: start Jac, start static server, open the page. No more than 10 lines.
- Optional: a curl transcript of the end-to-end test we already validated (the `Italian + 3 Korean meals → ["Italian", "Korean"]` result). Paste into an appendix as textual evidence.

## 8. Video post-production checklist

Keep edits minimal. Cuts between segments are fine; do not re-order events within a segment.
- Trim dead air at the start and end.
- Add a one-line text overlay at the top of each segment naming the step (`Fresh user`, `Three Korean meals`, `No cuisine hint`, `Profile page`, `New session`).
- Do not speed up the generation segments — the viewer needs to see the loading animation so they know it's a real API call, not a cached result.
- Target file size under 50MB if the submission system has an upload cap; use H.264 at 4-6 Mbps.

## 9. Dry-run plan

Do two full dry runs before the real take. The first is to catch environment issues (dead API key, CORS, stale localStorage). The second is to time the segments and rehearse the narration. Only then do the real take. If the first real take has any visible glitch, reset and redo it — do not try to edit it out, because most review committees check that the demo appears continuous.

Total prep time, excluding recording: about 30 minutes. Recording plus dry runs: about 40 minutes. Editing and upload: 20 minutes.
