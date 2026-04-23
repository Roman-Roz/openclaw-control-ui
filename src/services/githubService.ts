import { Octokit } from '@octokit/rest';
import NodeCache from 'node-cache';
import fetch from 'node-fetch';

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}

export interface PullRequestData {
  title: string;
  body: string;
  head: string;
  base: string;
  commits?: Array<{
    sha: string;
    message: string;
    author: string;
    date: string;
  }>;
  files?: Array<{
    filename: string;
    status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed';
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
  }>;
}

export interface CommitData {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  files: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
  }>;
}

export interface RepoStats {
  repos: number;
  stars: number;
  forks: number;
  watchers: number;
  issues: number;
  prs: number;
}

export interface LanguageStats {
  [key: string]: {
    bytes: number;
    percentage: string;
  };
}

export interface ActivityStats {
  today: number;
  week: number;
  month: number;
}

export interface RepoHealth {
  hasReadme: boolean;
  hasLicense: boolean;
  hasTopics: boolean;
  hasIssues: boolean;
  hasProjects: boolean;
  hasWiki: boolean;
  score: number;
}

export interface IssueNotification {
  repo: string;
  issue: any;
  type: 'new' | 'update';
  timestamp: Date;
}

export class GitHubService {
  private octokit: Octokit;
  private config: GitHubConfig;
  private cache: NodeCache;
  private apiClient: any = null;
  private statsModule: any = null;
  private issuesModule: any = null;
  private subscribers: Set<Function> = new Set();
  private watchedRepos: Map<string, any> = new Map();
  private notificationHistory: Map<string, number> = new Map();
  private pollInterval: NodeJS.Timeout | null = null;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(config: GitHubConfig) {
    this.config = config;
    this.octokit = new Octokit({
      auth: config.token,
    });
    
    // Кэш для хранения результатов запросов (TTL: 5 минут)
    this.cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
  }

  /**
   * Получить информацию о репозитории
   */
  async getRepository() {
    const cacheKey = `repo:${this.config.owner}:${this.config.repo}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    const response = await this.octokit.repos.get({
      owner: this.config.owner,
      repo: this.config.repo,
    });

    this.cache.set(cacheKey, response.data);
    return response.data;
  }

  /**
   * Создать новую ветку
   */
  async createBranch(branchName: string, baseBranch: string = 'main') {
    const repo = await this.getRepository();
    const baseRef = await this.octokit.git.getRef({
      owner: this.config.owner,
      repo: this.config.repo,
      ref: `heads/${baseBranch}`,
    });

    const newBranch = await this.octokit.git.createRef({
      owner: this.config.owner,
      repo: this.config.repo,
      ref: `refs/heads/${branchName}`,
      sha: baseRef.data.object.sha,
    });

    return newBranch.data;
  }

  /**
   * Получить список файлов в репозитории
   */
  async getFiles(path: string = '') {
    const cacheKey = `files:${this.config.owner}:${this.config.repo}:${path}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    const response = await this.octokit.repos.getContent({
      owner: this.config.owner,
      repo: this.config.repo,
      path,
    });

    const files = Array.isArray(response.data) 
      ? response.data.filter(item => item.type === 'file')
      : [response.data];

    this.cache.set(cacheKey, files);
    return files;
  }

