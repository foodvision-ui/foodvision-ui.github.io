# Adaptive Meal Recommendations

## Goal

Make the meal planner smarter over time by learning from the user's meal history. Two mechanisms: (1) inject recent meal context into the AI prompt so recommendations account for variety and patterns, (2) evolve the user profile automatically based on observed behavior.

## Architecture

```
User clicks "Generate Meal Plan"
  |
  v
[Frontend: fetch get_meals, filter to last 14 days]
  |
  v
[Frontend: build history summary, attach to user_profile dict]
  |
  v
[Backend: analyze_meal] --> Qwen3-VL sees image + profile + history
  |
  v
[Frontend: render result, call save_meal]
  |
  v
[Backend: evolve_profile] --> Qwen3-VL (text-only, no image)
  |                           reads meal history + current profile
  |                           returns suggested profile updates
  v
[Frontend: update local userProfile from response]
```

## Changes

### Backend: `main.jac`

New endpoint `evolve_profile` (`def:priv`, requires JWT):

- Input: none (reads from the user's own graph)
- Logic:
  1. Fetch all MealEntry nodes from the user's graph
  2. Filter to entries where `created_at` is within the last 14 days
  3. Fetch the user's current UserProfile
  4. Call Qwen3-VL (text-only, no image) with a prompt like:
     ```
     Given this user's meal history from the past 2 weeks and their current
     profile, suggest updates to their profile fields. Only suggest changes
     that are clearly supported by the data. Return JSON with only the fields
     that should change.
     
     Current profile: {profile_json}
     Recent meals: {meals_summary}
     ```
  5. Parse the AI response and merge non-empty fields into the UserProfile node
  6. Return the updated profile
- Model: `qwen/qwen3-vl-32b-instruct` (same model, text-only call — no image in messages)
- Token budget: ~200 in, ~200 out

### Frontend: `calories.html`

**Before calling analyze_meal (in the generate button handler):**

1. If JWT exists, call `get_meals`
2. Filter meals to those with `created_at` within the last 14 days
3. Build a summary string from the filtered meals:
   ```
   Recent meals (last 14 days):
   - 2026-04-06: Pad Thai (Thai, key: rice noodles, shrimp)
   - 2026-04-04: Bibimbap (Korean, key: rice, egg, gochujang)
   - 2026-04-02: Pasta Carbonara (Italian, key: pasta, egg, pancetta)
   Patterns: 3 Asian dishes, avg 1 meal every 2 days, no repeated dishes
   ```
4. Attach this summary as a `meal_history_summary` field in the `user_profile` dict sent to the backend
5. Update the system prompt in `analyze_meal` (backend) to include: "Consider the user's recent meal history when making recommendations. Avoid repeating recent dishes. Suggest variety while respecting their preferences."

**After successful generation:**

1. Call `save_meal` with the recommendation data (already exists)
2. Call `evolve_profile` (new)
3. If evolve_profile returns updated fields, merge them into the local `userProfile` object
4. Re-save to localStorage so the profile page reflects changes

### Frontend: `profile.html`

- In the food preferences section, add a small "(learned)" label next to preference values that differ from the default/empty state and were not manually set
- Implementation: compare current profile against a "base" profile (the initial defaults). Any field that has values but wasn't explicitly edited by the user on this page gets the label.

## Data flow

```
UserProfile node (Jac graph)
  - Manual edits from profile.html
  - AI-driven updates from evolve_profile
  - Keyword extraction from calories.html (existing)

MealEntry nodes (Jac graph)
  - Created by save_meal after each generation
  - Read by evolve_profile for pattern analysis
  - Read by frontend for history summary injection
```

## What stays the same

- `analyze_meal` endpoint signature (already accepts arbitrary dict as user_profile)
- Auth flow, restaurant/delivery page, login page
- Keyword-based preference extraction in calories.html (fast local fallback)
- The existing userProfile defaults

## Token budget per generation

| Component | Input tokens | Output tokens |
|-----------|-------------|---------------|
| analyze_meal (image + profile + history) | ~1500 + image | ~2000 |
| evolve_profile (text-only) | ~400 | ~200 |
| Total overhead from personalization | ~700 extra | ~200 extra |

14 meals at ~40 tokens each = ~560 tokens for the history summary. Fits comfortably within the 4096 max_tokens budget.

## Edge cases

- **No meal history yet**: Skip history injection, skip evolve_profile call. First-time users get the same experience as before.
- **Guest users without JWT**: Skip get_meals and evolve_profile. The keyword-based local extraction still works.
- **evolve_profile fails**: Non-blocking. The meal plan was already generated and saved. Log the error, don't break the UI.
- **AI suggests bad profile updates**: The user can always manually edit their profile on profile.html. Learned preferences are additive, not destructive (we merge, not replace).
