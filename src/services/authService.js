const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class AuthService {
  constructor() {
    this.users = new Map(); // В памяти для демо, в проде использовать БД
    this.sessions = new Map();
    this.jwtSecret = process.env.JWT_SECRET || 'openclaw-secret-key-change-in-prod';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '1h';
    
    // Создаем демо пользователя
    this.createDemoUser();
  }

  async createDemoUser() {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const user = {
      id: 'admin-001',
      username: 'admin',
      password: hashedPassword,
      role: 'admin',
      twoFAEnabled: false,
      twoFASecret: null,
      createdAt: new Date()
    };
    this.users.set('admin', user);
    logger.info('Demo admin user created');
  }

  async register(username, password, role = 'operator') {
    if (this.users.has(username)) {
      throw new Error('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
      id: uuidv4(),
      username,
      password: hashedPassword,
      role,
      twoFAEnabled: false,
      twoFASecret: null,
      createdAt: new Date()
    };

    this.users.set(username, user);
    logger.info(`User registered: ${username} (${role})`);
    return { id: user.id, username, role };
  }

  async login(username, password, twoFACode = null) {
    const user = this.users.get(username);
    if (!user) {
      logger.warn(`Login attempt for non-existent user: ${username}`);
      throw new Error('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      logger.warn(`Invalid password for user: ${username}`);
      throw new Error('Invalid credentials');
    }

    if (user.twoFAEnabled) {
      if (!twoFACode) {
        throw new Error('2FA code required');
      }
      const verified = speakeasy.totp.verify({
        secret: user.twoFASecret,
        encoding: 'base32',
        token: twoFACode
      });
      if (!verified) {
        throw new Error('Invalid 2FA code');
      }
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      this.jwtSecret,
      { expiresIn: this.jwtExpiresIn }
    );

    const sessionId = uuidv4();
    this.sessions.set(sessionId, {
      userId: user.id,
      token,
      createdAt: new Date()
    });

    logger.info(`User logged in: ${username}`);
    return {
      token,
      sessionId,
      user: { id: user.id, username: user.username, role: user.role }
    };
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      logger.warn(`Invalid token: ${error.message}`);
      return null;
    }
  }

  async enable2FA(username) {
    const user = this.users.get(username);
    if (!user) {
      throw new Error('User not found');
    }

    const secret = speakeasy.generateSecret({
      name: `OpenClaw Panel (${username})`,
      issuer: 'OpenClaw'
    });

    user.twoFASecret = secret.base32;
    user.twoFAEnabled = false; // Пока не подтверждено

    const qrCode = await QRCode.toDataURL(secret.otpauth_url);
    
    return {
      secret: secret.base32,
      otpauth_url: secret.otpauth_url,
      qrCode
    };
  }

  confirm2FA(username, token) {
    const user = this.users.get(username);
    if (!user) {
      throw new Error('User not found');
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFASecret,
      encoding: 'base32',
      token
    });

    if (verified) {
      user.twoFAEnabled = true;
      logger.info(`2FA enabled for user: ${username}`);
      return { success: true };
    } else {
      throw new Error('Invalid 2FA token');
    }
  }

  disable2FA(username, password) {
    const user = this.users.get(username);
    if (!user) {
      throw new Error('User not found');
    }

    // Требуется подтверждение паролем
    return bcrypt.compare(password, user.password).then(isValid => {
      if (!isValid) {
        throw new Error('Invalid password');
      }
      user.twoFAEnabled = false;
      user.twoFASecret = null;
      logger.info(`2FA disabled for user: ${username}`);
      return { success: true };
    });
  }

  logout(sessionId) {
    this.sessions.delete(sessionId);
    logger.info(`Session terminated: ${sessionId}`);
  }

  getUser(username) {
    const user = this.users.get(username);
    if (!user) return null;
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      twoFAEnabled: user.twoFAEnabled,
      createdAt: user.createdAt
    };
  }

  getAllUsers() {
    return Array.from(this.users.values()).map(u => ({
      id: u.id,
      username: u.username,
      role: u.role,
      twoFAEnabled: u.twoFAEnabled,
      createdAt: u.createdAt
    }));
  }

  auditLog(userId, action, details) {
    logger.info('[AUDIT]', { userId, action, details, timestamp: new Date() });
  }
}

module.exports = new AuthService();