  /**
   * Получить содержимое файла
   */
  async getFileContent(filePath: string, branch: string = 'main') {
    const cacheKey = `file:${this.config.owner}:${this.config.repo}:${filePath}:${branch}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    const response = await this.octokit.repos.getContent({
      owner: this.config.owner,
      repo: this.config.repo,
      path: filePath,
      ref: branch,
    });

    const content = Buffer.from(
      (response.data as any).content, 
      'base64'
    ).toString('utf-8');

    const result = {
      content,
      sha: (response.data as any).sha,
      encoding: (response.data as any).encoding,
    };

    this.cache.set(cacheKey, result);
    return result;
  }

  /**
   * Обновить или создать файл
   */
  async updateFile(
    filePath: string,
    content: string,
    message: string,
    branch: string = 'main',
    sha?: string
  ) {
    let fileSha = sha;
    
    if (!fileSha) {
      try {
        const existing: any = await this.getFileContent(filePath, branch);
        fileSha = existing.sha;
      } catch (error) {
        // Файл не существует, создадим новый
        fileSha = undefined;
      }
    }

    const response = await this.octokit.repos.createOrUpdateFileContents({
      owner: this.config.owner,
      repo: this.config.repo,
      path: filePath,
      message,
      content: Buffer.from(content).toString('base64'),
      branch,
      sha: fileSha,
    });

    // Инвалидировать кэш для этого файла
    const cacheKey = `file:${this.config.owner}:${this.config.repo}:${filePath}:${branch}`;
    this.cache.del(cacheKey);

    return response.data;
  }

  /**
   * Создать Pull Request
   */
  async createPullRequest(
    title: string,
    body: string,
    head: string,
    base: string = 'main'
  ): Promise<PullRequestData> {
    const response = await this.octokit.pulls.create({
      owner: this.config.owner,
      repo: this.config.repo,
      title,
      body,
      head,
      base,
    });

    return {
      title: response.data.title,
      body: response.data.body || '',
      head: response.data.head.ref,
      base: response.data.base.ref,
      commits: [],
      files: [],
    };
  }

  /**
   * Получить информацию о Pull Request
   */
  async getPullRequest(pullNumber: number): Promise<PullRequestData> {
    const prResponse = await this.octokit.pulls.get({
      owner: this.config.owner,
      repo: this.config.repo,
      pull_number: pullNumber,
    });

    const commitsResponse = await this.octokit.pulls.listCommits({
      owner: this.config.owner,
      repo: this.config.repo,
      pull_number: pullNumber,
    });

    const filesResponse = await this.octokit.pulls.listFiles({
      owner: this.config.owner,
      repo: this.config.repo,
      pull_number: pullNumber,
    });

    const commits = commitsResponse.data.map(commit => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author?.name || '',
      date: commit.commit.author?.date || '',
    }));

    const files = filesResponse.data.map(file => ({
      filename: file.filename,
      status: file.status as any,
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
      patch: file.patch,
    }));

    return {
      title: prResponse.data.title,
      body: prResponse.data.body || '',
      head: prResponse.data.head.ref,
      base: prResponse.data.base.ref,
      commits,
      files,
    };
  }

  /**
   * Добавить комментарий к Pull Request
   */
  async addPullRequestComment(pullNumber: number, comment: string) {
    const response = await this.octokit.issues.createComment({
      owner: this.config.owner,
      repo: this.config.repo,
      issue_number: pullNumber,
      body: comment,
    });

    return response.data;
  }

  /**
   * Получить последние коммиты
   */
  async getCommits(branch: string = 'main', limit: number = 10): Promise<CommitData[]> {
    const cacheKey = `commits:${this.config.owner}:${this.config.repo}:${branch}:${limit}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached as CommitData[];
    }

    const response = await this.octokit.repos.listCommits({
      owner: this.config.owner,
      repo: this.config.repo,
      sha: branch,
      per_page: limit,
    });

    const commits: CommitData[] = [];
    
    for (const commit of response.data) {
      const detailResponse = await this.octokit.repos.getCommit({
        owner: this.config.owner,
        repo: this.config.repo,
        ref: commit.sha,
      });

      commits.push({
        sha: commit.sha,
        message: commit.commit.message,
        author: {
          name: commit.commit.author?.name || '',
          email: commit.commit.author?.email || '',
          date: commit.commit.author?.date || '',
        },
        files: detailResponse.data.files?.map(file => ({
          filename: file.filename,
          status: file.status || '',
          additions: file.additions,
          deletions: file.deletions,
          changes: file.changes,
          patch: file.patch,
        })) || [],
      });
    }

