import SkillForge from './components/SkillForge'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SkillForge />
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
