import PlatformApp from "@/components/platform-app";

export default async function RoutePage({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return <PlatformApp route={path.join("/")} />;
}