import { useEffect, useState } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const DEFAULT_POSITION = [26.4499, 74.6399]

const OVERPASS_SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter'
]

function LocationUpdater({ position }) {
  const map = useMap()

  useEffect(() => {
    map.setView(position, 14)
  }, [position, map])

  return null
}

async function searchNearbyPlaces(lat, lng) {
  const query = `
    [out:json][timeout:15];
    (
      node(around:5000,${lat},${lng})[amenity~"^(police|hospital|clinic)$"];
      way(around:5000,${lat},${lng})[amenity~"^(police|hospital|clinic)$"];
      relation(around:5000,${lat},${lng})[amenity~"^(police|hospital|clinic)$"];
    );
    out center tags;
  `

  let lastError = null

  for (const endpoint of OVERPASS_SERVERS) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 12000)

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        },
        body: new URLSearchParams({ data: query }),
        signal: controller.signal
      })

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`)
      }

      const data = await response.json()

      return (data.elements || [])
        .map((item) => {
          const type = item.tags?.amenity

          return {
            id: `${item.type}-${item.id}`,
            name:
              item.tags?.name ||
              (type === 'police'
                ? 'Unnamed police station'
                : type === 'hospital'
                  ? 'Unnamed hospital'
                  : 'Unnamed clinic'),
            type,
            lat: item.lat ?? item.center?.lat,
            lng: item.lon ?? item.center?.lon
          }
        })
        .filter(
          (place) =>
            Number.isFinite(place.lat) &&
            Number.isFinite(place.lng)
        )
    } catch (error) {
      lastError = error
      console.warn(`Map server failed: ${endpoint}`, error.message)
    } finally {
      clearTimeout(timeoutId)
    }
  }

  throw new Error(
    `'Live map data is unavailable right now. Use the Google Maps links below to find nearby help.'. ${
      lastError?.message || 'Please try again later.'
    }`
  )
}

export default function NearbyHelp() {
  const [position, setPosition] = useState(DEFAULT_POSITION)
  const [places, setPlaces] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(
    'Ajmer demo location. Click the button to find nearby help.'
  )

  async function findHelp() {
    if (!navigator.geolocation) {
      setMessage(
        'Location is not supported by your browser. You can still use Google Maps below.'
      )
      return
    }

    setLoading(true)
    setPlaces([])
    setMessage('Getting your location and searching nearby help...')

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const lat = coords.latitude
        const lng = coords.longitude

        setPosition([lat, lng])

        try {
          const results = await searchNearbyPlaces(lat, lng)

          setPlaces(results)
          setMessage(
            results.length
              ? `Found ${results.length} mapped places within about 5 km.`
              : 'No mapped police stations, hospitals or clinics found within about 5 km. Try Google Maps below.'
          )
        } catch (error) {
          setMessage(
            `${error.message} Use the Google Maps links below to search for help.`
          )
        } finally {
          setLoading(false)
        }
      },
      (error) => {
        setMessage(
          `Could not get your location: ${error.message}. Allow location access or use Google Maps below.`
        )
        setLoading(false)
      },
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 60000
      }
    )
  }

  return (
    <section className="journey-container">
      <h2>Find Help Nearby</h2>

      <p role="status">{message}</p>

      <button onClick={findHelp} disabled={loading}>
        {loading ? 'Searching...' : '📍 Use My Location & Find Help'}
      </button>

      <MapContainer
        center={DEFAULT_POSITION}
        zoom={13}
        style={{
          height: '350px',
          width: '100%',
          marginTop: '16px',
          borderRadius: '12px'
        }}
      >
        <LocationUpdater position={position} />

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={position}>
          <Popup>Your current or demo location</Popup>
        </Marker>

        {places.map((place) => (
          <Marker
            key={place.id}
            position={[place.lat, place.lng]}
          >
            <Popup>
              <strong>{place.name}</strong>
              <br />
              Type: {place.type}
              <br />
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
                target="_blank"
                rel="noreferrer"
              >
                Get directions
              </a>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <p>
        <a
          href={`https://www.google.com/maps/search/police+station/@${position[0]},${position[1]},14z`}
          target="_blank"
          rel="noreferrer"
        >
          🚔 Find nearby police stations
        </a>
      </p>

      <p>
        <a
          href={`https://www.google.com/maps/search/hospital/@${position[0]},${position[1]},14z`}
          target="_blank"
          rel="noreferrer"
        >
          🏥 Find nearby hospitals
        </a>
      </p>

      <p>
        <a
          href={`https://www.google.com/maps/search/clinic/@${position[0]},${position[1]},14z`}
          target="_blank"
          rel="noreferrer"
        >
          Find nearby clinics
        </a>
      </p>

      <small>
        OpenStreetMap data may be incomplete or outdated. Verify locations
        before travelling. For immediate emergency help in India, call 112.
        This app is not an emergency-response service.
      </small>
    </section>
  )
}
