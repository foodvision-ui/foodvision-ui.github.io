# Feature: Adaptive Meal Recommendations

## What it does

The meal planner learns from your eating history. The more you use it, the better it understands your taste. It avoids repeating recent dishes, picks up on cuisine patterns, and updates your preference profile automatically.

## How it works

Two things happen every time you generate a meal plan:

### 1. History-aware prompting

Before calling the AI, the app fetches your meal history from the last 14 days. It builds a short summary — recent dish names, ingredients used, cuisine patterns — and includes it in the prompt alongside your profile. The AI sees something like:

```
Recent meals (last 14 days):
- 2026-04-06: Bibimbap (rice, gochujang, egg)
- 2026-04-04: Kimchi Jjigae (tofu, kimchi, pork)
- 2026-04-02: Korean BBQ (beef, rice, lettuce)
Cuisine patterns: korean x3
Total: 3 meals
```

This lets the AI reason about variety. If you've had Korean food three times this week, it might suggest something different — or double down if that's clearly what you prefer.

### 2. Profile evolution

After the meal plan is generated and saved, the backend calls the AI a second time (text-only, no image). This call analyzes your full meal history against your current profile and suggests updates. For example:

- You cooked Korean food 3 times but "Korean" wasn't in your cuisine preferences → it gets added
- You keep requesting spicy dishes but "spicy" wasn't in your flavor preferences → it gets added
- You always ask for meals under 30 minutes → "prefers quick meals" gets added to other preferences

These learned preferences show up on the Profile page with a green "AI learned" label so you can tell which ones were inferred vs. manually set. You can always override them by editing your profile.

## Technical details

### Backend

**New endpoint: `POST /function/evolve_profile`**

- Input: `current_profile` (dict) + `recent_meals` (list)
- Calls Qwen3-VL-32B via OpenRouter (text-only, no image)
- Prompt instructs the AI to suggest only additive changes supported by meal history patterns
- Returns `{evolved: true/false, changes: {...}, profile: {...}}`
- Token budget: ~400 input, ~200 output (cheap compared to the image analysis call)

**Updated: `POST /function/analyze_meal`**

- System prompt now includes: "If the user profile contains a meal_history_summary field, use it to avoid repeating recent dishes and to suggest variety while respecting their preferences."

### Frontend

**`calories.html` — before generation:**

1. Fetch meal history via `get_meals`
2. Filter to last 14 days
3. Build summary string with dish names, ingredients, cuisine pattern counts
4. Attach as `meal_history_summary` field in the profile dict sent to the backend

**`calories.html` — after generation:**

1. Call `save_meal` to persist the new meal entry
2. Fetch full meal history via `get_meals`
3. Call `evolve_profile` with the current profile and meal list
4. Merge any AI-suggested changes into the local profile
5. Save updated profile to localStorage

**`profile.html`:**

- Compares current profile against default values
- Fields that differ from defaults get a green "AI learned" badge
- Backend profile data is fetched on page load if the user is authenticated

### Data flow

```
Generate Meal Plan
       |
       v
  Fetch meal history (get_meals)
       |
       v
  Build history summary (last 14 days)
       |
       v
  Call analyze_meal (image + profile + history)
       |
       v
  Render result + save_meal
       |
       v
  Call evolve_profile (profile + all meals)
       |
       v
  Merge AI-suggested changes into local profile
       |
       v
  Profile page shows "AI learned" badges
```

### Edge cases

- **No meal history yet**: History injection and evolve_profile are both skipped. First-time users get the same experience as before.
- **Guest users without JWT**: get_meals and evolve_profile are skipped. Local keyword-based preference extraction still works.
- **evolve_profile fails**: Non-blocking. The meal plan was already generated and displayed. A console warning is logged but the UI is not affected.
- **AI suggests bad updates**: Users can manually edit their profile at any time. Learned preferences are additive — the AI never removes existing preferences.
