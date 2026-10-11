import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Activity, Flow, Look, MinionRun, Panel, Phase } from '../types'
import { activityOf, minion, MINION_CSS } from './minion'

const flow = atom({ plugin: 'minions', key: 'flow' } as const, null)
const crew = atom({ plugin: 'minions', key: 'crew' } as const, [])
const panel = atom({ plugin: 'minions', key: 'panel' } as const, { isDoneCollapsed: false, autoOpenedFor: '' })
const now = atom({ plugin: 'minions', key: 'now' } as const, 0)

const PROGRESS_TOOL = 'mcp__minions__progress'
const PANE = 'minion-crew'
const PHASES: readonly Phase[] = ['ticket', 'grill', 'plan', 'build', 'review', 'bugbot']
const PHASE_LABEL: Record<Phase, string> = {
  ticket: 'Ticket',
  grill: 'Grill',
  plan: 'Plan',
  build: 'Build',
  review: 'Review',
  bugbot: 'BugBot',
}
// What the band's minion acts out during each phase.
const PHASE_ACTIVITY: Record<Phase, Activity> = {
  ticket: 'ticket',
  grill: 'think',
  plan: 'ticket',
  build: 'edit',
  review: 'read',
  bugbot: 'bash',
}
const YELLOW = '#F5C542'
const DENIM = '#1F4E9A'
const DONE = '#3B9C5F'
const FAILED = '#D0453F'
const FONT = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',sans-serif"

const ROSTER: Record<string, { name: string; look: Look; role: string; phase: Phase }> = {
  'ticket-planner': { name: 'Bob', look: 'bob', role: 'reads the ticket', phase: 'ticket' },
  'plan-reviewer': { name: 'Carl', look: 'carl', role: 'checks the plan', phase: 'plan' },
  reviewer: { name: 'Kevin', look: 'kevin', role: 'reviews the branch', phase: 'review' },
}
const STUART = { name: 'Stuart', look: 'stuart' as const, role: 'scouts the code' }
const HELPERS: Look[] = ['dave', 'otto', 'tim', 'mel', 'gus', 'phil', 'ralph', 'ron']
const nameOf = (look: Look): string => look.charAt(0).toUpperCase() + look.slice(1)

const bareType = (type: string): string => type.replace(/^[^:]*:/, '')

const roleOf = (r: MinionRun): string =>
  ROSTER[bareType(r.type)]?.role ?? (r.type === 'Explore' ? STUART.role : bareType(r.type))

// USD per million tokens: input, output, cache read, cache write. An estimate, not a bill.
const PRICES: [RegExp, [number, number, number, number]][] = [
  [/fable|mythos/, [10, 50, 0.25, 12.5]],
  [/opus-5-5/, [4, 20, 0.2, 5]],
  [/opus/, [5, 25, 0.5, 6.25]],
  [/sonnet/, [2, 10, 0.2, 2.5]],
  [/haiku/, [1, 5, 0.1, 1.25]],
]

type Usage = {
  input_tokens: number
  output_tokens: number
  cache_read_input_tokens: number
  cache_creation_input_tokens: number
}

const tokensOf = (u: Usage): number =>
  (u.input_tokens || 0) + (u.output_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0)

const costOf = (model: string, u: Usage): number => {
  const [i, o, r, w] = PRICES.find(([re]) => re.test(model.toLowerCase()))?.[1] ?? [4, 20, 0.2, 5]
  return (
    ((u.input_tokens || 0) * i +
      (u.output_tokens || 0) * o +
      (u.cache_read_input_tokens || 0) * r +
      (u.cache_creation_input_tokens || 0) * w) /
    1e6
  )
}

const modelName = (id: string): string => {
  const m = /(fable|mythos|opus|sonnet|haiku)-(\d+)(?:-(\d{1,2})(?!\d))?/i.exec(id)
  const [, family = '', major = '', minor] = m ?? []
  if (!family) return id.replace(/^claude-/, '').replace(/\[.*\]$/, '') || '—'
  return `${family.charAt(0).toUpperCase()}${family.slice(1).toLowerCase()} ${major}${minor ? '.' + minor : ''}`
}

