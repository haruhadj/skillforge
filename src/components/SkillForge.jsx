import { useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/useAuth'
import GameLibrary from './GameLibrary'
import GamePlayer from './GamePlayer'
import ProfilePage from './ProfilePage'
import StartScreen from './StartScreen'
import LoginScreen from './LoginScreen'
import SignupScreen from './SignupScreen'
import {
  claimUsername,
  createSuggestedUsername,
  ensureUserProfileDocument,
  getUserProfile,
  isValidUsername,
  resolveAuthProvider,
} from '../services/userProfileService'

function PlayRoute({ onBack, playerName }) {
  const { gameId = '' } = useParams()
  return <GamePlayer gameId={gameId} onBack={onBack} playerNameOverride={playerName} />
}

function SkillForge() {
  const navigate = useNavigate()
  const location = useLocation()
  const [userProfile, setUserProfile] = useState(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [usernameChoice, setUsernameChoice] = useState('')
  const [isCustomizingUsername, setIsCustomizingUsername] = useState(false)
  const [isSavingUsername, setIsSavingUsername] = useState(false)
  const [usernameSetupError, setUsernameSetupError] = useState('')
  const { currentUser, login, signup, logout, signInWithGoogle } = useAuth()
  const canAccessGameViews = Boolean(currentUser)

  const suggestedUsername = useMemo(() => {
    return createSuggestedUsername(
      currentUser?.displayName || currentUser?.email?.split('@')[0] || '',
    )
  }, [currentUser?.displayName, currentUser?.email])

  const needsUsernameSetup = Boolean(
    currentUser
    && profileLoaded
    && !userProfile?.username,
  )

  const activePlayerName = userProfile?.username || currentUser?.displayName || currentUser?.email || 'Player'

  const handleLogin = async (credentials) => {
    try {
      await login(credentials.email, credentials.password)
      toast.success('Logged in successfully')
      navigate('/library', { replace: true })
    } catch (error) {
      toast.error(`Login failed: ${error.message}`)
      throw error
    }
  }

  const handleSignup = async (credentials) => {
    try {
      const userCredential = await signup(credentials.email, credentials.password)
      const claimedUsername = await claimUsername(
        userCredential.user.uid,
        credentials.username,
        {
          email: userCredential.user.email || credentials.email,
          authProvider: 'password',
        },
      )

      setUserProfile((previousProfile) => ({
        ...(previousProfile || {}),
        ...claimedUsername,
        email: userCredential.user.email || credentials.email,
        authProvider: 'password',
      }))
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
      navigate('/', { replace: true })
      toast.success('Logged out')
    } catch (error) {
      toast.error(`Logout failed: ${error.message}`)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      const signInResponse = await signInWithGoogle()

      if (signInResponse?.method === 'popup') {
        toast.success('Signed in with Google')
        navigate('/library', { replace: true })
      }
    } catch (error) {
      toast.error(`Google sign-in failed: ${error.message}`)
      throw error
    }
  }

  const saveUsernameChoice = async (nextUsername) => {
    const trimmed = String(nextUsername || '').trim()

    if (!currentUser) {
      return
    }

    if (!isValidUsername(trimmed)) {
      setUsernameSetupError('Username must be 3-20 characters and use letters, numbers, or underscores only')
      return
    }

    try {
      setIsSavingUsername(true)
      setUsernameSetupError('')

      const usernameData = await claimUsername(
        currentUser.uid,
        trimmed,
        {
          email: currentUser.email || null,
          authProvider: resolveAuthProvider(currentUser),
        },
      )

      setUserProfile((previousProfile) => ({
        ...(previousProfile || {}),
        ...usernameData,
        email: currentUser.email || null,
        authProvider: resolveAuthProvider(currentUser),
      }))
      setIsCustomizingUsername(false)
      toast.success('Username saved')
    } catch (error) {
      setUsernameSetupError(error.message)
    } finally {
      setIsSavingUsername(false)
    }
  }

  const handleKeepSuggestedUsername = async () => {
    await saveUsernameChoice(suggestedUsername)
  }

  const handleSaveCustomUsername = async (event) => {
    event.preventDefault()
    await saveUsernameChoice(usernameChoice)
  }

  useEffect(() => {
    if (!currentUser) {
      setUserProfile(null)
      setProfileLoaded(true)
      setIsCustomizingUsername(false)
      setUsernameChoice('')
      setUsernameSetupError('')
      return
    }

    let isMounted = true
    setProfileLoaded(false)

    Promise.resolve()
      .then(() => ensureUserProfileDocument(currentUser))
      .then(() => getUserProfile(currentUser.uid))
      .then((profile) => {
        if (!isMounted) {
          return
        }
        setUserProfile(profile)
      })
      .catch((error) => {
        if (!isMounted) {
          return
        }
        toast.error(`Could not load profile: ${error.message}`)
      })
      .finally(() => {
        if (isMounted) {
          setProfileLoaded(true)
        }
      })

    return () => {
      isMounted = false
    }
  }, [currentUser])

  useEffect(() => {
    if (!needsUsernameSetup) {
      return
    }

    setUsernameSetupError('')
    setUsernameChoice(suggestedUsername)
    if (!isValidUsername(suggestedUsername)) {
      setIsCustomizingUsername(true)
    }
  }, [needsUsernameSetup, suggestedUsername])

  useEffect(() => {
    const authRoutes = ['/', '/login', '/signup']
    if (currentUser && authRoutes.includes(location.pathname)) {
      navigate('/library', { replace: true })
    }
  }, [currentUser, location.pathname, navigate])

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <StartScreen
              onLoginClick={() => navigate('/login')}
              onSignupClick={() => navigate('/signup')}
              onGoogleSignIn={handleGoogleSignIn}
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
                onStats={() => navigate('/profile')}
                displayName={activePlayerName}
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/profile"
          element={
            canAccessGameViews ? (
              <ProfilePage onBack={() => navigate('/library')} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/play/:gameId"
          element={
            canAccessGameViews ? (
              <PlayRoute onBack={() => navigate('/library')} playerName={activePlayerName} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {needsUsernameSetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Set your username</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">
              This will identify you on your profile and upcoming game leaderboards.
            </p>

            <div className="mt-4 rounded-xl bg-slate-100 dark:bg-gray-800 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-gray-400">Suggested</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">{suggestedUsername}</p>
            </div>

            {!isCustomizingUsername ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  className="rounded-xl bg-indigo-600 dark:bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-indigo-700 dark:hover:bg-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-200 dark:focus:ring-indigo-800 disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={handleKeepSuggestedUsername}
                  disabled={isSavingUsername}
                  type="button"
                >
                  {isSavingUsername ? 'Saving...' : 'Keep suggested'}
                </button>
                <button
                  className="rounded-xl bg-slate-100 dark:bg-gray-800 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-gray-300 transition-colors duration-200 hover:bg-slate-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-slate-200 dark:focus:ring-gray-600"
                  onClick={() => setIsCustomizingUsername(true)}
                  disabled={isSavingUsername}
                  type="button"
                >
                  Customize
                </button>
              </div>
            ) : (
              <form className="mt-5 space-y-3" onSubmit={handleSaveCustomUsername}>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700 dark:text-gray-300">Custom username</span>
                  <input
                    className="mt-2 w-full rounded-xl border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-slate-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 transition-colors duration-200 placeholder:text-slate-400 dark:placeholder:text-gray-500"
                    type="text"
                    value={usernameChoice}
                    onChange={(event) => setUsernameChoice(event.target.value)}
                    spellCheck={false}
                    autoCapitalize="off"
                    autoCorrect="off"
                    required
                  />
                </label>
                <p className="text-xs text-slate-500 dark:text-gray-400">
                  Use 3-20 characters: letters, numbers, and underscores only.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    className="rounded-xl bg-indigo-600 dark:bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-indigo-700 dark:hover:bg-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-200 dark:focus:ring-indigo-800 disabled:opacity-60 disabled:cursor-not-allowed"
                    type="submit"
                    disabled={isSavingUsername}
                  >
                    {isSavingUsername ? 'Saving...' : 'Save username'}
                  </button>
                  <button
                    className="rounded-xl bg-slate-100 dark:bg-gray-800 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-gray-300 transition-colors duration-200 hover:bg-slate-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-slate-200 dark:focus:ring-gray-600"
                    onClick={() => {
                      setIsCustomizingUsername(false)
                      setUsernameChoice(suggestedUsername)
                      setUsernameSetupError('')
                    }}
                    type="button"
                    disabled={isSavingUsername}
                  >
                    Use suggested instead
                  </button>
                </div>
              </form>
            )}

            {usernameSetupError && (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">{usernameSetupError}</p>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default SkillForge