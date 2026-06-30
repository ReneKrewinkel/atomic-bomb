import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  getInstalledSkillDir,
  getInstalledSkillIndex,
  installSkillBundle,
  installSkillBundleForAi
} from '../src/skills.js'

const makeTempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'atomic-bomb-'))

const silenceConsole = (fn) => {
  const originalLog = console.log
  console.log = () => {}

  try {
    return fn()
  } finally {
    console.log = originalLog
  }
}

test('getInstalledSkillDir resolves versioned target skill directory', () => {
  assert.equal(getInstalledSkillDir({ appVersion: '1.2.3', projectDir: '.' }), '.skills/atomic-bomb/1.2.3')
})

test('getInstalledSkillIndex resolves versioned target skill index', () => {
  assert.equal(getInstalledSkillIndex({ appVersion: '1.2.3', projectDir: '.' }), '.skills/atomic-bomb/1.2.3/index.md')
})

test('installSkillBundle copies bundled skills into the target project', () => {
  const dir = makeTempDir()
  const skillSourcePath = path.join(dir, 'source')
  const projectDir = path.join(dir, 'project')

  fs.mkdirSync(path.join(skillSourcePath, 'nested'), { recursive: true })
  fs.mkdirSync(path.join(projectDir, '.skills/atomic-bomb/1.2.3/stale'), { recursive: true })
  fs.writeFileSync(path.join(projectDir, '.skills/atomic-bomb/1.2.3/stale/old.md'), '# Old\n')
  fs.writeFileSync(path.join(skillSourcePath, 'index.md'), '# Skill\n')
  fs.writeFileSync(path.join(skillSourcePath, 'nested', 'rule.md'), '# Rule\n')
  fs.writeFileSync(path.join(skillSourcePath, '.DS_Store'), 'ignore')

  const installedIndex = silenceConsole(() =>
    installSkillBundle({
      appVersion: '1.2.3',
      projectDir,
      skillSourcePath
    })
  )

  assert.equal(installedIndex, path.join(projectDir, '.skills/atomic-bomb/1.2.3/index.md'))
  assert.equal(fs.existsSync(installedIndex), true)
  assert.equal(fs.existsSync(path.join(projectDir, '.skills/atomic-bomb/1.2.3/nested/rule.md')), true)
  assert.equal(fs.existsSync(path.join(projectDir, '.skills/atomic-bomb/1.2.3/.DS_Store')), false)
  assert.equal(fs.existsSync(path.join(projectDir, '.skills/atomic-bomb/1.2.3/stale/old.md')), false)
})

test('installSkillBundleForAi does not install skills when AI is not configured', () => {
  const dir = makeTempDir()
  const skillSourcePath = path.join(dir, 'source')
  const projectDir = path.join(dir, 'project')

  fs.mkdirSync(skillSourcePath, { recursive: true })
  fs.writeFileSync(path.join(skillSourcePath, 'index.md'), '# Skill\n')

  assert.equal(
    installSkillBundleForAi({
      aiConfig: false,
      appVersion: '1.2.3',
      projectDir,
      skillSourcePath
    }),
    false
  )
  assert.equal(fs.existsSync(path.join(projectDir, '.skills')), false)
})

test('installSkillBundleForAi installs skills and updates configured AI path', () => {
  const dir = makeTempDir()
  const skillSourcePath = path.join(dir, 'source')
  const projectDir = path.join(dir, 'project')
  const aiConfig = {
    enabled: true,
    provider: 'openai',
    skillPath: '.skills/atomic-bomb/old/index.md'
  }

  fs.mkdirSync(skillSourcePath, { recursive: true })
  fs.writeFileSync(path.join(skillSourcePath, 'index.md'), '# Skill\n')

  const result = silenceConsole(() =>
    installSkillBundleForAi({
      aiConfig,
      appVersion: '1.2.3',
      projectDir,
      skillSourcePath
    })
  )

  assert.deepEqual(result, {
    ...aiConfig,
    skillPath: path.join(projectDir, '.skills/atomic-bomb/1.2.3/index.md')
  })
  assert.equal(fs.existsSync(result.skillPath), true)
})
