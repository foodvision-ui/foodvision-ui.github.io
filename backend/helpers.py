"""Python helpers for the Jac backend (safe JSON parsing, etc.)."""

import json
import re


def as_list(v) -> list:
    """Coerce a possibly-stringified list value back into a real list.

    Jac's ShelfStorage occasionally returns class-default list values as the
    string "[]" when a field was declared with a default of `[]` and then
    never explicitly reassigned. This helper normalizes both that case and
    genuine lists.
    """
    if isinstance(v, list):
        return list(v)
    if isinstance(v, str):
        s = v.strip()
        if s in ("", "[]"):
            return []
        try:
            parsed = json.loads(s)
            if isinstance(parsed, list):
                return parsed
        except (ValueError, TypeError):
            pass
    return []


def safe_parse_json(text: str) -> dict:
    """Parse JSON from AI response, handling common issues."""
    if not text:
        return {"error": "Empty response"}

    cleaned = text.strip()

    # Strip markdown code fences
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)

    # Strip <think>...</think> tags
    cleaned = re.sub(r"<think>[\s\S]*?</think>", "", cleaned).strip()

    # Find the outermost JSON object
    match = re.search(r"\{[\s\S]*\}", cleaned)
    if not match:
        return {"error": "No JSON object found in response", "raw": text[:500]}

    json_str = match.group(0)

    # Attempt 1: direct parse
    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        pass

    # Attempt 2: fix trailing commas
    try:
        fixed = re.sub(r",\s*([}\]])", r"\1", json_str)
        return json.loads(fixed)
    except json.JSONDecodeError:
        pass

    # Attempt 3: fix unescaped newlines inside string values
    try:
        fixed = json_str.replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t")
        # But don't break structural newlines — re-fix them
        fixed = fixed.replace("\\n{", "\n{").replace("\\n}", "\n}")
        fixed = fixed.replace("\\n[", "\n[").replace("\\n]", "\n]")
        fixed = fixed.replace("\\n\"", "\n\"")
        fixed = re.sub(r",\s*([}\]])", r"\1", fixed)
        return json.loads(fixed)
    except json.JSONDecodeError:
        pass

    # Attempt 4: extract key fields manually with regex as last resort
    try:
        # analyze_meal response shape
        if re.search(r'"dish_name"\s*:\s*"([^"]*)"', json_str):
            return _extract_fields_regex(json_str)
        # evolve_profile response shape — flat dict of profile fields
        flat = _extract_flat_profile_regex(json_str)
        if flat:
            return flat
    except Exception:
        pass

    return {"error": "JSON parse error: could not fix malformed response", "raw": text[:500]}


def _extract_flat_profile_regex(s: str) -> dict:
    """Last-resort regex extraction for evolve_profile's flat dict shape."""
    list_keys = [
        "dietary_restrictions", "allergies", "cuisine_preferences",
        "flavor_preferences", "available_equipment", "nutritional_goals",
        "disliked_foods", "other_preferences",
    ]
    scalar_keys = ["cooking_skill_level"]

    out: dict = {}
    for key in list_keys:
        m = re.search(rf'"{key}"\s*:\s*\[(.*?)\]', s, re.DOTALL)
        if not m:
            continue
        items = re.findall(r'"((?:[^"\\]|\\.)*)"', m.group(1))
        if items:
            out[key] = items
    for key in scalar_keys:
        m = re.search(rf'"{key}"\s*:\s*"((?:[^"\\]|\\.)*)"', s)
        if m and m.group(1):
            out[key] = m.group(1)
    return out


def _extract_fields_regex(s: str) -> dict:
    """Last-resort regex extraction of key fields from broken JSON."""
    def extract_str(key):
        m = re.search(rf'"{key}"\s*:\s*"((?:[^"\\]|\\.)*)"', s)
        return m.group(1) if m else ""

    def extract_list(key):
        m = re.search(rf'"{key}"\s*:\s*\[(.*?)\]', s, re.DOTALL)
        if not m:
            return []
        items = re.findall(r'"((?:[^"\\]|\\.)*)"', m.group(1))
        return items

    return {
        "updated_user_profile": {
            "dietary_restrictions": extract_list("dietary_restrictions"),
            "allergies": extract_list("allergies"),
            "cuisine_preferences": extract_list("cuisine_preferences"),
            "flavor_preferences": extract_list("flavor_preferences"),
            "cooking_skill_level": extract_str("cooking_skill_level"),
            "available_equipment": extract_list("available_equipment"),
            "nutritional_goals": extract_list("nutritional_goals"),
            "disliked_foods": extract_list("disliked_foods"),
        },
        "recommendation": {
            "dish_name": extract_str("dish_name"),
            "reason_for_recommendation": extract_str("reason_for_recommendation"),
            "key_ingredients": extract_list("key_ingredients"),
            "substitutions": extract_list("substitutions"),
            "nutrition_analysis": {
                "estimated_daily_needs": {
                    "calories": extract_str("calories"),
                    "protein": extract_str("protein"),
                    "carbohydrates": extract_str("carbohydrates"),
                    "fat": extract_str("fat"),
                    "fiber": extract_str("fiber"),
                },
                "ingredient_nutrition_summary": extract_str("ingredient_nutrition_summary"),
                "nutritional_balance_assessment": extract_str("nutritional_balance_assessment"),
                "suggested_nutritional_improvements": extract_str("suggested_nutritional_improvements"),
            },
            "preparation_overview": extract_list("preparation_overview"),
        },
    }
