"""
API Views for the Weather-Aware Truck Routing app.
"""
from __future__ import annotations

import datetime
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .services import ors_service, weather_service
from .services.risk_engine import checkpoint_risk, score_route, rank_routes

logger = logging.getLogger(__name__)


class GeoCodeView(APIView):
    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if not query:
            return Response({"error": "Missing query parameter 'q'"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            lat, lon = ors_service.geocode(query)
            return Response({"lat": lat, "lon": lon, "query": query})
        except Exception as exc:
            logger.exception("Geocode exception")
            return Response({"error": f"Geocoding failed: {exc}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RoutesView(APIView):
    """
    POST /api/routes/
    Request Body:
      {
        "origin": "Chicago, IL",
        "destination": "Indianapolis, IN",
        "departure_datetime": "2024-11-02T08:00:00",
        "load_weight_lb": 45000,
        "interval_miles": 25
      }
    """
    def post(self, request):
        data = request.data
        origin = str(data.get("origin", "")).strip()
        destination = str(data.get("destination", "")).strip()
        departure_str = str(data.get("departure_datetime", "")).strip()
        load_lb = float(data.get("load_weight_lb", 40000))
        interval_miles = int(data.get("interval_miles", 25))

        # Interval must be 10, 25, or 50 as specified in requirements
        if interval_miles not in [10, 25, 50]:
            interval_miles = 25

        if not origin or not destination:
            return Response(
                {"error": "Both origin and destination are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Parse departure datetime
        try:
            if departure_str:
                departure_dt = datetime.datetime.fromisoformat(departure_str)
            else:
                departure_dt = datetime.datetime.now(datetime.timezone.utc)
            if departure_dt.tzinfo is None:
                departure_dt = departure_dt.replace(tzinfo=datetime.timezone.utc)
        except Exception as exc:
            return Response(
                {"error": f"Invalid departure_datetime format: {exc}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 1. Geocode endpoints
        try:
            origin_lat, origin_lon = ors_service.geocode(origin)
            dest_lat, dest_lon = ors_service.geocode(destination)
        except Exception as exc:
            return Response(
                {"error": f"Could not geocode origin or destination: {exc}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 2. Generate 3 routes with checkpoints every interval_miles
        try:
            raw_routes = ors_service.get_routes(
                (origin_lat, origin_lon),
                (dest_lat, dest_lon),
                interval_miles=interval_miles,
            )
        except Exception as exc:
            logger.exception("Routing failed")
            return Response(
                {"error": f"Failed to generate routes: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # 3. Sample weather at each checkpoint using estimated arrival time
        enriched_routes = []
        for route in raw_routes:
            duration_s = route.get("duration_seconds", 3600)
            checkpoints = route.get("checkpoints", [])
            total_cps = max(len(checkpoints) - 1, 1)

            enriched_checkpoints = []
            for cp_idx, cp in enumerate(checkpoints):
                # Calculate ETA at this checkpoint
                fraction = cp_idx / total_cps
                offset_seconds = fraction * duration_s
                arrival_dt = departure_dt + datetime.timedelta(seconds=offset_seconds)

                # Fetch weather
                try:
                    wx = weather_service.fetch_checkpoint_weather(cp["lat"], cp["lon"], arrival_dt)
                except Exception as exc:
                    logger.warning(f"Weather error for checkpoint {cp_idx}: {exc}")
                    wx = {
                        "wind_mph": 15.0,
                        "rain_mm_per_hr": 0.0,
                        "snow_mm_per_hr": 0.0,
                        "temperature_c": 15.0,
                        "description": "Clear",
                        "icon": "01d",
                        "dt": int(arrival_dt.timestamp()),
                    }

                # Calculate weather risk with load rules
                risk = checkpoint_risk(
                    wind_mph=wx["wind_mph"],
                    rain_mm_per_hr=wx["rain_mm_per_hr"],
                    snow_mm_per_hr=wx["snow_mm_per_hr"],
                    load_lb=load_lb,
                )

                enriched_checkpoints.append(
                    {
                        "index": cp_idx,
                        "lat": cp["lat"],
                        "lon": cp["lon"],
                        "distance_miles": cp["distance_miles"],
                        "arrival_dt": arrival_dt.isoformat(),
                        **wx,
                        **risk,
                    }
                )

            # Score route
            score = score_route(enriched_checkpoints, interval_miles=float(interval_miles))

            enriched_routes.append(
                {
                    **route,
                    "checkpoints": enriched_checkpoints,
                    "score": score,
                    "origin": {"lat": origin_lat, "lon": origin_lon, "label": origin},
                    "destination": {"lat": dest_lat, "lon": dest_lon, "label": destination},
                    "departure_dt": departure_dt.isoformat(),
                    "load_weight_lb": load_lb,
                    "interval_miles": interval_miles,
                }
            )

        # 4. Rank routes & recommend best route
        ranked_routes = rank_routes(enriched_routes)
        recommended_index = 0
        for r in ranked_routes:
            if r.get("recommended"):
                recommended_index = r["index"]
                break

        return Response(
            {
                "routes": ranked_routes,
                "recommended_index": recommended_index,
                "summary": {
                    "origin": origin,
                    "destination": destination,
                    "departure_datetime": departure_dt.isoformat(),
                    "load_weight_lb": load_lb,
                    "interval_miles": interval_miles,
                    "route_count": len(ranked_routes),
                },
            }
        )


class HeatmapView(APIView):
    """
    GET /api/heatmap/?min_lat=...&min_lon=...&max_lat=...&max_lon=...&forecast_hour=0
    Returns weather risk points across the trip corridor.
    """
    def get(self, request):
        try:
            min_lat = float(request.query_params.get("min_lat", 38.0))
            min_lon = float(request.query_params.get("min_lon", -90.0))
            max_lat = float(request.query_params.get("max_lat", 42.0))
            max_lon = float(request.query_params.get("max_lon", -85.0))
            forecast_hour = int(request.query_params.get("forecast_hour", 0))
            # Clamp forecast_hour to 0-48
            forecast_hour = max(0, min(48, forecast_hour))
        except (ValueError, TypeError):
            return Response({"error": "Invalid bounding box coordinates."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            points = weather_service.fetch_heatmap_grid(
                (min_lat, min_lon, max_lat, max_lon),
                forecast_hour=forecast_hour,
            )
            return Response(
                {
                    "forecast_hour": forecast_hour,
                    "point_count": len(points),
                    "points": points,
                }
            )
        except Exception as exc:
            logger.exception("Heatmap fetch error")
            return Response({"error": f"Failed to generate heatmap: {exc}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
