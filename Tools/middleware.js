import logger from './logger.js'
import kuroBbsTokenData from './kuroBbsTokenData.js'
import mcGachaData from './mcGachaData.js'
import config from './config.js'
import { marked } from 'marked'
import fs from 'fs/promises'
import path from 'path'

// 获取客户端IP的中间件 (CDN 兼容)
export const getClientIp = (req, res, next) => {
  req.clientIp =
    req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress
  next()
}

// 日志中间件
export const logMiddleware = (req, res, next) => {
  // 记录请求开始
  const startTime = Date.now()
  logger.debug(`收到请求: ${req.method} ${req.url}`)

  // 记录请求体
  if (req.method !== 'GET' && req.body) {
    logger.debug(`请求体: ${JSON.stringify(req.body)}`)
  }

  // 响应完成后记录日志
  res.on('finish', () => {
    const duration = Date.now() - startTime
    const level = res.statusCode >= 400 ? 'warn' : 'info'
    logger[level](
      `请求处理完成: ${req.method} ${req.url} ${res.statusCode} ${duration}ms`
    )
  })

  next()
}

// 版本验证中间件
export const versionCheck = (req, res, next) => {
  logger.debug(`版本验证: ${req.url}`)
  const { version } = req.body || {}

  if (!req.body || Object.keys(req.body).length === 0) {
    logger.warn(`客户端 ${req.clientIp} 请求 ${req.url} 无效请求: 请求体为空`)
    return res.json({
      code: -1,
      msg: '无效请求, 请检查请求体',
    })
  }

  if (!version) {
    logger.warn(`客户端 ${req.clientIp} 请求 ${req.url} 无效请求: 缺少版本号`)
    return res.json({
      code: -1,
      msg: '缺少版本号参数',
    })
  }

  if (version !== 1) {
    logger.warn(
      `客户端 ${req.clientIp} 请求 ${req.url} 不支持的版本号: ${version}`
    )
    return res.json({
      code: -1,
      msg: `服务端暂不支持版本号 ${version}`,
    })
  }

  next()
}

// 库街区 token 验证中间件
export const kuroBbsTokenCheck = (req, res, next) => {
  logger.debug(`库街区 token 验证: ${req.url}`)
  const { token } = req.body

  if (!token || !kuroBbsTokenData.verifyToken(token)) {
    logger.warn(`客户端 ${req.clientIp} 请求 ${req.url} 无效的 token: ${token}`)
    return res.json({
      code: -1,
      msg: 'Token 无效, 请重新获取',
    })
  }

  next()
}

// 库街区 kuroToken 验证中间件
export const kuroTokenCheck = (req, res, next) => {
  logger.debug(`库街区 kuroToken 验证: ${req.url}`)
  const { kuroToken } = req.body

  if (!kuroToken || Object.keys(kuroToken).length !== 4) {
    logger.warn(
      `客户端 ${req.clientIp} 请求 ${
        req.url
      } 不完整的 kuroToken: ${JSON.stringify(kuroToken)}`
    )
    return res.json({
      code: -1,
      msg: '上传的库街区 Token 不完整, 请检查',
    })
  }

  next()
}

// JSON 解析错误处理中间件
export const jsonParseError = (err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    logger.warn(
      `客户端 ${req.clientIp} 请求 ${req.url} 无效的请求体: ${err.body}`
    )
    return res.status(400).json({
      code: -1,
      msg: '无效的请求体, 请检查',
    })
  }
  next(err)
}

// 通用错误处理中间件
export const errorHandler = (err, req, res, next) => {
  logger.error(`服务器错误: ${err.stack}`)
  res.status(500).json({ code: -1, msg: '服务器内部错误' })
}

// 404 处理中间件
export const notFoundHandler = (req, res) => {
  logger.warn(`404 未找到: ${req.method} ${req.url} from ${req.clientIp}`)
  res.status(404).json({ code: -1, msg: '404 Not Found' })
}

// 鸣潮抽卡 token 验证中间件
export const mcGachaTokenCheck = (req, res, next) => {
  logger.debug(`鸣潮抽卡 token 验证: ${req.url}`)
  const { token } = req.body

  if (!token || !mcGachaData.verifyToken(token)) {
    logger.warn(`客户端 ${req.clientIp} 请求 ${req.url} 无效的 token: ${token}`)
    return res.json({
      code: -1,
      msg: 'Token 无效, 请重新获取',
    })
  }

  next()
}

// 鸣潮抽卡数据验证中间件
export const mcGachaDataCheck = (req, res, next) => {
  logger.debug(`鸣潮抽卡数据验证: ${req.url}`)
  const { playerId, gachaData } = req.body

  if (!playerId || !/^\d{9}$/.test(playerId)) {
    logger.warn(
      `客户端 ${req.clientIp} 请求 ${req.url} 无效的 UID: ${playerId}`
    )
    return res.json({
      code: -1,
      msg: `UID ${playerId} 无效, 请检查`,
    })
  }

  if (!gachaData || Object.keys(gachaData).length !== 6) {
    logger.warn(
      `客户端 ${req.clientIp} 请求 ${
        req.url
      } 不完整的抽卡记录: ${JSON.stringify(gachaData)}`
    )
    return res.json({
      code: -1,
      msg: '上传的抽卡记录不完整, 请检查',
      gachaData: gachaData,
    })
  }

  next()
}

