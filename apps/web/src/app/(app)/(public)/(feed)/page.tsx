import { FeedShell } from '~/app/(app)/(public)/(feed)/components/FeedShell'

const HomePage = async ({
  searchParams,
}: {
  searchParams: Promise<{ school?: string; major?: string; gradYear?: string }>
}) => {
  const params = await searchParams

  return <FeedShell searchParams={params} />
}

export default HomePage
