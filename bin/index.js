#!/usr/bin/env node

import inquirer from 'inquirer'
import chalk from 'chalk'
import path from 'path'
import download from 'download-git-repo'
import { program } from 'commander'
import fs from 'fs-extra'
import { Font } from 'fonteditor-core'

program.version('1.0.0', '-v, --version')

program.command('create', { isDefault: true }).action(async () => {
  const { name, fontPath, inline, url, fontFamily, prefix, targetPath } = await inquirer.prompt([
    {
      name: 'name',
      message: '组件名称',
      default: 'CustomIcon',
    },
    {
      name: 'fontPath',
      message: '字体文件路径(本地或网络路径)',
      default: './iconfont.ttf',
    },
    {
      name: 'inline',
      message: '是否以Base64格式内嵌',
      type: 'confirm',
      default: false,
    },
    {
      name: 'url',
      message: 'iconfont字体文件CDN地址',
    },
    {
      name: 'fontFamily',
      message: '字体名称',
      default: 'customIconfont',
    },
    {
      name: 'prefix',
      message: '图标名称前缀',
      default: 'custom-icon',
    },
    {
      name: 'targetPath',
      message: '组件创建位置',
      default: './components/',
    },
  ])

  let file

  try {
    const fontExists = await fs.pathExists(fontPath)
    if (!fontExists) {
      console.log(chalk.red(`字体文件"${fontPath}"不存在`))
      return
    }
    file = await fs.readFile(fontPath)
    // 将 TTF 文件解析为字体对象
    const font = Font.create(file, {
      type: 'ttf',
    })
    // 打印每个图标的名称和编码
    font.data.glyf.forEach((glyph, index) => {
      if (glyph.name) {
        console.log(`Glyph ${index}: Name=${glyph.name}, Code=${glyph.unicode[0].toString(16)}`)
      }
    })
  } catch (error) {
    console.log(chalk.red(`读取文件"${fontPath}"失败：${error}`))
  }

  const ext = path.extname(fontPath)
  const base64 = `data:application/font-${ext};charset=utf-8;base64,` + Buffer.from(file).toString('base64')
})

program.parse()
