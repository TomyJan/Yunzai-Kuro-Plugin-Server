import chalk from 'chalk'
import fs from 'fs'
import path from 'path'

class Logger {
  constructor(logLevel = 'debug', logDirectory = './logs') {
    this.logLevel = logLevel.toLowerCase()
    this.logDirectory = logDirectory
    this.maxLogFileSize = 20 * 1024 * 1024 // 20 MB
    this.currentLogFile = this.generateLogFileName(true)
    this.ensureLogDirectoryExists()
  }

  setLogLevel(logLevel) {
    this.logLevel = logLevel.toLowerCase()
    this.logMessage(`日志等级设置为 ${this.logLevel}`)
  }

  logMessage(message, logType = 'INFO ') {
    const logMessage = `[${this.getTimeForLog()}] [${logType} ] ${message}`
    const currentLogFilePath = path.join(this.logDirectory, this.currentLogFile)

    if (fs.existsSync(currentLogFilePath)) {
      const stats = fs.statSync(currentLogFilePath)
      if (stats.size >= this.maxLogFileSize) {
        this.currentLogFile = this.generateLogFileName()
      }
    }

    fs.appendFile(currentLogFilePath, logMessage + '\n', (err) => {
      if (err) {
        console.log(
          chalk.yellow(
            `[${this.getTimeForLog()}] [WARN  ] 写入日志文件时发生错误：${err}`
          )
        )
      }
    })

    if (logType === 'INFO ') console.log(chalk.white(logMessage))
    if (logType === 'DEBUG') console.log(chalk.gray(logMessage))
    if (logType === 'WARN ') console.log(chalk.yellow(logMessage))
    if (logType === 'ERROR') console.log(chalk.red(logMessage))
  }

  debug(...args) {
    if (this.isLogLevelEnabled('debug')) {
      this.logMessage(args.join(' '), 'DEBUG')
    }
  }

  info(...args) {
    if (this.isLogLevelEnabled('info')) {
      this.logMessage(args.join(' '), 'INFO ')
    }
  }

  warn(...args) {
    if (this.isLogLevelEnabled('warn')) {
      this.logMessage(args.join(' '), 'WARN ')
    }
  }

  error(...args) {
    if (this.isLogLevelEnabled('error')) {
      this.logMessage(args.join(' '), 'ERROR')
    }
  }

  isLogLevelEnabled(level) {
    const logLevels = ['debug', 'info', 'warn', 'error']
    const currentLogLevelIndex = logLevels.indexOf(this.logLevel)
    const messageLogLevelIndex = logLevels.indexOf(level)
    return (
      messageLogLevelIndex >= 0 && messageLogLevelIndex >= currentLogLevelIndex
    )
  }

  generateLogFileName(onStart = false) {
    const now = new Date()
    const year = now.getFullYear().toString().padStart(4, '0')
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const day = now.getDate().toString().padStart(2, '0')
    const hours = now.getHours().toString().padStart(2, '0')
    const minutes = now.getMinutes().toString().padStart(2, '0')
    const seconds = now.getSeconds().toString().padStart(2, '0')
    const milliseconds = now.getMilliseconds().toString().padStart(3, '0')

    const timestamp = `${year}-${month}-${day}T${hours}-${minutes}-${seconds}-${milliseconds}`
    return onStart ? `${timestamp}-start.log` : `${timestamp}.log`
  }

  getTimeForLog() {
    const now = new Date()
    const year = now.getFullYear().toString().padStart(4, '0')
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const day = now.getDate().toString().padStart(2, '0')
    const hours = now.getHours().toString().padStart(2, '0')
    const minutes = now.getMinutes().toString().padStart(2, '0')
    const seconds = now.getSeconds().toString().padStart(2, '0')
    const milliseconds = now.getMilliseconds().toString().padStart(3, '0')

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`
  }

  ensureLogDirectoryExists() {
    if (!fs.existsSync(this.logDirectory)) {
      fs.mkdirSync(this.logDirectory, { recursive: true })
    }
  }
}

// 初始化全局日志记录器实例
const logger = new Logger('debug')
console.log(
  chalk.gray(`[${logger.getTimeForLog()}] [LOGGER] Logger initialized!`)
)

export default logger
