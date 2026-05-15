import { defaultGames } from '@/app/games/games'
import PlayGameClient from './PlayGameClient'

export function generateStaticParams() {
  return defaultGames.map((game) => ({
    gameId: game.id,
  }))
}

export default function PlayPage() {
  return <PlayGameClient />
}
