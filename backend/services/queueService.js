import PgBoss from 'pg-boss';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

class QueueService {
  constructor() {
    this.boss = null;
    this.isStarted = false;
  }

  async initialize() {
    try {
      const connectionString = process.env.DATABASE_URL || 
        `postgresql://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'password'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DB || 'mlm_project'}`;

      console.log('🔄 Инициализация PG-BOSS...');
      
      this.boss = new PgBoss({
        connectionString,
        schema: 'pgboss',
        retryLimit: 5,
        retryDelay: 30,
        expireInSeconds: 60 * 15, // 15 minutes
        deleteAfterSeconds: 60 * 60 * 24, // 24 hours
        maxConnections: 10,
        newJobCheckInterval: 1000, // 1 sec
        clockMonitorIntervalSeconds: 10,
        // Увеличиваем таймауты для стабильности
        acquireTimeoutMillis: 30000,
        // Настройки для создания схемы
        installSchema: true
      });

      console.log('[QUEUE] 🔄 Starting PG-BOSS...');
      await this.boss.start();
      this.isStarted = true;
      
      console.log('✅ PG-BOSS успешно подключен');
      console.log('[QUEUE] 📊 PG-BOSS status:', this.boss.state);
      
      // Ждем, пока PG-BOSS полностью запустится
      console.log('[QUEUE] ⏳ Waiting for PG-BOSS to fully initialize...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Проверяем состояние через правильные методы
      const isInstalled = await this.boss.isInstalled();
      console.log('[QUEUE] 📊 PG-BOSS isInstalled:', isInstalled);
      
      // Проверяем, можем ли мы создать тестовую задачу
      try {
        const testJobId = await this.boss.send('test.init', { test: true }, { priority: 1 });
        if (testJobId) {
          console.log('[QUEUE] ✅ PG-BOSS is ready - test job created:', testJobId);
          await this.boss.deleteJob(testJobId);
        } else {
          console.log('[QUEUE] ⚠️ PG-BOSS test job returned null');
        }
      } catch (error) {
        console.log('[QUEUE] ⚠️ PG-BOSS test failed:', error.message);
      }
      
      // Регистрируем обработчики задач
      await this.registerJobHandlers();
      
      // Проверяем здоровье очередей
      const isHealthy = await this.checkQueueHealth();
      if (!isHealthy) {
        console.log('[QUEUE] ⚠️ Queue health check failed, but continuing...');
      }
      
      // Тестируем очереди
      const testResult = await this.testQueue();
      if (testResult) {
        console.log('[QUEUE] ✅ Queue test passed - system is working');
      } else {
        console.log('[QUEUE] ⚠️ Queue test failed - fallback mode will be used');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Ошибка инициализации PG-BOSS:', error);
      
      // Если это ошибка подключения, пробуем еще раз
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
        console.log('[QUEUE] 🔄 Retrying connection in 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        try {
          console.log('[QUEUE] 🔄 Retrying PG-BOSS connection...');
          await this.boss.start();
          this.isStarted = true;
          console.log('✅ PG-BOSS успешно подключен после повторной попытки');
          
          // Продолжаем инициализацию
          await this.registerJobHandlers();
          const isHealthy = await this.checkQueueHealth();
          const testResult = await this.testQueue();
          
          if (testResult) {
            console.log('[QUEUE] ✅ Queue test passed after retry');
          }
          
          return true;
        } catch (retryError) {
          console.error('[QUEUE] ❌ Retry failed:', retryError.message);
          this.isStarted = false;
          throw retryError;
        }
      }
      
      this.isStarted = false;
      throw error;
    }
  }

  async registerJobHandlers() {
    if (!this.boss) {
      throw new Error('PG-BOSS не инициализирован');
    }

    console.log('📋 Регистрация обработчиков задач...');

    // Сначала создаем очереди для всех задач
    console.log('📋 Создаем очереди...');
    
    try {
      await this.boss.createQueue('user.register', { retryLimit: 3, retryDelay: 5 });
      console.log('✅ Queue created: user.register');
      
      await this.boss.createQueue('user.login', { retryLimit: 2, retryDelay: 3 });
      console.log('✅ Queue created: user.login');
      
      await this.boss.createQueue('investment.create', { retryLimit: 5, retryDelay: 10 });
      console.log('✅ Queue created: investment.create');
      
      await this.boss.createQueue('withdrawal.process', { retryLimit: 3, retryDelay: 30 });
      console.log('✅ Queue created: withdrawal.process');
      
      await this.boss.createQueue('bonus.calculate', { retryLimit: 2, retryDelay: 15 });
      console.log('✅ Queue created: bonus.calculate');
      
      await this.boss.createQueue('email.send', { retryLimit: 3, retryDelay: 5 });
      console.log('✅ Queue created: email.send');
      
      await this.boss.createQueue('rank.update', { retryLimit: 2, retryDelay: 10 });
      console.log('✅ Queue created: rank.update');
      
      console.log('✅ Все очереди созданы');
    } catch (error) {
      console.log('⚠️ Some queues already exist:', error.message);
    }

    // КРИТИЧЕСКИЕ ОПЕРАЦИИ с приоритетами
    console.log('📋 Регистрируем обработчики...');
    
    await this.boss.work('user.register', { teamSize: 3, teamConcurrency: 2 }, this.handleUserRegistration.bind(this));
    console.log('✅ Handler registered: user.register');
    
    await this.boss.work('user.login', { teamSize: 5, teamConcurrency: 3 }, this.handleUserLogin.bind(this));
    console.log('✅ Handler registered: user.login');
    
    await this.boss.work('investment.create', { teamSize: 2, teamConcurrency: 1 }, this.handleInvestmentCreate.bind(this));
    console.log('✅ Handler registered: investment.create');
    
    await this.boss.work('withdrawal.process', { teamSize: 1, teamConcurrency: 1 }, this.handleWithdrawal.bind(this));
    console.log('✅ Handler registered: withdrawal.process');
    
    await this.boss.work('bonus.calculate', { teamSize: 3, teamConcurrency: 2 }, this.handleBonusCalculation.bind(this));
    console.log('✅ Handler registered: bonus.calculate');
    
    await this.boss.work('email.send', { teamSize: 5, teamConcurrency: 10 }, this.handleEmailSend.bind(this));
    console.log('✅ Handler registered: email.send');
    
    await this.boss.work('rank.update', { teamSize: 2, teamConcurrency: 1 }, this.handleRankUpdate.bind(this));
    console.log('✅ Handler registered: rank.update');

    console.log('✅ Все обработчики задач зарегистрированы');
  }

  // ПУБЛИЧНЫЕ МЕТОДЫ ДЛЯ ДОБАВЛЕНИЯ В ОЧЕРЕДЬ
  async addUserRegistration(userData) {
    if (!this.isStarted || !this.boss) {
      console.log('⚠️ Queue service not started, throwing error for fallback');
      throw new Error('Queue service not available');
    }
    
    // Проверяем состояние PG-BOSS через правильные методы
    try {
      const isInstalled = await this.boss.isInstalled();
      if (!isInstalled) {
        console.log('⚠️ PG-BOSS not installed, throwing error for fallback');
        throw new Error('PG-BOSS not installed');
      }
    } catch (error) {
      console.log(`⚠️ PG-BOSS check failed: ${error.message}, throwing error for fallback`);
      throw new Error('PG-BOSS check failed');
    }
    
    try {
      console.log(`[QUEUE] Adding user registration job to queue: ${userData.email}`);
      console.log(`[QUEUE] 📊 PG-BOSS isInstalled: true`);
      
      const jobId = await this.boss.send('user.register', userData, {
        priority: 10, // Высокий приоритет
        retryLimit: 3,
        retryDelay: 5
      });
      
      if (!jobId) {
        console.log('⚠️ Queue returned null jobId for registration, throwing error for fallback');
        throw new Error('Queue returned null jobId for registration');
      }
      
      console.log(`[QUEUE] ✅ User registration job added to queue: ${jobId}`);
      return jobId;
    } catch (error) {
      console.log(`⚠️ Queue error for registration: ${error.message}, throwing for fallback`);
      throw error;
    }
  }

  async addUserLogin(loginData) {
    return await this.boss.send('user.login', loginData, {
      priority: 8,
      retryLimit: 2,
      retryDelay: 3
    });
  }

  async addInvestmentCreation(investmentData) {
    return await this.boss.send('investment.create', investmentData, {
      priority: 9,
      retryLimit: 5,
      retryDelay: 10
    });
  }

  async addWithdrawalProcess(withdrawalData) {
    return await this.boss.send('withdrawal.process', withdrawalData, {
      priority: 10,
      retryLimit: 3,
      retryDelay: 30
    });
  }

  async addBonusCalculation(bonusData) {
    return await this.boss.send('bonus.calculate', bonusData, {
      priority: 6,
      retryLimit: 2,
      retryDelay: 15
    });
  }

  async addRankUpdate(rankData) {
    return await this.boss.send('rank.update', rankData, {
      priority: 7,
      retryLimit: 2,
      retryDelay: 10
    });
  }

  async addEmailSend(emailData) {
    if (!this.isStarted || !this.boss) {
      console.log('⚠️ Queue service not started, throwing error for fallback');
      throw new Error('Queue service not available');
    }
    
    // Проверяем состояние PG-BOSS через правильные методы
    try {
      const isInstalled = await this.boss.isInstalled();
      if (!isInstalled) {
        console.log('⚠️ PG-BOSS not installed, throwing error for fallback');
        throw new Error('PG-BOSS not installed');
      }
    } catch (error) {
      console.log(`⚠️ PG-BOSS check failed: ${error.message}, throwing error for fallback`);
      throw new Error('PG-BOSS check failed');
    }
    
    try {
      console.log(`[QUEUE] Adding email job to queue: ${emailData.type} -> ${emailData.to}`);
      console.log(`[QUEUE] 📊 PG-BOSS isInstalled: true`);
      
      const jobId = await this.boss.send('email.send', emailData, {
        priority: 4,
        retryLimit: 3,
        retryDelay: 5
      });
      
      if (!jobId) {
        console.log('⚠️ Queue returned null jobId for email, throwing error for fallback');
        throw new Error('Queue returned null jobId for email');
      }
      
      console.log(`[QUEUE] ✅ Email job added to queue: ${jobId}`);
      return jobId;
    } catch (error) {
      console.log(`⚠️ Queue error for email: ${error.message}, throwing for fallback`);
      throw error;
    }
  }

  // Добавление задачи в очередь (общий метод)
  async addJob(queueName, data, options = {}) {
    if (!this.isStarted || !this.boss) {
      console.warn('⚠️ PG-BOSS не подключен, выполняем синхронно');
      return null;
    }

    try {
      const defaultOptions = {
        retryLimit: 3,
        retryDelay: 5000,
        expireInSeconds: 3600
      };

      const jobOptions = { ...defaultOptions, ...options };
      const jobId = await this.boss.send(queueName, data, jobOptions);
      
      console.log(`📤 Задача добавлена в очередь ${queueName}: ${jobId}`);
      return jobId;
    } catch (error) {
      console.error(`❌ Ошибка добавления задачи в очередь ${queueName}:`, error);
      throw error;
    }
  }



  // ОБРАБОТЧИКИ ЗАДАЧ
  async handleUserRegistration(job) {
    console.log(`[QUEUE] Processing user registration job:`, job);
    
    // PG-BOSS передает массив, берем первый элемент
    const jobData = Array.isArray(job) ? job[0] : job;
    
    if (!jobData || !jobData.data) {
      console.error('[QUEUE] ❌ Invalid job data:', jobData);
      throw new Error('Invalid job data');
    }
    
    const { id, data } = jobData;
    console.log(`[QUEUE] Job ID: ${id}, Data:`, data);
    
    try {
      const { email, username, password, referralCode, registrationIp } = data;
      
        // Проверяем существование пользователя
      const existingUser = await prisma.user.findFirst({
          where: { OR: [{ email }, { username }] }
        });
        
        if (existingUser) {
          console.log(`[QUEUE] ⚠️ User already exists: ${email}, skipping registration`);
        return existingUser;
      }

      // Генерируем код и токен верификации
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const verificationToken = crypto.randomBytes(32).toString('hex');
      
      // Сохраняем данные во временную таблицу PendingRegistration
      // Используем upsert для обновления существующих записей
      await prisma.pendingRegistration.upsert({
        where: { email },
        update: {
          username,
          password,
          referralCode,
          verificationToken,
          verificationCode,
          expiresAt: new Date(Date.now() + 180 * 1000), // 180 seconds (3 minutes)
          registrationIp: registrationIp || 'unknown'
        },
        create: {
            email,
            username,
          password,
          referralCode,
          verificationToken,
          verificationCode,
          expiresAt: new Date(Date.now() + 180 * 1000), // 180 seconds (3 minutes)
          registrationIp: registrationIp || 'unknown'
        }
      });
      
      // Формируем ссылку верификации
      const baseUrl = process.env.NODE_ENV === 'production' ? 'https://margine-space.com' : 'http://localhost:5173';
      const verifyUrl = `${baseUrl}/verify?token=${verificationToken}`;
      
      // ✅ ЛОГИРОВАНИЕ КОДОВ И ССЫЛОК
      console.log(`|mlm-backend  | [REGISTRATION] EMAIL: ${email}`);
      console.log(`|mlm-backend  | [REGISTRATION] CODE: ${verificationCode}`);
      console.log(`|mlm-backend  | [REGISTRATION] TOKEN: ${verificationToken}`);
      console.log(`|mlm-backend  | [REGISTRATION] LINK: ${verifyUrl}`);

      // Отправляем email верификации в очередь
      await this.addEmailSend({
        type: 'EMAIL_VERIFICATION',
        to: email,
        code: verificationCode,
        token: verificationToken
      });

      console.log(`[QUEUE] ✅ Registration data saved to PendingRegistration for: ${email}`);
      return { email, username, verificationCode, verificationToken };
    } catch (error) {
      console.error(`[QUEUE] ❌ User registration failed:`, error);
      throw error;
    }
  }

  async handleEmailSend(job) {
    console.log(`[QUEUE] Processing email send job:`, job);
    
    // PG-BOSS передает массив, берем первый элемент
    const jobData = Array.isArray(job) ? job[0] : job;
    
    if (!jobData || !jobData.data) {
      console.error('[QUEUE] ❌ Invalid email job data:', jobData);
      throw new Error('Invalid email job data');
    }
    
    const { id, data } = jobData;
    console.log(`[QUEUE] Email Job ID: ${id}, Data:`, data);
    
    try {
      const { type, to, subject, text, html, code, token } = data;
      const emailService = await import('./email-service.js');
      
      // ✅ ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ ПЕРЕД ОТПРАВКОЙ EMAIL
      if (type === 'EMAIL_VERIFICATION') {
        const baseUrl = process.env.NODE_ENV === 'production' ? 'https://margine-space.com' : 'http://localhost:5173';
        const verifyUrl = `${baseUrl}/verify?token=${token}`;
        console.log(`|mlm-backend  | [EMAIL-QUEUE] VERIFICATION EMAIL TO: ${to}`);
        console.log(`|mlm-backend  | [EMAIL-QUEUE] CODE: ${code}`);
        console.log(`|mlm-backend  | [EMAIL-QUEUE] TOKEN: ${token}`);
        console.log(`|mlm-backend  | [EMAIL-QUEUE] LINK: ${verifyUrl}`);
        
        await emailService.sendVerificationEmail(to, code || '123456', token);
      } else if (type === 'password-reset' && token) {
        const baseUrl = process.env.NODE_ENV === 'production' ? 'https://margine-space.com' : 'http://localhost:5173';
        const resetUrl = `${baseUrl}/reset-password?token=${token}`;
        console.log(`|mlm-backend  | [EMAIL-QUEUE] PASSWORD-RESET EMAIL TO: ${to}`);
        console.log(`|mlm-backend  | [EMAIL-QUEUE] TOKEN: ${token}`);
        console.log(`|mlm-backend  | [EMAIL-QUEUE] LINK: ${resetUrl}`);
        
        await emailService.sendPasswordResetEmail(to, token);
      } else {
        // Обычный email
        console.log(`|mlm-backend  | [EMAIL-QUEUE] GENERAL EMAIL TO: ${to} | SUBJECT: ${subject}`);
        await emailService.sendEmail(to, subject, text, html);
      }
      
      console.log(`|mlm-backend  | [EMAIL] MOCK EMAIL TO: ${to} | CODE: ${code || token || 'N/A'}`);
      return { success: true, timestamp: new Date().toISOString() };
    } catch (error) {
      console.error(`[QUEUE] ❌ Email send failed:`, error);
      console.log(`|mlm-backend  | [EMAIL] MOCK EMAIL TO: ${data.to} | CODE: ERROR`);
      throw error;
    }
  }

  async handleBonusCalculation(job) {
    console.log(`[QUEUE] Processing bonus calculation job:`, job);
    
    // PG-BOSS передает массив, берем первый элемент
    const jobData = Array.isArray(job) ? job[0] : job;
    
    if (!jobData || !jobData.data) {
      console.error('[QUEUE] ❌ Invalid bonus calculation job data:', jobData);
      throw new Error('Invalid bonus calculation job data');
    }
    
    const { id, data } = jobData;
    console.log(`[QUEUE] Bonus Calculation Job ID: ${id}, Data:`, data);
    
    try {
      // Создаем транзакцию бонуса
      const transaction = await prisma.transaction.create({
        data: {
          userId: data.userId,
          type: data.type,
          amount: data.amount,
          description: `${data.type} bonus`,
          status: 'COMPLETED'
        }
      });

      // Обновляем баланс пользователя
      const updatedUser = await prisma.user.update({
        where: { id: data.userId },
        data: {
          balance: {
            increment: data.amount
          }
        }
      });

      console.log(`[QUEUE] ✅ Bonus processed: User ${data.userId} - $${data.amount} (${data.type})`);
      return { 
        success: true, 
        transactionId: transaction.id,
        bonusAmount: data.amount,
        newBalance: updatedUser.balance,
        message: `${data.type} bonus of $${data.amount} processed successfully`
      };
    } catch (error) {
      console.error(`[QUEUE] ❌ Bonus calculation failed:`, error);
      throw error;
    }
  }

  async handleUserLogin(job) {
    console.log(`[QUEUE] Processing user login job:`, job);
    
    // PG-BOSS передает массив, берем первый элемент
    const jobData = Array.isArray(job) ? job[0] : job;
    
    if (!jobData || !jobData.data) {
      console.error('[QUEUE] ❌ Invalid user login job data:', jobData);
      throw new Error('Invalid user login job data');
    }
    
    const { id, data } = jobData;
    console.log(`[QUEUE] User Login Job ID: ${id}, Data:`, data);
    
    // Заглушка для аналитики логинов
    return { success: true };
  }

  async handleInvestmentCreate(job) {
    console.log(`[QUEUE] Processing investment creation job:`, job);
    
    // PG-BOSS передает массив, берем первый элемент
    const jobData = Array.isArray(job) ? job[0] : job;
    
    if (!jobData || !jobData.data) {
      console.error('[QUEUE] ❌ Invalid investment creation job data:', jobData);
      throw new Error('Invalid investment creation job data');
    }
    
    const { id, data } = jobData;
    console.log(`[QUEUE] Investment Creation Job ID: ${id}, Data:`, data);
    
    try {
      // Импортируем сервис инвестиций
      const { default: investmentService } = await import('../services/investment-service.js');
      
      // Создаем инвестицию асинхронно
      const investment = await investmentService.createInvestment(
        data.userId, 
        data.packageId, 
        data.amount
      );
      
      console.log(`[QUEUE] ✅ Investment created successfully: ${investment.id}`);
      return { 
        success: true, 
        investmentId: investment.id,
        message: `Investment of $${data.amount} created for package ${data.packageName}`
      };
    } catch (error) {
      console.error(`[QUEUE] ❌ Investment creation failed:`, error);
      throw error;
    }
  }

  async handleWithdrawal(job) {
    console.log(`[QUEUE] Processing withdrawal job:`, job);
    
    // PG-BOSS передает массив, берем первый элемент
    const jobData = Array.isArray(job) ? job[0] : job;
    
    if (!jobData || !jobData.data) {
      console.error('[QUEUE] ❌ Invalid withdrawal job data:', jobData);
      throw new Error('Invalid withdrawal job data');
    }
    
    const { id, data } = jobData;
    console.log(`[QUEUE] Withdrawal Job ID: ${id}, Data:`, data);
    
    try {
      // Создаем транзакцию вывода
      const transaction = await prisma.transaction.create({
        data: {
          userId: data.userId,
          type: 'WITHDRAWAL',
          amount: data.amount,
          description: `Withdrawal to ${data.wallet}`,
          status: 'PENDING',
          wallet: data.wallet
        }
      });

      // Обновляем баланс пользователя
      const updatedUser = await prisma.user.update({
        where: { id: data.userId },
        data: {
          balance: {
            decrement: data.amount
          }
        }
      });

      console.log(`[QUEUE] ✅ Withdrawal processed: User ${data.username} - $${data.amount} to ${data.wallet}`);
      return { 
        success: true, 
        transactionId: transaction.id,
        newBalance: updatedUser.balance,
        message: `Withdrawal of $${data.amount} processed successfully`
      };
    } catch (error) {
      console.error(`[QUEUE] ❌ Withdrawal processing failed:`, error);
      throw error;
    }
  }

  async handleRankUpdate(job) {
    console.log(`[QUEUE] Processing rank update job:`, job);
    
    // PG-BOSS передает массив, берем первый элемент
    const jobData = Array.isArray(job) ? job[0] : job;
    
    if (!jobData || !jobData.data) {
      console.error('[QUEUE] ❌ Invalid rank update job data:', jobData);
      throw new Error('Invalid rank update job data');
    }
    
    const { id, data } = jobData;
    console.log(`[QUEUE] Rank Update Job ID: ${id}, Data:`, data);
    
    try {
      // Импортируем сервис рангов
      const { default: rankService } = await import('../services/rank-service.js');
      
      // Обновляем ранг пользователя асинхронно
      const rank = await rankService.updateUserRank(data.userId);
      
      console.log(`[QUEUE] ✅ Rank updated successfully for user: ${data.userId}`);
      return { 
        success: true, 
        userId: data.userId,
        rank: rank,
        message: `Rank updated for user ${data.userId}`
      };
    } catch (error) {
      console.error(`[QUEUE] ❌ Rank update failed:`, error);
      throw error;
    }
  }

  // Получение статистики очередей
  async getQueueStats() {
    if (!this.isStarted) return null;
    
    try {
      // Используем правильные методы PG-BOSS
      const stats = {
        pending: await this.boss.getQueueSize('pending'),
        completed: await this.boss.getQueueSize('completed'),
        failed: await this.boss.getQueueSize('failed'),
        active: await this.boss.getQueueSize('active')
      };
      
      console.log(`[QUEUE] 📊 Queue stats:`, stats);
      return stats;
    } catch (error) {
      console.error(`[QUEUE] ❌ Failed to get queue stats:`, error.message);
      return null;
    }
  }

  // Проверка здоровья очередей
  async checkQueueHealth() {
    if (!this.isStarted || !this.boss) {
      console.log('[QUEUE] ❌ Queue service not started');
      return false;
    }
    
    try {
      // Проверяем подключение к базе данных
      const stats = await this.getQueueStats();
      if (stats === null) {
        console.log('[QUEUE] ❌ Cannot get queue stats - database connection issue');
        return false;
      }
      
      console.log('[QUEUE] ✅ Queue health check passed');
      return true;
    } catch (error) {
      console.error('[QUEUE] ❌ Queue health check failed:', error.message);
      return false;
    }
  }

  // Тестовый метод для проверки очередей
  async testQueue() {
    if (!this.isStarted || !this.boss) {
      console.log('[QUEUE] ❌ Cannot test queue - service not started');
      return false;
    }
    
    try {
      console.log('[QUEUE] 🧪 Testing queue functionality...');
      
      // Проверяем состояние PG-BOSS через правильные методы
      const isInstalled = await this.boss.isInstalled();
      console.log('[QUEUE] 📊 PG-BOSS isInstalled:', isInstalled);
      
      if (!isInstalled) {
        console.log('[QUEUE] ❌ PG-BOSS not installed, cannot test');
        return false;
      }
      
      // Создаем тестовую очередь
      try {
        await this.boss.createQueue('test.job', { retryLimit: 1, retryDelay: 1 });
        console.log('[QUEUE] ✅ Test queue created');
      } catch (error) {
        console.log('[QUEUE] ⚠️ Test queue already exists');
      }
      
      // Тестируем создание простой задачи
      console.log('[QUEUE] 🔄 Attempting to create test job...');
      const testJobId = await this.boss.send('test.job', { message: 'test' }, {
        priority: 1,
        retryLimit: 1,
        retryDelay: 1
      });
      
      if (testJobId) {
        console.log(`[QUEUE] ✅ Test job created successfully: ${testJobId}`);
        
        // Удаляем тестовую задачу
        try {
          await this.boss.deleteJob(testJobId);
          console.log(`[QUEUE] ✅ Test job deleted: ${testJobId}`);
        } catch (error) {
          console.log(`[QUEUE] ⚠️ Could not delete test job: ${error.message}`);
          // Попробуем другой способ удаления
          try {
            await this.boss.fail(testJobId, new Error('Test job cleanup'));
            console.log(`[QUEUE] ✅ Test job marked as failed: ${testJobId}`);
          } catch (failError) {
            console.log(`[QUEUE] ⚠️ Could not mark test job as failed: ${failError.message}`);
          }
        }
        
        return true;
      } else {
        console.log('[QUEUE] ❌ Test job creation failed - returned null');
        console.log('[QUEUE] 🔍 Debug info - Boss methods:', Object.getOwnPropertyNames(this.boss));
        return false;
      }
    } catch (error) {
      console.error('[QUEUE] ❌ Queue test failed:', error.message);
      console.error('[QUEUE] 🔍 Full error:', error);
      return false;
    }
  }

  // Graceful shutdown
  async shutdown() {
    if (this.boss && this.isStarted) {
      console.log('🔄 Завершение работы PG-BOSS...');
      await this.boss.stop();
      this.isStarted = false;
      console.log('✅ PG-BOSS остановлен');
    }
  }
}

// Создаем единственный экземпляр (Singleton)
const queueService = new QueueService();

export default queueService;
