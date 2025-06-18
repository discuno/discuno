import { DashboardShell } from './components/DashboardShell'

const HomePage = async ({
  searchParams,
}: {
  searchParams: Promise<{ school?: string; major?: string; gradYear?: string }>
}) => {
  const params = await searchParams

  return <DashboardShell searchParams={params} />
}

export default HomePage
