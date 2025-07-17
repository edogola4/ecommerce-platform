import fs from 'fs';
import path from 'path';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  meta?: any;
  requestId?: string;
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private logsDir: string;

  private constructor() {
    this.logLevel = this.getLogLevel();
    this.logsDir = path.join(process.cwd(), 'logs');
    this.ensureLogDirectory();
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private getLogLevel(): LogLevel {
    const level = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';
    switch (level) {
      case 'ERROR': return LogLevel.ERROR;
      case 'WARN': return LogLevel.WARN;
      case 'INFO': return LogLevel.INFO;
      case 'DEBUG': return LogLevel.DEBUG;
      default: return LogLevel.INFO;
    }
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const logEntry: LogEntry = {
      timestamp,
      level,
      message,
      ...(meta && { meta })
    };
    return JSON.stringify(logEntry);
  }

  private writeToFile(level: string, formattedMessage: string): void {
    const date = new Date().toISOString().split('T')[0];
    const filename = `${date}.log`;
    const filepath = path.join(this.logsDir, filename);
    
    try {
      fs.appendFileSync(filepath, formattedMessage + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private writeToConsole(level: string, message: string, meta?: any): void {
    const timestamp = new Date().toISOString();
    const colorCodes = {
      ERROR: '\x1b[31m', // Red
      WARN: '\x1b[33m',  // Yellow
      INFO: '\x1b[36m',  // Cyan
      DEBUG: '\x1b[35m', // Magenta
      RESET: '\x1b[0m'   // Reset
    };

    const color = colorCodes[level as keyof typeof colorCodes] || colorCodes.INFO;
    const reset = colorCodes.RESET;
    
    let output = `${color}[${timestamp}] ${level}: ${message}${reset}`;
    
    if (meta) {
      output += `\n${color}Meta: ${JSON.stringify(meta, null, 2)}${reset}`;
    }
    
    console.log(output);
  }

  private log(level: LogLevel, levelName: string, message: string, meta?: any): void {
    if (level > this.logLevel) {
      return;
    }

    const formattedMessage = this.formatMessage(levelName, message, meta);
    
    // Always write to console in development
    if (process.env.NODE_ENV === 'development') {
      this.writeToConsole(levelName, message, meta);
    }
    
    // Write to file in production
    if (process.env.NODE_ENV === 'production') {
      this.writeToFile(levelName, formattedMessage);
    }
  }

  public error(message: string, meta?: any): void {
    this.log(LogLevel.ERROR, 'ERROR', message, meta);
  }

  public warn(message: string, meta?: any): void {
    this.log(LogLevel.WARN, 'WARN', message, meta);
  }

  public info(message: string, meta?: any): void {
    this.log(LogLevel.INFO, 'INFO', message, meta);
  }

  public debug(message: string, meta?: any): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, meta);
  }

  public request(method: string, url: string, statusCode: number, responseTime: number, requestId?: string): void {
    const message = `${method} ${url} ${statusCode} - ${responseTime}ms`;
    this.info(message, { requestId, type: 'request' });
  }

  public database(operation: string, collection: string, duration: number): void {
    const message = `DB ${operation} on ${collection} - ${duration}ms`;
    this.debug(message, { type: 'database' });
  }

  public payment(operation: string, amount: number, method: string, status: string): void {
    const message = `Payment ${operation} - ${method} ${amount} KES - ${status}`;
    this.info(message, { type: 'payment', amount, method, status });
  }

  public security(event: string, userId?: string, ip?: string): void {
    const message = `Security event: ${event}`;
    this.warn(message, { type: 'security', userId, ip });
  }

  public performance(operation: string, duration: number, threshold: number = 1000): void {
    const level = duration > threshold ? 'WARN' : 'DEBUG';
    const message = `Performance: ${operation} took ${duration}ms`;
    
    if (level === 'WARN') {
      this.warn(message, { type: 'performance', operation, duration, threshold });
    } else {
      this.debug(message, { type: 'performance', operation, duration });
    }
  }

  public cleanup(): void {
    const retentionDays = 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    try {
      const files = fs.readdirSync(this.logsDir);
      files.forEach(file => {
        if (file.endsWith('.log')) {
          const filePath = path.join(this.logsDir, file);
          const stats = fs.statSync(filePath);
          
          if (stats.mtime < cutoffDate) {
            fs.unlinkSync(filePath);
            this.info(`Cleaned up old log file: ${file}`);
          }
        }
      });
    } catch (error) {
      this.error('Error during log cleanup:', error);
    }
  }
}

export const logger = Logger.getInstance();