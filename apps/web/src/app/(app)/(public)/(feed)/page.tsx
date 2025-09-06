import { DashboardShell } from '~/app/(app)/(public)/(feed)/components/FeedShell'

const HomePage = async ({
  searchParams,
}: {
  searchParams: Promise<{ school?: string; major?: string; gradYear?: string }>
}) => {
  const params = await searchParams

  return <DashboardShell searchParams={params} />
}

export default HomePage
