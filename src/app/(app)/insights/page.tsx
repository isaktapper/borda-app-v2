import { getInsightsData } from './actions'
import { InsightsPageClient } from './insights-page-client'

export default async function InsightsPage() {
  const data = await getInsightsData()

  return <InsightsPageClient data={data} />
}



