import fs from 'fs'
import crypto from 'crypto'
import logger from './logger.js'
import { exit } from 'process'

class kuroBbsTokenDataManager {
  constructor() {
    this.dataPath = './data/kuroBbsTokenData/'
    this.initData()
  }

  initData() {
    logger.debug('初始化库街区 token 目录...')
    try {
      // 检查记录目录是否存在, 不存在则创建
      if (!fs.existsSync(this.dataPath)) {
        logger.warn('库街区 token 目录不存在，创建目录...')
        fs.mkdirSync(this.dataPath)
      }
    } catch (err) {
      logger.error('无法读取/创建库街区 token 目录:', err)
      exit(1)
    }

    // 删除目录下所有修改时间在 3 分钟前的 json 文件
    let now = Date.now()
    fs.readdirSync(this.dataPath).forEach((file) => {
      let filePath = this.dataPath + file
      let stat = fs.statSync(filePath)
      if (
        file.endsWith('.json') &&
        (now - stat.mtimeMs > 3 * 60 * 1000 || stat.size > 10)
      ) {
        fs.unlinkSync(filePath)
        logger.warn(
          '删除超时或已使用的 token',
          file,
          '修改时间:',
          stat.mtimeMs,
          '文件大小:',
          stat.size
        )
      }
    })

    logger.info('库街区 token 目录初始化完成')
  }

  /**
   * 生成 token
   * @returns {string|null} 生成的 token, 失败返回 null
   */
  generateToken() {
    do {
      let token = crypto.randomBytes(8).toString('hex')
      let tokenPath = this.dataPath + token + '.json'
      if (!fs.existsSync(tokenPath)) {
        fs.writeFileSync(tokenPath, '{}')
        setTimeout(() => {
          if (fs.existsSync(tokenPath)) {
            fs.unlinkSync(tokenPath)
            logger.warn('删除超时未使用的 token', token)
          }
        }, 3 * 60 * 1000)
        return token
      }
    } while (true)
  }

  /**
   * 验证 token 是否存在
   * @param {string} token token
   * @returns {boolean} token 是否存在
   */
  verifyToken(token) {
    if (
      !token ||
      typeof token !== 'string' ||
      token.length !== 16 ||
      !/^[0-9a-fA-F]+$/.test(token)
    )
      return false
    let tokenPath = this.dataPath + token + '.json'
    return fs.existsSync(tokenPath)
  }

  /**
   * 获取库街区 token, 如果记录有效就同时删除
   * @param {string} token token
   * @returns {object|null} 库街区 token, 失败返回 null
   */
  getTokenData(token) {
    let tokenPath = this.dataPath + token + '.json'
    try {
      // 读入文件, 删除, 并返回
      let rawTokenData = fs.readFileSync(tokenPath, 'utf-8')
      // 删除文件
      if (Object.keys(JSON.parse(rawTokenData)).length > 0) {
        logger.info(
          '删除 token',
          token,
          '已上传的库街区 token:',
          JSON.stringify(JSON.parse(rawTokenData))
        )
        fs.unlinkSync(tokenPath)
      }
      return JSON.parse(rawTokenData)
    } catch (err) {
      logger.error('无法读取 token', token, '的库街区 token:', err)
      return null
    }
  }

  /**
   * 保存库街区 token
   * @param {string} token token
   * @param {object} data 原始格式的库街区 token
   * @returns {null|string} 保存成功返回 null 失败返回错误信息
   */
  saveTokenData(token, data) {
    let tokenPath = this.dataPath + token + '.json'
    let localData = {}
    try {
      localData = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'))
    } catch (err) {
      logger.error('无法读取', token, '的本地库街区 token:', err)
      return `读取本地库街区 Token 失败: ${err}, 请重试`
    }
    if (Object.keys(localData).length !== 0) {
      logger.error(token, '的本地库街区 token 不为空，无法保存')
      return '已经上传过库街区 Token 了, 如需重新上传请重新获取 Token'
    }
    try {
      fs.writeFileSync(tokenPath, JSON.stringify(data, null, 2), 'utf-8')
      return null
    } catch (err) {
      logger.error('无法保存', token, '的库街区 token:', err)
      return `库街区 Token 保存失败: ${err}, 请重试`
    }
  }
}

const kuroBbsTokenData = new kuroBbsTokenDataManager()
export default kuroBbsTokenData
