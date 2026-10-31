
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminReports() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [processing, setProcessing] = useState(null)

  async function loadReports() {
    setLoading(true)
    setMessage('')

    const { data, error } = await supabase
      .from('safety_reports')
      .select('id, report_type, description, latitude, longitude, created_at, verification_status')
      .order('created_at', { ascending: false })

    if (error) {
      setMessage(error.message)
    } else {
      setReports(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadReports()
  }, [])

  async function reviewReport(reportId, status) {
    setProcessing(reportId)
    setMessage('')

    const { error } = await supabase.rpc('review_safety_report', {
      p_report_id: reportId,
      p_status: status,
    })

    if (error) {
      setMessage(error.message)
    } else {
      setMessage(`Report ${status} successfully.`)
      await loadReports()
    }

    setProcessing(null)
  }

  return (
    <section className="journey-container">
      <h2>🛡️ Admin Report Review</h2>
      <p>Review community reports before confirming them.</p>

      <button onClick={loadReports}>Refresh Reports</button>

      {message && <p role="status">{message}</p>}
      {loading && <p>Loading reports...</p>}

      {!loading && reports.length === 0 && (
        <p>No reports found.</p>
      )}

      {reports.map((report) => (
        <article key={report.id} className="report-card">
          <h3>{report.report_type}</h3>

          <p>{report.description || 'No description provided'}</p>

          <p>
            Status: <strong>{report.verification_status}</strong>
          </p>

          <p>
            Location: {report.latitude}, {report.longitude}
          </p>

          <p>
            Submitted: {new Date(report.created_at).toLocaleString()}
          </p>

          {report.verification_status === 'pending' && (
            <div>
              <button
                disabled={processing === report.id}
                onClick={() => reviewReport(report.id, 'verified')}
              >
                {processing === report.id ? 'Please wait...' : 'Verify'}
              </button>

              <button
                disabled={processing === report.id}
                onClick={() => reviewReport(report.id, 'rejected')}
              >
                Reject
              </button>
            </div>
          )}
        </article>
      ))}
    </section>
  )
}
