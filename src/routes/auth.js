const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const logger = require('../utils/logger');

// Middleware для проверки токена
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = authService.verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = decoded;
  next();
};

// Middleware для проверки роли
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      logger.warn(`Unauthorized access attempt by ${req.user?.username} to ${req.path}`);
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// POST /api/auth/register - Регистрация нового пользователя
router.post('/register', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { username, password, role } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = await authService.register(username, password, role || 'operator');
    authService.auditLog(req.user.userId, 'USER_REGISTERED', { targetUser: user.id });
    
    res.status(201).json({ message: 'User registered successfully', user });
  } catch (error) {
    logger.error(`Registration error: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
});

// POST /api/auth/login - Вход
router.post('/login', async (req, res) => {
  try {
    const { username, password, twoFACode } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const result = await authService.login(username, password, twoFACode);
    authService.auditLog(result.user.id, 'USER_LOGIN', { sessionId: result.sessionId });
    
    res.json({
      message: 'Login successful',
      ...result
    });
  } catch (error) {
    logger.warn(`Login error: ${error.message}`);
    if (error.message === '2FA code required') {
      return res.status(403).json({ error: error.message, requires2FA: true });
    }
    res.status(401).json({ error: error.message });
  }
});

// POST /api/auth/logout - Выход
router.post('/logout', authenticate, (req, res) => {
  const sessionId = req.body.sessionId;
  if (sessionId) {
    authService.logout(sessionId);
  }
  authService.auditLog(req.user.userId, 'USER_LOGOUT', {});
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me - Текущий пользователь
router.get('/me', authenticate, (req, res) => {
  const user = authService.getUser(req.user.username);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user });
});

// POST /api/auth/2fa/enable - Включение 2FA
router.post('/2fa/enable', authenticate, async (req, res) => {
  try {
    const result = await authService.enable2FA(req.user.username);
    res.json({
      message: 'Scan QR code with authenticator app',
      qrCode: result.qrCode,
      secret: result.secret
    });
  } catch (error) {
    logger.error(`Enable 2FA error: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
});

// POST /api/auth/2fa/confirm - Подтверждение 2FA
router.post('/2fa/confirm', authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: '2FA token required' });
    }
    
    await authService.confirm2FA(req.user.username, token);
    authService.auditLog(req.user.userId, '2FA_ENABLED', {});
    res.json({ message: '2FA enabled successfully' });
  } catch (error) {
    logger.error(`Confirm 2FA error: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
});

// POST /api/auth/2fa/disable - Отключение 2FA
router.post('/2fa/disable', authenticate, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Password required' });
    }
    
    await authService.disable2FA(req.user.username, password);
    authService.auditLog(req.user.userId, '2FA_DISABLED', {});
    res.json({ message: '2FA disabled successfully' });
  } catch (error) {
    logger.error(`Disable 2FA error: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
});

// GET /api/auth/users - Список всех пользователей (только admin)
router.get('/users', authenticate, requireRole('admin'), (req, res) => {
  const users = authService.getAllUsers();
  res.json({ users });
});

module.exports = { router, authenticate, requireRole };
