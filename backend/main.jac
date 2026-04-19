"""FoodVision AI Backend - Jac powered.

Endpoints:
  POST /function/health          - Health check (public)
  POST /function/analyze_meal    - Qwen3-VL proxy (public)
  POST /user/register            - Register (built-in)
  POST /user/login               - Login (built-in)
  POST /function/get_profile     - Get user profile (auth required)
  POST /function/update_profile  - Update user profile (auth required)
  POST /function/save_meal       - Save meal entry (auth required)
  POST /function/get_meals       - Get meal history (auth required)
  POST /function/evolve_profile  - AI-driven profile evolution (auth required)
"""

import from dotenv { load_dotenv }
import from os { getenv }
import from requests { post as http_post }
import from json { dumps as json_dumps }
import from datetime { datetime as dt_cls }
import from helpers { safe_parse_json }




# ── Data Model (Graph Nodes) ──────────────────────────────────

node UserProfile {
    has dietary_restrictions: list = [],
        allergies: list = [],
        cuisine_preferences: list = [],
        flavor_preferences: list = [],
        cooking_skill_level: str = "Intermediate",
        available_equipment: list = [],
        nutritional_goals: list = [],
        disliked_foods: list = [],
        other_preferences: list = [],
        display_name: str = "",
        habits: str = "",
        ai_learned_fields: list = [],
        updated_at: str = "";
}

node MealEntry {
    has dish_name: str = "",
        reason: str = "",
        key_ingredients: list = [],
        substitutions: list = [],
        nutrition_analysis: dict = {},
        preparation_overview: list = [],
        user_message: str = "",
        created_at: str = "";
}


# ── Public Endpoints ──────────────────────────────────────────

"""Health check."""
def:pub health() -> dict {
    return {"status": "ok", "service": "FoodVision AI Backend"};
}

"""Analyze a food image using Qwen3-VL-32B via OpenRouter (public, no auth needed)."""
def:pub analyze_meal(image_base64: str = "", message: str = "", user_profile: dict = {}) -> dict {
    load_dotenv();
    api_key = getenv("OPENROUTER_API_KEY", "");

    system_prompt = "\n".join([
        "You are a food and nutrition AI. Respond with ONLY valid JSON. No markdown, no code fences, no explanation, no thinking.",
        "Use this exact JSON structure:",
        "{",
        '  "updated_user_profile": {',
        '    "dietary_restrictions": ["string"],',
        '    "allergies": ["string"],',
        '    "cuisine_preferences": ["string"],',
        '    "flavor_preferences": ["string"],',
        '    "cooking_skill_level": "string",',
        '    "available_equipment": ["string"],',
        '    "nutritional_goals": ["string"],',
        '    "disliked_foods": ["string"]',
        "  },",
        '  "recommendation": {',
        '    "dish_name": "string",',
        '    "reason_for_recommendation": "string (keep short, 1-2 sentences)",',
        '    "key_ingredients": ["string"],',
        '    "substitutions": ["string"],',
        '    "nutrition_analysis": {',
        '      "estimated_daily_needs": {"calories": "string", "protein": "string", "carbohydrates": "string", "fat": "string", "fiber": "string"},',
        '      "ingredient_nutrition_summary": "string (1-2 sentences)",',
        '      "nutritional_balance_assessment": "string (1-2 sentences)",',
        '      "suggested_nutritional_improvements": "string (1-2 sentences)"',
        "    },",
        '    "preparation_overview": ["Step 1: ...", "Step 2: ..."]',
        "  }",
        "}",
        "",
        "Rules:",
        "- All string values must use double quotes and must NOT contain unescaped quotes or newlines inside them.",
        "- Keep text values short. No long paragraphs.",
        "- Do NOT include any text before or after the JSON.",
        "",
        "Current user profile: " + json_dumps(user_profile),
        "If the profile contains meal_history_summary, avoid repeating recent dishes."
    ]);

    user_msg = message if message else "Analyze this food image and suggest a recipe based on what you see and my preferences.";

    messages = [
        {"role": "system", "content": system_prompt},
        {
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": image_base64}},
                {"type": "text", "text": user_msg}
            ]
        }
    ];

    resp = http_post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": "Bearer " + api_key,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://foodvision-ai.app",
            "X-OpenRouter-Title": "FoodVision AI"
        },
        json={
            "model": "qwen/qwen3-vl-32b-instruct",
            "messages": messages,
            "max_tokens": 4096,
            "temperature": 0.7
        },
        timeout=120
    );

    resp_json = resp.json();
    if resp.status_code != 200 {
        return {"error": "OpenRouter API error " + str(resp.status_code), "detail": str(resp_json)};
    }

    content = str(resp_json["choices"][0]["message"]["content"]);
    return safe_parse_json(content);
}


# ── Private Endpoints (require JWT auth) ──────────────────────

