
import AdminReports from './components/AdminReports'
import { useEffect, useState } from 'react'
import './App.css'
import 'leaflet/dist/leaflet.css'
import Auth from './Auth'
import { supabase } from './lib/supabase'
import TrustedContacts from './components/TrustedContacts'
import JourneySharing from './components/JourneySharing'
import SharedJourney from './components/SharedJourney'
import NearbyHelp from './components/NearbyHelp'
import ReportProblem from './components/ReportProblem'
import CommunitySafetyMap from './components/CommunitySafetyMap'
import SaferRoute from './components/SaferRoute'

function App() {
  const [showReport, setShowReport] = useState(false)
  const [showSaferRoute, setShowSaferRoute] = useState(false)
  const [dark, setDark] = useState(false)
  const [language, setLanguage] = useState('en')
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminChecked, setAdminChecked] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [sosLoading, setSosLoading] = useState(false)
  const [showJourney, setShowJourney] = useState(false)
  const [lateAlerts, setLateAlerts] = useState([])
  const [dismissedAlertIds, setDismissedAlertIds] = useState([])

  const isSharedJourney =
    window.location.pathname.startsWith('/shared-journey/')

  // Authentication check
  useEffect(() => {
    if (isSharedJourney) {
      setAuthLoading(false)
      return
    }

    let mounted = true

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return
      if (error) console.error(error.message)
      setUser(data.session?.user ?? null)
      setAuthLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUser(session?.user ?? null)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [isSharedJourney])

  // Admin check
  useEffect(() => {
    let mounted = true

    async function checkAdmin() {
      setIsAdmin(false)
      setAdminChecked(false)

      if (!user || isSharedJourney) {
        setAdminChecked(true)
        return
      }

      const { data, error } = await supabase
        .from('app_admins')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) {
        console.error('Admin check failed:', error.message)
      }

      if (mounted) {
        setIsAdmin(!error && !!data)
        setAdminChecked(true)
      }
    }

    checkAdmin()

    return () => {
      mounted = false
    }
  }, [user, isSharedJourney])

  // Late journey alerts
  useEffect(() => {
    if (!user || isSharedJourney) {
      setLateAlerts([])
      return
    }

    let mounted = true

    const checkLateJourneys = async () => {
      const { data, error } = await supabase
        .from('journeys')
        .select('id, destination, expected_arrival, status, late_alert_sent')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .eq('late_alert_sent', false)
        .lt('expected_arrival', new Date().toISOString())

      if (error) {
        console.error('Late journey check failed:', error)
        return
      }

      if (mounted) setLateAlerts(data || [])
    }

    checkLateJourneys()
    const timer = window.setInterval(checkLateJourneys, 30000)

    return () => {
      mounted = false
      window.clearInterval(timer)
    }
  }, [user, isSharedJourney])

  const text = {
    en: {
      subtitle: 'Your safety comes first',
      intro: 'Plan your trip and stay connected to people you trust.',
      sos: 'SOS — Get Help',
      sosNote: 'In immediate danger? Call 112 in India.',
      route: 'Find a Safer Route',
      routeDesc: 'Check your route and nearby places.',
      routeBtn: 'Check Routes',
      help: 'Find Help Nearby',
      helpDesc: 'Find police stations and hospitals.',
      helpBtn: 'Find Help',
      journey: 'Share My Journey',
      journeyDesc: 'Let someone you trust know about your trip.',
      journeyBtn: 'Plan My Journey',
      report: 'Report a Problem',
      reportDesc: 'Report a dark street or blocked path.',
      reportBtn: 'Report Problem',
      footer: 'Safety information cannot guarantee your safety.',
      language: 'Language',
      dark: '🌙 Dark',
      light: '☀️ Light',
    },
    hi: {
      subtitle: 'आपकी सुरक्षा सबसे ज़रूरी है',
      intro: 'अपना सफ़र प्लान करें और अपने भरोसेमंद लोगों से जुड़े रहें।',
      sos: 'SOS — मदद लें',
      sosNote: 'तुरंत खतरा हो तो भारत में 112 पर कॉल करें।',
      route: 'सुरक्षित रास्ता खोजें',
      routeDesc: 'रास्ता और आसपास की जगहें देखें।',
      routeBtn: 'रास्ते देखें',
      help: 'पास में मदद खोजें',
      helpDesc: 'पुलिस स्टेशन और अस्पताल खोजें।',
      helpBtn: 'मदद खोजें',
      journey: 'अपना सफ़र शेयर करें',
      journeyDesc: 'अपने भरोसेमंद व्यक्ति को सफ़र के बारे में बताएं।',
      journeyBtn: 'सफ़र प्लान करें',
      report: 'समस्या बताएं',
      reportDesc: 'अंधेरी सड़क या बंद रास्ते की जानकारी दें।',
      reportBtn: 'समस्या बताएं',
      footer: 'सुरक्षा की जानकारी सुरक्षित होने की गारंटी नहीं है।',
      language: 'भाषा',
      dark: '🌙 डार्क',
      light: '☀️ लाइट',
    },
    es: {
      subtitle: 'Tu seguridad es lo primero',
      intro: 'Planifica tu viaje y mantente en contacto con personas de confianza.',
      sos: 'SOS — Pedir ayuda',
      sosNote: 'Si estás en peligro inmediato, llama al 112 en India.',
      route: 'Buscar una ruta más segura',
      routeDesc: 'Consulta tu ruta y los lugares cercanos.',
      routeBtn: 'Ver rutas',
      help: 'Buscar ayuda cercana',
      helpDesc: 'Encuentra comisarías y hospitales.',
      helpBtn: 'Buscar ayuda',
      journey: 'Compartir mi viaje',
      journeyDesc: 'Informa a alguien de confianza sobre tu viaje.',
      journeyBtn: 'Planear viaje',
      report: 'Informar de un problema',
      reportDesc: 'Informa sobre calles oscuras o caminos bloqueados.',
      reportBtn: 'Informar',
      footer: 'La información no garantiza tu seguridad.',
      language: 'Idioma',
      dark: '🌙 Oscuro',
      light: '☀️ Claro',
    },
    fr: {
      subtitle: 'Votre sécurité avant tout',
      intro: 'Planifiez votre trajet et restez en contact avec vos proches.',
      sos: 'SOS — Demander de l’aide',
      sosNote: 'En cas de danger immédiat, appelez le 112 en Inde.',
      route: 'Trouver un trajet plus sûr',
      routeDesc: 'Consultez votre trajet et les lieux proches.',
      routeBtn: 'Voir les trajets',
      help: 'Trouver de l’aide',
      helpDesc: 'Trouvez des postes de police et des hôpitaux.',
      helpBtn: 'Trouver de l’aide',
      journey: 'Partager mon trajet',
      journeyDesc: 'Informez une personne de confiance de votre trajet.',
      journeyBtn: 'Planifier',
      report: 'Signaler un problème',
      reportDesc: 'Signalez une rue sombre ou un chemin bloqué.',
      reportBtn: 'Signaler',
      footer: 'Ces informations ne garantissent pas votre sécurité.',
      language: 'Langue',
      dark: '🌙 Sombre',
      light: '☀️ Clair',
    },
    ar: {
      subtitle: 'سلامتك أولاً',
      intro: 'خطط لرحلتك وابقَ على تواصل مع أشخاص تثق بهم.',
      sos: 'SOS — اطلب المساعدة',
      sosNote: 'في حالة الخطر الفوري، اتصل بالرقم 112 في الهند.',
      route: 'ابحث عن طريق أكثر أمانًا',
      routeDesc: 'تحقق من الطريق والأماكن القريبة.',
      routeBtn: 'عرض الطرق',
      help: 'ابحث عن مساعدة قريبة',
      helpDesc: 'اعثر على مراكز الشرطة والمستشفيات.',
      helpBtn: 'البحث عن مساعدة',
      journey: 'شارك رحلتي',
      journeyDesc: 'أخبر شخصًا تثق به عن رحلتك.',
      journeyBtn: 'خطط لرحلتك',
      report: 'الإبلاغ عن مشكلة',
      reportDesc: 'أبلغ عن شارع مظلم أو طريق مغلق.',
      reportBtn: 'إبلاغ',
      footer: 'المعلومات لا تضمن سلامتك.',
      language: 'اللغة',
      dark: '🌙 داكن',
      light: '☀️ فاتح',
    },
    zh: {
      subtitle: '安全第一',
      intro: '规划行程，并与信任的人保持联系。',
      sos: 'SOS — 寻求帮助',
      sosNote: '如遇紧急危险，请拨打印度紧急电话 112。',
      route: '查找更安全的路线',
      routeDesc: '查看路线和附近地点。',
      routeBtn: '查看路线',
      help: '查找附近帮助',
      helpDesc: '查找警察局和医院。',
      helpBtn: '查找帮助',
      journey: '分享我的行程',
      journeyDesc: '让你信任的人了解你的行程。',
      journeyBtn: '规划行程',
      report: '报告问题',
      reportDesc: '报告路灯损坏或道路堵塞。',
      reportBtn: '报告问题',
      footer: '安全信息不代表安全保证。',
      language: '语言',
      dark: '🌙 深色',
      light: '🌙 浅色',
    },
  }

  const t = text[language] || text.en

  function showDemo(feature) {
    alert(`${feature}\n\nThis feature is not connected yet.`)
  }

  async function handleSOS() {
    if (sosLoading) return

    const confirmed = window.confirm(
      'SOS Emergency\n\nGet your location and prepare an alert for a trusted contact?'
    )

    if (!confirmed) return

    if (!navigator.geolocation) {
      alert('Location unavailable. In India, call 112 in an emergency.')
      return
    }

    setSosLoading(true)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude, accuracy } = position.coords

          console.log('SafeRoute location:', {
            latitude,
            longitude,
            accuracy,
          })

          if (accuracy > 1000) {
            alert(
              `Location accurate nahi hai (${Math.round(accuracy)} metres). Please enable location services or try on your phone.`
            )
            return
          }

          const mapLink = `https://www.google.com/maps?q=${latitude},${longitude}`

          const {
            data: { user },
          } = await supabase.auth.getUser()

          if (!user) {
            alert('Please log in again.')
            return
          }

          const { data: contacts, error } = await supabase
            .from('trusted_contacts')
            .select('name, phone')
            .eq('user_id', user.id)

          if (error) throw error

          if (!contacts || contacts.length === 0) {
            alert('Please add a trusted contact first.')
            return
          }

          const message =
            `SOS — I may need help!\n` +
            `My location: ${mapLink}\n` +
            `Accuracy: approximately ${Math.round(accuracy)} metres.\n` +
            `Please contact me and check that I am safe.`

          const share = window.confirm(
            `Location obtained.\n\nTrusted contacts:\n` +
              contacts.map((c) => `${c.name}: ${c.phone}`).join('\n') +
              `\n\nOpen sharing options? No message has been sent yet.`
          )

          if (!share) return

          const contact = contacts[0]
          const phone = contact.phone.replace(/\D/g, '')
          const whatsappUrl =
            `https://wa.me/${phone}?text=${encodeURIComponent(message)}`

          window.location.href = whatsappUrl
        } catch (error) {
          alert(`SOS error: ${error.message}`)
        } finally {
          setSosLoading(false)
        }
      },
      (error) => {
        alert(
          `Could not get location: ${error.message}\nIf you are in immediate danger in India, call 112.`
        )
        setSosLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 60000,
        maximumAge: 10000,
      }
    )
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut()
    if (error) alert(error.message)
  }

  if (isSharedJourney) {
    return <SharedJourney />
  }

  if (authLoading) {
    return <main className="app">Loading SafeRoute...</main>
  }

  if (!user) {
    return <Auth onLogin={setUser} />
  }

  const visibleLateAlerts = lateAlerts.filter(
    (journey) => !dismissedAlertIds.includes(journey.id)
  )

  return (
    <main className={dark ? 'app dark' : 'app'}>
      <header className="topbar">
        <h2>🛡️ SafeRoute</h2>

        <div className="controls">
          <label className="sr-only" htmlFor="language">
            {t.language}
          </label>

          <select
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="ar">العربية</option>
            <option value="zh">中文</option>
          </select>

          <button
            className="theme-button"
            onClick={() => setDark(!dark)}
          >
            {dark ? t.light : t.dark}
          </button>

          <button onClick={handleLogout}>Logout</button>
        </div>
      </header>

      {visibleLateAlerts.length > 0 && (
        <div
          role="alert"
          style={{
            background: '#fee2e2',
            color: '#991b1b',
            padding: '16px',
            margin: '16px 0',
            borderRadius: '8px',
          }}
        >
          <strong>⚠️ Late Journey Alert!</strong>

          {visibleLateAlerts.map((journey) => (
            <p key={journey.id}>
              Your journey to <strong>{journey.destination}</strong> is overdue.
            </p>
          ))}

          <button
            type="button"
            onClick={() =>
              setDismissedAlertIds((previous) => [
                ...new Set([
                  ...previous,
                  ...visibleLateAlerts.map((journey) => journey.id),
                ]),
              ])
            }
            style={{
              background: '#991b1b',
              color: 'white',
              padding: '8px 14px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              marginTop: '8px',
            }}
          >
            Dismiss Alert
          </button>
        </div>
      )}

      <div className="dashboard-layout">
        <div className="dashboard-main">
          <section className="hero">
            <p className="eyebrow">YOUR PERSONAL SAFETY APP</p>
            <h1>{t.subtitle}</h1>
            <p className="intro">{t.intro}</p>

            <button
              className="sos"
              onClick={handleSOS}
              disabled={sosLoading}
            >
              {sosLoading ? 'Getting location...' : `🆘 ${t.sos}`}
            </button>

            <p className="notice">{t.sosNote}</p>
            <p className="demo-note">
              SOS prepares a location-sharing message. It does not
              automatically send SMS or contact emergency services.
            </p>
          </section>

          <section className="cards">
            <article className="feature route-card">
              <span className="feature-icon">🧭</span>
              <h3>{t.route}</h3>
              <p>{t.routeDesc}</p>
              <button onClick={() => setShowSaferRoute(true)}>
  {t.routeBtn} →
</button>
            </article>

            <article className="feature help-card">
              <span className="feature-icon">🤝</span>
              <h3>{t.help}</h3>
              <p>{t.helpDesc}</p>
              <button
                onClick={() =>
                  document.getElementById('nearby-help')?.scrollIntoView({
                    behavior: 'smooth',
                  })
                }
              >
                {t.helpBtn} →
              </button>
            </article>

            <article className="feature journey-card">
              <span className="feature-icon">📍</span>
              <h3>{t.journey}</h3>
              <p>{t.journeyDesc}</p>
              <button onClick={() => setShowJourney(true)}>
                {t.journeyBtn} →
              </button>
            </article>

            <article className="feature report-card">
              <span className="feature-icon">📝</span>
              <h3>{t.report}</h3>
              <p>{t.reportDesc}</p>
              <button onClick={() => setShowReport(true)}>
                {t.reportBtn} →
              </button>
            </article>
          </section>
           
          {showSaferRoute && (
  <SaferRoute onClose={() => setShowSaferRoute(false)} />
)}

          {showReport && (
            <ReportProblem onClose={() => setShowReport(false)} />
          )}

          <CommunitySafetyMap />

          {/* Only admins can see the report review dashboard */}
          {adminChecked && isAdmin && <AdminReports />}

          <section id="nearby-help" className="journey-container">
            <NearbyHelp />
          </section>

          {showJourney && (
            <section className="journey-container">
              <button
                type="button"
                className="journey-close"
                onClick={() => setShowJourney(false)}
              >
                ✕ Close
              </button>
              <JourneySharing />
            </section>
          )}
        </div>

        <aside className="dashboard-sidebar">
          <TrustedContacts />
        </aside>
      </div>

      <footer>
        <strong>SafeRoute</strong> • {t.footer}
      </footer>
    </main>
  )
}

export default App
