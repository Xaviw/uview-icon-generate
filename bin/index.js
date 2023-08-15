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
  const { targetPath, fontUrl, inline } = await inquirer.prompt([
    {
      name: 'targetPath',
      message: '组件创建路径以及组件名',
      default: './components/CustomIcon',
    },
    {
      name: 'fontUrl',
      message: 'ttf字体文件路径(本地或网络路径)',
    },
    {
      name: 'inline',
      message: '是否以Base64格式内嵌(默认N)',
      type: 'confirm',
      default: false,
    },
  ])

  // 解析字体链接
  let ext, url
  try {
    const fileInfo = await parseUrl(fontUrl)
    ext = fileInfo.ext
    url = fileInfo.url
    if (ext !== 'ttf') {
      console.log(chalk.red(`仅支持.ttf格式文件`))
      return
    }
  } catch (error) {
    return error
  }

  // 读取字体文件
  let fontBuffer, fontFamily, chartMap
  spinner.text = '开始读取字体'
  spinner.start()
  try {
    fontBuffer = await getFontBuffer(url)
    // 解析字体文件
    const fontData = parseTTF(fontBuffer)
    fontFamily = fontData.fontFamily
    chartMap = fontData.chartMap
  } catch (error) {
    spinner.fail('字体读取失败')
    return
  }
  spinner.succeed('字体解析成功')

  // 保存组件代码
  try {
    spinner.text = `开始保存${targetPath}`
    spinner.start()
    const name = path.parse(targetPath).name
    let vueCode = await getUIconSourceCode('u-icon.vue')
    vueCode = transformUIcon({ source: vueCode, inline, fontBuffer, fontFamily, fontUrl: url, name })
    await fs.outputFile(targetPath, vueCode)
    spinner.succeed(`${targetPath}保存成功`)
  } catch (error) {
    spinner.fail(`${targetPath}保存失败`)
    return
  }

  // 保存props.js
  const propsPath = path.join(targetPath, '../props.js')
  try {
    spinner.text = `开始保存${propsPath}`
    spinner.start()
    const propsCode = await getUIconSourceCode('props.js')
    await fs.outputFile(propsPath, propsCode)
    spinner.succeed(`${propsPath}保存成功`)
  } catch (error) {
    spinner.fail(`${propsPath}保存失败`)
    return
  }

  // 保存icons.js
  const iconsPath = path.join(targetPath, '../icons.js')
  try {
    spinner.text = `开始保存${iconsPath}`
    spinner.start()
    const iconsCode = transformIcons(chartMap)
    await fs.outputFile(iconsPath, iconsCode)
    spinner.succeed(`${iconsPath}保存成功`)
  } catch (error) {
    spinner.fail(`${iconsPath}保存失败`)
    return
  }
})

program.parse()

// 检查文件是否存在
function fileExists(path) {
  return new Promise((resolve, reject) => {
    fs.pathExists(path)
      .then((flag) => {
        if (!flag) reject(chalk.red(`文件"${path}"不存在`))
        resolve()
      })
      .catch((err) => {
        reject(chalk.red(`文件"${path}"检查错误：${err}`))
      })
  })
}

// 接收链接解析出扩展名与可用链接（本地路径会判断文件是否存在）
async function parseUrl(originUrl) {
  const ext = path
    .extname(originUrl)
    ?.match(/^\.(.*?)(?:\?.*?)?$/)?.[1]
    ?.toLowerCase()
  let url = originUrl

  // 是网络路径
  if (/^(http|https)?(\:)?\/\/.*?$/i.test(originUrl)) {
    // 处理"//"开头的情况（//at.alicdn.com/t/c/xxx.ttf）
    if (!originUrl.startsWith('http')) {
      const index = originUrl.indexOf('/')
      url = `https:${originUrl.slice(index)}`.replace(/\?.*?$/, '')
    }
  } else {
    // 非网络路径，直接判断本地是否存在
    try {
      await fileExists(originUrl)
    } catch (error) {
      throw error
    }
  }

  return { ext, url }
}

// 接收链接返回文件buffer
async function getFontBuffer(url) {
  if (url.startsWith('http')) {
    return fetch(url).then((res) => res.arrayBuffer())
  } else {
    return fs.readFile(url)
  }
}

// 解析ttf文件fontFamily与字符名称与Unicode编码对应表
function parseTTF(buffer) {
  try {
    const chartMap = {}
    const font = Font.create(buffer, { type: 'ttf' })
    fontFamily = font.data.name.fontFamily
    // 存储图标名称和编码
    font.data.glyf.forEach((glyph) => {
      if (glyph.name && glyph.unicode) {
        chartMap[glyph.name] = `\\u${glyph.unicode[0].toString(16)}`
      }
    })
    return { fontFamily, chartMap }
  } catch (error) {
    throw error
  }
}

// 获取u-icon文件源码（u-icon.vue或props.js）
async function getUIconSourceCode(fileName) {
  const uniPath = './uni_modules/uview-ui/components/u-icon/' + fileName
  const nodePath = './node_modules/uview-ui/components/u-icon/' + fileName
  const networkPath = 'https://raw.githubusercontent.com/umicro/uView2.0/master/uni_modules/uview-ui/components/u-icon/' + fileName
  let url

  // 判断本地源码文件是否存在
  await fileExists(uniPath)
    .then(() => {
      url = uniPath
    })
    .catch(() => {
      return fileExists(nodePath).then(() => {
        url = nodePath
      })
    })

  if (url) {
    return fs.readFile(url, 'utf-8')
  } else {
    return fetch(networkPath).then((res) => res.text())
  }
}

// 处理u-icon.vue文件
function transformUIcon({ source, inline, fontFamily, name, fontBuffer, fontUrl }) {
  // 通用修改部分
  source = source.replace(/['"]fontFamily['"]:\s*['"]uicon-iconfont['"]/i, `'fontFamily': '${fontFamily}'`)
  source = source.replace(/font-family:\s*['"]uicon-iconfont['"]/i, `font-family: '${fontFamily}'`)
  source = source.replace(/font-family:\s*uicon-iconfont/i, `font-family: ${fontFamily}`)
  source = source.replace(/name: ['"]u-icon['"]/i, `name: '${name}'`)
  source = source.replace(/return icons\[['"]uicon-['"]\s*\+\s*this.name\]/i, `return icons[this.name]`)
  source = source.replace(/\@import\s*.*?;/i, `@import "@/uni_modules/uview-ui/libs/css/components.scss";`)
  // 字体引入部分
  if (inline) {
    const base64 = `data:application/font-ttf;charset=utf-8;base64,` + Buffer.from(fontBuffer).toString('base64')
    source = source.replace(/['"]?src['"]?:\s*`url\('\$\{fontUrl\}'\)`/i, `'src': 'url("${base64}")'`)
    source = source.replace(/['"]?src['"]?:\s*url\('.*?'\)\s*format\('truetype'\)\;/i, `src: url('${base64}')`)
  } else {
    source = source.replace(/const\s+fontUrl\s+=\s+'.*?'/i, `const fontUrl = '${fontUrl}'`)
    source = source.replace(/src: url\('.*?'\)\s*format\('truetype'\);/i, `src: url('${fontUrl}') format('truetype');`)
  }
  return source
}

// 处理props.js文件
function transformIcons(chartMap) {
  return `export default ${JSON.stringify(chartMap)}`.replace(/\\\\/g, '\\')
}
