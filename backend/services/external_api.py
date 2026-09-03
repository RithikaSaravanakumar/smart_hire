import time
import requests
from typing import Dict, Any, Optional
from flask import current_app

# Simple in-memory cache with timestamp to prevent redundant network calls
_LOCATION_CACHE: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_SECONDS = 3600  # 1 hour cache

# Known fallback data for popular tech hubs
FALLBACK_LOCATIONS: Dict[str, Dict[str, Any]] = {
    'bangalore': {
        'name': 'Bengaluru',
        'region': 'Karnataka',
        'country': 'India',
        'latitude': 12.9716,
        'longitude': 77.5946,
        'timezone': 'Asia/Kolkata',
        'is_fallback': True
    },
    'bengaluru': {
        'name': 'Bengaluru',
        'region': 'Karnataka',
        'country': 'India',
        'latitude': 12.9716,
        'longitude': 77.5946,
        'timezone': 'Asia/Kolkata',
        'is_fallback': True
    },
    'hyderabad': {
        'name': 'Hyderabad',
        'region': 'Telangana',
        'country': 'India',
        'latitude': 17.3850,
        'longitude': 78.4867,
        'timezone': 'Asia/Kolkata',
        'is_fallback': True
    },
    'pune': {
        'name': 'Pune',
        'region': 'Maharashtra',
        'country': 'India',
        'latitude': 18.5204,
        'longitude': 73.8567,
        'timezone': 'Asia/Kolkata',
        'is_fallback': True
    },
    'mumbai': {
        'name': 'Mumbai',
        'region': 'Maharashtra',
        'country': 'India',
        'latitude': 19.0760,
        'longitude': 72.8777,
        'timezone': 'Asia/Kolkata',
        'is_fallback': True
    },
    'delhi': {
        'name': 'New Delhi',
        'region': 'Delhi',
        'country': 'India',
        'latitude': 28.6139,
        'longitude': 77.2090,
        'timezone': 'Asia/Kolkata',
        'is_fallback': True
    },
    'chennai': {
        'name': 'Chennai',
        'region': 'Tamil Nadu',
        'country': 'India',
        'latitude': 13.0827,
        'longitude': 80.2707,
        'timezone': 'Asia/Kolkata',
        'is_fallback': True
    },
    'noida': {
        'name': 'Noida',
        'region': 'Uttar Pradesh',
        'country': 'India',
        'latitude': 28.5355,
        'longitude': 77.3910,
        'timezone': 'Asia/Kolkata',
        'is_fallback': True
    },
    'gurugram': {
        'name': 'Gurugram',
        'region': 'Haryana',
        'country': 'India',
        'latitude': 28.4595,
        'longitude': 77.0266,
        'timezone': 'Asia/Kolkata',
        'is_fallback': True
    },
    'remote': {
        'name': 'Remote (Global/Work From Home)',
        'region': 'Anywhere',
        'country': 'Global',
        'latitude': 0.0,
        'longitude': 0.0,
        'timezone': 'UTC',
        'is_fallback': True
    }
}

def get_location_insights(location_name: str) -> Dict[str, Any]:
    """
    Fetch geographical details for a job location using Open-Meteo Public Geocoding API.
    
    Resilience:
    - 3-second strict timeout
    - In-memory cache with TTL
    - Graceful fallback for offline, network errors, timeouts, or unknown places
    - Never raises unhandled exceptions to calling services
    """
    if not location_name or not isinstance(location_name, str):
        return {
            'name': 'Not Specified',
            'country': 'Unknown',
            'region': 'Unknown',
            'latitude': None,
            'longitude': None,
            'timezone': 'UTC',
            'source': 'default_fallback'
        }

    clean_loc = location_name.strip()
    cache_key = clean_loc.lower()

    # 1. Check in-memory cache
    if cache_key in _LOCATION_CACHE:
        entry = _LOCATION_CACHE[cache_key]
        if time.time() - entry['timestamp'] < CACHE_TTL_SECONDS:
            return entry['data']

    # 2. Extract first city segment if compound string (e.g. "Bangalore / Remote" -> "Bangalore")
    first_token = clean_loc.split('/')[0].split(',')[0].strip().lower()

    timeout = current_app.config.get('EXTERNAL_API_TIMEOUT', 3) if current_app else 3
    api_url = current_app.config.get('EXTERNAL_API_URL', 'https://geocoding-api.open-meteo.com/v1/search') if current_app else 'https://geocoding-api.open-meteo.com/v1/search'

    try:
        response = requests.get(
            api_url,
            params={'name': first_token, 'count': 1, 'language': 'en', 'format': 'json'},
            timeout=timeout,
            headers={'User-Agent': 'SmartHire-StudentPlacementPortal/1.0'}
        )
        if response.status_code == 200:
            data = response.json()
            if 'results' in data and len(data['results']) > 0:
                top_result = data['results'][0]
                result_payload = {
                    'name': top_result.get('name', clean_loc),
                    'region': top_result.get('admin1', ''),
                    'country': top_result.get('country', ''),
                    'country_code': top_result.get('country_code', ''),
                    'latitude': top_result.get('latitude'),
                    'longitude': top_result.get('longitude'),
                    'timezone': top_result.get('timezone', 'UTC'),
                    'source': 'external_api'
                }
                # Save to cache
                _LOCATION_CACHE[cache_key] = {
                    'timestamp': time.time(),
                    'data': result_payload
                }
                return result_payload
    except (requests.RequestException, Exception) as err:
        # Fall through to fallback
        pass

    # 3. Fallback mapping
    fallback = FALLBACK_LOCATIONS.get(first_token, {
        'name': clean_loc.capitalize(),
        'region': 'Standard',
        'country': 'India',
        'latitude': 20.5937,
        'longitude': 78.9629,
        'timezone': 'Asia/Kolkata',
        'source': 'static_fallback'
    })
    
    return fallback
