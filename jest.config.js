/**
 * @fileoverview Конфигурация Jest для тестирования
 */

module.exports = {
  // Окружение тестирования
  testEnvironment: 'node',
  
  // Паттерны для поиска тестов
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  
  // Исключения
  testPathIgnorePatterns: [
    '/node_modules/',
    '/public/'
  ],
  
  // Сбор покрытия кода
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js' // Исключаем точку входа
  ],
  
  // Порог покрытия
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },
  
  // Отчёт о покрытии
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  
  // Детектор утечек
  detectOpenHandles: true,
  
  // Таймауты
  testTimeout: 10000,
  
  //Verbose вывод
  verbose: true,
  
  // Цветной вывод
  colors: true
};
