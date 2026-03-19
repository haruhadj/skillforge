import SkillForge from './components/SkillForge'
import { AuthProvider } from './contexts/AuthContext'

function App() {
  return (
    <AuthProvider>
      <SkillForge />
    </AuthProvider>
  )
}

export default App
