#!/usr/bin/env node

import inquirer from 'inquirer'
import chalk from 'chalk'
import path from 'path'
import download from 'download-git-repo'
import { program } from 'commander'
import fs from 'fs-extra'
import { Font } from 'fonteditor-core'
import { DownloaderHelper } from 'node-downloader-helper'

program.version('1.0.0', '-v, --version')

program.command('create', { isDefault: true }).action(async () => {
  const { name, inline, url, fontFamily, prefix, targetPath } = await inquirer.prompt([
    {
      name: 'name',
      message: '组件名称',
      default: 'CustomIcon',
    },
    {
      name: 'url',
      message: '字体文件路径(本地或网络路径)',
    },
    {
      name: 'inline',
      message: '是否以Base64格式内嵌',
      type: 'confirm',
      default: false,
    },
    {
      name: 'fontFamily',
      message: '字体名称',
      default: 'iconfont',
    },
    {
      name: 'prefix',
      message: '图标名称前缀',
      default: 'icon-',
    },
    {
      name: 'targetPath',
      message: '组件创建位置',
      default: './components/',
    },
  ])

  // 如果是网络地址
  if (/^(http|https)?(\:)?\/\/.*?$/i.test(url)) {
    const dl = new DownloaderHelper(url)
    dl.on('end', (res) => {
      console.log(res)
    })
    dl.start()
  }

  try {
    const fontExists = await fs.pathExists(url)
    if (!fontExists) {
      console.log(chalk.red(`字体文件"${url}"不存在`))
      return
    }
    const fontBuffer = await fs.readFile(url)
    // 将 TTF 文件解析为字体对象
    const font = Font.create(fontBuffer, { type: 'ttf' })
    // 打印每个图标的名称和编码
    font.data.glyf.forEach((glyph, index) => {
      if (glyph.name) {
        console.log(`Glyph ${index}: Name=${glyph.name}, Code=${glyph.unicode[0].toString(16)}`)
      }
    })
  } catch (error) {
    console.log(chalk.red(`读取文件"${url}"失败：${error}`))
  }

  const ext = path.extname(url)
  const base64 = `data:application/font-${ext};charset=utf-8;base64,` + Buffer.from(fontBuffer).toString('base64')
})

program.parse()
