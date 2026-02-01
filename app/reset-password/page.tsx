'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { resetPassword } from '@/app/actions/auth'
import { Lock, ChevronRight, Flag, Loader2 } from 'lucide-react'
import Link from 'next/link'

function ResetPasswordForm() {
    const searchParams = useSearchParams()
    const token = searchParams.get('token')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!token) {
            setError('Missing reset token.')
            return
        }

        setLoading(true)
        setError(null)

        const formData = new FormData(e.currentTarget)
        formData.append('token', token)

        try {
            const result = await resetPassword(null, formData)
            if (result.error) {
                setError(result.error)
            } else if (result.success) {
                setSuccess(true)
            }
        } catch (err) {
            setError('A system error occurred. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    if (!token) {
        return (
            <div className="text-center">
                <p className="text-red-500 font-semibold mb-4">Invalid or missing reset token.</p>
                <Link href="/login" className="text-green-800 font-bold uppercase underline">
                    Return to Login
                </Link>
            </div>
        )
    }

    if (success) {
        return (
            <div className="text-center">
                <div className="bg-green-50 text-green-700 p-4 rounded-xl mb-6 font-semibold">
                    Password Reset Successful!
                </div>
                <p className="mb-6 text-gray-600">You can now sign in with your new password.</p>
                <Link href="/login" className="sign-in-btn" style={{ textDecoration: 'none' }}>
                    SIGN IN NOW <ChevronRight size={24} />
                </Link>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="auth-form w-full">
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
                <label className="label">New Password</label>
                <div className="input-wrapper">
                    <Lock className="input-icon" size={20} />
                    <input
                        className="input"
                        type="password"
                        name="password"
                        placeholder="••••••••"
                        required
                        minLength={4}
                    />
                </div>
            </div>

            <div className="form-group">
                <label className="label">Confirm New Password</label>
                <div className="input-wrapper">
                    <Lock className="input-icon" size={20} />
                    <input
                        className="input"
                        type="password"
                        name="confirmPassword"
                        placeholder="••••••••"
                        required
                        minLength={4}
                    />
                </div>
            </div>

            <button className="sign-in-btn" type="submit" disabled={loading}>
                {loading ? (
                    <Loader2 className="animate-spin" size={24} />
                ) : (
                    <>
                        RESET PASSWORD
                        <ChevronRight size={24} />
                    </>
                )}
            </button>
        </form>
    )
}

export default function ResetPasswordPage() {
    return (
        <main className="auth-container">
            <style jsx global>{`
                .auth-container {
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background-color: #2b7a3a;
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
                    box-shadow: 0 10px 20px rgba(27, 67, 50, 0.2);
                    transition: all 0.2s;
                    text-transform: uppercase;
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
            `}</style>

            <div className="auth-card">
                <div className="logo-container">
                    <div className="logo-icon">
                        <Flag size={20} fill="currentColor" />
                    </div>
                    <span className="logo-text">GolfLS.app</span>
                </div>

                <h1 className="welcome-title">SET NEW PASSWORD</h1>

                <Suspense fallback={<Loader2 className="animate-spin text-green-800" size={40} />}>
                    <ResetPasswordForm />
                </Suspense>
            </div>
        </main>
    )
}
