import express from 'express'
import logger from './Tools/logger.js'
import config from './Tools/config.js'
import mcGachaData from './Tools/mcGachaData.js'
import kuroBbsTokenData from './Tools/kuroBbsTokenData.js'
import {
  getClientIp,
  logMiddleware,
  versionCheck,
  kuroBbsTokenCheck,
  kuroTokenCheck,
  mcGachaTokenCheck,
  mcGachaDataCheck,
  jsonParseError,
  errorHandler,
  notFoundHandler,
} from './Tools/middleware.js'
import fetch from 'node-fetch'

logger.info('Yunzai-Kuro-Plugin-Server starting...')
logger.debug('当前日志级别:', config.logLevel)
logger.setLogLevel(config.logLevel)

// 创建 Express 应用
const app = express()

// 使用基础中间件
app.use(getClientIp) // 1. 最先处理 CDN 兼容
app.use(express.json()) // 2. 然后是请求体解析
app.use(jsonParseError) // 3. JSON 解析错误处理
app.use(logMiddleware) // 4. 最后是日志记录

// 处理 OPTIONS 请求
app.options('*', (req, res) => {
  res.status(200).end()
})

// 静态文件服务
app.use('/static', express.static('./res/static'))
app.use('/favicon.ico', express.static('./res/favicon.ico'))
logger.debug('静态文件服务已启动')

// 首页路由
app.get(['/', '/index.html'], (req, res) => {
  logger.debug(`访问首页: ${req.url}`)
  try {
    res.sendFile('index.html', { root: './res/html' })
    logger.info(`首页访问成功: ${req.clientIp}`)
  } catch (err) {
    logger.error(`首页访问失败: ${err.message}`)
    res.status(404).json({ code: -1, msg: '404 Not Found' })
  }
})

// 库街区登录页面
app.get('/page/kuroBbsLogin', (req, res) => {
  try {
    res.sendFile('kuroBbsLogin.html', { root: './res/html' })
  } catch (err) {
    res.status(404).json({ code: -1, msg: '404 Not Found' })
  }
})

// 鸣潮抽卡记录上传页面
app.get('/page/mcGachaUpload', (req, res) => {
  try {
    res.sendFile('mcGachaUpload.html', { root: './res/html' })
  } catch (err) {
    res.status(404).json({ code: -1, msg: '404 Not Found' })
  }
})

// API 路由
// Ping (不需要版本验证)
app.post('/api/ping', (req, res) => {
  logger.debug(`Ping 请求: ${req.clientIp}`)
  res.json({ code: 0, msg: 'pong' })
})

// API: Bot: 生成库街区登录密钥
app.post('/api/kuroBbs/token/generateToken', versionCheck, (req, res) => {
  logger.debug(`生成库街区登录密钥: ${req.clientIp}`)

  const token = kuroBbsTokenData.generateToken()
  if (!token) {
    logger.error(`生成 token 失败: ${req.clientIp}`)
    return res.json({
      code: -1,
      msg: '生成 token 失败',
      token: null,
    })
  }

  logger.info(`生成 token 成功: ${req.clientIp} token=${token}`)
  res.json({
    code: 0,
    msg: '生成成功',
    token,
  })
})

// API: 前端: 库街区登录 token 验证
app.post(
  '/api/kuroBbs/token/verifyToken',
  versionCheck,
  kuroBbsTokenCheck,
  (req, res) => {
    logger.info(`客户端 ${req.clientIp} 请求 ${req.url} token 验证成功`)
    res.json({
      code: 0,
      msg: 'Token 有效',
    })
  }
)

// API: 前端: 上传库街区 Token
app.post(
  '/api/kuroBbs/token/upload',
  versionCheck,
  kuroBbsTokenCheck,
  kuroTokenCheck,
  (req, res) => {
    const { token } = req.body
    logger.debug(`上传库街区 Token: ${req.clientIp} token=${token}`)

    const saveRet = kuroBbsTokenData.saveTokenData(token, req.body.kuroToken)
    if (saveRet !== null) {
      logger.error(
        `保存库街区 Token 失败: ${req.clientIp} token=${token} error=${saveRet}`
      )
      return res.json({
        code: -1,
        msg: `保存库街区 Token 失败: ${saveRet}`,
      })
    }

    logger.info(`保存库街区 Token 成功: ${req.clientIp} token=${token}`)
    res.json({
      code: 0,
      msg: '保存成功',
    })
  }
)

// API: Bot: 获取库街区 Token
app.post(
  '/api/kuroBbs/token/get',
  versionCheck,
  kuroBbsTokenCheck,
  (req, res) => {
    const { token } = req.body

    const data = kuroBbsTokenData.getTokenData(token)
    if (!data) {
      logger.warn(`客户端 ${req.clientIp} 请求 ${req.url} 获取失败`)
      return res.json({
        code: -1,
        msg: '获取库街区 Token 失败',
      })
    }

    logger.info(`客户端 ${req.clientIp} 请求 ${req.url} 获取成功`)
    res.json({
      code: 0,
      msg: '获取成功',
      data,
    })
  }
)

// (已弃用) API: Bot: 生成鸣潮抽卡记录上传的密钥
app.post('/api/mc/gacha/generateToken', versionCheck, (req, res) => {
  logger.debug(`生成鸣潮抽卡密钥: ${req.clientIp}`)

  const token = mcGachaData.generateToken()
  if (!token) {
    logger.error(`生成 token 失败: ${req.clientIp}`)
    return res.json({
      code: -1,
      msg: '生成 token 失败',
      token: null,
    })
  }

  logger.info(`生成 token 成功: ${req.clientIp} token=${token}`)
  res.json({
    code: 0,
    msg: '生成成功',
    token,
  })
})

