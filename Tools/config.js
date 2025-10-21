import fs from 'fs'
import logger from './logger.js'
import { exit } from 'process'

class ConfigurationManager {
  constructor() {
    this.configFileName = 'config.json'
    this.initConfig()
  }

  // 默认配置
  static defaultConfig = {
    logLevel: 'debug',
    httpServer: {
      port: 8123,
    },
    repos: {
      whiteList: [
        'TomyJan/Yunzai-Kuro-Plugin',
        'TomyJan/Yunzai-TomyJan-Plugin',
      ],
      githubRawUrl: 'https://raw.githubusercontent.com/',
    },
  }

  initConfig() {
    logger.debug('初始化配置文件...')
    try {
      if (fs.existsSync(this.configFileName)) {
        logger.debug('配置文件存在，读取配置文件...')
        const rawConfig = fs.readFileSync(this.configFileName, 'utf-8')
        try {
          this.config = JSON.parse(rawConfig)
        } catch (jsonError) {
          logger.error(
            '配置文件格式错误:',
            jsonError,
            ', 请检查或删除后重新启动',
          )
          exit(1)
        }

        // 验证配置项并设置默认值
        let configChanged = false
        for (const key in ConfigurationManager.defaultConfig) {
          if (
            !(key in this.config) ||
            typeof this.config[key] !==
              typeof ConfigurationManager.defaultConfig[key]
          ) {
            logger.warn(
              `配置项 ${key}: ${this.config[key]} 非法，使用默认值 ${ConfigurationManager.defaultConfig[key]} ...`,
            )
            this.config[key] = ConfigurationManager.defaultConfig[key]
            configChanged = true
          }
        }

        // 将更新后的配置保存回配置文件
        if (configChanged) {
          logger.info('配置项有变更，更新配置文件...')
          fs.writeFileSync(
            this.configFileName,
            JSON.stringify(this.config, null, 2),
            'utf-8',
          )
        }
      } else {
        // 如果配置文件不存在，创建新文件并写入默认配置
        logger.warn('配置文件不存在，创建新文件并写入默认配置...')
        fs.writeFileSync(
          this.configFileName,
          JSON.stringify(ConfigurationManager.defaultConfig, null, 2),
          'utf-8',
        )
        this.config = { ...ConfigurationManager.defaultConfig }
      }
    } catch (err) {
      logger.error('无法读取/创建配置文件:', err)
      exit(1)
    }
    logger.info('配置文件初始化完成')
  }
}

// 使用配置管理类
const configManager = new ConfigurationManager()

// 导出配置对象
export default configManager.config
