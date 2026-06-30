import PlayGameClient from './PlayGameClient'

// Dynamic so the per-request CSP nonce (middleware.ts, round 16) reaches this
// route's scripts. It previously prerendered all game host pages via
// generateStaticParams, whose baked HTML would carry no runtime nonce.
export const dynamic = 'force-dynamic'

export default function PlayPage() {
  return <PlayGameClient />
}
