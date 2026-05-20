import { PageHeader } from "@/components/PageHeader";
import { getCurrentUser } from "@/lib/auth";
import { SonicMirrorMain } from "@/components/sonic/SonicMirrorMain";
import { SpotifyConnectCard } from "@/components/sonic/SpotifyConnectCard";

export const dynamic = "force-dynamic";

interface SearchParams {
  sp_error?: string;
  sp_synced?: string;
}

export default async function SonicMirrorPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();

  return (
    <div className="space-y-4 anim-fade-in">
      <PageHeader
        eyebrow="Shadow · Intelligence"
        title="Sonic Mirror"
        subtitle="Your music as a psychological mirror."
      />

      {user ? (
        <SonicMirrorMain
          userId={user.id}
          spError={params.sp_error}
          spSynced={params.sp_synced}
        />
      ) : (
        <SpotifyConnectCard />
      )}
    </div>
  );
}
