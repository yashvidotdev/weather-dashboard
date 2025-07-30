from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import requests
import os
from dotenv import load_dotenv
from datetime import datetime
import pytz

load_dotenv()

app = FastAPI(title="Weather API Proxy", version="1.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY = os.getenv("OPENWEATHER_API_KEY")

def extract_weather(data, forecast_data):
    city_name = data["name"]
    temperature = round(data["main"]["temp"], 1)
    description = data["weather"][0]["description"].title()
    icon = data["weather"][0]["icon"]

    timezone_offset = data["timezone"]
    local_time = datetime.utcfromtimestamp(data["dt"] + timezone_offset)
    time_str = local_time.strftime("%H:%M")
    date_str = local_time.strftime("%d %b %Y")

    forecast = []
    for item in forecast_data["list"][:6]:
        ftime = datetime.utcfromtimestamp(item["dt"] + timezone_offset).strftime("%H:%M")
        ftemp = round(item["main"]["temp"], 1)
        forecast.append({"time": ftime, "temp": ftemp})

    return {
        "city": city_name,
        "temperature": temperature,
        "description": description,
        "icon": icon,
        "forecast": forecast,
        "local_time": time_str,
        "local_date": date_str
    }

@app.get("/weather")
async def get_weather(city: str):
    try:
        params = {"q": city, "appid": API_KEY, "units": "metric"}
        current = requests.get("https://api.openweathermap.org/data/2.5/weather", params=params)
        forecast = requests.get("https://api.openweathermap.org/data/2.5/forecast", params=params)
        current.raise_for_status()
        forecast.raise_for_status()
        return extract_weather(current.json(), forecast.json())
    except:
        raise HTTPException(status_code=404, detail="City not found")

@app.get("/weather/coords")
async def get_weather_by_coords(lat: float, lon: float):
    try:
        params = {"lat": lat, "lon": lon, "appid": API_KEY, "units": "metric"}
        current = requests.get("https://api.openweathermap.org/data/2.5/weather", params=params)
        forecast = requests.get("https://api.openweathermap.org/data/2.5/forecast", params=params)
        current.raise_for_status()
        forecast.raise_for_status()
        return extract_weather(current.json(), forecast.json())
    except:
        raise HTTPException(status_code=404, detail="Location not found")
