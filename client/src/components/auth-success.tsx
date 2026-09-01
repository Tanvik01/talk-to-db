import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

interface User {
    id: number
    email: string
    username?: string
    avatar?: string
}

interface AuthSuccessProps {
    onAuthSuccess: (token: string, user: User) => void
}

function AuthSuccess({ onAuthSuccess }: AuthSuccessProps) {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()

    useEffect(() => {
        const token = searchParams.get('token')
        const username = searchParams.get('username')
        const avatar = searchParams.get('avatar')
        const email = searchParams.get('email')

        if (token) {
            // Store the token
            localStorage.setItem('authToken', token)

            // Create user object with GitHub profile info
            const user: User = {
                id: 0,
                email: email || 'GitHub User',
                username: username || undefined,
                avatar: avatar || undefined
            }
            localStorage.setItem('user', JSON.stringify(user))

            // Notify App that auth succeeded
            onAuthSuccess(token, user)

            // Redirect to the main dashboard
            navigate('/')
        } else {
            // No token found, redirect back to login
            navigate('/')
        }
    }, [searchParams, navigate, onAuthSuccess])

    return (
        <div className="landing-container">
            <div className="auth-box" style={{ textAlign: 'center' }}>
                <h2 style={{ color: '#fff', marginBottom: '16px' }}>Completing Login...</h2>
                <p style={{ color: '#aaa' }}>Please wait a moment.</p>
                <div style={{ marginTop: '20px' }}>
                    <div className="spinner" style={{
                        width: '40px',
                        height: '40px',
                        border: '3px solid rgba(255,255,255,0.1)',
                        borderTop: '3px solid #10b981',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto'
                    }} />
                </div>
            </div>
            <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    )
}

export default AuthSuccess