"""Get the current user's profile."""
def:priv get_profile() -> dict {
    profiles = [root()-->][?:UserProfile];
    if not profiles {
        root() ++> UserProfile();
        profiles = [root()-->][?:UserProfile];
    }
    p = profiles[0];
    return {
        "display_name": p.display_name,
        "habits": p.habits,
        "dietary_restrictions": p.dietary_restrictions,
        "allergies": p.allergies,
        "cuisine_preferences": p.cuisine_preferences,
        "flavor_preferences": p.flavor_preferences,
        "cooking_skill_level": p.cooking_skill_level,
        "available_equipment": p.available_equipment,
        "nutritional_goals": p.nutritional_goals,
        "disliked_foods": p.disliked_foods,
        "other_preferences": p.other_preferences,
        "ai_learned_fields": p.ai_learned_fields,
        "updated_at": p.updated_at
    };
}

"""Update the current user's profile."""
def:priv update_profile(
    display_name: str = "",
    habits: str = "",
    dietary_restrictions: list = [],
    allergies: list = [],
    cuisine_preferences: list = [],
    flavor_preferences: list = [],
    cooking_skill_level: str = "",
    available_equipment: list = [],
    nutritional_goals: list = [],
    disliked_foods: list = [],
    other_preferences: list = []
) -> dict {
    profiles = [root()-->][?:UserProfile];
    if not profiles {
        root() ++> UserProfile();
        profiles = [root()-->][?:UserProfile];
    }
    p = profiles[0];
    # A manual update by the user overrides AI-learned provenance for that field.
    learned: list = list(p.ai_learned_fields);
    if display_name { p.display_name = display_name; }
    if habits { p.habits = habits; }
    if dietary_restrictions {
        p.dietary_restrictions = dietary_restrictions;
        if "dietary_restrictions" in learned { learned.remove("dietary_restrictions"); }
    }
    if allergies {
        p.allergies = allergies;
        if "allergies" in learned { learned.remove("allergies"); }
    }
    if cuisine_preferences {
        p.cuisine_preferences = cuisine_preferences;
        if "cuisine_preferences" in learned { learned.remove("cuisine_preferences"); }
    }
    if flavor_preferences {
        p.flavor_preferences = flavor_preferences;
        if "flavor_preferences" in learned { learned.remove("flavor_preferences"); }
    }
    if cooking_skill_level {
        p.cooking_skill_level = cooking_skill_level;
        if "cooking_skill_level" in learned { learned.remove("cooking_skill_level"); }
    }
    if available_equipment {
        p.available_equipment = available_equipment;
        if "available_equipment" in learned { learned.remove("available_equipment"); }
    }
    if nutritional_goals {
        p.nutritional_goals = nutritional_goals;
        if "nutritional_goals" in learned { learned.remove("nutritional_goals"); }
    }
    if disliked_foods {
        p.disliked_foods = disliked_foods;
        if "disliked_foods" in learned { learned.remove("disliked_foods"); }
    }
    if other_preferences {
        p.other_preferences = other_preferences;
        if "other_preferences" in learned { learned.remove("other_preferences"); }
    }
    p.ai_learned_fields = learned;
    p.updated_at = str(dt_cls.now());
    return {"success": True, "updated_at": p.updated_at};
}

"""Save a meal entry for the current user."""
def:priv save_meal(
    dish_name: str = "",
    reason: str = "",
    key_ingredients: list = [],
    substitutions: list = [],
    nutrition_analysis: dict = {},
    preparation_overview: list = [],
    user_message: str = ""
) -> dict {
    ts = str(dt_cls.now());
    meal = MealEntry(
        dish_name=dish_name,
        reason=reason,
        key_ingredients=key_ingredients,
        substitutions=substitutions,
        nutrition_analysis=nutrition_analysis,
        preparation_overview=preparation_overview,
        user_message=user_message,
        created_at=ts
    );
    root() ++> meal;
    return {"success": True, "created_at": ts};
}

"""Get all meal entries for the current user."""
def:priv get_meals() -> list {
    meals = [root()-->][?:MealEntry];
    result: list = [];
    for m in meals {
        result.append({
            "dish_name": m.dish_name,
            "reason": m.reason,
            "key_ingredients": m.key_ingredients,
            "substitutions": m.substitutions,
            "nutrition_analysis": m.nutrition_analysis,
            "preparation_overview": m.preparation_overview,
            "user_message": m.user_message,
            "created_at": m.created_at
        });
    }
    return result;
}


