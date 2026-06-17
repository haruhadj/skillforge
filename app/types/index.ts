import { User as FirebaseUser, UserCredential } from 'firebase/auth'

// User types
export interface UserProfile {
  uid: string
  email: string | null
  username?: string
  usernameNormalized?: string
  photoURL?: string
  photoThumbURL?: string
  authProvider?: 'google' | 'password' | 'facebook' | 'unknown'
  profileCompleted?: boolean
  role?: 'admin' | 'teacher' | 'user'
  createdAt?: Date
  updatedAt?: Date
}

// Auth context types
export interface AuthContextType {
  currentUser: FirebaseUser | null
  signup: (email: string, password: string) => Promise<UserCredential>
  login: (email: string, password: string) => Promise<UserCredential>
  signInWithGoogle: () => Promise<{ method: string; result: UserCredential }>
  signInWithFacebook: () => Promise<{ method: string; result: UserCredential }>
  logout: () => Promise<void>
}

// Theme context types
export interface ThemeContextType {
  darkMode: boolean
  toggleDarkMode: () => void
}

// Game types
export interface Game {
  id: string
  name: string
  iframePath: string
  description: string
  enabled?: boolean
  category?: string
  difficulty?: 'easy' | 'medium' | 'hard'
}

export interface GameStats {
  singleplayer: {
    matchCount: number
    totalScore: number
    averageScore: number
  }
  multiplayer: {
    matchCount: number
    totalScore: number
    averageScore: number
  }
  totalMatchCount: number
  combinedAverageScore: number | null
  lastMode?: 'singleplayer' | 'multiplayer'
  lastScore?: number
  accuracyPercentage?: number
}

export interface ScoreData {
  bestScore: number
  updatedAt: Date
  bestScoreAchievedAt?: Date
}

export interface RecentActivityItem {
  gameId: string
  lastMode: 'singleplayer' | 'multiplayer' | null
  lastScore: number | null
  updatedAt: Date
}

export interface GlobalActivityItem extends RecentActivityItem {
  userId: string
  username: string
  userPhotoURL?: string
}

export interface LeaderboardEntry {
  uid: string
  bestScore: number
  updatedAt: Date
}

export interface GlobalLeaderboardEntry {
  uid: string
  totalMatchCount: number
  compositeScore: number
  gamesPlayed: number
  avgNormalizedScore: number
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'master'
}

// Announcement types
export interface Announcement {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'success'
  active: boolean
  sticky?: boolean
  linkUrl?: string
  createdAt: Date
  updatedAt: Date
}

// Admin types
export interface PlatformStats {
  totalUsers: number
  totalMatches: number
}

// Component prop types
export interface GameLibraryProps {
  onSelect: (gameId: string) => void
  onLogout: () => void
  onStats: () => void
  onLeaderboard: () => void
  onAdmin: () => void
  displayName: string
  isAdmin: boolean
}

export interface GamePlayerProps {
  gameId: string
  onBack: () => void
  playerNameOverride?: string
}

export interface LoginScreenProps {
  onBack: () => void
  onSubmit: (credentials: { email: string; password: string }) => Promise<void>
}

export interface SignupScreenProps {
  onBack: () => void
  onSubmit: (credentials: { email: string; password: string; username: string }) => Promise<void>
}

export interface StartScreenProps {
  onLoginClick: () => void
  onSignupClick: () => void
  onGoogleSignIn: () => Promise<void>
}

export interface AdminPageProps {
  onBack: () => void
}

export interface LeaderboardPageProps {
  onBack: () => void
}

export interface ProfilePageProps {
  onBack: () => void
}

export interface ErrorBoundaryProps {
  children: React.ReactNode
}

export interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}
