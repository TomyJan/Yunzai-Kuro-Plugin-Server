import fs from 'fs'
import crypto from 'crypto'
import logger from './logger.js'
import { exit } from 'process'

class mcGachaDataManager {
  constructor() {
    this.dataPath = './data/mcGachaData/'
    this.initData()
  }

  initData() {
    logger.debug('初始化鸣潮抽卡记录目录...')
    try {
      // 检查记录目录是否存在, 不存在则创建
      if (!fs.existsSync(this.dataPath)) {
        logger.warn('鸣潮抽卡记录目录不存在，创建目录...')
        fs.mkdirSync(this.dataPath)
      }
    } catch (err) {
      logger.error('无法读取/创建鸣潮抽卡记录目录:', err)
      exit(1)
    }
    logger.info('鸣潮抽卡记录目录初始化完成')
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
   * 获取抽卡记录, 如果记录有效就同时删除
   * @param {string} token token
   * @returns {object|null} 抽卡记录, 失败返回 null
   */
  getGachaData(token) {
    let tokenPath = this.dataPath + token + '.json'
    try {
      // 读入文件, 删除, 并返回
      let rawGachaData = fs.readFileSync(tokenPath, 'utf-8')
      // 删除文件
      if (Object.keys(JSON.parse(rawGachaData)).length > 0) {
        logger.info(
          '删除 token',
          token,
          '已上传的抽卡记录:',
          JSON.stringify(JSON.parse(rawGachaData))
        )
        fs.unlinkSync(tokenPath)
      }
      return JSON.parse(rawGachaData)
    } catch (err) {
      logger.error('无法读取 token', token, '的抽卡记录:', err)
      return null
    }
  }

  /**
   * 保存抽卡记录
   * @param {string} token token
   * @param {object} data 自有格式的抽卡记录
   * @returns {null|string} 保存成功返回 null 失败返回错误信息
   */
  saveGachaData(token, data) {
    let tokenPath = this.dataPath + token + '.json'
    let localData = {}
    try {
      localData = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'))
    } catch (err) {
      logger.error('无法读取', token, '的本地抽卡记录:', err)
      return `读取本地抽卡记录失败: ${err}, 请重试`
    }
    if (Object.keys(localData).length !== 0) {
      logger.error(token, '的本地抽卡记录不为空，无法保存')
      return '已经上传过抽卡记录了, 如需重新上传请重新获取 token'
    }
    try {
      fs.writeFileSync(tokenPath, JSON.stringify(data, null, 2), 'utf-8')
      return null
    } catch (err) {
      logger.error('无法保存', token, '的抽卡记录:', err)
      return `抽卡记录保存失败: ${err}, 请重试`
    }
  }
}

const maGachaData = new mcGachaDataManager()
export default maGachaData
