
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function SharedJourney() {
  const [journey, setJourney] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadJourney() {
      const parts = window.location.pathname.split('/').filter(Boolean)
      const token = parts[parts.length - 1]

      if (!token || token === 'shared-journey') {
        setError('Invalid journey sharing link.')
        setLoading(false)
        return
      }

      const { data, error: rpcError } = await supabase.rpc(
        'get_shared_journey',
        { p_token: token }
      )

      if (rpcError) {
        console.error('Shared journey lookup failed:', rpcError.message)
        setError('Could not load this journey. Please check the link.')
      } else {
        const result = Array.isArray(data) ? data[0] : data

        if (!result) {
          setError('Journey not found. The link may be invalid.')
        } else {
          setJourney(result)
        }
      }

      setLoading(false)
    }

    loadJourney()
  }, [])

  if (loading) {
    return <main className="journey-panel"><p>Loading shared journey...</p></main>
  }

  if (error) {
    return (
      <main className="journey-panel">
        <h1>SafeRoute — Shared Journey</h1>
        <p role="status">{error}</p>
      </main>
    )
  }

  const hasLocation =
    journey.current_lat != null && journey.current_lng != null

  return (
    <main className="journey-panel">
      <h1>SafeRoute — Shared Journey</h1>

      <p><strong>Destination:</strong> {journey.destination}</p>
      <p><strong>Status:</strong> {journey.status}</p>
      <p>
        <strong>Expected arrival:</strong>{' '}
        {new Date(journey.expected_arrival).toLocaleString()}
      </p>

      {hasLocation ? (
        <>
          <p>
            <strong>Last location update:</strong>{' '}
            {journey.last_location_at
              ? new Date(journey.last_location_at).toLocaleString()
              : 'Time unavailable'}
          </p>

          <p>
            <a
              href={`https://www.google.com/maps?q=${journey.current_lat},${journey.current_lng}`}
              target="_blank"
              rel="noreferrer"
            >
              View latest saved location on Google Maps
            </a>
          </p>
        </>
      ) : (
        <p>Location has not been shared yet.</p>
      )}

      <p>
        This page shows the latest saved location. It may not be live or
        current if location updates have stopped.
      </p>
    </main>
  )
}
