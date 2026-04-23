import express, { Request, Response } from 'express';
import GitHubService from '../services/githubService.js';

const router = express.Router();

// Глобальный экземпляр сервиса (в реальном приложении лучше использовать DI)
let githubService: GitHubService | null = null;

/**
 * Инициализировать GitHub сервис
 */
function getGitHubService(): GitHubService {
  if (!githubService) {
    const token = process.env.GITHUB_TOKEN || '';
    const owner = process.env.GITHUB_OWNER || '';
    const repo = process.env.GITHUB_REPO || '';

    if (!token || !owner || !repo) {
      throw new Error(
        'GitHub credentials not configured. Set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO environment variables.'
      );
    }

    githubService = new GitHubService({ token, owner, repo });
  }

  return githubService;
}

/**
 * Проверить доступность сервиса
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const service = getGitHubService();
    const repo: any = await service.getRepository();
    
    res.json({
      status: 'connected',
      repository: {
        name: repo.name,
        full_name: repo.full_name,
        default_branch: repo.default_branch,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * Получить информацию о репозитории
 */
router.get('/repo', async (req: Request, res: Response) => {
  try {
    const service = getGitHubService();
    const repo: any = await service.getRepository();
    
    res.json(repo);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Создать новую ветку
 */
router.post('/branches', async (req: Request, res: Response) => {
  try {
    const { branchName, baseBranch = 'main' } = req.body;
    
    if (!branchName) {
      return res.status(400).json({ error: 'branchName is required' });
    }

    const service = getGitHubService();
    const branch = await service.createBranch(branchName, baseBranch);
    
    res.status(201).json(branch);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Получить список файлов
 */
router.get('/files', async (req: Request, res: Response) => {
  try {
    const path = req.query.path as string || '';
    const service = getGitHubService();
    const files = await service.getFiles(path);
    
    res.json(files);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Получить содержимое файла
 */
router.get('/files/*', async (req: Request, res: Response) => {
  try {
    const filePath = req.params[0];
    const branch = req.query.branch as string || 'main';
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const service = getGitHubService();
    const file = await service.getFileContent(filePath, branch);
    
    res.json(file);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Обновить или создать файл
 */
router.put('/files/*', async (req: Request, res: Response) => {
  try {
    const filePath = req.params[0];
    const { content, message, branch = 'main', sha } = req.body;
    
    if (!content || !message) {
      return res.status(400).json({ error: 'content and message are required' });
    }

    const service = getGitHubService();
    const result = await service.updateFile(filePath, content, message, branch, sha);
    
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Создать Pull Request
 */
router.post('/pulls', async (req: Request, res: Response) => {
  try {
    const { title, body, head, base = 'main' } = req.body;
    
    if (!title || !head) {
      return res.status(400).json({ error: 'title and head are required' });
    }

    const service = getGitHubService();
    const pr = await service.createPullRequest(title, body || '', head, base);
    
    res.status(201).json(pr);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Получить информацию о Pull Request
 */
router.get('/pulls/:pullNumber', async (req: Request, res: Response) => {
  try {
    const pullNumber = parseInt(req.params.pullNumber, 10);
    
    if (isNaN(pullNumber)) {
      return res.status(400).json({ error: 'Invalid pull number' });
    }

    const service = getGitHubService();
    const pr = await service.getPullRequest(pullNumber);
    
    res.json(pr);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Добавить комментарий к Pull Request
 */
router.post('/pulls/:pullNumber/comments', async (req: Request, res: Response) => {
  try {
    const pullNumber = parseInt(req.params.pullNumber, 10);
    const { comment } = req.body;
    
    if (isNaN(pullNumber)) {
      return res.status(400).json({ error: 'Invalid pull number' });
    }
    
    if (!comment) {
      return res.status(400).json({ error: 'comment is required' });
    }

    const service = getGitHubService();
    const result = await service.addPullRequestComment(pullNumber, comment);
    
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Получить последние коммиты
 */
router.get('/commits', async (req: Request, res: Response) => {
  try {
    const branch = req.query.branch as string || 'main';
    const limit = parseInt(req.query.limit as string || '10', 10);
    
    const service = getGitHubService();
    const commits = await service.getCommits(branch, limit);
    
    res.json(commits);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Создать Issue
 */
router.post('/issues', async (req: Request, res: Response) => {
  try {
    const { title, body, labels } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    const service = getGitHubService();
    const issue = await service.createIssue(title, body || '', labels);
    
    res.status(201).json(issue);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Обработать webhook от GitHub
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const event = req.headers['x-github-event'] as string || 'unknown';
    const payload = req.body;
    
    const service = getGitHubService();
    const result = await service.handleWebhook(event, payload);
    
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Очистить кэш
 */
router.delete('/cache', async (req: Request, res: Response) => {
  try {
    const service = getGitHubService();
    service.clearCache();
    
    res.json({ message: 'Cache cleared successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Получить статистику кэша
 */
router.get('/cache/stats', async (req: Request, res: Response) => {
  try {
    const service = getGitHubService();
    const stats = service.getCacheStats();
    
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
