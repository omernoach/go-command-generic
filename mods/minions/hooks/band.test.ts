import { expect, mock, test } from 'claude-code/testing'

const PROPS = { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 120, scroll: { offset: 0, bodyRows: 9 }, view: {} }

test('the flow bar shares the band: another band drawn beneath it stays visible', async ($, on) => {
  mock.clock(on)
  on('ui.open', async () => ({ value: { isPlaced: true } }) as never)
  on('command.run', async () => ({ text: '' }) as never)
  on('ui.render', { component: 'AbovePrompt' }, async ($, e) => {
    const { Text } = $.ui.resolve(e)
    return h(Text, { key: 'other-band' }, 'another mod') as never
  })
  await $.command.run({ command: 'minions', args: 'demo' } as never)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'minions', surface, component: 'AbovePrompt', props: PROPS })
    expect(await ui.find({ key: 'minions-crew' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'another mod' })).toBeDefined()
    await ui.unmount()
  }
})
