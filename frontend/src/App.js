import React, { useEffect, useState } from 'react';
import './styles/App.css';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_BASE = 'http://localhost:8000';

export default function App() {
  const [city, setCity] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('weatherHistory')) || [];
    setHistory(stored);
  }, []);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        try {
          const res = await fetch(`${API_BASE}/weather/coords?lat=${lat}&lon=${lon}`);
          const data = await res.json();
          setWeather(data);
          updateHistory(data.city);
        } catch {
          setError('Failed to fetch auto-location weather');
        }
      });
    }
  }, []);

  const updateHistory = (newCity) => {
    let updated = [newCity, ...history.filter(c => c !== newCity)];
    if (updated.length > 5) updated = updated.slice(0, 5);
    setHistory(updated);
    localStorage.setItem('weatherHistory', JSON.stringify(updated));
  };

  const fetchSuggestions = async (query) => {
    if (!query) {
      setSuggestions([]);
      return;
    }

    const apiKey = process.env.REACT_APP_OPENWEATHER_API_KEY;

    try {
      const res = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${apiKey}`
      );
      const data = await res.json();

      if (!Array.isArray(data)) {
        setSuggestions([]);
        return;
      }

      const names = data.map(c => {
        const statePart = c.state ? `, ${c.state}` : '';
        return `${c.name}${statePart}, ${c.country}`;
      });

      setSuggestions(names);
    } catch (err) {
      console.error('Autocomplete fetch error:', err);
      setSuggestions([]);
    }
  };

  const extractCityOnly = (fullString) => {
    return fullString.split(',')[0].trim(); // e.g., "Goa Island, Goa, IN" => "Goa Island"
  };

  const fetchWeather = async (selectedCity) => {
    setError('');
    setSuggestions([]);
    const cityOnly = extractCityOnly(selectedCity);
    setCity(cityOnly);
    try {
      const res = await fetch(`${API_BASE}/weather?city=${encodeURIComponent(cityOnly)}`);
      if (!res.ok) throw new Error('City not found');
      const data = await res.json();
      setWeather(data);
      updateHistory(data.city);
    } catch {
      setError('City not found');
      setWeather(null);
    }
  };

  return (
    <div className="container">
      <h1>🌤 Weather Dashboard</h1>

      <div className="search">
        <input
          type="text"
          placeholder="Enter city name..."
          value={city}
          onChange={(e) => {
            const val = e.target.value;
            setCity(val);
            fetchSuggestions(val);
          }}
          onKeyDown={(e) => e.key === 'Enter' && fetchWeather(city)}
        />
        <button onClick={() => fetchWeather(city)}>Search</button>

        {suggestions.length > 0 && (
          <ul className="suggestions">
            {suggestions.map((s, idx) => (
              <li key={idx} onClick={() => fetchWeather(s)}>{s}</li>
            ))}
          </ul>
        )}
      </div>

      {history.length > 0 && (
        <div className="history">
          <h3>Recent:</h3>
          <div className="tags">
            {history.map((h, i) => (
              <span key={i} className="tag" onClick={() => fetchWeather(h)}>{h}</span>
            ))}
          </div>
        </div>
      )}

      {error && <div className="error">{error}</div>}

      {weather && (
        <div className="weather-card">
          <h2>{weather.city}</h2>
          <p>{weather.local_time} ({weather.local_date})</p>
          <img src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`} alt={weather.description} />
          <h3>{weather.temperature}°C</h3>
          <p>{weather.description}</p>

          <div className="forecast">
            {weather.forecast.map((f, i) => (
              <div className="forecast-item" key={i}>
                <p>{f.time}</p>
                <strong>{f.temp}°</strong>
              </div>
            ))}
          </div>

          {/* 📊 Chart added below forecast */}
          <div className="chart-section">
            <h3>Temperature Forecast</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={weather.forecast}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis unit="°" />
                <Tooltip />
                <Line type="monotone" dataKey="temp" stroke="#3498db" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
