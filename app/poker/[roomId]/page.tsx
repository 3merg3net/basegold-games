// app/poker/[roomId]/page.tsx
import dynamic from 'next/dynamic';

const PokerRoomPageClient = dynamic(
  () => import('./PokerRoomPageClient'),
  {
    ssr: false,
  }
);

type PageProps = {
  params: {
    roomId: string;
  };
};

export default function PokerRoomPage({ params }: PageProps) {
  // This is rendered on the server, but it only outputs
  // a Next dynamic client island. No complex UI to hydrate.
  return <PokerRoomPageClient params={params} />;
}
