import type { Activity, Look } from '../types'

// Pixel minions after the movie lineup. The 13-wide body comes from the reference
// chart; each minion changes height, width, hair, eyes and mouth. Drawn on a
// 21×25 canvas with the feet on the bottom row, so short and tall stand level.
const C: Record<string, string> = {
  Y: '#F5C542',
  y: '#DDA92A',
  G: '#8E8E8E',
  w: '#FFFFFF',
  B: '#4A2E0D',
  g: '#3E8E41',
  K: '#1F1E1D',
  U: '#1F4E9A',
  S: '#C9CCD2',
  L: '#A9D6F5',
  N: '#7A4A26',
  P: '#F8F6F1',
  R: '#59C36A',
  r: '#C0504D',
}

const HEAD = '..YYYYYYYYY..'
const TWO_EYES = [
  '.YGGGYYYGGGY.',
  'YGwwwGYGwwwGY',
  'GwwwwwGwwwwwG',
  'GwwBBwGwBBwwG',
  'GwwBBwGwBBwwG',
  'YGwwwGYGwwwGY',
  'YYGGGYYYGGGYY',
]
const ONE_EYE = [
  '.YYGGGGGGGYY.',
  'YYGwwwwwwwGYY',
  'GGwwwwwwwwwGG',
  'GGwwwBBBwwwGG',
  'GGwwwBBBwwwGG',
  'YYGwwwwwwwGYY',
  'YYYGGGGGGGYYY',
]
// Bob's heterochromia: one brown eye, one green.
const BOB_EYES = TWO_EYES.map((r, i) => (i === 3 || i === 4 ? r.slice(0, 8) + 'gg' + r.slice(10) : r))
// Half-closed lids over the top of the eye: Stuart, Mel, Carl, Tim, Ron.
const lidded = (eyes: string[]) => eyes.map((r, i) => (i === 1 || i === 2 ? r.replace(/w/g, 'y') : r))

type Mouth = 'line' | 'smile' | 'grin' | 'braces' | 'smirk'
const MOUTHS: Record<Mouth, [string, string]> = {
  line: ['YYYYYKKKYYYYY', 'UYYYYYYYYYYYU'],
  smile: ['YYYYKYYYKYYYY', 'UYYYYKKKYYYYU'],
  grin: ['YYYYKKKKKYYYY', 'UYYYYKrKYYYYU'],
  braces: ['YYYKSSSSSKYYY', 'UYYYKKKKKYYYU'],
  smirk: ['YYYYYYKKKYYYY', 'UYYYYYYYYYYYU'],
}
const OVERALLS = [
  'YKUUUUUUUUUKY',
  'YUUUKKKKKUUUY',
  'YUUUKUUUKUUUY',
  'KUUUUKKKUUUUK',
  'KUUUUUUUUUUUK',
  '..UUUUUUUUU..',
]
// Short minions lose the lower bib row and one glove row.
const SHORT_OVERALLS = OVERALLS.filter((_, i) => i !== 2 && i !== 4)
const YELLOW_ROW = 'YYYYYYYYYYYYY'

type Spec = {
  hair: string[]
  eyes: string[]
  mouth: Mouth
  extra?: number
  isShort?: boolean
  isWide?: boolean
}

const LOOKS: Record<Look, Spec> = {
  kevin: { hair: ['....K...K....', '.....K.K.....', '......K......', '......K......'], eyes: TWO_EYES, mouth: 'smirk', extra: 4 },
  stuart: { hair: ['...KKK.KKK...', '.....K.K.....'], eyes: lidded(ONE_EYE), mouth: 'smirk' },
  bob: { hair: [], eyes: BOB_EYES, mouth: 'smile', isShort: true },
  otto: { hair: ['.....KKK.....'], eyes: TWO_EYES, mouth: 'braces', isWide: true },
  mel: { hair: ['....K.K.K....', '....K.K.K....'], eyes: lidded(ONE_EYE), mouth: 'smirk', extra: 1 },
  dave: { hair: ['......KKKK...', '.....K.......'], eyes: TWO_EYES, mouth: 'smile' },
  tim: { hair: ['..K.K.K.K.K..', '...K.K.K.K...'], eyes: lidded(TWO_EYES), mouth: 'line', extra: 5 },
  carl: { hair: ['...K..K..K...', '..K.K.K.K.K..', '..KKKKKKKKK..'], eyes: lidded(ONE_EYE), mouth: 'line' },
  gus: { hair: ['.....KK......', '....K..K.....', '.......K.....', '......K......'], eyes: TWO_EYES, mouth: 'smile' },
  phil: { hair: ['....K.K.K....', '...KKKKKKK...'], eyes: TWO_EYES, mouth: 'grin', isShort: true },
  ralph: { hair: ['......K......', '....K.K.K....', '.....KKK.....'], eyes: ONE_EYE, mouth: 'grin' },
  ron: { hair: ['...KKKKKKK...', '...K.K.K.K...'], eyes: lidded(TWO_EYES), mouth: 'line', extra: 2 },
}