"""Evolve user profile based on meal history patterns (AI-driven).
Auth-required. Accepts current_profile and recent_meals as input (client sends these
because Jac ShelfStorage does not make data written in one request visible to graph
queries in another request)."""
def:priv evolve_profile(current_profile: dict = {}, recent_meals: list = []) -> dict {
    load_dotenv();
    api_key = getenv("OPENROUTER_API_KEY", "");

    if not recent_meals {
        return {"evolved": False, "reason": "No recent meals provided"};
    }

    recent = recent_meals;
    # Sort by created_at so the last-N slice is the most recent meals
    sorted_meals = sorted(recent, key=lambda m: m.get("created_at", ""));
    if len(sorted_meals) > 20 {
        sorted_meals = sorted_meals[-20:];
    }

    prompt = "\n".join([
        "You are analyzing a user's meal history to update their food preference profile.",
        "Look at their recent meals and current profile. Suggest updates ONLY for fields where",
        "the meal history clearly shows a pattern not yet reflected in the profile.",
        "For example: if they cooked Korean food 3 times but Korean is not in cuisine_preferences, add it.",
        "If they always request quick meals but other_preferences has no time note, add one.",
        "Do NOT remove existing preferences. Only ADD or update.",
        "For list fields, return ONLY the NEW items to add (not the full list).",
        "",
        "Current profile: " + json_dumps(current_profile),
        "Recent meals: " + json_dumps(sorted_meals),
        "",
        "Return ONLY a JSON object with the fields that should change. Example:",
        '{"cuisine_preferences": ["Korean"], "other_preferences": ["prefers quick meals"]}',
        "If no changes needed, return: {}",
        "IMPORTANT: Return ONLY the JSON object, nothing else."
    ]);

    resp = http_post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": "Bearer " + api_key,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://foodvision-ai.app",
            "X-OpenRouter-Title": "FoodVision AI"
        },
        json={
            "model": "qwen/qwen3-vl-32b-instruct",
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 512,
            "temperature": 0.3
        },
        timeout=60
    );

    resp_json = resp.json();
    if resp.status_code != 200 {
        return {"evolved": False, "reason": "AI call failed: " + str(resp.status_code)};
    }

    content = str(resp_json["choices"][0]["message"]["content"]);
    updates = safe_parse_json(content);
    if updates.get("error") {
        return {"evolved": False, "reason": "Parse error: " + str(updates.get("error"))};
    }
    if not updates {
        return {"evolved": False, "reason": "No profile changes needed"};
    }

    # Additive-only merge: union-dedupe for list fields; only fill scalars if empty.
    # Track which fields were changed for provenance ("AI learned" badge).
    list_fields = [
        "dietary_restrictions", "allergies", "cuisine_preferences",
        "flavor_preferences", "available_equipment", "nutritional_goals",
        "disliked_foods", "other_preferences"
    ];
    scalar_fields = ["cooking_skill_level"];

    merged = dict(current_profile);
    learned_fields: list = list(current_profile.get("ai_learned_fields", []));
    actual_changes: dict = {};

    for k in updates {
        new_val = updates[k];
        if k in list_fields {
            if not isinstance(new_val, list) {
                continue;
            }
            existing = list(merged.get(k, []));
            existing_lower = [str(x).lower() for x in existing];
            added: list = [];
            for item in new_val {
                if str(item).lower() not in existing_lower {
                    existing.append(item);
                    existing_lower.append(str(item).lower());
                    added.append(item);
                }
            }
            if added {
                merged[k] = existing;
                actual_changes[k] = added;
                if k not in learned_fields {
                    learned_fields.append(k);
                }
            }
        } elif k in scalar_fields {
            current_val = merged.get(k, "");
            if new_val and not current_val {
                merged[k] = new_val;
                actual_changes[k] = new_val;
                if k not in learned_fields {
                    learned_fields.append(k);
                }
            }
        }
    }

    merged["ai_learned_fields"] = learned_fields;

    if not actual_changes {
        return {"evolved": False, "reason": "No new patterns detected"};
    }

    # Persist merged profile + provenance to the graph (explicit assignment; no setattr)
    profiles = [root()-->][?:UserProfile];
    if not profiles {
        root() ++> UserProfile();
        profiles = [root()-->][?:UserProfile];
    }
    p = profiles[0];
    if "dietary_restrictions" in merged { p.dietary_restrictions = merged["dietary_restrictions"]; }
    if "allergies" in merged { p.allergies = merged["allergies"]; }
    if "cuisine_preferences" in merged { p.cuisine_preferences = merged["cuisine_preferences"]; }
    if "flavor_preferences" in merged { p.flavor_preferences = merged["flavor_preferences"]; }
    if "available_equipment" in merged { p.available_equipment = merged["available_equipment"]; }
    if "nutritional_goals" in merged { p.nutritional_goals = merged["nutritional_goals"]; }
    if "disliked_foods" in merged { p.disliked_foods = merged["disliked_foods"]; }
    if "other_preferences" in merged { p.other_preferences = merged["other_preferences"]; }
    if merged.get("cooking_skill_level") { p.cooking_skill_level = merged["cooking_skill_level"]; }
    p.ai_learned_fields = learned_fields;
    p.updated_at = str(dt_cls.now());

    return {
        "evolved": True,
        "changes": actual_changes,
        "learned_fields": learned_fields,
        "profile": merged
    };
}
