import dynamic from "next/dynamic";

const TournamentTableClient = dynamic(() => import("./TournamentTableClient"), { ssr: false });

type PageProps = { params: { roomId: string } };

export default function Page({ params }: PageProps) {
  return <TournamentTableClient params={params} />;
}
