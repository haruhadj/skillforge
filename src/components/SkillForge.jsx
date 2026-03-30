import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import GameLibrary from './GameLibrary'
import GamePlayer from './GamePlayer'
import StatsPage from './StatsPage'
import StartScreen from './StartScreen'
import LoginScreen from './LoginScreen'
import SignupScreen from './SignupScreen'

function SkillForge() {
  const [currentView, setCurrentView] = useState('start')
  const [selectedGame, setSelectedGame] = useState('')
  const { currentUser, login, signup, logout } = useAuth()

  const handleLogin = async (credentials) => {
    try {
      await login(credentials.email, credentials.password)
      setCurrentView('library')
    } catch (error) {
      alert(`Login failed: ${error.message}`)
    }
  }

  const handleSignup = async (credentials) => {
    try {
      await signup(credentials.email, credentials.password)
      setCurrentView('library')
    } catch (error) {
      alert(`Signup failed: ${error.message}`)
    }
  }

  const handleLogout = async () => {
    await logout()
    setSelectedGame('')
    setCurrentView('start')
  }

  const handleAnonymousLogin = () => {
    setCurrentView('library')
  }

  // If user is authenticated, redirect to library
  useEffect(() => {
    if (currentUser && currentView === 'start') {
      setCurrentView('library')
    }
  }, [currentUser, currentView])

  return (
    <div>
      {currentView === 'start' && (
        <StartScreen
          onLoginClick={() => setCurrentView('login')}
          onSignupClick={() => setCurrentView('signup')}
          onAnonymousLogin={handleAnonymousLogin}
        />
      )}

      {currentView === 'login' && (
        <LoginScreen
          onBack={() => setCurrentView('start')}
          onSubmit={handleLogin}
        />
      )}

      {currentView === 'signup' && (
        <SignupScreen
          onBack={() => setCurrentView('start')}
          onSubmit={handleSignup}
        />
      )}

      {currentView === 'library' && (
        <GameLibrary
          onSelect={(gameId) => {
            setSelectedGame(gameId)
            setCurrentView('play')
          }}
          onLogout={handleLogout}
          onStats={() => setCurrentView('stats')}
        />
      )}

      {currentView === 'stats' && (
        <StatsPage onBack={() => setCurrentView('library')} />
      )}

      {currentView === 'play' && (
        <GamePlayer gameId={selectedGame} onBack={() => setCurrentView('library')} />
      )}
    </div>
  )
}

export default SkillForge