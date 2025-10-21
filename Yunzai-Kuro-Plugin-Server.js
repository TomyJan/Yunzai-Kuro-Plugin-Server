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
  githubRepoCheck,
  githubProxy,
  githubPreview,
} from './Tools/middleware.js'

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
app.options(/.*/, (req, res) => {
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
// 请求示例: /repo/raw/TomyJan/Yunzai-Kuro-Plugin/master/README.md
// 预览示例: /repo/raw/TomyJan/Yunzai-Kuro-Plugin/master/README.md?type=preview
app.get(/^\/repo\/raw\/(.*)/, githubRepoCheck, (req, res, next) => {
  if (req.query.type === 'preview') {
    githubPreview(req, res)
  } else {
    githubProxy(req, res)
  }
})

// 错误处理
app.use(errorHandler) // 通用错误处理
app.use(notFoundHandler) // 404 处理

// 启动服务器
logger.info(`准备在端口 ${config.httpServer.port} 上启动 HTTP 服务器...`)
const server = app.listen(config.httpServer.port, '0.0.0.0')

// 监听服务器成功启动事件
server.on('listening', () => {
  logger.info(`HTTP 服务器启动成功！`)
  logger.info('========================================')
  logger.info('Yunzai-Kuro-Plugin-Server 已启动!')
  logger.info(`监听地址: 0.0.0.0:${config.httpServer.port}`)
  logger.info('========================================')
})

// 监听服务器错误
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error('========================================')
    logger.error('服务器启动失败！')
    logger.error(`端口 ${config.httpServer.port} 已被占用`)
    logger.error('请检查是否有其他服务器实例正在运行')
    logger.error('或修改配置文件中的端口号')
    logger.error('========================================')
    process.exit(1)
  } else if (err.code === 'EACCES') {
    logger.error('========================================')
    logger.error('服务器启动失败！')
    logger.error(`没有权限监听端口 ${config.httpServer.port}`)
    logger.error('请尝试使用管理员权限运行或更换端口号')
    logger.error('========================================')
    process.exit(1)
  } else {
    logger.error('========================================')
    logger.error('服务器启动失败！')
    logger.error(`错误信息: ${err.message}`)
    logger.error('========================================')
    if (err.stack) {
      logger.error('错误堆栈:', err.stack)
    }
    process.exit(1)
  }
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
  logger.error('未捕获的异常:', err.message)

  // 记录错误堆栈
  if (err.stack) {
    logger.error('错误堆栈:', err.stack)
  }

  // 非致命错误，记录日志后继续运行
  logger.warn('检测到未捕获的异常，但服务器将尝试继续运行')
})
