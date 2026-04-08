import { useState, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import GameLibrary from './GameLibrary'
import GamePlayer from './GamePlayer'
import StatsPage from './StatsPage'
import StartScreen from './StartScreen'
import LoginScreen from './LoginScreen'
import SignupScreen from './SignupScreen'

function PlayRoute({ onBack }) {
  const { gameId = '' } = useParams()
  return <GamePlayer gameId={gameId} onBack={onBack} />
}

function SkillForge() {
  const navigate = useNavigate()
  const location = useLocation()
  const [guestMode, setGuestMode] = useState(false)
  const { currentUser, login, signup, logout } = useAuth()
  const canAccessGameViews = Boolean(currentUser || guestMode)

  const handleLogin = async (credentials) => {
    try {
      await login(credentials.email, credentials.password)
      setGuestMode(false)
      toast.success('Logged in successfully')
      navigate('/library', { replace: true })
    } catch (error) {
      toast.error(`Login failed: ${error.message}`)
      throw error
    }
  }

  const handleSignup = async (credentials) => {
    try {
      await signup(credentials.email, credentials.password)
      setGuestMode(false)
      toast.success('Account created successfully')
      navigate('/library', { replace: true })
    } catch (error) {
      toast.error(`Signup failed: ${error.message}`)
      throw error
    }
  }

  const handleLogout = async () => {
    try {
      if (currentUser) {
        await logout()
      }
      setGuestMode(false)
      navigate('/', { replace: true })
      toast.success('Logged out')
    } catch (error) {
      toast.error(`Logout failed: ${error.message}`)
    }
  }

  const handleAnonymousLogin = () => {
    setGuestMode(true)
    navigate('/library', { replace: true })
  }

  useEffect(() => {
    if (currentUser && location.pathname === '/') {
      navigate('/library', { replace: true })
    }
  }, [currentUser, location.pathname, navigate])

  return (
    <Routes>
      <Route
        path="/"
        element={
          <StartScreen
            onLoginClick={() => navigate('/login')}
            onSignupClick={() => navigate('/signup')}
            onAnonymousLogin={handleAnonymousLogin}
          />
        }
      />
      <Route
        path="/login"
        element={<LoginScreen onBack={() => navigate('/')} onSubmit={handleLogin} />}
      />
      <Route
        path="/signup"
        element={<SignupScreen onBack={() => navigate('/')} onSubmit={handleSignup} />}
      />
      <Route
        path="/library"
        element={
          canAccessGameViews ? (
            <GameLibrary
              onSelect={(gameId) => navigate(`/play/${gameId}`)}
              onLogout={handleLogout}
              onStats={() => navigate('/stats')}
            />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/stats"
        element={
          canAccessGameViews ? (
            <StatsPage onBack={() => navigate('/library')} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/play/:gameId"
        element={
          canAccessGameViews ? (
            <PlayRoute onBack={() => navigate('/library')} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default SkillForge