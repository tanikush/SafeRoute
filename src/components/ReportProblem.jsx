
import { useState } from 'react'
import { supabase } from '../lib/supabase'

const REPORT_TYPES = [
  'Broken streetlight',
  'Isolated stretch',
  'Blocked walkway',
  'Helpful public place',
  'Other',
]

export default function ReportProblem({ onClose }) {
  const [reportType, setReportType] = useState(REPORT_TYPES[0])
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    setIsError(false)

    try {
      // Check whether the user is logged in
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) throw userError

      if (!user) {
        throw new Error('Please log in before submitting a report.')
      }

      // Get the user's current location
      if (!navigator.geolocation) {
        throw new Error('Location is not supported by this browser.')
      }

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          () => reject(
            new Error(
              'Could not get your location. Allow location access and try again.'
            )
          ),
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 30000,
          }
        )
      })

      const { latitude, longitude } = position.coords

      // Save the report in Supabase
      const { error: insertError } = await supabase
        .from('safety_reports')
        .insert({
          user_id: user.id,
          report_type: reportType,
          description: description.trim() || null,
          latitude,
          longitude,
        })

      if (insertError) throw insertError

      setMessage('Report submitted successfully!')
      setDescription('')
      setReportType(REPORT_TYPES[0])
    } catch (error) {
      setIsError(true)
      setMessage(error.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="journey-container report-form-container">
      <h2>📝 Report a Safety Issue</h2>

      <p>
        Help the community by reporting a safety issue or a helpful public place.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="report-form-field">
          <label htmlFor="report-type">Report type</label>

          <select
            id="report-type"
            value={reportType}
            onChange={(event) => setReportType(event.target.value)}
            required
          >
            {REPORT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="report-form-field">
          <label htmlFor="report-description">
            Description (optional)
          </label>

          <textarea
            id="report-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe the safety issue..."
            maxLength={500}
            rows={4}
          />
        </div>

        <p className="report-location-note">
          📍 Your current location will be attached to this report.
          Your browser may ask for location permission.
        </p>

        <div className="report-form-actions">
          <button type="submit" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Report'}
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
        </div>

        {message && (
          <p
            role="status"
            aria-live="polite"
            style={{
              color: isError ? '#dc2626' : '#16a34a',
              marginTop: '12px',
            }}
          >
            {message}
          </p>
        )}
      </form>
    </section>
  )
}
