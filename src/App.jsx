
import { useEffect, useState } from 'react'
import './App.css'
import Auth from './Auth'
import { supabase } from './lib/supabase'

function App() {
  const [dark, setDark] = useState(false)
  const [language, setLanguage] = useState('en')
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
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
  }, [])

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
      demo: 'Demo only. No alert or location is shared.',
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
      demo: 'यह डेमो है। कोई अलर्ट या लोकेशन शेयर नहीं होती।',
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
      demo: 'Solo demostración. No se envían alertas ni ubicación.',
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
      demo: 'Démo uniquement. Aucune alerte ni position partagée.',
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
      demo: 'نسخة تجريبية. لا يتم إرسال تنبيه أو مشاركة الموقع.',
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
      demo: '仅供演示，不会发送警报或分享位置。',
      language: '语言',
      dark: '🌙 深色',
      light: '☀️ 浅色',
    },
  }

  const t = text[language] || text.en

  const showDemo = (feature) => {
    alert(`${feature}\n\nThis feature is not connected yet.`)
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut()
    if (error) alert(error.message)
  }

  if (authLoading) {
    return <main className="app">Loading SafeRoute...</main>
  }

  if (!user) {
    return <Auth onLogin={setUser} />
  }

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

      <section className="hero">
        <p className="eyebrow">YOUR PERSONAL SAFETY APP</p>
        <h1>{t.subtitle}</h1>
        <p className="intro">{t.intro}</p>

        <button
          className="sos"
          onClick={() =>
            alert(
              'Demo only. No alert or location is shared.\n\nIf you are in immediate danger in India, call 112.'
            )
          }
        >
          🆘 {t.sos}
        </button>

        <p className="notice">{t.sosNote}</p>
        <p className="demo-note">{t.demo}</p>
      </section>

      <section className="cards">
        <article className="feature route-card">
          <span className="feature-icon">🧭</span>
          <h3>{t.route}</h3>
          <p>{t.routeDesc}</p>
          <button onClick={() => showDemo(t.route)}>
            {t.routeBtn} →
          </button>
        </article>

        <article className="feature help-card">
          <span className="feature-icon">🤝</span>
          <h3>{t.help}</h3>
          <p>{t.helpDesc}</p>
          <button
            onClick={() =>
              window.open(
                'https://112.gov.in/',
                '_blank',
                'noopener,noreferrer'
              )
            }
          >
            {t.helpBtn} →
          </button>
        </article>

        <article className="feature journey-card">
          <span className="feature-icon">📍</span>
          <h3>{t.journey}</h3>
          <p>{t.journeyDesc}</p>
          <button onClick={() => showDemo(t.journey)}>
            {t.journeyBtn} →
          </button>
        </article>

        <article className="feature report-card">
          <span className="feature-icon">📝</span>
          <h3>{t.report}</h3>
          <p>{t.reportDesc}</p>
          <button onClick={() => showDemo(t.report)}>
            {t.reportBtn} →
          </button>
        </article>
      </section>

      <footer>
        <strong>SafeRoute</strong> • {t.footer}
      </footer>
    </main>
  )
}

export default App
