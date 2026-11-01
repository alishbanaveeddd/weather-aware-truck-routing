# Weather-Aware Truck Routing 🚛🌦️

A full-stack web application built with **React (TypeScript)** and **Django REST Framework** that helps truck drivers select the safest route balancing weather risk, truck load weight, and travel time.

---

## Deliverables & Features Overview

- **3 Alternative Routes**: Generated using OpenRouteService / OSRM routing engines.
- **Dynamic Checkpoint Sampling**: Samples weather conditions every **10 / 25 / 50 miles**.
- **ETA Weather Forecasting**: Calculates the truck's estimated arrival time at each checkpoint to query the exact forecasted weather.
- **Comprehensive Risk Engine**:
  - Classifies conditions into **Low**, **Moderate**, **High**, **Severe**, and **No Travel**.
  - Dynamic load weight rules ($\ge 55\text{ mph} \rightarrow$ No Travel; $45\text{--}54\text{ mph} + >30,000\text{ lb} \rightarrow$ No Travel; $35\text{--}44\text{ mph} + >40,000\text{ lb} \rightarrow$ Severe).
- **Route Recommendation Logic**:
  1. Fewest No Travel / Severe miles
  2. Fewest High miles
  3. Lowest average risk
  4. Shortest travel times
- **Interactive Map & Heatmap**:
  - Color-coded routes and checkpoint pins with interactive popups (ETA, wind, rain, snow, temp, load rules).
  - Smooth weather risk heatmap across the trip corridor.
  - **0–48 hour forecast slider** with auto-play animation.
  - Detailed checkpoint table with mile-by-mile metrics.
- **Quick Demo Scenarios**: Pre-configured one-click scenarios (Chicago $\rightarrow$ Indianapolis, Denver $\rightarrow$ Salt Lake City, Dallas $\rightarrow$ Kansas City).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS |
| **Map Engine** | Leaflet, react-leaflet, Leaflet.heat |
| **State Management** | Zustand |
| **Backend** | Python 3.10+, Django 5.1, Django REST Framework |
| **CORS & Networking**| django-cors-headers, requests |
| **Routing & Geocoding** | OpenRouteService (HGV profile) with OSRM & Nominatim fallbacks |
| **Weather APIs** | OpenWeatherMap One Call 3.0, Open-Meteo, & atmospheric simulation engine |

---

## Quickstart & Setup

### 1. Clone & Navigate
```bash
git clone <repo-url>
cd fs-assessment-spotter
```

### 2. Backend Setup
```bash
# Windows:
.\start_backend.bat

# Or manually:
cd backend
python -m venv ../venv
..\venv\Scripts\activate       # On Linux/macOS: source ../venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

### 3. Frontend Setup
```bash
# Windows:
.\start_frontend.bat

# Or manually:
cd frontend
npm install
npm run dev
```

Open your browser at **[http://localhost:5173](http://localhost:5173)**. The Vite dev server automatically proxies `/api` requests to Django at `http://127.0.0.1:8000`.

---

## API Keys Configuration (Optional)

The application functions out of the box with zero external configuration (using open APIs and resilient fallbacks). To connect personal API keys:

1. Copy `backend/.env.example` to `backend/.env`
2. Provide your API keys:
```env
ORS_API_KEY=your_openrouteservice_api_key_here
OWM_API_KEY=your_openweathermap_onecall_key_here
```

---

## Risk Rules Matrix

### Condition Thresholds

| Condition | Low | Moderate | High | Severe | No Travel |
|:----------|:---:|:--------:|:----:|:------:|:---------:|
| **Wind** | $<25\text{ mph}$ | $25\text{--}34\text{ mph}$ | $35\text{--}44\text{ mph}$ | $45\text{--}54\text{ mph}$ | $\ge 55\text{ mph}$ |
| **Rain** | $<0.10\text{ in/hr}$ | $0.10\text{--}0.25\text{ in/hr}$ | $0.25\text{--}0.50\text{ in/hr}$ | $0.50\text{--}1.00\text{ in/hr}$ | $>1.00\text{ in/hr}$ |
| **Snow** | $<0.5\text{ in/hr}$ | $0.5\text{--}1.0\text{ in/hr}$ | $1.0\text{--}2.0\text{ in/hr}$ | $2.0\text{--}3.0\text{ in/hr}$ | $>3.0\text{ in/hr}$ |

### Load Rules (Wind Modifiers)
- $\ge 55\text{ mph} \rightarrow$ **No Travel** for any load weight.
- $45\text{--}54\text{ mph} + >30,000\text{ lb} \rightarrow$ **No Travel**.
- $35\text{--}44\text{ mph} + >40,000\text{ lb} \rightarrow$ **Severe** (minimum risk level).