// Otto is wider: the centre column doubles.
const widen = (r: string) => r.slice(0, 7) + r.slice(6)

const CANVAS_H = 25

const bodyOf = (look: Look) => {
  const s = LOOKS[look]
  const [mouth, strap] = MOUTHS[s.mouth]
  const rows = [
    ...s.hair,
    HEAD,
    ...s.eyes,
    mouth,
    ...Array<string>(s.extra ?? 0).fill(YELLOW_ROW),
    strap,
    ...(s.isShort ? SHORT_OVERALLS : OVERALLS),
    '...KKK.......',
    '.......KKK...',
  ].map(r => (s.isWide ? widen(r) : r))
  const top = CANVAS_H - (rows.length - 1)
  return {
    rows,
    top,
    headY: top + s.hair.length,
    gloveY: top + rows.findIndex(r => r.startsWith('K')),
    dx: s.isWide ? 1 : 0,
  }
}

type Px = { x: number; y: number; c: string; cls: string }

const stamp = (out: Px[], x: number, y: number, rows: string[], cls: string): void =>
  rows.forEach((row, dy) =>
    [...row].forEach((ch, dx) => {
      const c = C[ch]
      if (c) out.push({ x: x + dx, y: y + dy, c, cls })
    }),
  )

// Each prop stamps into named groups; the CSS below moves each group.
const PROPS: Record<Activity | 'banana', (out: Px[]) => void> = {
  read: out => stamp(out, 12, 7, ['..KKK.', '.KLLLK', '.KLwLK', '.KLLLK', '..KKK.', '.N....', 'N.....'], 'it'),
  edit: out => stamp(out, 12, 6, ['..SSSS', '..SSSS', '...N..', '...N..', '..N...', '..N...', '.N....', '.N....', 'N.....'], 'it'),
  bash: out => {
    stamp(out, 13, 10, ['KKKKKK', 'KRRRKK', 'KKKKKK', 'KRRKKK', 'SSSSSS'], 'it')
    out.push({ x: 16, y: 13, c: C.R ?? '', cls: 'cur' })
  },
  ticket: out => stamp(out, 13, 7, ['NNNNN', 'NPPPN', 'NKKPN', 'NPPPN', 'NKKKN', 'NPPPN', 'NNNNN'], 'it'),
  think: out => {
    stamp(out, 12, 0, ['.SSSSS.', 'SSSSSSS', '.SSSSS.', 'S......'], 'it')
    out.push({ x: 13, y: 1, c: C.K ?? '', cls: 'd1' }, { x: 15, y: 1, c: C.K ?? '', cls: 'd2' }, { x: 17, y: 1, c: C.K ?? '', cls: 'd3' })
  },
  banana: out => stamp(out, 13, 8, ['....N', '...Y.', '..YY.', '.YY..', 'YY...', 'Y....'], 'it'),
}

// Pure CSS run by the compositor. Periods divide one second, so the
// once-a-second redraw of a running row restarts them in phase.
export const MINION_CSS = `<style>
.run .fa{animation:st .5s steps(1) infinite}.run .fb{animation:st .5s steps(1) infinite -.25s}
.run .bd{animation:bob .5s steps(1) infinite -.125s}
.run g{transform-box:fill-box}
@keyframes st{50%{transform:translateY(-1px)}}@keyframes bob{50%{transform:translateY(1px)}}
@keyframes blink{50%{opacity:.15}}
.a-read.run .it{animation:scan 1s steps(1) infinite}
@keyframes scan{25%{transform:translate(-1px,1px)}50%{transform:translate(-2px,0)}75%{transform:translate(-1px,-1px)}}
.a-edit.run .it{transform-origin:0 100%;animation:swing .5s ease-in-out infinite}
@keyframes swing{50%{transform:rotate(30deg)}}
.a-bash.run .fa,.a-bash.run .fb,.a-think.run .fa,.a-think.run .fb{animation:none}
.a-bash.run .cur{animation:blink .5s steps(1) infinite}
.a-ticket.run .it{transform-origin:50% 0;animation:flut 1s ease-in-out infinite}
@keyframes flut{50%{transform:rotate(-10deg)}}
.a-think.run .d1{animation:blink 1s steps(1) infinite}.a-think.run .d2{animation:blink 1s steps(1) infinite -.33s}.a-think.run .d3{animation:blink 1s steps(1) infinite -.66s}
@media (prefers-reduced-motion: reduce){.run,.run g{animation:none!important}}
</style>`


