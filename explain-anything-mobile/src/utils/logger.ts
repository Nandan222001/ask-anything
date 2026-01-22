type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
    private isDevelopment = __DEV__;

    private log(level: LogLevel, message: string, data?: any) {
        const timestamp = new Date().toISOString();
        const logData = data ? { ...data } : {};

        if (this.isDevelopment) {
            const styles: Record<LogLevel, string> = {
                debug: 'color: #9CA3AF',
                info: 'color: #3B82F6',
                warn: 'color: #F59E0B',
                error: 'color: #EF4444',
            };

            console.log(
                `[${timestamp}] ${level.toUpperCase()}: ${message}`,
                logData
            );
        }
    }

    debug(message: string, data?: any) {
        this.log('debug', message, data);
    }

    info(message: string, data?: any) {
        this.log('info', message, data);
    }

    warn(message: string, data?: any) {
        this.log('warn', message, data);
    }

    error(message: string, error?: any) {
        const errorData = error instanceof Error
            ? {
                message: error.message,
                stack: error.stack,
                name: error.name,
            }
            : error;

        this.log('error', message, errorData);
    }
}

export const logger = new Logger();