const fmtTokens = (n: number): string =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : `${Math.round(n)}`
const fmtCost = (usd: number): string => `$${usd < 10 ? usd.toFixed(2) : usd.toFixed(1)}`
const fmtTime = (ms: number): string => {
  const s = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
const elapsed = (r: MinionRun, at: number): number => (r.endedAt ?? Math.max(at, r.startedAt)) - r.startedAt

const xml = (s: string): string =>
  s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c)
const charEm = (ch: string): number => (/[\s.,:;'|!il1()[\]]/.test(ch) ? 0.3 : /[A-Zmw@%]/.test(ch) ? 0.72 : 0.56)
const textWidth = (s: string, size: number): number => [...s].reduce((w, ch) => w + charEm(ch) * size, 0)
const fitText = (s: string, size: number, maxW: number): string => {
  if (textWidth(s, size) <= maxW) return s
  let out = ''
  for (const ch of s) {
    if (textWidth(out + ch + '…', size) > maxW) break
    out += ch
  }
  return out + '…'
}

const CSS = `<style>
.t{fill:#1f1f1f}.s{fill:#6b6b68}.m{fill:#9a9a96}.k{fill:#ecebe8}.ln{stroke:#e4e4e1}.tile{fill:#f4f3f0}
@media (prefers-color-scheme: dark){.t{fill:#ececec}.s{fill:#a8a8a4}.m{fill:#7d7d79}.k{fill:#2c2c2b}.ln{stroke:#333331}.tile{fill:#262625}}
.live{animation:p 1s ease-in-out infinite}@keyframes p{50%{opacity:.45}}
@media (prefers-reduced-motion: reduce){.live{animation:none}}
</style>`

const svg = (W: number, H: number, body: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${CSS}${MINION_CSS}${body}</svg>`

// ---------------------------------------------------------------------------
// Band above the prompt: the whole /go flow as one bar, a banana riding its head.

const phaseText = (f: Flow, p: Phase): string =>
  p === 'build' && f.total && f.phase === 'build' ? `Build ${f.done}/${f.total}` : PHASE_LABEL[p]

const label = (f: Flow): string => (f.isFinished ? 'Done' : phaseText(f, f.phase))

// Each phase is a sixth of the bar; Build fills its sixth task by task.
const ratio = (f: Flow): number => {
  if (f.isFinished) return 1
  const within = f.phase === 'build' && f.total ? f.done / f.total : 0
  return (PHASES.indexOf(f.phase) + within) / PHASES.length
}

// Deterministic noise so the dither does not shimmer between redraws.
const noise = (x: number, y: number): number => {
  const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
  return v - Math.floor(v)
}

const BAND_H = 22
const BAR_H = 16
const CELL = 3
const BANANA = ['.....N', '....YN', '....YY', '...YYy', '.YYYy.', 'yyy...']
const BANANA_INK: Record<string, string> = { Y: YELLOW, y: '#DDA92A', N: '#7A4A26' }

const bananaSvg = (x: number, y: number, isBouncing: boolean): string =>
  `<g class="${isBouncing ? 'nana' : ''}" shape-rendering="crispEdges">${BANANA.flatMap((row, dy) =>
    [...row].map((ch, dx) =>
      BANANA_INK[ch] ? `<rect x="${x + dx * 2.5}" y="${y + dy * 2.5}" width="2.5" height="2.5" fill="${BANANA_INK[ch]}"/>` : '',
    ),
  ).join('')}</g>`

const bandSvg = (f: Flow, W: number): string => {
  const title = fitText(f.title, 13, Math.max(60, W * 0.3))
  const minionW = 22
  const barX = Math.round(16 + textWidth(title, 13) + 12)
  const barW = Math.max(80, W - barX - 44 - minionW)
  const y0 = (BAND_H - BAR_H) / 2
  const fillW = Math.round(barW * ratio(f))

  // Dithered banana-yellow fill: sparse at the start, dense toward the head.
  const dots: string[] = []
  const cols = Math.floor(fillW / CELL)
  for (let c = 0; c < cols; c++) {
    const density = 0.35 + 0.6 * Math.pow(c / Math.max(1, cols), 1.2)
    for (let r = 0; r < BAR_H / CELL; r++) {
      if (noise(c, r) < density)
        dots.push(`<rect class="t${Math.floor(noise(r, c) * 4)}" x="${c * CELL + 1}" y="${r * CELL + 1}" width="2" height="2" fill="${noise(c + 3, r) < 0.25 ? '#DDA92A' : YELLOW}"/>`)
    }
  }
  const ticks = PHASES.slice(1)
    .map((_, i) => Math.round((barW * (i + 1)) / PHASES.length))
    .filter(x => x > fillW + 4)
    .map(x => `<rect x="${x}" y="${BAR_H / 2 - 4}" width="1.5" height="8" rx=".75"/>`)
    .join('')

  const text = label(f)
  const pillW = Math.round(18 + text.length * 6.4)
  const bx = Math.max(0, Math.min(barW - 15, fillW - 8))
  const pillX = bx - pillW - 3 >= 0 ? bx - pillW - 3 : Math.min(barW - pillW, bx + 18)
  const look: Look = f.isFinished ? 'bob' : f.phase === 'review' ? 'kevin' : f.phase === 'plan' ? 'carl' : 'bob'

  return svg(
    W,
    BAND_H,
    `<style>
.t0,.t1,.t2,.t3{animation:tw 2s ease-in-out infinite}.t1{animation-delay:-.5s}.t2{animation-delay:-1s}.t3{animation-delay:-1.5s}
@keyframes tw{0%,100%{opacity:1}50%{opacity:.35}}
.nana{animation:nb .5s steps(1) infinite}@keyframes nb{50%{transform:translateY(-1px)}}
.tk{fill:#b4b4b0}@media (prefers-color-scheme: dark){.tk{fill:#5a5a5a}}
@media (prefers-reduced-motion: reduce){.t0,.t1,.t2,.t3,.nana{animation:none}}
</style>
<defs><clipPath id="bar"><rect width="${barW}" height="${BAR_H}" rx="${BAR_H / 2}"/></clipPath></defs>
<circle cx="5" cy="${BAND_H / 2}" r="4" fill="${f.isFinished ? DONE : YELLOW}"/>
<text class="t" x="16" y="${BAND_H / 2 + 4.5}" font-family="${FONT}" font-size="13" font-weight="500">${xml(title)}</text>
<g transform="translate(${barX},${y0})">
<rect class="k" width="${barW}" height="${BAR_H}" rx="${BAR_H / 2}"/>
<g clip-path="url(#bar)">${dots.join('')}<g class="tk">${ticks}</g></g>
<rect x="${pillX}" width="${pillW}" height="${BAR_H}" rx="${BAR_H / 2}" fill="${f.isFinished ? DONE : DENIM}"/>
<text x="${pillX + pillW / 2}" y="${BAR_H / 2 + 4}" text-anchor="middle" font-family="${FONT}" font-size="11" font-weight="600" fill="#ffffff">${xml(text)}</text>
${bananaSvg(bx, 0, !f.isFinished)}
</g>
<text class="m" x="${W - minionW - 4}" y="${BAND_H / 2 + 4.5}" text-anchor="end" font-family="${FONT}" font-size="12.5" font-variant-numeric="tabular-nums">${Math.round(ratio(f) * 100)}%</text>
${minion(W - minionW + 2, 0, look, PHASE_ACTIVITY[f.phase], f.isFinished ? 'done' : 'running', 0.85)}`,
  )
}

const barText = (f: Flow, width: number): string => {
  const filled = Math.round(width * ratio(f))
  return '█'.repeat(Math.max(0, filled - 1)) + '🍌' + '░'.repeat(Math.max(0, width - filled))
}

// ---------------------------------------------------------------------------
// Crew pane.

const totals = (list: MinionRun[], at: number) => {
  const cost = list.reduce((s, r) => s + r.costUsd, 0)
  const tokens = list.reduce((s, r) => s + r.tokens, 0)
  const start = Math.min(...list.map(r => r.startedAt))
  const end = Math.max(...list.map(r => r.endedAt ?? Math.max(at, r.startedAt)))
  return { cost, tokens, time: list.length ? end - start : 0 }
}

const headerSvg = (W: number, title: string, t: ReturnType<typeof totals>): string => {
  const gap = 6
  const tw = (W - gap * 2) / 3
  const top = title ? 28 : 0
  const tile = (i: number, k: string, v: string) =>
    `<rect class="tile" x="${i * (tw + gap)}" y="${top}" width="${tw}" height="40" rx="8"/>
<text class="s" x="${i * (tw + gap) + 9}" y="${top + 16}" font-family="${FONT}" font-size="11">${k}</text>
<text class="t" x="${i * (tw + gap) + 9}" y="${top + 33}" font-family="${FONT}" font-size="15" font-weight="600" font-variant-numeric="tabular-nums">${v}</text>`
  return svg(
    W,
    title ? 72 : 44,
    `${title ? `<text class="t" x="0" y="15" font-family="${FONT}" font-size="14" font-weight="600">🍌 ${xml(fitText(title, 14, W - 24))}</text>` : ''}
${tile(0, 'Cost', '≈' + fmtCost(t.cost))}${tile(1, 'Tokens', fmtTokens(t.tokens))}${tile(2, 'Time', fmtTime(t.time))}`,
  )
}

const statusMark = (x: number, y: number, status: MinionRun['status']): string => {
  if (status === 'running') return `<circle class="live" cx="${x}" cy="${y}" r="3.5" fill="${YELLOW}"/>`
  if (status === 'done')
    return `<path d="M${x - 5} ${y}l3.5 3.5 6.5-7" fill="none" stroke="${DONE}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`
  return `<path d="M${x - 4} ${y - 4}l8 8M${x + 4} ${y - 4}l-8 8" stroke="${FAILED}" stroke-width="1.8" stroke-linecap="round"/>`
}

const ROW_H = 60

const rowLine = (r: MinionRun, at: number): string =>
  r.status === 'running'
    ? r.doing
    : `${r.status === 'done' ? 'done' : 'failed'} in ${fmtTime(elapsed(r, at))} · ${r.tools} tools`

const minionSvg = (W: number, r: MinionRun, at: number): string => {
  const textW = W - 50 - 22
  const stats = `${fmtTokens(r.tokens)}  ≈${fmtCost(r.costUsd)}  ${fmtTime(elapsed(r, at))}`
  const color = r.status === 'failed' ? FAILED : r.status === 'done' ? DONE : DENIM
  return svg(
    W,
    ROW_H,
    `${minion(0, 5, r.look, r.activity, r.status)}
<text x="50" y="16" font-family="${FONT}" font-size="13"><tspan class="t" font-weight="700">${xml(r.name)}</tspan><tspan class="s">  ${xml(fitText(r.description, 13, textW - textWidth(r.name, 13) - 12))}</tspan></text>
<text x="50" y="32" font-family="${FONT}" font-size="11"><tspan fill="${color}" font-weight="600">${xml(roleOf(r))}</tspan><tspan class="s">  ·  ${xml(modelName(r.model))}</tspan></text>
<text class="t" x="50" y="48" font-family="${FONT}" font-size="11.5">${xml(fitText(rowLine(r, at), 11.5, textW - textWidth(stats, 11) - 10))}</text>
<text class="m" x="${W - 2}" y="48" text-anchor="end" font-family="${FONT}" font-size="11" font-variant-numeric="tabular-nums">${stats}</text>
${statusMark(W - 8, 14, r.status)}
<line class="ln" x1="0" y1="${ROW_H - 0.5}" x2="${W}" y2="${ROW_H - 0.5}"/>`,
  )
}

const STATUS_GLYPH: Record<MinionRun['status'], string> = { running: '●', done: '✓', failed: '✗' }
const ACTIVITY_GLYPH: Record<Activity, string> = { think: '💭', read: '🔍', edit: '🔨', bash: '💻', ticket: '📋' }

async function togglePane($: EngineInterface): Promise<boolean> {
  if ((await $.ui.panes()).some(p => p.id === PANE)) {
    await $.ui.close({ id: PANE })
    return false
  }
  const at = await $.clock.now()
  await update($, now, () => at)
  await $.ui.open({ id: PANE, title: 'Minion crew' })
  return true
}

async function autoOpen($: EngineInterface, key: string): Promise<void> {
  const p = await read($, panel)
  if (p.autoOpenedFor === key) return
  await update($, panel, prev => ({ ...prev, autoOpenedFor: key }))
  void $.ui.open({ id: PANE, title: 'Minion crew' })
}

type ProgressInput = { title?: string; phase?: Phase; total?: number; done?: number; finished?: boolean }

const blank = (): Flow => ({ title: '/go', phase: 'ticket', total: 0, done: 0, isFinished: false })

// A flow the band started on its own (title '/go') adopts the first real title.
const isNewFlow = (prev: Flow | null, input: ProgressInput): boolean =>
  !prev || prev.isFinished || (input.title !== undefined && prev.title !== '/go' && input.title.trim() !== prev.title)

const merge = (prev: Flow | null, input: ProgressInput): Flow => {
  const base = isNewFlow(prev, input) || !prev ? blank() : prev
  const total = Math.max(0, Math.round(input.total ?? base.total))
  return {
    title: input.title?.trim() || base.title,
    phase: input.phase && PHASES.includes(input.phase) ? input.phase : base.phase,
    total,
    done: Math.min(total || Infinity, Math.max(0, Math.round(input.done ?? base.done))),
    isFinished: input.finished === true,
  }
}

// ---------------------------------------------------------------------------
// Demo crew: every look and every prop at once.

function demoCrew(t: number): MinionRun[] {
  const run = (
    id: string,
    type: string,
    name: string,
    look: Look,
    description: string,
    model: string,
    status: MinionRun['status'],
    agoS: number,
    tookS: number | null,
    activity: Activity,
    doing: string,
  ): MinionRun => ({
    id,
    type,
    name,
    look,
    description,
    model,
    status,
    startedAt: t - agoS * 1000,
    endedAt: tookS === null ? undefined : t - (agoS - tookS) * 1000,
    activity,
    doing,
    tools: Math.round(agoS / 6),
    tokens: agoS * 1400,
    contextTokens: agoS * 900,
    costUsd: agoS * 0.004,
  })
  return [
    run('demo-bob', 'ticket-planner', 'Bob', 'bob', 'Read IL-140231', 'claude-sonnet-5-5', 'done', 540, 41, 'ticket', ''),
    run('demo-stuart', 'Explore', 'Stuart', 'stuart', 'Where is CacheTtl read', 'claude-haiku-5-5', 'done', 470, 30, 'read', ''),
    run('demo-carl', 'plan-reviewer', 'Carl', 'carl', 'Validate the plan', 'claude-opus-5-5', 'done', 420, 95, 'read', ''),
    run('demo-dave', 'general-purpose', 'Dave', 'dave', 'Task 1: add CacheTtl config', 'claude-haiku-5-5', 'running', 120, null, 'edit', 'editing GlobalCacheHostConfiguration.cs'),
    run('demo-otto', 'general-purpose', 'Otto', 'otto', 'Task 2: wire the validator', 'claude-sonnet-5-5', 'running', 95, null, 'bash', 'running dotnet test Cache.Tests'),
    run('demo-tim', 'general-purpose', 'Tim', 'tim', 'Task 3: migration', 'claude-sonnet-5-5', 'running', 60, null, 'think', 'reading the brief'),
    run('demo-kevin', 'reviewer', 'Kevin', 'kevin', 'Review IL-140231-cache-ttl', 'claude-opus-5-5', 'running', 38, null, 'read', 'searching "CacheTtl"'),
    run('demo-phil', 'general-purpose', 'Phil', 'phil', 'Fix BugBot comments', 'claude-sonnet-5-5', 'failed', 300, 70, 'bash', ''),
  ]
}

async function demoStep($: EngineInterface, id: string, patch: Partial<MinionRun>): Promise<void> {
  const at = await $.clock.now()
  await update($, crew, list =>
    list.map(r => (r.id === id ? { ...r, ...patch, ...(patch.status && patch.status !== 'running' ? { endedAt: at } : {}) } : r)),
  )
}

// ---------------------------------------------------------------------------

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    await $.tool.register({
      name: 'progress',
      description:
        "Report /go progress to the minion band above the prompt. Call it when /go starts (title: the ticket ID or a few words, phase), on every phase change (ticket, grill, plan, build, review, bugbot), with total once the plan's task count is known and done as each task passes review, and once at the end with finished: true. Fields left out keep their previous value.",
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'The ticket ID, or a few words for a quick win.' },
          phase: { type: 'string', enum: [...PHASES] },
          total: { type: 'integer', minimum: 0, description: 'Number of plan tasks.' },
          done: { type: 'integer', minimum: 0, description: 'Tasks that passed review.' },
          finished: { type: 'boolean', description: 'True once /go has ended.' },
        },
      },
    })
    await $.command.register({
      name: 'minions',
      description: 'Show or hide the minion crew panel (demo: a fake crew to look at, clear: empty it)',
      argumentHint: '[demo|clear]',
    })
    $.clock.every(1000, () => {
      void (async () => {
        if (!(await read($, crew)).some(r => r.status === 'running')) return
        const at = await $.clock.now()
        await update($, now, () => at)
      })()
    })
    return started
  })

  on('command.run', { command: 'minions' }, async ($, e) => {
    const arg = e.args.trim()
    if (arg === 'clear') {
      await update($, crew, () => [])
      await update($, flow, () => null)
      return { text: '🍌 Crew dismissed.' }
    }
    if (arg !== 'demo') return { text: (await togglePane($)) ? '🍌 Bello! Crew panel opened.' : '🍌 Crew panel closed.' }

    const at = await $.clock.now()
    await update($, crew, () => demoCrew(at))
    await update($, flow, () => ({ title: 'IL-140231 cache TTL', phase: 'build', total: 3, done: 0, isFinished: false }))
    await update($, now, () => at)
    await $.ui.open({ id: PANE, title: 'Minion crew' })
    $.clock.after(4000, () => void demoStep($, 'demo-tim', { activity: 'read', doing: 'reading MigrationsModule.cs' }))
    $.clock.after(7000, () => void demoStep($, 'demo-dave', { status: 'done' }))
    $.clock.after(7000, () => void update($, flow, f => (f ? { ...f, done: 1 } : f)))
    $.clock.after(9000, () => void demoStep($, 'demo-otto', { activity: 'edit', doing: 'editing CacheTtlValidator.cs' }))
    $.clock.after(12000, () => void demoStep($, 'demo-tim', { activity: 'ticket', doing: 'using superpowers:test-driven-development' }))
    $.clock.after(16000, () => void demoStep($, 'demo-kevin', { status: 'done' }))
    return { text: '🍌 Bello! Demo crew assembled.' }
  })

  on('tool.call', { tool: PROGRESS_TOOL }, async ($, e) => {
    const input = e as unknown as ProgressInput
    if (isNewFlow(await read($, flow), input) && input.title !== undefined) await update($, crew, list => list.filter(r => r.status === 'running'))
    const next = await update($, flow, p => merge(p, input))
    if (next && !next.isFinished) await autoOpen($, next.title)
    return { result: `ok: ${next ? `${next.title} · ${PHASE_LABEL[next.phase]}` : 'cleared'}` }
  })

  // What each subagent is doing right now: the prop on its minion and the line under it.
  on('tool.call', async ($, e, next) => {
    const agentId = e.agentId
    if (agentId !== undefined) {
      const { activity, doing } = activityOf(String(e.tool), e as unknown as Record<string, unknown>)
      await update($, crew, list =>
        list.map(r => (r.agentId === agentId ? { ...r, activity, doing, tools: r.tools + 1 } : r)),
      )
    }
    return next(e)
  })

  on('agent.spawn', async ($, e, next) => {
    const started = await next(e)
    if (started.deny !== undefined) return started

    const type = bareType(e.subagentType)
    const named = ROSTER[type]
    const at = await $.clock.now()
    await update($, crew, list => {
      const helpers = list.filter(r => HELPERS.includes(r.look)).length
      const look = HELPERS[helpers % HELPERS.length] ?? 'dave'
      const who = named ?? (type === 'Explore' ? STUART : { name: nameOf(look), look })
      const run: MinionRun = {
        id: started.agentId ?? e.tool_use_id,
        agentId: started.agentId,
        type: e.subagentType,
        name: who.name,
        look: who.look,
        description: e.description,
        model: started.model,
        status: 'running',
        startedAt: at,
        activity: 'think',
        doing: 'reading the brief',
        tools: 0,
        tokens: 0,
        contextTokens: 0,
        costUsd: 0,
      }
      return [...list.filter(r => r.id !== run.id && !r.id.startsWith('demo-')), run].slice(-100)
    })
    await update($, now, () => at)

    // A named /go minion moves the band forward even if the orchestrator never reports.
    if (named) {
      const f = await update($, flow, prev => {
        const base = prev && !prev.isFinished ? prev : blank()
        return PHASES.indexOf(named.phase) > PHASES.indexOf(base.phase) || base !== prev ? { ...base, phase: named.phase } : base
      })
      if (f) await autoOpen($, f.title)
    }
    return started
  })

  on('turn.step', async function* ($, e, next) {
    const result = yield* next(e)
    const agentId = e.agentId
    const usage = result.usage
    if (!agentId || !usage) return result
    const model = usage.model || e.model
    await update($, crew, list =>
      list.map(r =>
        r.agentId !== agentId
          ? r
          : { ...r, model, contextTokens: tokensOf(usage), tokens: r.tokens + tokensOf(usage), costUsd: r.costUsd + costOf(model, usage) },
      ),
    )
    return result
  })

  on('turn.complete', async ($, e, next) => {
    const agentId = e.agentId
    if (agentId) {
      const at = await $.clock.now()
      await update($, crew, list =>
        list.map(r => (r.agentId === agentId ? { ...r, status: e.reason === 'answer' ? ('done' as const) : ('failed' as const), endedAt: at } : r)),
      )
      await update($, now, () => at)
    }
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Text, Button } = ui
    const list = await read($, crew)
    const f = await read($, flow)
    const p: Panel = await read($, panel)
    const at = Math.max(await read($, now), ...list.map(r => r.startedAt), 0)
    const running = list.filter(r => r.status === 'running').reverse()
    const finished = list.filter(r => r.status !== 'running').reverse()
    const t = totals(list, at)
    const title = f && !f.isFinished ? f.title : ''

    const toggleDone = (
      <Button
        key="done"
        label={`${p.isDoneCollapsed ? '▸' : '▾'} Finished · ${finished.length}`}
        plain
        onPress={() => update($, panel, prev => ({ ...prev, isDoneCollapsed: !prev.isDoneCollapsed }))}
      />
    )
    const empty = <Text dimColor>No minions at work yet. Run /go, or /minions demo to meet the crew.</Text>

    if (e.surface === 'desktop' && 'Svg' in ui) {
      const { Svg } = ui
      const W = Math.max(260, Math.min(900, (e.props.bodyColumns || 40) * 8 - 8))
      const rowOf = (r: MinionRun) => (
        <Svg key={r.id} source={minionSvg(W, r, at)} alt={`${r.name}, ${roleOf(r)}: ${rowLine(r, at)}`} width={W} height={ROW_H} />
      )
      return (
        <Box flexDirection="column">
          <Svg source={headerSvg(W, title, t)} alt={`${title} ≈${fmtCost(t.cost)}, ${fmtTokens(t.tokens)} tokens, ${fmtTime(t.time)}`} width={W} height={title ? 72 : 44} />
          {list.length === 0 && empty}
          {running.length > 0 && <Text dimColor>Working · {running.length}</Text>}
          {running.map(rowOf)}
          {finished.length > 0 && toggleDone}
          {!p.isDoneCollapsed && finished.map(rowOf)}
        </Box>
      )
    }

    const row = (r: MinionRun) => (
      <Box key={r.id} flexDirection="column" marginBottom={1}>
        <Box flexDirection="row" gap={1}>
          <Text color={YELLOW}>◉</Text>
          <Text bold>{r.name}</Text>
          <Text dimColor wrap="truncate-end">
            {r.description}
          </Text>
          <Text color={r.status === 'failed' ? 'red' : r.status === 'done' ? 'green' : YELLOW}>{STATUS_GLYPH[r.status]}</Text>
        </Box>
        <Text dimColor wrap="truncate-end">
          {'  '}
          {roleOf(r)} · {modelName(r.model)} · {fmtTokens(r.tokens)} ≈{fmtCost(r.costUsd)} {fmtTime(elapsed(r, at))}
        </Text>
        <Text wrap="truncate-end">
          {'  '}
          {r.status === 'running' ? `${ACTIVITY_GLYPH[r.activity]} ` : ''}
          {rowLine(r, at)}
        </Text>
      </Box>
    )
    return (
      <Box flexDirection="column">
        {title !== '' && <Text bold>🍌 {title}</Text>}
        <Text dimColor>
          ≈{fmtCost(t.cost)} · {fmtTokens(t.tokens)} tokens · {fmtTime(t.time)}
        </Text>
        <Box flexDirection="column" marginTop={1}>
          {list.length === 0 && empty}
          {running.length > 0 && <Text dimColor>Working · {running.length}</Text>}
          {running.map(row)}
          {finished.length > 0 && toggleDone}
          {!p.isDoneCollapsed && finished.map(row)}
        </Box>
      </Box>
    )
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const f = await read($, flow)
    if (f === null || e.props.hasSurvey) return next(e)

    const ui = $.ui.resolve(e)
    const { Box, Text, Button } = ui
    const list = await read($, crew)
    const crewButton = <Button key="minions-crew" label={`🍌×${list.length}`} plain onPress={() => void togglePane($)} />
    const dismiss = <Button key="minions-dismiss" label="✕" plain role="dismiss" onPress={() => update($, flow, () => null)} />

    const svgW = Math.max(240, Math.min(1600, (e.props.bodyColumns || 100) * 8 - 110))
    const bar =
      'Svg' in ui ? (
        <Box key="minions-bar" flexDirection="row" alignItems="center" gap={1}>
          <ui.Svg
            source={bandSvg(f, svgW)}
            alt={`${f.title}: ${label(f)}, ${Math.round(ratio(f) * 100)}%`}
            width={svgW}
            height={BAND_H}
          />
          {crewButton}
          {dismiss}
        </Box>
      ) : (
        <Box key="minions-bar" flexDirection="row" gap={1}>
          <Text color={f.isFinished ? 'green' : YELLOW}>●</Text>
          <Text bold wrap="truncate-end">
            {f.title}
          </Text>
          <Text color={YELLOW}>{barText(f, Math.max(6, Math.min(40, e.props.bodyColumns - Math.min(30, f.title.length + 2) - 34)))}</Text>
          <Text bold>{label(f)}</Text>
          <Text dimColor>{Math.round(ratio(f) * 100)}%</Text>
          {crewButton}
          {dismiss}
        </Box>
      )

    // The band has one slot: share it. Whatever draws beneath this mod (another
    // mod's band, or the engine's own) stays visible under the bar.
    const below = await next(e)
    return (
      <Box flexDirection="column">
        {bar}
        {below && <Box marginTop={1}>{below}</Box>}
      </Box>
    )
  })
}
