'use client'

interface GameCoverProps {
  /** Game id; cover assets live at /games/<id>/cover.{webp,png}. */
  gameId: string
  alt: string
  className?: string
  loading?: 'lazy' | 'eager'
}

/**
 * Game cover image with a WebP source and a PNG fallback.
 *
 * Centralizes the `/games/<id>/cover.*` convention (previously a hardcoded `cover.png`
 * <img> in ~9 places) and serves the smaller WebP to capable browsers while keeping the
 * PNG for the rest / if a .webp is missing. The <picture> uses `display:contents`
 * (Tailwind `contents`) so it adds no layout box — the <img> keeps the caller's exact
 * sizing classes. (audit R17 — WebP covers)
 */
export default function GameCover({ gameId, alt, className, loading }: GameCoverProps) {
  return (
    <picture className="contents">
      <source srcSet={`/games/${gameId}/cover.webp`} type="image/webp" />
      <img
        src={`/games/${gameId}/cover.png`}
        alt={alt}
        className={className}
        loading={loading}
        onError={(e) => {
          ;(e.currentTarget as HTMLImageElement).style.display = 'none'
        }}
      />
    </picture>
  )
}
