// app/blackjack-live/[roomId]/page.tsx
import dynamic from 'next/dynamic'

type PageProps = {
  params: { roomId: string }
}

// ✅ absolute import avoids relative/casing weirdness
const BlackjackRoomPageClient = dynamic<{ roomId: string }>(
  () => import('@/app/blackjack-live/[roomId]/BlackjackRoomPageClient'),
  { ssr: false }
)

export default function BlackjackRoomPage({ params }: PageProps) {
  return <BlackjackRoomPageClient roomId={params.roomId} />
}
