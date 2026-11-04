from django.test import TestCase
from rest_framework.test import APIClient
from .services.risk_engine import (
    wind_risk,
    rain_risk,
    snow_risk,
    apply_load_rules,
    checkpoint_risk,
    score_route,
    rank_routes,
)


class RiskEngineTests(TestCase):
    def test_wind_risk_thresholds(self):
        # <25 mph -> Low (0)
        self.assertEqual(wind_risk(0), 0)
        self.assertEqual(wind_risk(24.9), 0)
        # 25-34 mph -> Moderate (1)
        self.assertEqual(wind_risk(25.0), 1)
        self.assertEqual(wind_risk(34.9), 1)
        # 35-44 mph -> High (2)
        self.assertEqual(wind_risk(35.0), 2)
        self.assertEqual(wind_risk(44.9), 2)
        # 45-54 mph -> Severe (3)
        self.assertEqual(wind_risk(45.0), 3)
        self.assertEqual(wind_risk(54.9), 3)
        # >=55 mph -> No Travel (4)
        self.assertEqual(wind_risk(55.0), 4)
        self.assertEqual(wind_risk(75.0), 4)

    def test_rain_risk_thresholds(self):
        # <0.10 in/hr -> Low (0)
        self.assertEqual(rain_risk(0.0), 0)
        self.assertEqual(rain_risk(0.09), 0)
        # 0.10-0.25 in/hr -> Moderate (1)
        self.assertEqual(rain_risk(0.10), 1)
        self.assertEqual(rain_risk(0.25), 1)
        # 0.25-0.50 in/hr -> High (2)
        self.assertEqual(rain_risk(0.26), 2)
        self.assertEqual(rain_risk(0.50), 2)
        # 0.50-1.00 in/hr -> Severe (3)
        self.assertEqual(rain_risk(0.51), 3)
        self.assertEqual(rain_risk(1.00), 3)
        # >1.00 in/hr -> No Travel (4)
        self.assertEqual(rain_risk(1.01), 4)
        self.assertEqual(rain_risk(2.50), 4)

    def test_snow_risk_thresholds(self):
        # <0.5 in/hr -> Low (0)
        self.assertEqual(snow_risk(0.0), 0)
        self.assertEqual(snow_risk(0.49), 0)
        # 0.5-1.0 in/hr -> Moderate (1)
        self.assertEqual(snow_risk(0.5), 1)
        self.assertEqual(snow_risk(1.0), 1)
        # 1.0-2.0 in/hr -> High (2)
        self.assertEqual(snow_risk(1.01), 2)
        self.assertEqual(snow_risk(2.0), 2)
        # 2.0-3.0 in/hr -> Severe (3)
        self.assertEqual(snow_risk(2.01), 3)
        self.assertEqual(snow_risk(3.0), 3)
        # >3.0 in/hr -> No Travel (4)
        self.assertEqual(snow_risk(3.01), 4)
        self.assertEqual(snow_risk(5.0), 4)

    def test_load_rules_over_55_mph(self):
        # >=55 mph -> No Travel for any load
        risk, _ = apply_load_rules(wind_mph=56.0, base_wind_risk=4, load_lb=10000)
        self.assertEqual(risk, 4)
        risk, _ = apply_load_rules(wind_mph=55.0, base_wind_risk=4, load_lb=70000)
        self.assertEqual(risk, 4)

    def test_load_rules_45_to_54_mph(self):
        # 45-54 mph + >30,000 lb -> No Travel
        risk, reasons = apply_load_rules(wind_mph=48.0, base_wind_risk=3, load_lb=35000)
        self.assertEqual(risk, 4)
        self.assertTrue(len(reasons) > 0)

        # 45-54 mph + <=30,000 lb -> Severe (3)
        risk, reasons = apply_load_rules(wind_mph=48.0, base_wind_risk=3, load_lb=25000)
        self.assertEqual(risk, 3)

    def test_load_rules_35_to_44_mph(self):
        # 35-44 mph + >40,000 lb -> Severe (3)
        risk, reasons = apply_load_rules(wind_mph=40.0, base_wind_risk=2, load_lb=45000)
        self.assertEqual(risk, 3)
        self.assertTrue(len(reasons) > 0)

        # 35-44 mph + <=40,000 lb -> High (2)
        risk, reasons = apply_load_rules(wind_mph=40.0, base_wind_risk=2, load_lb=35000)
        self.assertEqual(risk, 2)

    def test_checkpoint_risk_composite(self):
        # Test unit conversion (25.4 mm = 1.0 inch)
        res = checkpoint_risk(
            wind_mph=20.0,         # Low (0)
            rain_mm_per_hr=15.0,   # 15 / 25.4 = 0.59 in/hr -> Severe (3)
            snow_mm_per_hr=0.0,
            load_lb=40000,
        )
        self.assertEqual(res["risk_score"], 3)
        self.assertEqual(res["risk_label"], "Severe")

    def test_route_ranking_preference_order(self):
        # Preference: 1. Fewest Severe miles, 2. Fewest High miles, 3. Lowest avg risk, 4. Shortest travel time
        route_a = {
            "index": 0,
            "duration_seconds": 10000,
            "score": {
                "no_travel_miles": 0.0,
                "severe_miles": 5.0,
                "high_miles": 0.0,
                "avg_risk_score": 1.5,
            },
        }
        route_b = {
            "index": 1,
            "duration_seconds": 12000,
            "score": {
                "no_travel_miles": 0.0,
                "severe_miles": 0.0,  # Zero severe miles -> MUST WIN
                "high_miles": 10.0,
                "avg_risk_score": 1.8,
            },
        }
        route_c = {
            "index": 2,
            "duration_seconds": 8000,
            "score": {
                "no_travel_miles": 10.0,  # Has No Travel -> Worst
                "severe_miles": 0.0,
                "high_miles": 0.0,
                "avg_risk_score": 2.0,
            },
        }

        ranked = rank_routes([route_a, route_b, route_c])
        # Route B has 0 No-Travel and 0 Severe miles -> rank 1
        self.assertEqual(ranked[0]["index"], 1)
        self.assertTrue(ranked[0]["recommended"])
        # Route A has 5 Severe miles -> rank 2
        self.assertEqual(ranked[1]["index"], 0)
        # Route C has 10 No-Travel miles -> rank 3
        self.assertEqual(ranked[2]["index"], 2)


class RoutingAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_geocode_endpoint(self):
        resp = self.client.get("/api/geocode/?q=Chicago")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("lat", resp.data)
        self.assertIn("lon", resp.data)

    def test_routes_endpoint_generates_3_routes(self):
        payload = {
            "origin": "Chicago, IL",
            "destination": "Indianapolis, IN",
            "departure_datetime": "2026-11-02T10:00:00Z",
            "load_weight_lb": 42000,
            "interval_miles": 25,
        }
        resp = self.client.post("/api/routes/", payload, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("routes", resp.data)
        self.assertEqual(len(resp.data["routes"]), 3)
        self.assertIn("recommended_index", resp.data)

        # Check that checkpoints exist and have risk properties
        first_route = resp.data["routes"][0]
        self.assertGreater(len(first_route["checkpoints"]), 2)
        cp = first_route["checkpoints"][0]
        self.assertIn("wind_mph", cp)
        self.assertIn("risk_label", cp)
        self.assertIn("arrival_dt", cp)

    def test_heatmap_endpoint(self):
        resp = self.client.get("/api/heatmap/?min_lat=39.0&min_lon=-88.0&max_lat=42.0&max_lon=-86.0&forecast_hour=12")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("points", resp.data)
        self.assertGreater(len(resp.data["points"]), 0)

