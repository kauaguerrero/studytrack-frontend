import SimuladosFounderClient from './SimuladosFounderClient';

export default async function SimuladosFounderPage({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <SimuladosFounderClient slug={slug} />;
}
