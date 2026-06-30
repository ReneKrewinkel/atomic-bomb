import fs from 'fs-extra'
import path from 'node:path'
import { check } from './logger.js'

export const getInstalledSkillDir = ({ appVersion, projectDir = '.' }) =>
  path.join(projectDir, '.skills', 'atomic-bomb', appVersion)

export const getInstalledSkillIndex = ({ appVersion, projectDir = '.' }) =>
  path.join(getInstalledSkillDir({ appVersion, projectDir }), 'index.md')

export const installSkillBundle = ({ appVersion, projectDir = '.', skillSourcePath }) => {
  const targetDir = getInstalledSkillDir({ appVersion, projectDir })

  fs.ensureDirSync(path.dirname(targetDir))
  fs.emptyDirSync(targetDir)
  fs.copySync(skillSourcePath, targetDir, {
    filter: (source) => path.basename(source) !== '.DS_Store',
    overwrite: true
  })

  check(`🧠 ${targetDir}`)

  return getInstalledSkillIndex({ appVersion, projectDir })
}

export const installSkillBundleForAi = ({ aiConfig, appVersion, projectDir = '.', skillSourcePath }) => {
  if (!aiConfig?.enabled) return false

  return {
    ...aiConfig,
    skillPath: installSkillBundle({
      appVersion,
      projectDir,
      skillSourcePath
    })
  }
}
