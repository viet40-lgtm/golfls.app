'use client'

import { useState, useEffect } from 'react'
import { login, signup, forgotPassword } from '@/app/actions/auth'
import { Mail, Lock, ChevronRight, Flag, Loader2, User, Phone } from 'lucide-react'

export default function LoginForm({ initialEmail }: { initialEmail?: string }) {
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
                    // Successful login or signup
                    window.location.href = '/live'
                }
            } else {
                setError('An unexpected response occurred.')
                setLoading(false)
            }
        } catch (err: any) {
            console.error('Auth error:', err)
            setError('An system error occurred. Please try again.')
            setLoading(false)
        }
    }

    // Prefill email if provided
    useEffect(() => {
        if (initialEmail && mode === 'login') {
            // We can optionally focus the password field here if we had a ref, 
            // but standard behavior is fine too.
        }
    }, [initialEmail, mode])

    return (
        <main className="auth-container" suppressHydrationWarning>
            <style jsx>{`
                .auth-container {
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background-color: #2b7a3a; /* Golf Green */
                    padding: 1.5rem;
                    font-family: 'Inter', system-ui, -apple-system, sans-serif;
                }

                .auth-card {
                    background: white;
                    width: 100%;
                    max-width: 440px;
                    border-radius: 40px;
                    padding: 3rem 2.5rem;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    margin-bottom: 2rem;
                }

                .logo-container {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin-bottom: 2rem;
                }

                .logo-icon {
                    background: #2b7a3a;
                    color: white;
                    padding: 0.5rem;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .logo-text {
                    font-size: 1.75rem;
                    font-weight: 700;
                    color: #1b4332;
                    letter-spacing: -0.02em;
                }

                .welcome-title {
                    font-size: 2.5rem;
                    font-weight: 900;
                    font-style: italic;
                    color: #111;
                    text-transform: uppercase;
                    margin-bottom: 2.5rem;
                    text-align: center;
                    letter-spacing: -0.01em;
                }

                .form-group {
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    margin-bottom: 1.5rem;
                }

                .auth-form {
                    width: 100%;
                }

                .label {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #888;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .input-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                .input-icon {
                    position: absolute;
                    left: 1.25rem;
                    color: #adb5bd;
                }

                .input {
                    width: 100%;
                    background: #f8f9fa;
                    border: none;
                    border-radius: 18px;
                    padding: 1.25rem 1.25rem 1.25rem 3.5rem;
                    font-size: 1rem;
                    color: #333;
                    transition: all 0.2s;
                    border: 1px solid transparent;
                }

                .input:focus {
                    outline: none;
                    background: white;
                    border-color: #2b7a3a;
                    box-shadow: 0 0 0 4px rgba(43, 122, 58, 0.1);
                }

                .sign-in-btn {
                    width: 100%;
                    background: #1b4332;
                    color: white;
                    border: none;
                    border-radius: 20px;
                    padding: 1.25rem;
                    font-size: 1.125rem;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.75rem;
                    cursor: pointer;
                    margin-top: 1rem;
                    box-shadow: 0 10px 20px rgba(27, 67, 50, 0.2);
                    transition: all 0.2s;
                    text-transform: uppercase;
                }

                .sign-in-btn:hover {
                    background: #153427;
                    transform: translateY(-2px);
                    box-shadow: 0 12px 24px rgba(27, 67, 50, 0.25);
                }

                .sign-in-btn:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                    transform: none;
                }

                .footer-links {
                    margin-top: 2rem;
                    text-align: center;
                    color: #555;
                    font-size: 0.95rem;
                }

                .link-btn {
                    background: none;
                    border: none;
                    color: #1b4332;
                    font-weight: 800;
                    text-transform: uppercase;
                    cursor: pointer;
                    padding: 0;
                    margin-left: 0.25rem;
                }

                .forgot-password {
                    background: none;
                    border: none;
                    display: block;
                    width: 100%;
                    margin-top: 1.5rem;
                    color: #adb5bd;
                    text-decoration: none;
                    font-weight: 500;
                    font-size: 0.9rem;
                    cursor: pointer;
                }
                
                .forgot-password:hover {
                    color: #1b4332;
                }

                .error-message {
                    color: #dc3545;
                    font-size: 0.875rem;
                    font-weight: 600;
                    margin-bottom: 1.5rem;
                    text-align: center;
                    width: 100%;
                    padding: 0.75rem;
                    background: #fff5f5;
                    border-radius: 12px;
                }

                .success-message {
                    color: #28a745;
                    font-size: 0.875rem;
                    font-weight: 600;
                    margin-bottom: 1.5rem;
                    text-align: center;
                    width: 100%;
                    padding: 0.75rem;
                    background: #f8fff8;
                    border-radius: 12px;
                }

                .copyright {
                    color: rgba(255, 255, 255, 0.6);
                    font-size: 0.75rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                }
            `}</style>

            <div className="auth-card">
                <div className="logo-container">
                    <div className="logo-icon">
                        <Flag size={20} fill="currentColor" />
                    </div>
                    <span className="logo-text">GolfLS.app</span>
                </div>

                <h1 className="welcome-title">
                    {mode === 'login' ? 'WELCOME BACK' : mode === 'signup' ? 'CREATE ACCOUNT' : 'RESET PASSWORD'}
                </h1>

                {error && <div className="error-message">{error}</div>}
                {successMessage && <div className="success-message">{successMessage}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    {mode === 'signup' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="form-group">
                                    <label className="label">First Name</label>
                                    <div className="input-wrapper">
                                        <User className="input-icon" size={20} />
                                        <input
                                            className="input"
                                            type="text"
                                            name="firstName"
                                            placeholder="John"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="label">Last Name</label>
                                    <div className="input-wrapper">
                                        <User className="input-icon" size={20} />
                                        <input
                                            className="input"
                                            type="text"
                                            name="lastName"
                                            placeholder="Doe"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="label">Phone Number</label>
                                <div className="input-wrapper">
                                    <Phone className="input-icon" size={20} />
                                    <input
                                        className="input"
                                        type="tel"
                                        name="phone"
                                        placeholder="(555) 555-5555"
                                        required
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    <div className="form-group">
                        <label className="label">
                            {mode === 'login' ? 'Email Address or Player ID' : 'Email Address'}
                        </label>
                        <div className="input-wrapper">
                            <Mail className="input-icon" size={20} />
                            <input
                                className="input"
                                type={mode === 'login' ? 'text' : 'email'}
                                name="email"
                                placeholder={mode === 'login' ? 'Enter email or player ID' : 'name@example.com'}
                                defaultValue={initialEmail}
                                required
                            />
                        </div>
                    </div>

                    {mode !== 'forgot' && (
                        <div className="form-group">
                            <label className="label">Password or PIN</label>
                            <div className="input-wrapper">
                                <Lock className="input-icon" size={20} />
                                <input
                                    className="input"
                                    type="password"
                                    name="password"
                                    placeholder="••••"
                                    required
                                    minLength={4}
                                />
                            </div>
                        </div>
                    )}

                    <button className="sign-in-btn" type="submit" disabled={loading}>
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

                <div className="footer-links">
                    {mode === 'login' ? (
                        <>
                            Not a member yet?
                            <button className="link-btn" onClick={() => setMode('signup')}>
                                CREATE AN ACCOUNT
                            </button>
                            <button className="forgot-password" onClick={() => setMode('forgot')}>
                                Forgot your password?
                            </button>
                        </>
                    ) : mode === 'signup' ? (
                        <>
                            Already have an account?
                            <button className="link-btn" onClick={() => setMode('login')}>
                                Sign In
                            </button>
                        </>
                    ) : (
                        <>
                            Remember your password?
                            <button className="link-btn" onClick={() => setMode('login')}>
                                Sign In
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="copyright">
                © 2026 GOLFLS.APP • ALL RIGHTS RESERVED
            </div>
        </main>
    )
}