---

## Automated Test Suite

A complete unit test suite validates the threshold boundaries, load rules, composite risk calculation, and API endpoints:

```bash
cd backend
..\venv\Scripts\python manage.py test
```

Test coverage includes:
- `test_wind_risk_thresholds`: $<25$, $25\text{--}34$, $35\text{--}44$, $45\text{--}54$, $\ge 55\text{ mph}$.
- `test_rain_risk_thresholds`: $<0.10$, $0.10\text{--}0.25$, $0.25\text{--}0.50$, $0.50\text{--}1.00$, $>1.00\text{ in/hr}$.
- `test_snow_risk_thresholds`: $<0.5$, $0.5\text{--}1.0$, $1.0\text{--}2.0$, $2.0\text{--}3.0$, $>3.0\text{ in/hr}$.
- `test_load_rules_over_55_mph`: Universal No Travel cutoff.
- `test_load_rules_45_to_54_mph`: $>30\text{k lb}$ escalation to No Travel.
- `test_load_rules_35_to_44_mph`: $>40\text{k lb}$ escalation to Severe.
- `test_route_ranking_preference_order`: Validates 4-tier tiebreaker sorting order.
- `RoutingAPITests`: Integration tests for `/api/routes/`, `/api/heatmap/`, `/api/geocode/`.

---

## 5–10 Min Loom Walkthrough Guide

Use this structure when recording your walkthrough video:

1. **Introduction & Overview (1 min)**:
   - Introduce the Weather-Aware Truck Routing app.
   - Explain the core problem: heavy trucks face dangerous rollovers in high winds and hydroplaning/traction loss in severe rain and snow.
2. **Architecture & Tech Stack (1 min)**:
   - React 19 + TypeScript frontend with Tailwind CSS and react-leaflet.
   - Django REST Framework backend with custom Risk Engine.
   - Routing via ORS/OSRM and weather forecasting.
3. **Demo Scenario 1: Heavy Load Wind Escalation (2 mins)**:
   - Click "Chicago ➔ Indianapolis" preset.
   - Set Load Weight to 45,000 lbs ($>40,000\text{ lbs}$).
   - Click "Calculate & Recommend Routes".
   - Highlight the 3 routes rendered on the map.
   - Show how Route 1 is ranked #1 because it has the fewest Severe/No-Travel miles.
   - Click a checkpoint pin with orange/red risk to show the popup with ETA, Wind speed, and the Load Rule warning banner.
4. **Demo Scenario 2: Sampling Intervals & Checkpoint Details (1.5 mins)**:
   - Switch sampling interval between **10 mi**, **25 mi**, and **50 mi**.
   - Open the "Checkpoints" tab to show the mile-by-mile breakdown with exact arrival timestamps, wind, rain, snow, temperature, and risk classifications.
5. **Demo Scenario 3: Weather Heatmap & 48h Slider (1.5 mins)**:
   - Toggle "Enable Heatmap".
   - Drag the forecast slider from 0h to +48h or click "▶ Play" to watch the weather front progress across the trip corridor.
   - Show how the risk gradient shifts over time.
6. **Codebase Tour & Tests (1 min)**:
   - Show `backend/routing/services/risk_engine.py` where load rules and 4-tier ranking are defined.
   - Run `python manage.py test` in the terminal to show all tests passing.
7. **Wrap-up**:
   - Summarize the clean separation of concerns and robust error handling.

---

## API Reference

### `POST /api/routes/`
Generates 3 route options with weather risk evaluated at each checkpoint.

**Request Body**:
```json
{
  "origin": "Chicago, IL",
  "destination": "Indianapolis, IN",
  "departure_datetime": "2026-11-02T10:00:00Z",
  "load_weight_lb": 42000,
  "interval_miles": 25
}
```

**Response**:
```json
{
  "routes": [
    {
      "index": 0,
      "rank": 1,
      "name": "Interstate Corridor (Direct)",
      "recommended": true,
      "recommendation_reason": "Zero Severe or No-Travel miles • Lowest overall risk score (0.75)",
      "distance_miles": 164.8,
      "duration_seconds": 10500,
      "score": {
        "no_travel_miles": 0.0,
        "severe_miles": 0.0,
        "high_miles": 0.0,
        "moderate_miles": 137.5,
        "low_miles": 27.3,
        "avg_risk_score": 0.75
      },
      "checkpoints": [ ... ]
    }
  ],
  "recommended_index": 0
}
```

### `GET /api/heatmap/`
Query weather risk grid across a bounding box for the forecast hour.

**Query Parameters**:
- `min_lat`, `min_lon`, `max_lat`, `max_lon`: Bounding box coordinates
- `forecast_hour`: Horizon in hours ($0\text{--}48$)
