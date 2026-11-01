"""
Risk Engine — Classifies weather conditions into risk levels
and recommends the best route according to the assessment specification.

Risk levels (numeric + label):
  0 = Low
  1 = Moderate
  2 = High
  3 = Severe
  4 = No Travel
"""

from __future__ import annotations
from typing import TypedDict, List, Dict, Any

RISK_LABELS = {0: "Low", 1: "Moderate", 2: "High", 3: "Severe", 4: "No Travel"}
RISK_COLORS = {
    0: "#22c55e",   # green
    1: "#eab308",   # yellow
    2: "#f97316",   # orange
    3: "#ef4444",   # red
    4: "#7c3aed",   # purple
}


def wind_risk(wind_mph: float) -> int:
    """
    Classify wind speed risk (before load adjustments).
      <25 mph   -> Low (0)
      25–34 mph -> Moderate (1)
      35–44 mph -> High (2)
      45–54 mph -> Severe (3)
      ≥55 mph   -> No Travel (4)
    """
    if wind_mph < 25:
        return 0
    if wind_mph < 35:
        return 1
    if wind_mph < 45:
        return 2
    if wind_mph < 55:
        return 3
    return 4


def rain_risk(rain_in_per_hr: float) -> int:
    """
    Classify rain intensity risk.
      <0.10 in/hr     -> Low (0)
      0.10–0.25 in/hr -> Moderate (1)
      0.25–0.50 in/hr -> High (2)
      0.50–1.00 in/hr -> Severe (3)
      >1.00 in/hr     -> No Travel (4)
    """
    if rain_in_per_hr < 0.10:
        return 0
    if rain_in_per_hr <= 0.25:
        return 1
    if rain_in_per_hr <= 0.50:
        return 2
    if rain_in_per_hr <= 1.00:
        return 3
    return 4


def snow_risk(snow_in_per_hr: float) -> int:
    """
    Classify snow intensity risk.
      <0.5 in/hr     -> Low (0)
      0.5–1.0 in/hr  -> Moderate (1)
      1.0–2.0 in/hr  -> High (2)
      2.0–3.0 in/hr  -> Severe (3)
      >3.0 in/hr     -> No Travel (4)
    """
    if snow_in_per_hr < 0.5:
        return 0
    if snow_in_per_hr <= 1.0:
        return 1
    if snow_in_per_hr <= 2.0:
        return 2
    if snow_in_per_hr <= 3.0:
        return 3
    return 4


def apply_load_rules(wind_mph: float, base_wind_risk: int, load_lb: float) -> tuple[int, list[str]]:
    """
    Apply load-weight modifiers to wind risk:
      • ≥55 mph → No Travel for any load
      • 45–54 mph + >30,000 lb → No Travel
      • 35–44 mph + >40,000 lb → Severe (minimum risk level 3)
    Returns:
      (adjusted_risk, reasons_list)
    """
    reasons = []
    risk = base_wind_risk

    if wind_mph >= 55:
        risk = 4
        reasons.append(f"Wind {wind_mph:.1f} mph exceeds 55 mph threshold: No Travel for any load")
    elif 45 <= wind_mph < 55:
        if load_lb > 30_000:
            risk = 4
            reasons.append(
                f"Wind {wind_mph:.1f} mph + heavy load ({load_lb:,.0f} lb > 30,000 lb) escalated to No Travel"
            )
        else:
            risk = max(risk, 3)
    elif 35 <= wind_mph < 45:
        if load_lb > 40_000:
            risk = max(risk, 3)
            reasons.append(
                f"Wind {wind_mph:.1f} mph + very heavy load ({load_lb:,.0f} lb > 40,000 lb) escalated to Severe"
            )

    return risk, reasons


def checkpoint_risk(
    wind_mph: float,
    rain_mm_per_hr: float,
    snow_mm_per_hr: float,
    load_lb: float,
) -> dict[str, Any]:
    """
    Compute comprehensive weather and load risk for a single checkpoint.
    Converts mm/hr -> inches/hr (1 in = 25.4 mm).
    """
    rain_in_per_hr = rain_mm_per_hr / 25.4
    snow_in_per_hr = snow_mm_per_hr / 25.4

    base_w_risk = wind_risk(wind_mph)
    w_risk, load_reasons = apply_load_rules(wind_mph, base_w_risk, load_lb)
    r_risk = rain_risk(rain_in_per_hr)
    s_risk = snow_risk(snow_in_per_hr)

    composite_score = max(w_risk, r_risk, s_risk)
    label = RISK_LABELS[composite_score]
    color = RISK_COLORS[composite_score]

    # Detailed factors that contributed to composite score
    driving_factors = []
    if composite_score > 0:
        if w_risk == composite_score:
            driving_factors.append(f"Wind ({wind_mph:.1f} mph -> {RISK_LABELS[w_risk]})")
        if r_risk == composite_score:
            driving_factors.append(f"Rain ({rain_in_per_hr:.2f} in/hr -> {RISK_LABELS[r_risk]})")
        if s_risk == composite_score:
            driving_factors.append(f"Snow ({snow_in_per_hr:.2f} in/hr -> {RISK_LABELS[s_risk]})")

    return {
        "wind_risk": w_risk,
        "rain_risk": r_risk,
        "snow_risk": s_risk,
        "rain_in_per_hr": round(rain_in_per_hr, 3),
        "snow_in_per_hr": round(snow_in_per_hr, 3),
        "risk_score": composite_score,
        "risk_label": label,
        "risk_color": color,
        "load_warnings": load_reasons,
        "driving_factors": driving_factors,
    }


