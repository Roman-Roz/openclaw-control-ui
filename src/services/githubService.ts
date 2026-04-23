import { Octokit } from '@octokit/rest';
import NodeCache from 'node-cache';

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

export class GitHubService {
  private octokit: Octokit;
  private config: GitHubConfig;
  private cache: NodeCache;

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
}

export default GitHubService;
