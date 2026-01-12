import dynamic from "next/dynamic";

const TournamentPageClient = dynamic(() => import("./TournamentPageClient"), {
  ssr: false,
});

type PageProps = { params: { id: string } };

export default function TournamentPage({ params }: PageProps) {
  return <TournamentPageClient params={params} />;
}
