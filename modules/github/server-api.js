/**
 * 🚀 GitHub Integration Server API
 * 
 * Express API для GitHub интеграции
 */

const express = require('express');
const { createGitHubIntegration } = require('./index.js');

class GitHubServerAPI {
    constructor(options = {}) {
        this.app = express.Router();
        this.options = options;
        this.gitHub = null;
        this.setupRoutes();
    }
    
    /**
     * Настройка маршрутов
     */
    setupRoutes() {
        // Middleware
        this.app.use(express.json());
        
        // Инициализация GitHub интеграции
        this.app.use(async (req, res, next) => {
            try {
                if (!this.gitHub) {
                    const token = req.headers['x-github-token'] || process.env.GITHUB_TOKEN;
                    this.gitHub = await createGitHubIntegration(this.options).initialize(token);
                }
                next();
            } catch (error) {
                res.status(500).json({
                    error: 'GitHub integration failed to initialize',
                    message: error.message
                });
            }
        });
        
        // Health check
        this.app.get('/health', async (req, res) => {
            try {
                const status = await this.gitHub.getStatusReport();
                res.json({
                    status: 'ok',
                    ...status
                });
            } catch (error) {
                res.status(500).json({
                    status: 'error',
                    error: error.message
                });
            }
        });
        
        // User info
        this.app.get('/user', async (req, res) => {
            try {
                const user = await this.gitHub.getUserInfo();
                res.json(user);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        // User repos
        this.app.get('/user/repos', async (req, res) => {
            try {
                const { page = 1, per_page = 30, sort = 'updated' } = req.query;
                const repos = await this.gitHub.getUserRepos(null, {
                    page: parseInt(page),
                    per_page: parseInt(per_page),
                    sort
                });
                res.json(repos);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        // Stats
        this.app.get('/stats', async (req, res) => {
            try {
                const stats = await this.gitHub.getStats();
                res.json(stats);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        // Repo info
        this.app.get('/repos/:owner/:repo', async (req, res) => {
            try {
                const { owner, repo } = req.params;
                const repoInfo = await this.gitHub.getRepoInfo(owner, repo);
                res.json(repoInfo);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        // Repo issues
        this.app.get('/repos/:owner/:repo/issues', async (req, res) => {
            try {
                const { owner, repo } = req.params;
                const { page = 1, per_page = 20, state = 'open' } = req.query;
                
                const issuesModule = this.gitHub.getModule('issues');
                const issues = await issuesModule.getRepoIssues(owner, repo, {
                    page: parseInt(page),
                    per_page: parseInt(per_page),
                    state
                });
                
                res.json(issues);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        // Watch repo for issues
        this.app.post('/repos/:owner/:repo/watch', async (req, res) => {
            try {
                const { owner, repo } = req.params;
                const config = req.body;
                
                this.gitHub.watchRepoForIssues(owner, repo, config);
                
                res.json({
                    success: true,
                    message: `Now watching ${owner}/${repo} for issues`,
                    config
                });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        // Search repos
        this.app.get('/search/repos', async (req, res) => {
            try {
                const { q, page = 1, per_page = 20 } = req.query;
                
                if (!q) {
                    return res.status(400).json({ error: 'Query parameter "q" is required' });
                }
                
                const repos = await this.gitHub.searchRepos(q, {
                    page: parseInt(page),
                    per_page: parseInt(per_page)
                });
                
                res.json(repos);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        // Update token
        this.app.post('/token', async (req, res) => {
            try {
                const { token } = req.body;
                
                if (!token) {
                    return res.status(400).json({ error: 'Token is required' });
                }
                
                this.gitHub.updateToken(token);
                
                res.json({
                    success: true,
                    message: 'GitHub token updated successfully'
                });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        // WebSocket endpoint для реального времени
        this.app.get('/ws', async (req, res) => {
            // Здесь будет WebSocket endpoint
            res.status(501).json({
                error: 'WebSocket endpoint not implemented yet'
            });
        });
        
        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({
                error: 'Not Found',
                message: `Endpoint ${req.method} ${req.path} not found`
            });
        });
        
        // Error handler
        this.app.use((error, req, res, next) => {
            console.error('GitHub API error:', error);
            res.status(500).json({
                error: 'Internal Server Error',
                message: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        });
    }
    
    /**
     * Получение Express router
     */
    getRouter() {
        return this.app;
    }
    
    /**
     * Очистка ресурсов
     */
    destroy() {
        if (this.gitHub) {
            this.gitHub.destroy();
            this.gitHub = null;
        }
    }
}

// Экспорт фабричной функции
function createGitHubServerAPI(options = {}) {
    return new GitHubServerAPI(options);
}

module.exports = {
    GitHubServerAPI,
    createGitHubServerAPI
};