'use client'

import { useState } from 'react'
import { login, signup, forgotPassword } from '@/app/actions/auth'
import { ChevronRight, Loader2 } from 'lucide-react'

export default function LoginForm({ initialEmail, initialPassword }: { initialEmail?: string, initialPassword?: string }) {
    const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccessMessage(null)

        const formData = new FormData(e.currentTarget)
        try {
            let result: { success?: boolean, error?: string, message?: string } | undefined;

            if (mode === 'login') {
                result = await login(null, formData)
            } else if (mode === 'signup') {
                result = await signup(null, formData)
            } else if (mode === 'forgot') {
                result = await forgotPassword(null, formData)
            }

            if (result && result.error) {
                setError(result.error)
                setLoading(false)
            } else if (result?.success) {
                if (mode === 'forgot') {
                    setSuccessMessage(result.message || 'Check your email for reset instructions.')
                    setLoading(false)
                } else {
                    window.location.href = '/live'
                }
            } else {
                setError('An unexpected response occurred.')
                setLoading(false)
            }
        } catch (err: any) {
            console.error('Auth error:', err)
            setError('A system error occurred. Please try again.')
            setLoading(false)
        }
    }

    return (
        <main
            style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                backgroundColor: '#2b7a3a',
                padding: '2rem 0.75rem',
                fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
            }}
            suppressHydrationWarning
        >
            {/* Card */}
            <div
                style={{
                    background: 'white',
                    width: '100%',
                    maxWidth: '440px',
                    borderRadius: '24px',
                    padding: '1.25rem 1rem',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    marginBottom: '2rem'
                }}
            >
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <img src="/icon-192.png" alt="GolfLS" style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '10px' }} />
                    <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1b4332', letterSpacing: '-0.02em' }}>GolfLS.app</span>
                </div>

                {/* Title */}
                <h1
                    style={{
                        fontSize: '18pt',
                        fontWeight: 900,
                        fontStyle: 'italic',
                        color: '#111',
                        textTransform: 'uppercase',
                        marginBottom: '0.5rem',
                        padding: '0.25rem 0',
                        textAlign: 'center',
                        letterSpacing: '-0.01em'
                    }}
                >
                    {mode === 'login' ? 'WELCOME BACK' : mode === 'signup' ? 'CREATE ACCOUNT' : 'RESET PASSWORD'}
                </h1>

                {/* Error Message */}
                {error && (
                    <div
                        style={{
                            color: '#dc3545',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            marginBottom: '1.5rem',
                            textAlign: 'center',
                            width: '100%',
                            padding: '0.75rem',
                            background: '#fff5f5',
                            borderRadius: '12px'
                        }}
                    >
                        {error}
                    </div>
                )}

                {/* Success Message */}
                {successMessage && (
                    <div
                        style={{
                            color: '#28a745',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            marginBottom: '1.5rem',
                            textAlign: 'center',
                            width: '100%',
                            padding: '0.75rem',
                            background: '#f8fff8',
                            borderRadius: '12px',
                            wordBreak: 'break-all'
                        }}
                    >
                        {successMessage.includes('http') ? (
                            <>
                                {successMessage.split('http')[0]}
                                <a
                                    href={'http' + successMessage.split('http')[1]}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: '#1b4332', textDecoration: 'underline', display: 'block', marginTop: '0.5rem', fontWeight: 800 }}
                                >
                                    CLICK HERE TO RESET
                                </a>
                            </>
                        ) : (
                            successMessage
                        )}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                    {/* Signup Extra Fields */}
                    {mode === 'signup' && (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                <div>
                                    <label style={labelStyle}>First Name</label>
                                    <input style={inputStyle} type="text" name="firstName" placeholder="John" required />
                                </div>
                                <div>
                                    <label style={labelStyle}>Last Name</label>
                                    <input style={inputStyle} type="text" name="lastName" placeholder="Doe" required />
                                </div>
                            </div>
                            <div style={{ marginBottom: '0.5rem' }}>
                                <label style={labelStyle}>Phone Number</label>
                                <input style={inputStyle} type="tel" name="phone" placeholder="(555) 555-5555" required />
                            </div>
                            <div style={{ marginBottom: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={labelStyle}>Index</label>
                                        <input style={inputStyle} type="number" step="0.1" name="handicapIndex" placeholder="0.0" defaultValue="0.0" />
                                    </div>
                                    <div style={{ fontSize: '15pt', fontWeight: 800, color: '#ced4da', marginTop: '1.25rem' }}>OR</div>
                                    <div style={{ flex: 1 }}>
                                        <label style={labelStyle}>Handicap</label>
                                        <input style={inputStyle} type="number" name="estimateHandicap" placeholder="0" defaultValue="0" />
                                    </div>
                                </div>
                                <p style={{ fontSize: '15pt', color: '#999', marginTop: '0.25rem', fontStyle: 'italic', lineHeight: '1.2' }}>
                                    (Index and Handicap will be calculated base on the USGA rules, after 5 rounds.)
                                </p>
                            </div>
                        </>
                    )}

                    {/* Email */}
                    <div style={{ marginBottom: '0.5rem' }}>
                        <label style={labelStyle}>Email Address</label>
                        <input
                            style={inputStyle}
                            type="email"
                            name="email"
                            placeholder="name@example.com"
                            defaultValue={initialEmail}
                            required
                        />
                    </div>

                    {/* Password */}
                    {mode !== 'forgot' && (
                        <div style={{ marginBottom: '0.5rem' }}>
                            <label style={labelStyle}>Password</label>
                            <input
                                style={inputStyle}
                                type="password"
                                name="password"
                                placeholder="••••"
                                defaultValue={initialPassword}
                                required
                                minLength={4}
                            />
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            background: '#1b4332',
                            color: 'white',
                            border: 'none',
                            borderRadius: '16px',
                            padding: '1rem',
                            fontSize: '1rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.75rem',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            marginTop: '1rem',
                            boxShadow: '0 10px 20px rgba(27, 67, 50, 0.2)',
                            textTransform: 'uppercase',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={24} />
                        ) : (
                            <>
                                {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Sign Up' : 'Send Reset Link'}
                                <ChevronRight size={24} />
                            </>
                        )}
                    </button>
                </form>

                {/* Footer Links */}
                <div style={{ marginTop: '2rem', textAlign: 'center', color: '#555', fontSize: '15pt' }}>
                    {mode === 'login' ? (
                        <>
                            Not a member yet?
                            <button onClick={() => setMode('signup')} style={linkBtnStyle}>
                                CREATE AN ACCOUNT
                            </button>
                            <button onClick={() => setMode('forgot')} style={forgotBtnStyle}>
                                Forgot your password?
                            </button>
                        </>
                    ) : mode === 'signup' ? (
                        <>
                            Already have an account?
                            <button onClick={() => setMode('login')} style={linkBtnStyle}>
                                Sign In
                            </button>
                        </>
                    ) : (
                        <>
                            Remember your password?
                            <button onClick={() => setMode('login')} style={linkBtnStyle}>
                                Sign In
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Copyright */}
            <div
                style={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em'
                }}
            >
                © 2026 GOLFLS.APP • ALL RIGHTS RESERVED
            </div>
        </main>
    )
}

// Styles as objects
const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '15pt',
    fontWeight: 700,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.1rem'
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#f8f9fa',
    border: '1px solid transparent',
    borderRadius: '14px',
    padding: '0.25rem 1rem',
    fontSize: '15pt',
    color: '#333',
    boxSizing: 'border-box'
}

const linkBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: '#1b4332',
    fontWeight: 800,
    textTransform: 'uppercase',
    cursor: 'pointer',
    padding: 0,
    marginLeft: '0.25rem'
}

const forgotBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    display: 'block',
    width: '100%',
    marginTop: '1.5rem',
    color: '#adb5bd',
    textDecoration: 'none',
    fontWeight: 500,
    fontSize: '15pt',
    cursor: 'pointer'
}
