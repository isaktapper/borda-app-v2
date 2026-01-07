import { getActivities, getActivityStats } from './actions'
import { ActivityPageClient } from './activity-page-client'

export default async function ActivityPage() {
  const [activities, stats] = await Promise.all([
    getActivities('assigned', 'all'),
    getActivityStats('assigned')
  ])

  return <ActivityPageClient initialActivities={activities} stats={stats} />
}