    this.cache.set(cacheKey, commits);
    return commits;
  }

  /**
   * Создать Issue
   */
  async createIssue(title: string, body: string, labels?: string[]) {
    const response = await this.octokit.issues.create({
      owner: this.config.owner,
      repo: this.config.repo,
      title,
      body,
      labels,
    });

    return response.data;
  }

  /**
   * Обработать webhook от GitHub
   */
  async handleWebhook(event: string, payload: any) {
    console.log(`[GitHub Webhook] Event: ${event}`);
    
    switch (event) {
      case 'push':
        return await this.handlePushEvent(payload);
      case 'pull_request':
        return await this.handlePullRequestEvent(payload);
      case 'issues':
        return await this.handleIssuesEvent(payload);
      default:
        console.log(`[GitHub Webhook] Unhandled event: ${event}`);
        return { handled: false };
    }
  }

  private async handlePushEvent(payload: any) {
    const { ref, repository, commits } = payload;
    const branch = ref.replace('refs/heads/', '');
    
    console.log(`[GitHub Push] Branch: ${branch}, Commits: ${commits?.length || 0}`);
    
    // Инвалидировать кэш для этой ветки
    const keysToDelete = this.cache.keys().filter(key => 
      key.includes(`${repository.owner.name}:${repository.name}:${branch}`)
    );
    
    keysToDelete.forEach(key => this.cache.del(key));

    return {
      handled: true,
      branch,
      commitsCount: commits?.length || 0,
    };
  }

  private async handlePullRequestEvent(payload: any) {
    const { action, pull_request } = payload;
    
    console.log(`[GitHub PR] Action: ${action}, PR: #${pull_request.number}`);
    
    return {
      handled: true,
      action,
      pullNumber: pull_request.number,
      state: pull_request.state,
    };
  }

  private async handleIssuesEvent(payload: any) {
    const { action, issue } = payload;
    
    console.log(`[GitHub Issue] Action: ${action}, Issue: #${issue.number}`);
    
    return {
      handled: true,
      action,
      issueNumber: issue.number,
    };
  }

  /**
   * Очистить кэш
   */
  clearCache() {
    this.cache.flushAll();
  }

  /**
   * Получить статистику кэша
   */
  getCacheStats() {
    return {
      keys: this.cache.keys().length,
      stats: this.cache.getStats(),
    };
  }

  /**
   * 📊 Модуль расширенной статистики репозиториев
   */
  async initializeStatsModule(username: string | null = null) {
    this.statsModule = {
      user: null,
      repos: [],
      totalStats: {
        repos: 0,
        stars: 0,
        forks: 0,
        watchers: 0,
        issues: 0,
        prs: 0
      },
      languageStats: {},
      activityStats: {},
      lastUpdated: null
    };
    
    try {
      // Получение информации о пользователе
      this.statsModule.user = await this.getUser(username);
      
      // Получение репозиториев
      const repos = await this.getUserRepos(username, { per_page: 100 });
      this.statsModule.repos = repos;
      
      await this.calculateStats();
      
      return this.statsModule;
    } catch (error: any) {
      console.error('Failed to initialize stats module:', error);
      throw error;
    }
  }

  /**
   * Расчет статистики репозиториев
   */
  async calculateStats() {
    if (!this.statsModule) return null;
    
    const stats = {
      repos: this.statsModule.repos.length,
      stars: 0,
      forks: 0,
      watchers: 0,
      issues: 0,
      prs: 0
    };
    
    const languageStats: Record<string, number> = {};
    const activityStats = { today: 0, week: 0, month: 0 };
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    for (const repo of this.statsModule.repos) {
      stats.stars += repo.stargazers_count || 0;
      stats.forks += repo.forks_count || 0;
      stats.watchers += repo.watchers_count || 0;
      stats.issues += repo.open_issues_count || 0;
      
      // Языки программирования
      try {
        const languages: Record<string, number> = await this.getRepoLanguages(repo.owner.login, repo.name) as Record<string, number>;
        for (const [language, bytes] of Object.entries(languages)) {
          languageStats[language] = (languageStats[language] || 0) + bytes;
        }
      } catch (error) {
        // Пропускаем ошибки получения языков
      }
      
      // Активность
      const updatedAt = new Date(repo.updated_at);
      if (updatedAt >= today) activityStats.today++;
      if (updatedAt >= weekAgo) activityStats.week++;
      if (updatedAt >= monthAgo) activityStats.month++;
    }
    
    // Расчет процентов для языков
    const totalBytes = Object.values(languageStats).reduce((sum, bytes) => sum + bytes, 0);
    const languagePercentages: LanguageStats = {};
    
    const sortedLanguages = Object.entries(languageStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
    
    for (const [language, bytes] of sortedLanguages) {
      languagePercentages[language] = {
        bytes,
        percentage: totalBytes > 0 ? ((bytes / totalBytes) * 100).toFixed(1) : '0'
      };
    }
    
    this.statsModule.totalStats = stats;
    this.statsModule.languageStats = languagePercentages;
    this.statsModule.activityStats = activityStats;
    this.statsModule.lastUpdated = new Date();
    
    this.notifySubscribers();
    
    return this.statsModule;
  }

  /**
   * Получение расширенной статистики репозитория
   */
  async getRepoDetailedStats(owner: string, repoName: string) {
    const [repo, contributors, languages, prs, issues] = await Promise.all([
      this.getRepo(owner, repoName),
      this.getRepoContributors(owner, repoName, { per_page: 10 }),
      this.getRepoLanguages(owner, repoName),
      this.getRepoPRs(owner, repoName, { per_page: 5, state: 'open' }),
      this.getRepoIssues(owner, repoName, { per_page: 5, state: 'open' })
    ]) as [any, any[], Record<string, number>, any[], any[]];
    
    const now = new Date();
    const created = new Date(repo.created_at);
    const updated = new Date(repo.updated_at);
    const pushed = new Date(repo.pushed_at);
    
    const ageDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    const lastUpdateDays = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));
    const lastPushDays = Math.floor((now.getTime() - pushed.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      basic: repo,
      contributors: contributors.slice(0, 5),
      languages,
      recentPRs: prs,
      recentIssues: issues,
      activity: {
        ageDays,
        lastUpdateDays,
        lastPushDays,
        isActive: lastPushDays < 30,
        commitFrequency: repo.size > 0 ? Math.round(repo.size / Math.max(ageDays, 1)) : 0
      },
      health: this.calculateRepoHealthScore(repo)
    };
  }

  /**
   * Расчет health score репозитория
   */
  calculateRepoHealthScore(repo: any): RepoHealth {
    let score = 50;
    
    if (repo.has_wiki) score += 10;
    if (repo.license) score += 10;
    if (repo.topics && repo.topics.length > 0) score += 5;
    if (repo.has_issues) score += 5;
    
    const lastUpdate = new Date(repo.updated_at);
    const now = new Date();
    const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceUpdate < 7) score += 15;
    else if (daysSinceUpdate < 30) score += 10;
    else if (daysSinceUpdate < 90) score += 5;
    else score -= 10;
    
    if (repo.stargazers_count > 100) score += 10;
    else if (repo.stargazers_count > 10) score += 5;
    
    if (repo.forks_count > 10) score += 5;
    if (repo.watchers_count > 5) score += 5;
    
    return {
      hasReadme: repo.has_wiki || false,
      hasLicense: !!repo.license,
      hasTopics: repo.topics && repo.topics.length > 0,
      hasIssues: repo.has_issues,
      hasProjects: repo.has_projects,
      hasWiki: repo.has_wiki,
      score: Math.min(Math.max(score, 0), 100)
    };
  }

  /**
   * 🔔 Модуль мониторинга Issues
   */
  async initializeIssuesModule() {
    this.issuesModule = {
      watchedRepos: new Map(),
      issuesCache: new Map(),
      lastCheckTime: new Map(),
      notificationHistory: new Map()
    };
    
    this.watchedRepos = new Map();
    this.notificationHistory = new Map();
    this.subscribers = new Set();
    
    this.startPolling();
    
    return this.issuesModule;
  }

  /**
   * Добавить репозиторий для отслеживания
   */
  watchRepo(owner: string, repo: string, config: any = {}) {
    const repoKey = `${owner}/${repo}`;
    
    const defaultConfig = {
      notifyOn: {
        new: true,
        updates: true,
        comments: true,
        labels: ['bug', 'urgent', 'critical'],
        mentions: true
      },
      filters: {
        onlyAssigned: false,
        onlyParticipating: false,
        labels: [],
        states: ['open']
      },
      pollingInterval: 300000 // 5 минут
    };
    
    this.watchedRepos.set(repoKey, { ...defaultConfig, ...config, owner, repo });
    console.log(`📡 Started watching repo: ${repoKey}`);
    return this;
  }

  /**
   * Удалить репозиторий из отслеживания
   */
  unwatchRepo(owner: string, repo: string) {
    const repoKey = `${owner}/${repo}`;
    this.watchedRepos.delete(repoKey);
    console.log(`📡 Stopped watching repo: ${repoKey}`);
    return this;
  }

  /**
   * Проверка новых и обновленных issues
   */
  async checkForNewIssues() {
    const newIssues: IssueNotification[] = [];
    const updatedIssues: IssueNotification[] = [];
    
    for (const [repoKey, config] of this.watchedRepos.entries()) {
      try {
        const [owner, repo] = repoKey.split('/');
        const oldIssues = this.issuesModule?.issuesCache.get(repoKey) || [];
        const newIssuesData: any[] = await this.getRepoIssues(owner, repo, { per_page: 20, state: 'all' }) as any[];
        
        for (const issue of newIssuesData) {
          const oldIssue = oldIssues.find((i: any) => i.id === issue.id);
          
          if (!oldIssue) {
            if (this.shouldNotify(issue, config, 'new')) {
              newIssues.push({
                repo: repoKey,
                issue,
                type: 'new',
                timestamp: new Date()
              });
            }
          } else if (this.isIssueUpdated(oldIssue, issue)) {
            if (this.shouldNotify(issue, config, 'updates')) {
              updatedIssues.push({
                repo: repoKey,
                issue,
                type: 'update',
                timestamp: new Date()
              });
            }
          }
        }
        
        this.issuesModule?.issuesCache.set(repoKey, newIssuesData);
        this.issuesModule?.lastCheckTime.set(repoKey, Date.now());
        
      } catch (error) {
        console.error(`Error checking issues for ${repoKey}:`, error);
      }
    }
    
    if (newIssues.length > 0 || updatedIssues.length > 0) {
      this.notifySubscribers({ newIssues, updatedIssues, timestamp: new Date() });
      this.updateNotificationHistory(newIssues, updatedIssues);
    }
    
    return { newIssues, updatedIssues };
  }

  /**
   * Проверка, нужно ли уведомлять об issue
   */
  shouldNotify(issue: any, config: any, eventType: string): boolean {
    const repoConfig = config.notifyOn;
    
    if (!repoConfig[eventType]) return false;
    
    if (repoConfig.labels && repoConfig.labels.length > 0) {
      const issueLabels = issue.labels.map((l: any) => l.name.toLowerCase());
      const configLabels = repoConfig.labels.map((l: string) => l.toLowerCase());
      
      if (!issueLabels.some((label: string) => configLabels.includes(label))) {
        return false;
      }
    }
    
    const filters = config.filters;
    
    if (filters.onlyAssigned && (!issue.assignee || issue.assignee.length === 0)) {
      return false;
    }
    
    if (filters.onlyParticipating && !issue.participating) {
      return false;
    }
    
    if (filters.labels && filters.labels.length > 0) {
      const issueLabels = issue.labels.map((l: any) => l.name.toLowerCase());
      const filterLabels = filters.labels.map((l: string) => l.toLowerCase());
      
      if (!issueLabels.some((label: string) => filterLabels.includes(label))) {
        return false;
      }
    }
    
    if (filters.states && filters.states.length > 0) {
      if (!filters.states.includes(issue.state)) {
        return false;
      }
    }
    
    const lastNotified = this.notificationHistory?.get(issue.id);
    if (lastNotified && Date.now() - lastNotified < 300000) {
      return false;
    }
    
    return true;
  }

  /**
   * Проверка, обновлена ли issue
   */
  isIssueUpdated(oldIssue: any, newIssue: any): boolean {
    return (
      oldIssue.updated_at !== newIssue.updated_at ||
      oldIssue.state !== newIssue.state ||
      oldIssue.comments !== newIssue.comments ||
      JSON.stringify(oldIssue.labels) !== JSON.stringify(newIssue.labels) ||
      JSON.stringify(oldIssue.assignees) !== JSON.stringify(newIssue.assignees)
    );
  }

  /**
   * Обновление истории уведомлений
   */
  updateNotificationHistory(newIssues: IssueNotification[], updatedIssues: IssueNotification[]) {
    const now = Date.now();
    
    for (const notification of [...newIssues, ...updatedIssues]) {
      this.notificationHistory?.set(notification.issue.id, now);
    }
    
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
    for (const [issueId, timestamp] of this.notificationHistory?.entries() || []) {
      if (timestamp < twentyFourHoursAgo) {
        this.notificationHistory?.delete(issueId);
      }
    }
  }

  /**
   * Подписка на уведомления
   */
  subscribe(callback: Function) {
    if (!this.subscribers) {
      this.subscribers = new Set();
    }
    this.subscribers.add(callback);
    return () => this.subscribers?.delete(callback);
  }

  /**
   * Уведомление подписчиков
   */
  notifySubscribers(data?: any) {
    if (!this.subscribers) return;
    
    for (const callback of this.subscribers) {
      try {
        callback(data || this.statsModule);
      } catch (error) {
        console.error('Error in subscriber callback:', error);
      }
    }
  }

  /**
   * Запуск polling для Issues
   */
  startPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    
    this.pollInterval = setInterval(async () => {
      try {
        await this.checkForNewIssues();
      } catch (error) {
        console.error('Polling failed:', error);
      }
    }, 300000); // 5 минут
    
    console.log('🔔 Started issues polling');
  }

  /**
   * Остановка polling
   */
  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      console.log('🔔 Stopped issues polling');
    }
  }

  /**
   * Запуск автоматического обновления статистики
   */
  startAutoRefresh(interval: number = 300000) {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.updateInterval = setInterval(async () => {
      try {
        await this.calculateStats();
      } catch (error) {
        console.error('Auto-refresh failed:', error);
      }
    }, interval);
    
    console.log('📊 Started stats auto-refresh');
  }

  /**
   * Остановка автоматического обновления
   */
  stopAutoRefresh() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Получение текущей статистики
   */
  getStats() {
    return this.statsModule;
  }

  /**
   * Получение списка отслеживаемых репозиториев
   */
  getWatchedRepos() {
    return Array.from(this.watchedRepos?.entries() || []).map(([repoKey, config]) => ({
      repo: repoKey,
      config
    }));
  }

  /**
   * Вспомогательные методы для API клиента
   */
  async getUser(username: string | null = null) {
    const endpoint = username ? `/users/${username}` : '/user';
    return this.apiRequest(endpoint);
  }

  async getUserRepos(username: string | null = null, options: any = {}) {
    const endpoint = username ? `/users/${username}/repos` : '/user/repos';
    const params = new URLSearchParams({
      sort: 'updated',
      direction: 'desc',
      per_page: options.per_page || 30,
      page: options.page || 1,
      ...options
    });
    return this.apiRequest(`${endpoint}?${params}`);
  }

  async getRepo(owner: string, repo: string) {
    return this.apiRequest(`/repos/${owner}/${repo}`);
  }

  async getRepoIssues(owner: string, repo: string, options: any = {}) {
    const params = new URLSearchParams({
      state: 'all',
      sort: 'updated',
      direction: 'desc',
      per_page: options.per_page || 20,
      page: options.page || 1,
      ...options
    });
    return this.apiRequest(`/repos/${owner}/${repo}/issues?${params}`);
  }

  async getRepoPRs(owner: string, repo: string, options: any = {}) {
    const params = new URLSearchParams({
      state: 'all',
      sort: 'updated',
      direction: 'desc',
      per_page: options.per_page || 20,
      page: options.page || 1,
      ...options
    });
    return this.apiRequest(`/repos/${owner}/${repo}/pulls?${params}`);
  }

  async getRepoContributors(owner: string, repo: string, options: any = {}) {
    const params = new URLSearchParams({
      per_page: options.per_page || 20,
      page: options.page || 1,
      ...options
    });
    return this.apiRequest(`/repos/${owner}/${repo}/contributors?${params}`);
  }

  async getRepoLanguages(owner: string, repo: string) {
    return this.apiRequest(`/repos/${owner}/${repo}/languages`);
  }

  async apiRequest(endpoint: string, options: any = {}) {
    const url = `https://api.github.com${endpoint}`;
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'OpenClaw-Cyberpunk-Panel/1.0.0',
      'X-GitHub-Api-Version': '2022-11-28'
    };
    
    if (this.config.token) {
      headers['Authorization'] = `token ${this.config.token}`;
    }
    
    const response = await fetch(url, {
      headers,
      ...options
    });
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Очистка ресурсов
   */
  destroy() {
    this.stopPolling();
    this.stopAutoRefresh();
    this.subscribers?.clear();
    this.watchedRepos?.clear();
    this.notificationHistory?.clear();
    this.clearCache();
  }
}

export default GitHubService;