def score_route(checkpoints: list[dict[str, Any]], interval_miles: float = 25.0) -> dict[str, Any]:
    """
    Aggregate checkpoint risks into miles and summary metrics.
    Computes exact miles per risk level using segment distances.
    """
    if not checkpoints:
        return {
            "no_travel_miles": 0.0,
            "severe_miles": 0.0,
            "high_miles": 0.0,
            "moderate_miles": 0.0,
            "low_miles": 0.0,
            "no_travel_count": 0,
            "severe_count": 0,
            "high_count": 0,
            "moderate_count": 0,
            "low_count": 0,
            "avg_risk_score": 0.0,
            "max_risk_score": 0,
            "max_risk_label": "Low",
        }

    miles_by_label = {label: 0.0 for label in RISK_LABELS.values()}
    counts_by_label = {label: 0 for label in RISK_LABELS.values()}
    total_score = 0.0
    max_risk = 0

    # Calculate segment miles represented by each checkpoint
    num_cp = len(checkpoints)
    for i, cp in enumerate(checkpoints):
        label = cp.get("risk_label", "Low")
        score = cp.get("risk_score", 0)
        counts_by_label[label] += 1
        total_score += score
        if score > max_risk:
            max_risk = score

        # Compute segment length for this checkpoint
        if num_cp == 1:
            seg_miles = interval_miles
        elif i == 0:
            seg_miles = (checkpoints[1]["distance_miles"] - cp["distance_miles"]) / 2.0
        elif i == num_cp - 1:
            seg_miles = (cp["distance_miles"] - checkpoints[i - 1]["distance_miles"]) / 2.0
        else:
            prev_d = checkpoints[i - 1]["distance_miles"]
            next_d = checkpoints[i + 1]["distance_miles"]
            seg_miles = (next_d - prev_d) / 2.0

        miles_by_label[label] += max(seg_miles, 0.0)

    avg_score = total_score / num_cp

    return {
        "no_travel_miles": round(miles_by_label["No Travel"], 1),
        "severe_miles": round(miles_by_label["Severe"], 1),
        "high_miles": round(miles_by_label["High"], 1),
        "moderate_miles": round(miles_by_label["Moderate"], 1),
        "low_miles": round(miles_by_label["Low"], 1),
        "no_travel_count": counts_by_label["No Travel"],
        "severe_count": counts_by_label["Severe"],
        "high_count": counts_by_label["High"],
        "moderate_count": counts_by_label["Moderate"],
        "low_count": counts_by_label["Low"],
        "avg_risk_score": round(avg_score, 2),
        "max_risk_score": max_risk,
        "max_risk_label": RISK_LABELS[max_risk],
    }


def rank_routes(routes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Sort routes by the specification preference order:
      1. Fewest Severe miles (including No Travel as worst case)
      2. Fewest High miles
      3. Lowest average risk
      4. Shortest travel time (duration_seconds)
    """

    def sort_key(r: dict[str, Any]) -> tuple:
        s = r["score"]
        # No Travel is the most severe condition (must be avoided first),
        # followed by Severe miles, High miles, Avg Risk, then Duration
        return (
            s["no_travel_miles"],
            s["severe_miles"],
            s["high_miles"],
            s["avg_risk_score"],
            r.get("duration_seconds", 0),
        )

    sorted_routes = sorted(routes, key=sort_key)
    for i, r in enumerate(sorted_routes):
        r["rank"] = i + 1
        r["recommended"] = (i == 0)

        # Generate recommendation justification text
        if i == 0:
            reasons = []
            s = r["score"]
            if s["no_travel_miles"] == 0 and s["severe_miles"] == 0:
                reasons.append("Zero Severe or No-Travel miles")
            elif s["no_travel_miles"] == 0:
                reasons.append("Avoids No-Travel zones")
            if s["high_miles"] == 0:
                reasons.append("Zero High-risk miles")
            reasons.append(f"Lowest overall risk score ({s['avg_risk_score']:.2f})")
            r["recommendation_reason"] = " • ".join(reasons)
        else:
            r["recommendation_reason"] = ""

    return sorted_routes
