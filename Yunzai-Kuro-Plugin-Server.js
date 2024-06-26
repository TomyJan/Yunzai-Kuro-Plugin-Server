import http from 'http'
import fs from 'fs'
import logger from './Tools/logger.js'
import config from './Tools/config.js'
import mcGachaData from './Tools/mcGachaData.js'
import kuroBbsTokenData from './Tools/kuroBbsTokenData.js'

logger.info('Yunzai-Kuro-Plugin-Server starting...')

logger.setLogLevel(config.logLevel)

let server = http
  .createServer(async function (req, res) {
    // CDN 兼容
    let clientIp = req.headers['x-forwarded-for']
      ? req.headers['x-forwarded-for'].split(',')[0]
      : req.socket.remoteAddress
    let url = req.url

    // OPTIONS 处理
    if (req.method === 'OPTIONS') {
      res.writeHead(200, {
        'content-type': 'application/json;charset="utf-8"',
      })
      res.end()
      logger.debug('客户端', clientIp, '请求', url, '200 OK')
      return
    }

    // 非法请求处理
    if (/(\.\.)|(~)|(^\/\.\.)|(^\.)/.test(url)) {
      res.writeHead(400, {
        'content-type': 'application/json;charset="utf-8"',
      })
      res.end(JSON.stringify({ code: -1, msg: '400 Bad Request' }))
      logger.warn('客户端', clientIp, '请求', url, '400 Bad Request')
      return
    }

    // 首页请求处理
    if (url === '/' || url === '/index.html') {
      // 读取 /res/html/index.html 文件响应
      try {
        let data = fs.readFileSync('./res/html/index.html')
        res.writeHead(200, {
          'content-type': 'text/html',
        })
        res.end(data)
        logger.debug('客户端', clientIp, '请求', url, '200 OK')
        return
      } catch (err) {
        res.writeHead(404, {
          'content-type': 'application/json;charset="utf-8"',
        })
        res.end(JSON.stringify({ code: -1, msg: '404 Not Found' }))
        logger.debug('客户端', clientIp, '请求', url, '404 Not Found:', err)
        return
      }
    }

    // ICO
    if (url === '/favicon.ico') {
      try {
        let data = fs.readFileSync('./res/favicon.ico')
        res.writeHead(200, {
          'content-type': 'image/x-icon',
        })
        res.end(data)
        logger.debug('客户端', clientIp, '请求', url, '200 OK')
        return
      } catch (err) {
        res.writeHead(404, {
          'content-type': 'application/json;charset="utf-8"',
        })
        res.end(JSON.stringify({ code: -1, msg: '404 Not Found' }))
        logger.debug('客户端', clientIp, '请求', url, '404 Not Found:', err)
        return
      }
    }

    // 页面: 库街区在线登录 /page/kuroBbsLogin?token=xxx
    if (url.startsWith('/page/kuroBbsLogin')) {
      // 读取 /res/html/kuroBbsLogin.html 文件响应
      try {
        let data = fs.readFileSync('./res/html/kuroBbsLogin.html')
        res.writeHead(200, {
          'content-type': 'text/html',
        })
        res.end(data)
        logger.debug('客户端', clientIp, '请求', url, '200 OK')
        return
      } catch (err) {
        res.writeHead(404, {
          'content-type': 'application/json;charset="utf-8"',
        })
        res.end(JSON.stringify({ code: -1, msg: '404 Not Found' }))
        logger.debug('客户端', clientIp, '请求', url, '404 Not Found:', err)
        return
      }
    }

    // 页面: 鸣潮抽卡记录上传 (已废弃) /page/mcGachaUpload?token=xxx
    if (url.startsWith('/page/mcGachaUpload')) {
      // 读取 /res/html/mcGachaUpload.html 文件响应
      try {
        let data = fs.readFileSync('./res/html/mcGachaUpload.html')
        res.writeHead(200, {
          'content-type': 'text/html',
        })
        res.end(data)
        logger.debug('客户端', clientIp, '请求', url, '200 OK')
        return
      } catch (err) {
        res.writeHead(404, {
          'content-type': 'application/json;charset="utf-8"',
        })
        res.end(JSON.stringify({ code: -1, msg: '404 Not Found' }))
        logger.debug('客户端', clientIp, '请求', url, '404 Not Found:', err)
        return
      }
    }

    // API: ping
    if (url === '/api/ping') {
      res.writeHead(200, {
        'content-type': 'application/json;charset="utf-8"',
      })
      res.end(JSON.stringify({ code: 0, msg: 'pong' }))
      logger.info('客户端', clientIp, '请求', url, '200 OK')
      return
    }

    // API: Bot: 生成库街区登录的密钥
    if (url === '/api/kuroBbs/token/generateToken') {
      let requestBody = ''
      let generateTokenRsp = {
        code: -1,
        msg: '未知错误',
        token: null,
      }
      req.on('data', (chunk) => {
        requestBody += chunk.toString()
      })
      req.on('end', () => {
        if (!requestBody) {
          generateTokenRsp.msg = '无效的请求, 请检查'
          res.writeHead(200, {
            'content-type': 'application/json;charset="utf-8"',
          })
          res.end(JSON.stringify(generateTokenRsp))
          logger.warn('客户端', clientIp, '请求', url, '无效请求: 请求体为空')
          return
        }
        let params = null
        try {
          params = JSON.parse(requestBody)
        } catch (err) {
          generateTokenRsp.msg = '无效的请求, 请检查'
          res.writeHead(200, {
            'content-type': 'application/json;charset="utf-8"',
          })
          res.end(JSON.stringify(generateTokenRsp))
          logger.warn('客户端', clientIp, '请求', url, '无效请求: 请求体无效')
          return
        }
        if (params?.version !== 1) {
          generateTokenRsp.msg = `服务端暂不支持版本号 ${params?.version}`
          res.writeHead(200, {
            'content-type': 'application/json;charset="utf-8"',
          })
          res.end(JSON.stringify(generateTokenRsp))
          logger.warn(
            '客户端',
            clientIp,
            '请求',
            url,
            '不支持的版本号',
            params?.version
          )
          return
        }
        let token = kuroBbsTokenData.generateToken()
        if (!token) {
          generateTokenRsp.msg = '生成 token 失败'
          res.writeHead(200, {
            'content-type': 'application/json;charset="utf-8"',
          })
          res.end(JSON.stringify(generateTokenRsp))
          logger.warn('客户端', clientIp, '请求', url, '生成 token 失败')
          return
        }
        generateTokenRsp.code = 0
        generateTokenRsp.msg = '生成成功'
        generateTokenRsp.token = token
        res.writeHead(200, {
          'content-type': 'application/json;charset="utf-8"',
        })
        res.end(JSON.stringify(generateTokenRsp))
        logger.info('客户端', clientIp, '请求', url, '200 OK')
      })
      return
    }

    // API: 前端: 库街区登录 token 验证
    if (url === '/api/kuroBbs/token/verifyToken') {
      let requestBody = ''
      let verifyTokenRsp = {
        code: -1,
        msg: '未知错误',
      }
      req.on('data', (chunk) => {
        requestBody += chunk.toString()
      })
      req.on('end', () => {
        if (!requestBody) {
          verifyTokenRsp.msg = '无效的请求, 请检查'
          res.writeHead(200, {
            'content-type': 'application/json;charset="utf-8"',
          })
          res.end(JSON.stringify(verifyTokenRsp))
          logger.warn('客户端', clientIp, '请求', url, '无效请求: 请求体为空')
          return
        }
        let params = null
        try {
          params = JSON.parse(requestBody)
        } catch (err) {
          verifyTokenRsp.msg = '无效的请求, 请检查'
          res.writeHead(200, {
            'content-type': 'application/json;charset="utf-8"',
          })
          res.end(JSON.stringify(verifyTokenRsp))
          logger.warn('客户端', clientIp, '请求', url, '无效请求: 请求体无效')
          return
        }
        if (params?.version !== 1) {
          verifyTokenRsp.msg = `服务端暂不支持版本号 ${params?.version}`
          res.writeHead(200, {
            'content-type': 'application/json;charset="utf-8"',
          })
          res.end(JSON.stringify(verifyTokenRsp))
          logger.warn(
            '客户端',
            clientIp,
            '请求',
            url,
            '不支持的版本号',
            params?.version
          )
          return
        }
        if (!params.token || !kuroBbsTokenData.verifyToken(params?.token)) {
          verifyTokenRsp.msg = 'Token 无效, 请重新获取'
          res.writeHead(200, {
            'content-type': 'application/json;charset="utf-8"',
          })
          res.end(JSON.stringify(verifyTokenRsp))
          logger.warn(
            '客户端',
            clientIp,
            '请求',
            url,
            '无效的 token:',
            params.token
          )
          return
        }
        verifyTokenRsp.code = 0
        verifyTokenRsp.msg = 'Token 有效'
        res.writeHead(200, {
          'content-type': 'application/json;charset="utf-8"',
        })
        res.end(JSON.stringify(verifyTokenRsp))
        logger.info('客户端', clientIp, '请求', url, '200 OK')
      })
      return
    }

    // API: 前端: 上传库街区 Token
    if (url === '/api/kuroBbs/token/upload') {
      let requestBody = ''
      let kuroBbsTokenDataUploadRsp = {
        code: -1,
        msg: '未知错误',
      }
      req.on('data', (chunk) => {
        requestBody += chunk.toString()
      })
      req.on('end', () => {
        if (!requestBody) {
          kuroBbsTokenDataUploadRsp.msg = '无效的请求, 请检查'
          res.writeHead(200, {
            'content-type': 'application/json;charset="utf-8"',
          })
          res.end(JSON.stringify(kuroBbsTokenDataUploadRsp))
          logger.warn('客户端', clientIp, '请求', url, '无效请求: 请求体为空')
          return
        }
        let params = null
        try {
          params = JSON.parse(requestBody)
        } catch (err) {
          kuroBbsTokenDataUploadRsp.msg = '无效的请求, 请检查'
          res.writeHead(200, {
            'content-type': 'application/json;charset="utf-8"',
          })
          res.end(JSON.stringify(kuroBbsTokenDataUploadRsp))
          logger.warn('客户端', clientIp, '请求', url, '无效请求: 请求体无效')
          return
        }
        if (params?.version !== 1) {
          kuroBbsTokenDataUploadRsp.msg = `服务端暂不支持版本号 ${params?.version}`
          res.writeHead(200, {
            'content-type': 'application/json;charset="utf-8"',
          })
          res.end(JSON.stringify(kuroBbsTokenDataUploadRsp))
          logger.warn(
            '客户端',
            clientIp,
            '请求',
            url,
            '不支持的版本号',
            params?.version
          )
          return
        }
        if (!params.token || !kuroBbsTokenData.verifyToken(params?.token)) {
          kuroBbsTokenDataUploadRsp.msg = 'Token 无效, 请重新获取'
          res.writeHead(200, {
            'content-type': 'application/json;charset="utf-8"',
          })
          res.end(JSON.stringify(kuroBbsTokenDataUploadRsp))
          logger.warn(
            '客户端',
            clientIp,
            '请求',
            url,
            '无效的 token:',
            params.token
          )
          return
        }
        if (!params.kuroToken || Object.keys(params.kuroToken).length !== 4) {
          kuroBbsTokenDataUploadRsp.msg = '上传的库街区 Token 不完整, 请检查'
          res.writeHead(200, {
            'content-type': 'application/json;charset="utf-8"',
          })
          res.end(JSON.stringify(kuroBbsTokenDataUploadRsp))
          logger.warn(
            '客户端',
            clientIp,
            '请求',
            url,
            '不完整的 库洛  token:',
            JSON.stringify(params.kuroToken)
          )
          return
        }
        let saveRet = kuroBbsTokenData.saveTokenData(
          params.token,
          params.kuroToken
        )
        if (saveRet !== null) {
          kuroBbsTokenDataUploadRsp.msg = `保存库街区 Token 失败: ${saveRet}`
          res.writeHead(200, {
            'content-type': 'application/json;charset="utf-8"',
          })
          res.end(JSON.stringify(kuroBbsTokenDataUploadRsp))
          logger.warn('客户端', clientIp, '请求', url, '保存库街区 Token 失败')
          return
        }
        kuroBbsTokenDataUploadRsp.code = 0
        kuroBbsTokenDataUploadRsp.msg = '保存成功'
        res.writeHead(200, {
          'content-type': 'application/json;charset="utf-8"',
        })
        res.end(JSON.stringify(kuroBbsTokenDataUploadRsp))
        logger.info('客户端', clientIp, '请求', url, '200 OK')
      })
      return
    }

    // API: Bot: 获取库街区 Token
    if (url === '/api/kuroBbs/token/get') {
      let requestBody = ''
      let kuroBbsTokenDataGetRsp = {
        code: -1,
        msg: '未知错误',
        data: null,
      }
      req.on('data', (chunk) => {
        requestBody += chunk.toString()
      })
      req.on('end', () => {
        if (!requestBody) {
          kuroBbsTokenDataGetRsp.msg = '无效的请求, 请检查'
          res.writeHead(200, {
            'content-type': 'application/json;charset="utf-8"',
          })
          res.end(JSON.stringify(kuroBbsTokenDataGetRsp))
          logger.warn('客户端', clientIp, '请求', url, '无效请求: 请求体为空')
          return
        }
        let params = null
        try {
          params = JSON.parse(requestBody)
        } catch (err) {
          kuroBbsTokenDataGetRsp.msg = '无效的请求, 请检查'
          res.writeHead(200, {
            'content-type': 'application/json;charset="utf-8"',
          })
          res.end(JSON.stringify(kuroBbsTokenDataGetRsp))
          logger.warn('客户端', clientIp, '请求', url, '无效请求: 请求体无效')
          return
        }
        if (params?.version !== 1) {
          kuroBbsTokenDataGetRsp.msg = `服务端暂不支持版本号 ${params?.version}`
          res.writeHead(200, {
            'content-type': 'application/json;charset="utf-8"',
          })
          res.end(JSON.stringify(kuroBbsTokenDataGetRsp))
          logger.warn(
            '客户端',
            clientIp,
            '请求',
            url,
            '不支持的版本号',
            params?.version
          )
          return
        }
        if (!params.token || !kuroBbsTokenData.verifyToken(params?.token)) {
          kuroBbsTokenDataGetRsp.msg = 'Token 无效, 请检查'
          res.writeHead(200, {
            'content-type': 'application/json;charset="utf-8"',
          })
          res.end(JSON.stringify(kuroBbsTokenDataGetRsp))
          logger.warn(
            '客户端',
            clientIp,
            '请求',
            url,
            '无效的 token:',
            params.token
          )
          return
        }
        let data = kuroBbsTokenData.getTokenData(params?.token)
        if (!data) {
          kuroBbsTokenDataGetRsp.msg = '获取库街区 Token 失败'
          res.writeHead(200, {
            'content-type': 'application/json;charset="utf-8"',
          })
          res.end(JSON.stringify(kuroBbsTokenDataGetRsp))
          logger.warn('客户端', clientIp, '请求', url, '获取库街区 Token 失败')
          return
        }
        kuroBbsTokenDataGetRsp.code = 0
        kuroBbsTokenDataGetRsp.msg = '获取成功'
        kuroBbsTokenDataGetRsp.data = data
        res.writeHead(200, {
          'content-type': 'application/json;charset="utf-8"',
        })
        res.end(JSON.stringify(kuroBbsTokenDataGetRsp))
        logger.debug('客户端', clientIp, '请求', url, '200 OK')
      })
      return
    }

    // API: Bot: 生成鸣潮抽卡记录上传的密钥
    if (url === '/api/mc/gacha/generateToken') {
      let requestBody = ''
      let generateTokenRsp = {
        code: -1,
        msg: '未知错误',
        token: null,
      }
      req.on('data', (chunk) => {
        requestBody += chunk.toString()
      })
      req.on('end', () => {
        if (!requestBody) {
          generateTokenRsp.msg = '无效的请求, 请检查'
          res.writeHead(200, {
            'content-type': 'application/json;charset="utf-8"',
          })
          res.end(JSON.stringify(generateTokenRsp))
          logger.warn('客户端', clientIp, '请求', url, '无效请求: 请求体为空')
          return
        }
        let params = null
        try {
          params = JSON.parse(requestBody)
        } catch (err) {
          generateTokenRsp.msg = '无效的请求, 请检查'
          res.writeHead(200, {
            'content-type': 'application/json;charset="utf-8"',
          })
          res.end(JSON.stringify(generateTokenRsp))
          logger.warn('客户端', clientIp, '请求', url, '无效请求: 请求体无效')
          return
        }
        if (params?.version !== 1) {
          generateTokenRsp.msg = `服务端暂不支持版本号 ${params?.version}`
          res.writeHead(200, {
            'content-type': 'application/json;charset="utf-8"',
          })
          res.end(JSON.stringify(generateTokenRsp))
          logger.warn(
            '客户端',
            clientIp,
            '请求',
            url,
            '不支持的版本号',
            params?.version
          )
          return
        }
        let token = mcGachaData.generateToken()
        if (!token) {
          generateTokenRsp.msg = '生成 token 失败'
          res.writeHead(200, {
            'content-type': 'application/json;charset="utf-8"',
          })
          res.end(JSON.stringify(generateTokenRsp))
          logger.warn('客户端', clientIp, '请求', url, '生成 token 失败')
          return
        }
        generateTokenRsp.code = 0
        generateTokenRsp.msg = '生成成功'
        generateTokenRsp.token = token
        res.writeHead(200, {
          'content-type': 'application/json;charset="utf-8"',
        })
        res.end(JSON.stringify(generateTokenRsp))
        logger.info('客户端', clientIp, '请求', url, '200 OK')
      })
      return
    }

    // API: 前端: 鸣潮抽卡上传 token 验证
    if (url === '/api/mc/gacha/verifyToken') {
      let requestBody = ''
      let verifyTokenRsp = {
        code: -1,
        msg: '未知错误',
      }
      req.on('data', (chunk) => {
        requestBody += chunk.toString()
      })
      req.on('end', () => {
        if (!requestBody) {
          verifyTokenRsp.msg = '无效的请求, 请检查'
          res.writeHead(200, {
            'content-type': 'application/json;charset="utf-8"',
          })
          res.end(JSON.stringify(verifyTokenRsp))
          logger.warn('客户端', clientIp, '请求', url, '无效请求: 请求体为空')
          return
        }
        let params = null
        try {
          params = JSON.parse(requestBody)
        } catch (err) {
          verifyTokenRsp.msg = '无效的请求, 请检查'
          res.writeHead(200, {
            'content-type': 'application/json;charset="utf-8"',
          })
          res.end(JSON.stringify(verifyTokenRsp))
          logger.warn('客户端', clientIp, '请求', url, '无效请求: 请求体无效')
          return
        }
        if (params?.version !== 1) {
          verifyTokenRsp.msg = `服务端暂不支持版本号 ${params?.version}`
          res.writeHead(200, {
            'content-type': 'application/json;charset="utf-8"',
          })
          res.end(JSON.stringify(verifyTokenRsp))
          logger.warn(
            '客户端',
            clientIp,
            '请求',
            url,
            '不支持的版本号',
            params?.version
          )
          return
        }
        if (!params.token || !mcGachaData.verifyToken(params?.token)) {
          verifyTokenRsp.msg = 'Token 无效, 请重新获取'
          res.writeHead(200, {
            'content-type': 'application/json;charset="utf-8"',
          })
          res.end(JSON.stringify(verifyTokenRsp))
          logger.warn(
            '客户端',
            clientIp,
            '请求',
            url,
            '无效的 token:',
            params.token
          )
          return
        }
        verifyTokenRsp.code = 0
        verifyTokenRsp.msg = 'token 有效'
        res.writeHead(200, {
          'content-type': 'application/json;charset="utf-8"',
        })
        res.end(JSON.stringify(verifyTokenRsp))
        logger.info('客户端', clientIp, '请求', url, '200 OK')
      })
      return
    }

    // API: 前端: 上传鸣潮抽卡记录
    if (url === '/api/mc/gacha/upload') {
      let requestBody = ''
      let mcGachaDataUploadRsp = {
        code: -1,
        msg: '未知错误',
      }
      req.on('data', (chunk) => {
        requestBody += chunk.toString()
      })
      req.on('end', () => {
        if (!requestBody) {
          mcGachaDataUploadRsp.msg = '无效的请求, 请检查'
          res.writeHead(200, {
            'content-type': 'application/json;charset="utf-8"',
          })
          res.end(JSON.stringify(mcGachaDataUploadRsp))
          logger.warn('客户端', clientIp, '请求', url, '无效请求: 请求体为空')
          return
        }
        let params = null
        try {
          params = JSON.parse(requestBody)
        } catch (err) {
          mcGachaDataUploadRsp.msg = '无效的请求, 请检查'
          res.writeHead(200, {
            'content-type': 'application/json;charset="utf-8"',
          })
          res.end(JSON.stringify(mcGachaDataUploadRsp))
          logger.warn('客户端', clientIp, '请求', url, '无效请求: 请求体无效')
          return
        }
        if (params?.version !== 1) {
          mcGachaDataUploadRsp.msg = `服务端暂不支持版本号 ${params?.version}`
          res.writeHead(200, {
            'content-type': 'application/json;charset="utf-8"',
          })
          res.end(JSON.stringify(mcGachaDataUploadRsp))
          logger.warn(
            '客户端',
            clientIp,
            '请求',
            url,
            '不支持的版本号',
            params?.version
          )
          return
        }
        if (!params.token || !mcGachaData.verifyToken(params?.token)) {
          mcGachaDataUploadRsp.msg = 'Token 无效, 请重新获取'
          res.writeHead(200, {
            'content-type': 'application/json;charset="utf-8"',
          })
          res.end(JSON.stringify(mcGachaDataUploadRsp))
          logger.warn(
            '客户端',
            clientIp,
            '请求',
            url,
            '无效的 token:',
            params.token
          )
          return
        }
        if (!params.playerId || !/^\d{9}$/.test(params.playerId)) {
          mcGachaDataUploadRsp.msg = `UID ${params.playerId} 无效, 请检查`
          res.writeHead(200, {
            'content-type': 'application/json;charset="utf-8"',
          })
          res.end(JSON.stringify(mcGachaDataUploadRsp))
          logger.warn(
            '客户端',
            clientIp,
            '请求',
            url,
            '无效的 playerId:',
            params.playerId
          )
          return
        }
        if (!params.gachaData || Object.keys(params.gachaData).length !== 6) {
          mcGachaDataUploadRsp.msg = '上传的抽卡记录不完整, 请检查'
          res.writeHead(200, {
            'content-type': 'application/json;charset="utf-8"',
          })
          res.end(JSON.stringify(mcGachaDataUploadRsp))
          logger.warn(
            '客户端',
            clientIp,
            '请求',
            url,
            '不完整的 gachaData:',
            JSON.stringify(params.gachaData)
          )
          return
        }
        let saveRet = mcGachaData.saveGachaData(params.token, {
          version: params.version,
          playerId: params.playerId,
          gachaData: params.gachaData,
        })
        if (saveRet !== null) {
          mcGachaDataUploadRsp.msg = `保存抽卡记录失败: ${saveRet}`
          res.writeHead(200, {
            'content-type': 'application/json;charset="utf-8"',
          })
          res.end(JSON.stringify(mcGachaDataUploadRsp))
          logger.warn('客户端', clientIp, '请求', url, '保存抽卡记录失败')
          return
        }
        mcGachaDataUploadRsp.code = 0
        mcGachaDataUploadRsp.msg = '保存成功'
        res.writeHead(200, {
          'content-type': 'application/json;charset="utf-8"',
        })
        res.end(JSON.stringify(mcGachaDataUploadRsp))
        logger.info('客户端', clientIp, '请求', url, '200 OK')
      })
      return
    }

    // API: Bot: 获取鸣潮抽卡记录
    if (url === '/api/mc/gacha/get') {
      let requestBody = ''
      let mcGachaDataGetRsp = {
        code: -1,
        msg: '未知错误',
        data: null,
      }
      req.on('data', (chunk) => {
        requestBody += chunk.toString()
      })
      req.on('end', () => {
        if (!requestBody) {
          mcGachaDataGetRsp.msg = '无效的请求, 请检查'
          res.writeHead(200, {
            'content-type': 'application/json;charset="utf-8"',
          })
          res.end(JSON.stringify(mcGachaDataGetRsp))
          logger.warn('客户端', clientIp, '请求', url, '无效请求: 请求体为空')
          return
        }
        let params = null
        try {
          params = JSON.parse(requestBody)
        } catch (err) {
          mcGachaDataGetRsp.msg = '无效的请求, 请检查'
          res.writeHead(200, {
            'content-type': 'application/json;charset="utf-8"',
          })
          res.end(JSON.stringify(mcGachaDataGetRsp))
          logger.warn('客户端', clientIp, '请求', url, '无效请求: 请求体无效')
          return
        }
        if (params?.version !== 1) {
          mcGachaDataGetRsp.msg = `服务端暂不支持版本号 ${params?.version}`
          res.writeHead(200, {
            'content-type': 'application/json;charset="utf-8"',
          })
          res.end(JSON.stringify(mcGachaDataGetRsp))
          logger.warn(
            '客户端',
            clientIp,
            '请求',
            url,
            '不支持的版本号',
            params?.version
          )
          return
        }
        if (!params.token || !mcGachaData.verifyToken(params?.token)) {
          mcGachaDataGetRsp.msg = 'Token 无效, 请检查'
          res.writeHead(200, {
            'content-type': 'application/json;charset="utf-8"',
          })
          res.end(JSON.stringify(mcGachaDataGetRsp))
          logger.warn(
            '客户端',
            clientIp,
            '请求',
            url,
            '无效的 token:',
            params.token
          )
          return
        }
        let data = mcGachaData.getGachaData(params?.token)
        if (!data) {
          mcGachaDataGetRsp.msg = '获取抽卡记录失败'
          res.writeHead(200, {
            'content-type': 'application/json;charset="utf-8"',
          })
          res.end(JSON.stringify(mcGachaDataGetRsp))
          logger.warn('客户端', clientIp, '请求', url, '获取抽卡记录失败')
          return
        }
        mcGachaDataGetRsp.code = 0
        mcGachaDataGetRsp.msg = '获取成功'
        mcGachaDataGetRsp.data = data
        res.writeHead(200, {
          'content-type': 'application/json;charset="utf-8"',
        })
        res.end(JSON.stringify(mcGachaDataGetRsp))
        logger.info('客户端', clientIp, '请求', url, '200 OK')
      })
      return
    }

    // 静态文件
    // 极验 JS
    if (url === '/static/geetest/gt4.js') {
      try {
        let data = fs.readFileSync('./res/static/geetest/gt4.js')
        res.writeHead(200, {
          'content-type': 'application/javascript',
        })
        res.end(data)
        logger.debug('客户端', clientIp, '请求', url, '200 OK')
        return
      } catch (err) {
        res.writeHead(404, {
          'content-type': 'application/json;charset="utf-8"',
        })
        res.end(JSON.stringify({ code: -1, msg: '404 Not Found' }))
        logger.debug('客户端', clientIp, '请求', url, '404 Not Found:', err)
        return
      }
    }

    // 空路由
    res.writeHead(404, {
      'content-type': 'application/json;charset="utf-8"',
    })
    res.end(JSON.stringify({ code: -1, msg: '404 Not Found' }))
    logger.debug('客户端', clientIp, '请求', url, '404 Not Found')
  })
  .listen(config.httpServer.port, '0.0.0.0', () => {
    logger.info('HTTP 服务器创建于端口', config.httpServer.port)
  })

logger.info('Yunzai-Kuro-Plugin-Server 已启动!')
