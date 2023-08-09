#!/usr/bin/env node

import inquirer from 'inquirer'
import chalk from 'chalk'
import path from 'path'
import { program } from 'commander'
import fs from 'fs-extra'
import { Font } from 'fonteditor-core'
import fetch from 'node-fetch'
import ora from 'ora'

const spinner = ora()

program.version('1.0.0', '-v, --version')

program.command('create', { isDefault: true }).action(async () => {
  const { targetPath, url, originPath, inline } = await inquirer.prompt([
    {
      name: 'targetPath',
      message: '组件创建路径以及组件名',
      default: './components/CustomIcon',
    },
    {
      name: 'url',
      message: '字体文件路径(本地或网络路径)',
    },
    {
      name: 'originPath',
      message: 'u-icon源码路径',
      default: './uni_modules/uview-ui/components/u-icon',
    },
    {
      name: 'inline',
      message: '是否以Base64格式内嵌',
      type: 'confirm',
      default: false,
    },
  ])

  let networkUrl
  let fontBuffer
  let fontType
  let chartMap = {}
  let formatType
  let fontFamily

  // 读取字体文件
  try {
    if (/^(http|https)?(\:)?\/\/.*?$/i.test(url)) {
      // 如果是网络地址
      // 补充完整以"//"开头的链接（//at.alicdn.com/t/c/font_4200663_ne0mnk9sfr.ttf?t=1691456853251）
      networkUrl = url
      if (!url.startsWith('http')) {
        const index = url.indexOf('/')
        networkUrl = `https:${url.slice(index)}`.replace(/\?.*?$/, '')
      }
      spinner.text = '下载字体中...'
      spinner.start()
      const response = await fetch(networkUrl)
      fontBuffer = await response.arrayBuffer()
      spinner.succeed('字体下载完成')
    } else {
      // 是本地地址
      const fontExists = await fileExists(url)
      if (fontExists !== true) {
        console.log(fontExists)
        return
      }
      spinner.text = '读取字体中...'
      spinner.start()
      fontBuffer = await fs.readFile(url)
      spinner.succeed('字体读取成功')
    }

    // 解析字体类型
    const ext = path.extname(url)
    fontType = ext.match(/^\.(.*?)(?:\?.*?)?$/)?.[1]?.toLowerCase()
    formatType = fontType === 'ttf' ? 'truetype' : fontType
    if (!fontType || !['ttf', 'woff', 'woff2'].includes(fontType)) {
      console.log(chalk.red(`字体文件扩展名解析错误，支持ttf、woff、woff2，解析值为${ext}`))
      return
    }

    // 解析字体
    spinner.text = '字体解析中...'
    spinner.start()
    const font = Font.create(fontBuffer, { type: 'ttf' })
    fontFamily = font.data.name.fontFamily
    // 存储图标名称和编码
    font.data.glyf.forEach((glyph) => {
      if (glyph.name && glyph.unicode) {
        chartMap[glyph.name] = `\\u${glyph.unicode[0].toString(16)}`
      }
    })
    spinner.succeed('字体解析完成')
  } catch (error) {
    spinner.fail(`文件读取失败：${error}`)
    return
  }

  // 处理u-icon源码
  try {
    // 处理vue文件
    const vuePath = originPath + '/u-icon.vue'
    const vueExists = await fileExists(vuePath)
    if (vueExists !== true) {
      console.log(vueExists)
      return
    }
    const compName = targetPath.split('/').pop()
    spinner.text = '保存Vue代码...'
    spinner.start()
    let vueCode = await fs.readFile(vuePath, 'utf-8')
    // 通用修改部分
    vueCode = vueCode.replace(/['"]fontFamily['"]:\s*['"]uicon-iconfont['"]/i, `'fontFamily': '${fontFamily}'`)
    vueCode = vueCode.replace(/font-family:\s*['"]uicon-iconfont['"]/i, `font-family: '${fontFamily}'`)
    vueCode = vueCode.replace(/font-family:\s*uicon-iconfont/i, `font-family: ${fontFamily}`)
    vueCode = vueCode.replace(/name: ['"]u-icon['"]/i, `name: '${compName}'`)
    vueCode = vueCode.replace(/return icons\[['"]uicon-['"]\s*\+\s*this.name\]/i, `return icons[this.name]`)
    vueCode = vueCode.replace(/\@import\s*.*?;/i, `@import "@/uni_modules/uview-ui/libs/css/components.scss";`)
    // 字体引入部分
    if (inline) {
      const base64 = `data:application/font-${fontType};charset=utf-8;base64,` + Buffer.from(fontBuffer).toString('base64')
      vueCode = vueCode.replace(/['"]?src['"]?:\s*`url\('\$\{fontUrl\}'\)`/i, `'src': 'url("${base64}")'`)
      vueCode = vueCode.replace(/['"]?src['"]?:\s*url\('.*?'\)\s*format\('truetype'\)\;/i, `src: url('${base64}')`)
    } else {
      vueCode = vueCode.replace(/const\s+fontUrl\s+=\s+'.*?'/i, `const fontUrl = '${networkUrl || url}'`)
      vueCode = vueCode.replace(/src: url\('.*?'\)\s*format\('truetype'\);/i, `src: url('${networkUrl || url}') format('${formatType}');`)
    }
    fs.outputFile(`${targetPath}/${compName}.vue`, vueCode)
    spinner.succeed(`${targetPath}/${compName}.vue已保存`)

    // 处理props文件
    const propsPath = originPath + '/props.js'
    const propsExists = await fileExists(propsPath)
    if (propsExists !== true) {
      console.log(propsExists)
      return
    }
    spinner.text = '保存props代码...'
    spinner.start()
    const propsCode = await fs.readFile(propsPath, 'utf-8')
    fs.outputFile(`${targetPath}/props.js`, propsCode)
    spinner.succeed(`${targetPath}/props.js已保存`)

    // 处理icons.js
    spinner.text = '保存icons代码...'
    spinner.start()
    const iconsCode = `export default ${JSON.stringify(chartMap)}`.replace(/\\\\/g, '\\')
    fs.outputFile(`${targetPath}/icons.js`, iconsCode)
    spinner.succeed(`${targetPath}/icons.js已保存`)
  } catch (error) {
    spinner.fail(`保存失败：${error}`)
    return
  }
})

program.parse()

function fileExists(path) {
  return fs
    .pathExists(path)
    .then((flag) => {
      if (!flag) return chalk.red(`文件"${path}"不存在`)
      return true
    })
    .catch((err) => {
      return chalk.red(`文件"${path}"检查错误：${err}`)
    })
}
