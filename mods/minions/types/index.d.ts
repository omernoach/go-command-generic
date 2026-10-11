export type Phase = 'ticket' | 'grill' | 'plan' | 'build' | 'review' | 'bugbot'

export type Flow = {
  title: string
  phase: Phase
  total: number
  done: number
  isFinished: boolean
}

export type Look = 'kevin' | 'stuart' | 'bob' | 'otto' | 'mel' | 'dave' | 'tim' | 'carl' | 'gus' | 'phil' | 'ralph' | 'ron'

export type Activity = 'think' | 'read' | 'edit' | 'bash' | 'ticket'

export type RunStatus = 'running' | 'done' | 'failed'

export type MinionRun = {
  id: string
  agentId?: string
  type: string
  name: string
  look: Look
  description: string
  model: string
  status: RunStatus
  startedAt: number
  endedAt?: number
  activity: Activity
  doing: string
  tools: number
  tokens: number
  contextTokens: number
  costUsd: number
}

export type Panel = {
  isDoneCollapsed: boolean
  autoOpenedFor: string
}

declare module 'claude-code' {
  interface PluginState {
    minions: {
      flow: Flow | null
      crew: MinionRun[]
      panel: Panel
      now: number
    }
  }
}
