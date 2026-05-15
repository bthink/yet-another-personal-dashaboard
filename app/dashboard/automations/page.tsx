import { listSkills } from '@/lib/skills'
import { listAutomations } from '@/lib/automations'
import AutomationsPage from '@/components/automations/AutomationsPage'

export default async function AutomationsRoute() {
  const [skills, automations] = await Promise.all([
    listSkills().catch(() => []),
    listAutomations().catch(() => []),
  ])
  return <AutomationsPage initialSkills={skills} initialAutomations={automations} />
}
