# FoodVision AI

A food recognition and meal planning web app powered by Qwen3-VL-32B and a Jac (Jaseci) backend.

## Features

- Upload food images for AI-powered recipe generation (Qwen3-VL-32B via OpenRouter)
- Real-time restaurant discovery in Ann Arbor (OpenStreetMap / Overpass API)
- Browser geolocation for distance-based sorting
- JWT authentication with persistent user profiles and meal history (Jac graph DB)

## Quick Start

### Prerequisites

- Python >= 3.12
- Jaseci installed: `pip install jaseci`

### 1. Start the backend

```bash
cd todo_app/backend
./start.sh 8000
```

This launches the Jac API server at `http://localhost:8000` with:
- `POST /user/register` / `/user/login` — auth (returns JWT)
- `POST /function/analyze_meal` — Qwen3-VL image analysis proxy
- `POST /function/get_profile` / `update_profile` — user profile (JWT required)
- `POST /function/save_meal` / `get_meals` — meal history (JWT required)

### 2. Serve the frontend

```bash
cd todo_app
python3 -m http.server 3000
```

### 3. Open in browser

Visit `http://localhost:3000`. Navigate to:
- **Planner** — upload a food photo, describe what you want, click Generate
- **Delivery** — browse real Ann Arbor restaurants (allow location for distance sorting)
- **Profile** — view/edit preferences (auto-populated from meal plans)

## Project Structure

```
todo_app/
  backend/
    main.jac       # Jac backend (API endpoints + graph data model)
    .env           # OpenRouter API key (server-side only)
    start.sh       # Startup script
  index.html       # Home page
  calories.html    # Meal planner (Qwen3-VL integration)
  delivery.html    # Restaurant discovery (OpenStreetMap)
  profile.html     # User profile & preferences
  food-login.html  # Login page
  auth.js          # Auth logic (JWT + session)
  database.js      # Restaurant data (Overpass API + geolocation)
  theme.css        # Design system
```
