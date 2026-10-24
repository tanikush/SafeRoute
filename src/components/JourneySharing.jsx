
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function JourneySharing() {
  const [destination, setDestination] = useState('')
  const [arrival, setArrival] = useState('')
  const [journey, setJourney] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [shareLink, setShareLink] = useState('')
  const watchId = useRef(null)

  useEffect(() => {
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current)
      }
    }
  }, [])

  async function startJourney(event) {
    event.preventDefault()
    setMessage('')
    setShareLink('')

    if (!navigator.geolocation) {
      setMessage('This device does not support location.')
      return
    }

    const expected = new Date(arrival)

    if (
      !destination.trim() ||
      !arrival ||
      Number.isNaN(expected.getTime()) ||
      expected <= new Date()
    ) {
      setMessage('Enter a destination and a future arrival time.')
      return
    }

    setLoading(true)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const {
            data: { user },
            error: authError,
          } = await supabase.auth.getUser()

          if (authError) throw authError
          if (!user) throw new Error('Please log in again.')

          const token = crypto.randomUUID()

          const { data, error } = await supabase
            .from('journeys')
            .insert({
              user_id: user.id,
              destination: destination.trim(),
              expected_arrival: expected.toISOString(),
              share_token: token,
              start_lat: position.coords.latitude,
              start_lng: position.coords.longitude,
              current_lat: position.coords.latitude,
              current_lng: position.coords.longitude,
              last_location_at: new Date().toISOString(),
            })
            .select()
            .single()

          if (error) throw error

          setJourney(data)
          setShareLink(
            `${window.location.origin}/shared-journey/${token}`
          )
          setMessage('Journey started successfully.')

          watchId.current = navigator.geolocation.watchPosition(
            async (pos) => {
              const { error: updateError } = await supabase
                .from('journeys')
                .update({
                  current_lat: pos.coords.latitude,
                  current_lng: pos.coords.longitude,
                  last_location_at: new Date().toISOString(),
                })
                .eq('id', data.id)
                .eq('user_id', user.id)
                .eq('status', 'active')

              if (updateError) {
                console.error(
                  'Location update failed:',
                  updateError.message
                )
              }
            },
            (err) => {
              setMessage(
                `Journey active, but location update failed: ${err.message}`
              )
            },
            {
              enableHighAccuracy: true,
              maximumAge: 10000,
              timeout: 20000,
            }
          )
        } catch (error) {
          setMessage(`Error: ${error.message}`)
        } finally {
          setLoading(false)
        }
      },
      (error) => {
        setMessage(`Could not get location: ${error.message}`)
        setLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 60000,
        maximumAge: 10000,
      }
    )
  }

  async function copyJourneyLink() {
    try {
      await navigator.clipboard.writeText(shareLink)
      setMessage('Journey link copied! Send it to your trusted contact.')
    } catch {
      setMessage('Copy the journey link from the box above.')
    }
  }

  async function finishJourney(status) {
    if (!journey) return

    const confirmed = window.confirm(
      status === 'completed'
        ? 'Mark this journey as completed?'
        : 'Cancel this journey?'
    )

    if (!confirmed) return

    setLoading(true)
    setMessage('')

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) throw authError
      if (!user) throw new Error('Please log in again.')

      const { error } = await supabase
        .from('journeys')
        .update({
          status,
          completed_at: new Date().toISOString(),
        })
        .eq('id', journey.id)
        .eq('user_id', user.id)
        .eq('status', 'active')

      if (error) throw error

      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current)
        watchId.current = null
      }

      setJourney(null)
      setShareLink('')
      setMessage(
        status === 'completed'
          ? 'Journey completed.'
          : 'Journey cancelled.'
      )
    } catch (error) {
      setMessage(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="journey-panel">
      <h2>Share My Journey</h2>
      <p>
        Start a journey, save your destination and track your
        location while this app remains active.
      </p>

      {journey ? (
        <div>
          <h3>Journey Active</h3>

          <p>
            <strong>Destination:</strong> {journey.destination}
          </p>

          <p>
            <strong>Expected arrival:</strong>{' '}
            {new Date(journey.expected_arrival).toLocaleString()}
          </p>

          <p>
            <a
              href={`https://www.google.com/maps?q=${journey.current_lat},${journey.current_lng}`}
              target="_blank"
              rel="noreferrer"
            >
              View latest saved location
            </a>
          </p>

          <label htmlFor="journey-share-link">
            Share this link with your trusted contact
          </label>

          <input
            id="journey-share-link"
            type="text"
            value={shareLink}
            readOnly
            onFocus={(event) => event.target.select()}
          />

          <button
            type="button"
            disabled={!shareLink}
            onClick={copyJourneyLink}
          >
            Copy Journey Link
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => finishJourney('completed')}
          >
            {loading ? 'Please wait...' : 'Finish Journey'}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => finishJourney('cancelled')}
          >
            Cancel Journey
          </button>
        </div>
      ) : (
        <form onSubmit={startJourney}>
          <label htmlFor="journey-destination">
            Destination
          </label>

          <input
            id="journey-destination"
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
            placeholder="Enter destination"
            required
          />

          <label htmlFor="journey-arrival">
            Expected arrival
          </label>

          <input
            id="journey-arrival"
            type="datetime-local"
            value={arrival}
            onChange={(event) => setArrival(event.target.value)}
            min={new Date(Date.now() + 60000)
              .toISOString()
              .slice(0, 16)}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? 'Starting...' : 'Start Journey'}
          </button>
        </form>
      )}

      {message && <p role="status">{message}</p>}
    </section>
  )
}
