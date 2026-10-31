
import { useEffect, useState } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
} from 'react-leaflet'
import { supabase } from '../lib/supabase'

export default function CommunitySafetyMap() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadReports() {
      setLoading(true)
      setError('')

      try {
        const { data, error } = await supabase
          .from('safety_reports')
          .select(
            'id, report_type, description, latitude, longitude, created_at, verification_status'
          )
          .order('created_at', { ascending: false })

        if (error) throw error

        setReports(data || [])
      } catch (err) {
        setError(err.message || 'Could not load safety reports.')
      } finally {
        setLoading(false)
      }
    }

    loadReports()
  }, [])

  // Hide rejected reports from the public map
  const publicReports = reports.filter(
    (report) => report.verification_status !== 'rejected'
  )

  // Only reports with valid coordinates can appear on the map
  const validReports = publicReports.filter(
    (report) =>
      report.latitude !== null &&
      report.longitude !== null &&
      Number.isFinite(Number(report.latitude)) &&
      Number.isFinite(Number(report.longitude))
  )

  function getStatusLabel(status) {
    switch (status) {
      case 'verified':
        return '✅ Admin approved'

      case 'rejected':
        return '❌ Rejected'

      case 'pending':
      default:
        return '⏳ Pending review'
    }
  }

  return (
    <section className="journey-container">
      <h2>🗺️ Community Safety Map</h2>

      <p>
        View community safety reports. Rejected reports are hidden.
      </p>

      {loading && <p>Loading safety reports...</p>}

      {error && (
        <p role="alert">
          Could not load reports: {error}
        </p>
      )}

      {!loading && !error && publicReports.length === 0 && (
        <p>No public community reports available.</p>
      )}

      {!loading && !error && publicReports.length > 0 && (
        <>
          <p>
            {validReports.length} report location(s) available on the map.
          </p>

          {validReports.length > 0 ? (
            <MapContainer
              center={[
                Number(validReports[0].latitude),
                Number(validReports[0].longitude),
              ]}
              zoom={14}
              scrollWheelZoom
              style={{
                height: '400px',
                width: '100%',
                borderRadius: '12px',
              }}
            >
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {validReports.map((report) => (
                <Marker
                  key={report.id}
                  position={[
                    Number(report.latitude),
                    Number(report.longitude),
                  ]}
                >
                  <Popup>
                    <strong>{report.report_type}</strong>
                    <br />

                    {report.description || 'No description provided'}
                    <br />

                    <strong>Status: </strong>
                    {getStatusLabel(report.verification_status)}
                    <br />

                    <strong>Reported:</strong>{' '}
                    {new Date(report.created_at).toLocaleString()}
                    <br />

                    <small>
                      Admin approval does not guarantee that the
                      physical condition has been independently verified.
                    </small>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          ) : (
            <p>No reports with valid map locations available.</p>
          )}
        </>
      )}
    </section>
  )
}
