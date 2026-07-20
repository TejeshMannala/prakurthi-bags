// Reusable structured logger.
// - logger.info()   → always printed (startup, milestones)
// - logger.warn()   → always printed (degraded state, recoverable)
// - logger.error()  → always printed (failures, crash-worthy)
// - logger.debug()  → printed ONLY when NODE_ENV !== 'production'

const isProd = process.env.NODE_ENV === 'production';

const ts = () => new Date().toISOString();

const logger = {
  info(msg, ...args) {
    console.log(`[${ts()}] ${msg}`, ...args);
  },

  warn(msg, ...args) {
    console.warn(`[${ts()}] [WARN] ${msg}`, ...args);
  },

  error(msg, ...args) {
    console.error(`[${ts()}] [ERROR] ${msg}`, ...args);
  },

  debug(msg, ...args) {
    if (!isProd) {
      console.log(`[${ts()}] [DEBUG] ${msg}`, ...args);
    }
  },
};

module.exports = logger;
