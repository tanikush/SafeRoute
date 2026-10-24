
import { useState } from 'react'
import { supabase } from './lib/supabase'
import './Auth.css'

export default function Auth({ onLogin }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignup, setIsSignup] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              display_name: fullName.trim(),
            },
          },
        })

        if (error) throw error

        setMessage(
          data.session
            ? 'Account created successfully!'
            : 'Account created! Check your email to confirm, then sign in.'
        )
        setIsSignup(false)
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

        if (error) throw error
        onLogin(data.user)
      }
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-decoration auth-decoration-one" />
      <div className="auth-decoration auth-decoration-two" />

      <section className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">🛡️</div>
          <h1>SafeRoute</h1>
          <p className="auth-tagline">Your journey. Your safety.</p>
        </div>

        <div className="auth-heading">
          <h2>{isSignup ? 'Create your account' : 'Welcome back!'}</h2>
          <p>
            {isSignup
              ? 'Join SafeRoute and take a step towards safer journeys.'
              : 'Sign in to continue to your SafeRoute account.'}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isSignup && (
            <>
              <label htmlFor="auth-name">Full name</label>
              <input
                id="auth-name"
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                autoComplete="name"
                maxLength={80}
                required
              />
            </>
          )}

          <label htmlFor="auth-email">Email address</label>
          <input
            id="auth-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            required
          />

          <label htmlFor="auth-password">Password</label>
          <div className="auth-password-wrap">
            <input
              id="auth-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="At least 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              minLength={6}
              required
            />
            <button
              className="auth-show-password"
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading
              ? 'Please wait...'
              : isSignup
                ? 'Create account →'
                : 'Sign in →'}
          </button>
        </form>

        {message && (
          <p className="auth-message" role="status">
            {message}
          </p>
        )}

        <div className="auth-switch">
          {isSignup ? 'Already have an account?' : 'New to SafeRoute?'}
          <button
            type="button"
            onClick={() => {
              setIsSignup(!isSignup)
              setMessage('')
            }}
          >
            {isSignup ? 'Sign in' : 'Create account'}
          </button>
        </div>

        <p className="auth-security">
          🔒 Your account is protected by Supabase Authentication.
        </p>
      </section>

      <p className="auth-footer">SAFE ROUTES. SMARTER JOURNEYS.</p>
    </main>
  )
}