// (已弃用) API: 前端: 鸣潮抽卡上传 token 验证
app.post(
  '/api/mc/gacha/verifyToken',
  versionCheck,
  mcGachaTokenCheck,
  (req, res) => {
    logger.info(`鸣潮抽卡 token 验证成功: ${req.clientIp}`)
    res.json({
      code: 0,
      msg: 'token 有效',
    })
  }
)

// (已弃用) API: 前端: 上传鸣潮抽卡记录
app.post(
  '/api/mc/gacha/upload',
  versionCheck,
  mcGachaTokenCheck,
  mcGachaDataCheck,
  (req, res) => {
    const { token, playerId, gachaData } = req.body
    logger.debug(
      `上传鸣潮抽卡记录: ${req.clientIp} token=${token} playerId=${playerId}`
    )

    const saveRet = mcGachaData.saveGachaData(token, {
      version: 1,
      playerId,
      gachaData,
    })
    if (saveRet !== null) {
      logger.error(
        `保存抽卡记录失败: ${req.clientIp} token=${token} error=${saveRet}`
      )
      return res.json({
        code: -1,
        msg: `保存抽卡记录失败: ${saveRet}`,
      })
    }

    logger.info(`保存抽卡记录成功: ${req.clientIp} token=${token}`)
    res.json({
      code: 0,
      msg: '保存成功',
    })
  }
)

// (已弃用) API: Bot: 获取鸣潮抽卡记录
app.post('/api/mc/gacha/get', versionCheck, mcGachaTokenCheck, (req, res) => {
  const { token } = req.body

  const data = mcGachaData.getGachaData(token)
  if (!data) {
    logger.warn(`获取抽卡记录失败: ${req.clientIp} token=${token}`)
    return res.json({
      code: -1,
      msg: '获取抽卡记录失败',
    })
  }

  logger.info(`获取抽卡记录成功: ${req.clientIp} token=${token}`)
  res.json({
    code: 0,
    msg: '获取成功',
    data,
  })
})

// GitHub 仓库代理
// 请求示例: /repos/TomyJan/Yunzai-Kuro-Plugin/master/README.md
app.get('/repos/*', async (req, res) => {
  const path = req.params[0]
  logger.debug(`[GitHub代理] 收到请求: ${path}`)

  // 检查是否匹配白名单
  const repo = path.split('/').slice(0, 2).join('/')
  logger.debug(`[GitHub代理] 检查仓库: ${repo}`)

  if (!config.repos.whiteList.includes(repo)) {
    logger.warn(`[GitHub代理] 仓库 ${repo} 不在白名单中`)
    return res.status(403).json({
      code: -1,
      msg: '该仓库未被允许访问',
    })
  }

  try {
    // 构建原始文件 URL
    const pathParts = path.split('/')
    const branch = pathParts[2] || 'main'
    const filePath = pathParts.slice(3).join('/')
    const url = `${config.repos.githubRawUrl}${repo}/${branch}/${filePath}`

    logger.debug(`[GitHub代理] 请求上游 URL: ${url}`)

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
    logger.info(`[GitHub代理] 响应发送完成: ${path}`)
  } catch (err) {
    logger.error(`[GitHub代理] 请求失败:`, err)
    logger.error(`[GitHub代理] 错误堆栈:`, err.stack)
    res.status(500).json({
      code: -1,
      msg: `请求上游失败: ${err.message}`,
    })
  }
})

// 错误处理
app.use(errorHandler) // 通用错误处理
app.use(notFoundHandler) // 404 处理

// 启动服务器
const server = app.listen(config.httpServer.port, '0.0.0.0', () => {
  logger.info(`HTTP 服务器启动成功: 端口 ${config.httpServer.port}`)
  logger.info('----------------------------------------')
  logger.info('Yunzai-Kuro-Plugin-Server 已启动!')
  logger.info('----------------------------------------')
})

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('收到 SIGTERM 信号, 正在关闭服务器...')
  server.close(() => {
    logger.info('HTTP 服务器已关闭')
    process.exit(0)
  })
})

// 处理其他信号
process.on('SIGINT', () => {
  logger.info('收到 SIGINT 信号, 正在关闭服务器...')
  server.close(() => {
    logger.info('HTTP 服务器已关闭')
    process.exit(0)
  })
})

// 处理未捕获的异常
process.on('uncaughtException', (err) => {
  logger.error('未捕获的异常:', err)

  // 记录错误堆栈
  if (err.stack) {
    logger.error('错误堆栈:', err.stack)
  }

  // 如果是致命错误才关闭服务器
  if (isFatalError(err)) {
    logger.error('检测到致命错误，正在关闭服务器...')
    server.close(() => {
      logger.info('HTTP 服务器已关闭')
      process.exit(1)
    })
  } else {
    // 非致命错误，记录日志后继续运行
    logger.warn('非致命错误，服务器将继续运行')
  }
})

// 判断是否为致命错误
function isFatalError(err) {
  return (
    err instanceof TypeError || // 类型错误
    err instanceof ReferenceError || // 引用错误
    err.code === 'EADDRINUSE' || // 端口被占用
    err.code === 'EACCES' || // 权限错误
    err.code === 'ENOSPC'
  ) // 磁盘空间不足
}
