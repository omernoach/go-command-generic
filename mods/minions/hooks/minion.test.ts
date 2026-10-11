import { expect, test } from 'claude-code/testing'

import { activityOf, minion } from './minion'

test('each tool maps to the prop its minion acts out', () => {
  expect(activityOf('Read', { file_path: '/a/b/Foo.cs' })).toEqual({ activity: 'read', doing: 'reading Foo.cs' })
  expect(activityOf('Edit', { file_path: '/x/Bar.ts' }).activity).toBe('edit')
  expect(activityOf('Bash', { command: 'dotnet test', description: 'Run tests' })).toEqual({ activity: 'bash', doing: 'running Run tests' })
  expect(activityOf('mcp__atlassian__getJiraIssue', {}).activity).toBe('ticket')
  expect(activityOf('Mystery', {}).activity).toBe('think')
})

test('a working minion walks and holds its prop; a finished one holds a banana', () => {
  const working = minion(0, 0, 'kevin', 'edit', 'running')
  expect(working).toContain('a-edit run')
  expect(working).toContain('class="it"')
  const done = minion(0, 0, 'bob', 'edit', 'done')
  expect(done).not.toContain(' run')
  expect(done).toContain('#F5C542')
  expect(minion(0, 0, 'carl', 'read', 'failed')).not.toContain('class="it"')
})
