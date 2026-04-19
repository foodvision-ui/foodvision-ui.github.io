"""
cal_calculator_fake.py
Fake calorie calculator — returns hard-coded nutrition data.
Replace the logic here with real model calls when ready.
"""

import random

# Fake food database: name -> (kcal_per_100g, carb_g, protein_g, fat_g)
FOOD_DB = {
    "white rice":    (130, 28.2, 2.7, 0.3),
    "braised pork":  (265, 0.0, 14.5, 22.0),
    "broccoli":      (34,  6.6,  2.8,  0.4),
    "cheese pizza":  (266, 33.0,  11.0, 10.0),
    "cola":          (42,  10.6,  0.0,  0.0),
    "caesar salad":  (120,  8.0,   5.0,  8.0),
    "whole wheat bread": (247, 43.0, 13.0, 4.2),
    "boiled egg":    (155,  1.1, 13.0, 11.0),
    "ramen":         (116, 16.0,  4.5,  3.7),
    "pan-fried dumpling": (200, 22.0, 8.0, 9.0),
}

FAKE_SCENES = [
    [("white rice", 180), ("braised pork", 120), ("broccoli", 80)],
    [("cheese pizza", 200), ("cola", 400)],
    [("caesar salad", 260), ("whole wheat bread", 60), ("boiled egg", 55)],
    [("ramen", 450), ("pan-fried dumpling", 120)],
]


def analyze_image(image_path: str) -> dict:
    """
    Fake image analysis.  In production, call a vision model here.

    Returns
    -------
    dict with keys:
        foods  : list of {name, weight_g, kcal, conf}
        total_kcal : int
        macros : {carb_g, protein_g, fat_g}
    """
    scene = random.choice(FAKE_SCENES)

    foods = []
    total_kcal = 0
    total_carb = total_protein = total_fat = 0.0

    for food_name, weight_g in scene:
        kcal_per_100, carb, protein, fat = FOOD_DB[food_name]
        scale   = weight_g / 100
        kcal    = round(kcal_per_100 * scale)
        foods.append({
            "name":     food_name,
            "weight_g": weight_g,
            "kcal":     kcal,
            "conf":     random.choice(["high", "high", "medium"]),
        })
        total_kcal    += kcal
        total_carb    += carb    * scale
        total_protein += protein * scale
        total_fat     += fat     * scale

    return {
        "image_path": image_path,
        "foods":      foods,
        "total_kcal": total_kcal,
        "macros": {
            "carb_g":    round(total_carb),
            "protein_g": round(total_protein),
            "fat_g":     round(total_fat),
        },
    }


if __name__ == "__main__":
    import json
    result = analyze_image("img_fake.img")
    print(json.dumps(result, indent=2, ensure_ascii=False))
