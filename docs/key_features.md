# FoodVision AI — Key Features

## AI-driven recipe generation
- Photo-to-recipe via **Qwen3-VL-32B** (OpenRouter) — ingredients inferred from an uploaded fridge/meal image.
- Structured output: dish name, reasoning, key ingredients, substitutions, nutrition breakdown, ordered prep steps.
- Prompt is enriched with the user's current profile *and* a summary of their last 14 days of meals.

## Adaptive profile (the novel part)
- After each meal, a second AI pass (`evolve_profile`) reads the meal history and suggests profile updates.
- **Additive-only merge**: the AI can add, never delete. User-set fields are never clobbered.
- **Case-insensitive union-dedupe** for list fields (cuisine, flavor, allergies, equipment, goals, dislikes).
- **Provenance tracking** via `ai_learned_fields` — each AI-added field is flagged so the UI can show an "AI learned" badge honestly.
- Manual edit removes the field from `ai_learned_fields`, so the badge disappears when a user overrides.

## Cross-session persistence
- Jac graph storage (per-user root isolation) keeps profile, meals, and provenance server-side.
- Log out → log back in → learned preferences and badges are still there.

## Auth
- JWT-based, built into Jaseci.
- Three sign-in modes surfaced in the UI: email, phone, and guest.
- All user-scoped endpoints are `def:priv` and reject unauth'd calls with 401.

## Backend endpoints (Jac walkers)
- `register`, `login` — account + JWT issuance.
- `get_profile`, `update_profile` — authoritative profile state; manual edits strip AI provenance.
- `save_meal`, `get_meals` — append-only meal log, sorted by `created_at`.
- `evolve_profile` — text-only AI merge of history into profile (auth required).
- `analyze_meal` — server-side proxy to Qwen3-VL (keeps API key off the client).
- `health` — liveness probe.

## Reliability
- **Four-layer JSON fallback parser** in `helpers.py`: direct parse → trailing-comma fix → newline-escape fix → regex extraction. Handles both `analyze_meal` (nested) and `evolve_profile` (flat) shapes.
- Empty-history short-circuit — no AI call when there's nothing to learn from.
- Backend-owned merge logic; the frontend is a thin mirror of server state.

## Frontend — Landing page (`index.html`)
- Editorial hero ("It's 7pm. You open the fridge.") with a recipe-card preview mock.
- 4-number metric strip (14d memory, 0 fields typed, +∞ additive, 1× real AI call).
- Three-step "How it learns" explainer.
- Single primary CTA into the Planner.

## Frontend — Meal Planner (`calories.html`)
- Drag-and-drop image upload with instant preview.
- Prompt box with open-ended natural-language input.
- Real-time generating animation (spinner + skeleton lines) while the AI is working.
- Structured output panel: updated profile, recipe card, nutrition grid, prep steps.
- Non-blocking background calls to `save_meal` and `evolve_profile` after each generation.

## Frontend — Profile (`profile.html`)
- Identity card with session and last-saved metadata.
- Editable display name / email / habits fields (persisted to backend + localStorage).
- 8 preference cards: dietary restrictions, allergies, cuisine, flavor, cooking skill, equipment, nutritional goals, dislikes.
- Green-bordered cards + "AI learned" pill for fields with AI provenance.

## Frontend — Delivery Hub (`delivery.html`)
- Live Ann Arbor restaurant list via **OpenStreetMap Overpass API** with a static fallback.
- GPS-based distance sorting when the user grants location permission.
- Filters: cuisine, fast-delivery, popular, free-text search over name/address/category.
- Source badge shows Live vs. Cached vs. Fallback origin.

## Presentation assets
- `docs/slides.html` — single-file HTML slideshow (13 slides, keyboard nav, speaker notes, print CSS).
- `docs/slides_hifi.pptx` — screenshot-faithful PPTX (fade transitions, image fade-in).
- `docs/slides_native.pptx` — editable native PPTX rebuilt with python-pptx.
- `docs/demo_plan.md` — end-to-end demo script with pre-flight checklist and failure-mode recovery.

## Tech stack
- **Backend**: Jaseci / Jac, graph-native storage, JWT auth.
- **AI**: Qwen3-VL-32B via OpenRouter (vision + text passes).
- **Frontend**: plain HTML/CSS/JS, no framework, Google Fonts (Outfit + JetBrains Mono).
- **External data**: OpenStreetMap Overpass API for restaurants.
