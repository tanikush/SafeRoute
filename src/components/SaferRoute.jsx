
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { supabase } from '../lib/supabase'
import * as turf from '@turf/turf'

const AJMER_CENTER = [26.4499, 74.6399]
const STREETLIGHT_RADIUS_METERS = 100

const KNOWN_PLACES = [
  {
    keywords: ['ana sagar', 'anasagar'],
    lat: 26.475,
    lon: 74.625,
    name: 'Ana Sagar Lake, Ajmer',
  },
  {
    keywords: ['ajmer junction', 'ajmer railway station'],
    lat: 26.4583,
    lon: 74.6389,
    name: 'Ajmer Junction',
  },
]

async function geocode(place) {
  const cleanedPlace = place.trim()

  if (!cleanedPlace) {
    throw new Error('Please enter a location.')
  }

  const normalized = cleanedPlace.toLowerCase()

  const known = KNOWN_PLACES.find((item) =>
    item.keywords.some((keyword) => normalized.includes(keyword))
  )

  if (known) {
    return {
      lat: known.lat,
      lon: known.lon,
      name: `${known.name}, Rajasthan, India`,
    }
  }

  const queries = [
    cleanedPlace,
    `${cleanedPlace}, Ajmer, Rajasthan, India`,
    `${cleanedPlace}, Rajasthan, India`,
  ]

  for (const query of [...new Set(queries)]) {
    const params = new URLSearchParams({
      format: 'jsonv2',
      limit: '5',
      countrycodes: 'in',
      q: query,
    })

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`
    )

    if (!response.ok) {
      throw new Error('Location service unavailable. Please try again.')
    }

    const results = await response.json()

    if (results.length > 0) {
      return {
        lat: Number(results[0].lat),
        lon: Number(results[0].lon),
        name: results[0].display_name,
      }
    }
  }

  throw new Error(
    `Location not found: ${cleanedPlace}. Try a nearby landmark or full address.`
  )
}

function distanceInMeters(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180
  const earthRadius = 6371000

  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2

  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function countReportsNearRoute(routeCoordinates, reports) {
  let negative = 0
  let helpful = 0

  const negativeTypes = [
    'Broken streetlight',
    'Isolated stretch',
    'Blocked walkway',
  ]

  for (const report of reports) {
    if (
      report.latitude == null ||
      report.longitude == null
    ) {
      continue
    }

    const isNearRoute = routeCoordinates.some(([lat, lon]) => {
      return (
        distanceInMeters(
          lat,
          lon,
          Number(report.latitude),
          Number(report.longitude)
        ) <= 200
      )
    })

    if (!isNearRoute) continue

    if (negativeTypes.includes(report.report_type)) {
      negative += 1
    } else if (report.report_type === 'Helpful public place') {
      helpful += 1
    }
  }

  return { negative, helpful }
}

// Count mapped streetlight points within 100 metres of a route.
function countStreetlightsNearRoute(routeCoordinates, geojson) {
  if (!geojson?.features || !routeCoordinates?.length) {
    return null
  }

  const routeLine = turf.lineString(
    routeCoordinates.map(([lat, lon]) => [lon, lat])
  )

  const lightingSegments = {
    lit: 0,
    unlit: 0,
    unknown: 0,
  }

  const nearbyFeatures = geojson.features.filter((feature) => {
    if (!feature.geometry) return false

    try {
      const featureGeometry = turf.feature(feature.geometry)

      const distance = turf.pointToLineDistance(
        turf.point(turf.centroid(featureGeometry).geometry.coordinates),
        routeLine,
        { units: 'meters' }
      )

      return distance <= 100
    } catch {
      return false
    }
  })

  nearbyFeatures.forEach((feature) => {
    const lit = String(feature.properties?.lit || '').toLowerCase()

    if (lit === 'yes') {
      lightingSegments.lit += 1
    } else if (lit === 'no') {
      lightingSegments.unlit += 1
    } else {
      lightingSegments.unknown += 1
    }
  })

  return {
    total: nearbyFeatures.length,
    ...lightingSegments,
    radius: 100,
  }
}

function formatDistance(meters) {
  return meters >= 1000
    ? `${(meters / 1000).toFixed(1)} km`
    : `${Math.round(meters)} m`
}

function formatDuration(seconds) {
  const minutes = Math.round(seconds / 60)

  if (minutes < 60) return `${minutes} min`

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  return `${hours} hr ${remainingMinutes} min`
}

export default function SaferRoute({ onClose }) {
  const mapElement = useRef(null)
  const mapRef = useRef(null)
  const routeLayersRef = useRef([])
  const lightingLayerRef = useRef(null)

  const [start, setStart] = useState('')
  const [destination, setDestination] = useState('')
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reports, setReports] = useState([])
  const [lightingData, setLightingData] = useState(null)
  const [lightingStatus, setLightingStatus] = useState('Loading lighting data...')

  // Initialize map and load lighting GeoJSON.
  useEffect(() => {
    if (!mapElement.current || mapRef.current) return

    const map = L.map(mapElement.current).setView(AJMER_CENTER, 13)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    mapRef.current = map

    let active = true

    async function loadLightingData() {
      try {
        const response = await fetch('/data/ajmer-lighting.geojson')

        if (!response.ok) {
          throw new Error('Could not load streetlight GeoJSON file.')
        }

        const geojson = await response.json()

        if (!geojson.features || !Array.isArray(geojson.features)) {
          throw new Error('Invalid GeoJSON data.')
        }

        if (!active) return

        setLightingData(geojson)

        const streetlightCount = geojson.features.filter(
          (feature) =>
            feature.geometry?.type === 'Point' &&
            feature.properties?.highway === 'street_lamp'
        ).length

        setLightingStatus(
          `${streetlightCount} mapped streetlight locations loaded`
        )

        const lightingLayer = L.geoJSON(geojson, {
          pointToLayer: (feature, latlng) => {
            if (feature.properties?.highway === 'street_lamp') {
              return L.circleMarker(latlng, {
                radius: 5,
                color: '#b45309',
                fillColor: '#fbbf24',
                fillOpacity: 1,
                weight: 1,
              })
            }

            return L.circleMarker(latlng, {
              radius: 4,
              color: '#64748b',
              fillColor: '#94a3b8',
              fillOpacity: 0.8,
            })
          },

          style: (feature) => {
            const lit = String(
              feature.properties?.lit || ''
            ).toLowerCase()

            let color = '#64748b'

            if (lit === 'yes') color = '#16a34a'
            if (lit === 'no') color = '#dc2626'

            return {
              color,
              weight: 5,
              opacity: 0.85,
            }
          },

          onEachFeature: (feature, layer) => {
            const properties = feature.properties || {}
            const isStreetlight =
              properties.highway === 'street_lamp'
            const lit = String(properties.lit || '').toLowerCase()

            let label = 'Streetlight location'

            if (!isStreetlight) {
              if (lit === 'yes') {
                label = 'Mapped road lighting: Yes'
              } else if (lit === 'no') {
                label = 'Mapped road lighting: No'
              } else {
                label = 'Road lighting information unknown'
              }
            }

            layer.bindPopup(label)
          },
        }).addTo(map)

        lightingLayerRef.current = lightingLayer
      } catch (err) {
        console.error('Lighting data error:', err)

        if (active) {
          setLightingStatus('Lighting data unavailable')
        }
      }
    }

    loadLightingData()

    return () => {
      active = false
      map.remove()
      mapRef.current = null
      lightingLayerRef.current = null
    }
  }, [])

  // Load community reports from Supabase.
  useEffect(() => {
    let active = true

    async function loadReports() {
      const { data, error: reportError } = await supabase
        .from('safety_reports')
        .select(
          'id, report_type, latitude, longitude, verification_status'
        )
        .neq('verification_status', 'rejected')

      if (!active) return

      if (reportError) {
        console.error('Could not load safety reports:', reportError)
        return
      }

      setReports(data || [])
    }

    loadReports()

    return () => {
      active = false
    }
  }, [])

  async function findRoutes(event) {
    event.preventDefault()

    setError('')
    setRoutes([])

    if (!start.trim() || !destination.trim()) {
      setError('Please enter both starting point and destination.')
      return
    }

    if (!mapRef.current) {
      setError('Map is not ready. Please refresh the page.')
      return
    }

    setLoading(true)

    try {
      const [startPoint, endPoint] = await Promise.all([
        geocode(start),
        geocode(destination),
      ])

      const coordinates =
        `${startPoint.lon},${startPoint.lat};` +
        `${endPoint.lon},${endPoint.lat}`

      const routeUrl =
        `https://router.project-osrm.org/route/v1/driving/${coordinates}` +
        '?overview=full&geometries=geojson&alternatives=3&steps=false'

      const response = await fetch(routeUrl)

      if (!response.ok) {
        throw new Error('Route service is unavailable. Try again later.')
      }

      const routeData = await response.json()

      if (
        routeData.code !== 'Ok' ||
        !routeData.routes ||
        routeData.routes.length === 0
      ) {
        throw new Error('No driving route found between these locations.')
      }

      const formattedRoutes = routeData.routes.map((route, index) => {
        const coordinates = route.geometry.coordinates.map(
          ([lon, lat]) => [lat, lon]
        )

        const reportCounts = countReportsNearRoute(coordinates, reports)

        const streetlightCounts = countStreetlightsNearRoute(
          coordinates,
          lightingData
        )

        return {
          id: index,
          coordinates,
          distance: route.distance,
          duration: route.duration,
          negative: reportCounts.negative,
          helpful: reportCounts.helpful,
          streetlights: streetlightCounts,
        }
      })

      setRoutes(formattedRoutes)

      // Remove old route lines and markers.
      routeLayersRef.current.forEach((layer) => {
        layer.remove()
      })
      routeLayersRef.current = []

      // Draw route alternatives.
      formattedRoutes.forEach((route, index) => {
        const line = L.polyline(route.coordinates, {
          color: index === 0 ? '#e04a08' : '#64748b',
          weight: index === 0 ? 6 : 4,
          opacity: index === 0 ? 0.9 : 0.65,
          dashArray: index === 0 ? null : '8, 8',
        }).addTo(mapRef.current)

        line.bindPopup(
          `Route ${index + 1}<br/>` +
            `Distance: ${formatDistance(route.distance)}<br/>` +
            `Duration: ${formatDuration(route.duration)}<br/>` +
            `Mapped streetlights within ${STREETLIGHT_RADIUS_METERS}m: ${
              route.streetlights?.total ?? 'Unavailable'
            }`
        )

        routeLayersRef.current.push(line)
      })

      const startMarker = L.circleMarker(
        [startPoint.lat, startPoint.lon],
        {
          radius: 8,
          color: '#15803d',
          fillColor: '#22c55e',
          fillOpacity: 1,
        }
      )
        .bindPopup(`Start: ${startPoint.name}`)
        .addTo(mapRef.current)

      const endMarker = L.circleMarker(
        [endPoint.lat, endPoint.lon],
        {
          radius: 8,
          color: '#b91c1c',
          fillColor: '#ef4444',
          fillOpacity: 1,
        }
      )
        .bindPopup(`Destination: ${endPoint.name}`)
        .addTo(mapRef.current)

      routeLayersRef.current.push(startMarker, endMarker)

      const bounds = L.latLngBounds(
        formattedRoutes.flatMap((route) => route.coordinates)
      )

      mapRef.current.fitBounds(bounds, { padding: [35, 35] })
    } catch (err) {
      console.error('Route search error:', err)
      setError(err.message || 'Something went wrong while finding routes.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="safer-route">
      <div className="safer-route-header">
        <div>
          <h2>Safer Route Suggestions</h2>
          <p>Compare routes using mapped lighting and community reports.</p>
        </div>

        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>

      <form className="safer-route-form" onSubmit={findRoutes}>
        <label htmlFor="route-start">Starting point</label>
        <input
          id="route-start"
          type="text"
          value={start}
          onChange={(event) => setStart(event.target.value)}
          placeholder="e.g. Ajmer Junction"
        />

        <label htmlFor="route-destination">Destination</label>
        <input
          id="route-destination"
          type="text"
          value={destination}
          onChange={(event) => setDestination(event.target.value)}
          placeholder="e.g. Ana Sagar Lake, Ajmer"
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Finding routes...' : 'Find Routes'}
        </button>
      </form>

      {error && <p className="error-message">⚠️ {error}</p>}

      <div
        ref={mapElement}
        className="safer-route-map"
        style={{
          width: '100%',
          height: '380px',
          borderRadius: '12px',
          marginTop: '18px',
          zIndex: 0,
        }}
      />

      <div className="lighting-legend">
        <p><strong>Lighting data:</strong> {lightingStatus}</p>
        <p>🟡 Mapped streetlight location</p>
        <p>🟢 Road mapped with lit=yes</p>
        <p>🔴 Road mapped with lit=no</p>
        <p>⚪ Grey road: lighting information unknown</p>
      </div>

      {routes.length > 0 && (
        <div className="route-results">
          <h3>Available route options</h3>

          <p>
            Orange line = first suggested route. Grey dashed lines =
            alternative routes.
          </p>

          {routes.map((route, index) => (
            <article className="route-result-card" key={route.id}>
              <h4>
                {index === 0
                  ? 'Suggested Route'
                  : `Alternative Route ${index}`}
              </h4>

              <p>
                <strong>Distance:</strong>{' '}
                {formatDistance(route.distance)}
              </p>

              <p>
                <strong>Estimated travel time:</strong>{' '}
                {formatDuration(route.duration)}
              </p>

              {route.streetlights ? (
  <>
    <p><strong>Mapped road segments nearby:</strong> {route.streetlights.total}</p>
    <p><strong>Mapped as lit:</strong> {route.streetlights.lit}</p>
    <p><strong>Mapped as unlit:</strong> {route.streetlights.unlit}</p>
    <p><strong>Lighting unknown:</strong> {route.streetlights.unknown}</p>
  </>
) : (
  <p>Lighting data unavailable</p>
)}

              <p>
                <strong>Nearby negative reports:</strong>{' '}
                {route.negative}
              </p>

              <p>
                <strong>Nearby helpful-place reports:</strong>{' '}
                {route.helpful}
              </p>

              <p>
                <strong>Community evidence:</strong>{' '}
                {route.negative + route.helpful}
              </p>
            </article>
          ))}
        </div>
      )}

      <div className="route-disclaimer">
        <strong>Important safety note</strong>
        <p>
          Streetlight counts are based only on mapped OpenStreetMap
          locations within 100 metres of each route. They do not confirm
          that lights are installed, working, or switched on at the time
          of travel. Missing map data does not mean a road is unlit.
          Community reports may also be incomplete or outdated. These
          routes are not certified safe routes.
        </p>
      </div>
    </section>
  )
}
