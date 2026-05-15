export type Skill = {
  name: string
  description: string
  content: string
  path: string
}

export type InputDef = {
  key: string
  label: string
  type: 'text' | 'vault-file' | 'inbox-item' | 'todo-item'
  required: boolean
}

export type Automation = {
  id: string
  name: string
  description: string
  script: string
  schedule: string | null
  inputs: InputDef[]
  createdAt: string
  updatedAt: string
}

export type RunLog = {
  runId: string
  automationId: string
  startedAt: string
  finishedAt: string
  status: 'ok' | 'error' | 'running'
  inputs: Record<string, string>
  output: string
  exitCode: number
}