// GitHub 仓库白名单验证中间件
export const githubRepoCheck = (req, res, next) => {
  const path = req.params[0]
  const repo = path.split('/').slice(0, 2).join('/')
  logger.debug(`[GitHub代理] 检查仓库: ${repo}`)

  if (!config.repos.whiteList.includes(repo)) {
    logger.warn(`[GitHub代理] 仓库 ${repo} 不在白名单中`)
    return res.status(403).json({
      code: -1,
      msg: '该仓库未被允许访问',
    })
  }

  // 将解析后的信息传递给下一个中间件
  req.githubInfo = {
    repo,
    pathParts: path.split('/'),
    branch: path.split('/')[2] || 'main',
    filePath: path.split('/').slice(3).join('/'),
  }

  next()
}

// GitHub 代理请求中间件
export const githubProxy = async (req, res) => {
  const { repo, branch, filePath } = req.githubInfo
  const url = `${config.repos.githubRawUrl}${repo}/${branch}/${filePath}`

  logger.debug(`[GitHub代理] 请求上游 URL: ${url}`)

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Yunzai-Kuro-Plugin-Server',
        Accept: '*/*',
      },
    })

    // 如果响应不成功，返回错误
    if (!response.ok) {
      logger.warn(
        `[GitHub代理] 上游响应失败: ${response.status} ${response.statusText}`
      )
      return res.status(response.status).json({
        code: -1,
        msg: `请求上游失败: ${response.status} ${response.statusText}`,
      })
    }

    // 获取内容类型和文件名
    const contentType = response.headers.get('content-type')
    const fileName = filePath.split('/').pop()
    logger.debug(`[GitHub代理] 文件名: ${fileName}, 类型: ${contentType}`)

    // 设置响应头
    res.setHeader('Content-Type', contentType || 'application/octet-stream')
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cache-Control', 'public, max-age=86400')

    // 获取响应内容
    const buffer = await response.arrayBuffer()
    logger.debug(`[GitHub代理] 获取到响应内容，大小: ${buffer.byteLength}`)

    // 发送响应
    res.send(Buffer.from(buffer))
    logger.info(`[GitHub代理] 响应发送完成: ${req.params[0]}`)
  } catch (err) {
    logger.error(`[GitHub代理] 请求失败:`, err)
    logger.error(`[GitHub代理] 错误堆栈:`, err.stack)
    res.status(500).json({
      code: -1,
      msg: `请求上游失败: ${err.message}`,
    })
  }
}

// GitHub 预览中间件
export const githubPreview = async (req, res) => {
  const { repo, branch, filePath } = req.githubInfo
  const url = `${config.repos.githubRawUrl}${repo}/${branch}/${filePath}`
  const fileExt = filePath.split('.').pop().toLowerCase()

  logger.debug(`[GitHub预览] 请求上游 URL: ${url}`)
  logger.debug(`[GitHub预览] 文件类型: ${fileExt}`)

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Yunzai-Kuro-Plugin-Server',
        Accept: '*/*',
      },
    })

    if (!response.ok) {
      logger.warn(
        `[GitHub预览] 上游响应失败: ${response.status} ${response.statusText}`
      )
      return res.status(response.status).json({
        code: -1,
        msg: `请求上游失败: ${response.status} ${response.statusText}`,
      })
    }

    const text = await response.text()

    // 根据文件类型处理预览
    if (fileExt === 'md') {
      logger.debug(`[GitHub预览] 处理 Markdown 内容，长度: ${text.length}`)

      // 读取模板文件
      const template = await fs.readFile(
        path.join(process.cwd(), 'res', 'html', 'githubPreview.html'),
        'utf-8'
      )

      // 替换占位符
      const html = template
        .replace(/\{\{filePath\}\}/g, filePath)
        .replace(/\{\{repo\}\}/g, repo)
        .replace('{{content}}', marked(text))

      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.send(html)
      logger.info(`[GitHub预览] Markdown 预览发送完成: ${req.params[0]}`)
    } else {
      // 不支持的格式，原样返回
      logger.debug(`[GitHub预览] 不支持的文件格式: ${fileExt}，原样返回`)
      const contentType = response.headers.get('content-type')
      res.setHeader('Content-Type', contentType || 'text/plain; charset=utf-8')
      res.send(text)
      logger.info(`[GitHub预览] 原始内容发送完成: ${req.params[0]}`)
    }
  } catch (err) {
    logger.error(`[GitHub预览] 请求失败:`, err)
    logger.error(`[GitHub预览] 错误堆栈:`, err.stack)
    res.status(500).json({
      code: -1,
      msg: `预览失败: ${err.message}`,
    })
  }
}