/**
 * One minion as an SVG `<g>`. A finished minion holds a banana up; a failed one
 * is drawn faded with no prop. Needs MINION_CSS once in the enclosing `<svg>`.
 */
export function minion(
  x: number,
  y: number,
  look: Look,
  activity: Activity,
  state: 'running' | 'done' | 'failed' | 'idle',
  scale = 2,
): string {
  const { rows, top, headY, gloveY, dx } = bodyOf(look)
  const px: Px[] = []
  const feetY = top + rows.length - 2
  stamp(px, 0, top, rows.slice(0, -2), 'bd')
  stamp(px, 0, feetY, rows.slice(-2, -1), 'fa')
  stamp(px, 0, feetY, rows.slice(-1), 'fb')
  // Props are drawn for the reference body (glove at y 15, head top at y 2), then
  // moved to this minion's own glove, or head for the thought bubble.
  const prop: Px[] = []
  if (state === 'running' || state === 'idle') PROPS[activity](prop)
  if (state === 'done') PROPS.banana(prop)
  const dy = activity === 'think' && state !== 'done' ? headY - 2 : gloveY - 15
  px.push(...prop.map(p => ({ ...p, x: p.x + dx, y: p.y + dy })))

  const rects = (cls: string) =>
    px
      .filter(p => p.cls === cls)
      .map(p => `<rect x="${p.x}" y="${p.y}" width="1" height="1" fill="${p.c}"/>`)
      .join('')
  const group = (cls: string) => `<g class="${cls}">${rects(cls)}</g>`
  const props = [...new Set(px.map(p => p.cls))].filter(c => c !== 'bd' && c !== 'fa' && c !== 'fb')
  const opacity = state === 'failed' ? 0.4 : state === 'idle' ? 0.55 : 1
  // Props nest inside the body so they ride its bob; feet step on their own.
  return `<g transform="translate(${x},${y}) scale(${scale})" opacity="${opacity}" shape-rendering="crispEdges"><g class="a-${activity}${state === 'running' ? ' run' : ''}"><g class="bd">${rects('bd')}${props.map(group).join('')}</g>${group('fa')}${group('fb')}</g></g>`
}

const clip = (s: string, max = 60): string => {
  const one = s.replace(/\s+/g, ' ').trim()
  return one.length > max ? one.slice(0, max - 1) + '…' : one
}

/** What a tool call looks like on the minion: its prop and a few words. */
export function activityOf(tool: string, input: Record<string, unknown>): { activity: Activity; doing: string } {
  const s = (k: string): string => {
    const v = input[k]
    return typeof v === 'string' ? v : ''
  }
  const base = (p: string) => p.split('/').pop() || p
  const t = tool.toLowerCase()
  const r = (activity: Activity, doing: string) => ({ activity, doing: clip(doing) })
  if (tool === 'Read') return r('read', `reading ${base(s('file_path'))}`)
  if (tool === 'Grep') return r('read', `searching "${s('pattern')}"`)
  if (tool === 'Glob' || tool === 'LS') return r('read', `looking for ${s('pattern') || s('path')}`)
  if (tool === 'Edit' || tool === 'MultiEdit') return r('edit', `editing ${base(s('file_path'))}`)
  if (tool === 'NotebookEdit') return r('edit', `editing ${base(s('notebook_path'))}`)
  if (tool === 'Write') return r('edit', `writing ${base(s('file_path'))}`)
  if (tool === 'Bash') return r('bash', `running ${s('description') || s('command')}`)
  if (/atlassian|jira/.test(t)) return r('ticket', 'reading the Jira ticket')
  if (tool === 'WebFetch' || tool === 'WebSearch') return r('ticket', `browsing ${s('query') || s('url')}`)
  if (tool === 'Skill') return r('ticket', `using ${s('skill')}`)
  if (tool === 'Agent') return r('think', `briefing ${s('description') || 'a minion'}`)
  if (t.startsWith('mcp__')) return r('ticket', `calling ${tool.split('__').pop() ?? tool}`)
  return r('think', tool)
}
