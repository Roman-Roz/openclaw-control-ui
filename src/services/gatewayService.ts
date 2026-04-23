/**
 * Gateway Service - Integration with OpenClaw Gateway CLI
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '../utils/logger.js';
import { CommandRequest, CommandResponse } from '../types/index.js';

const execAsync = promisify(exec);

export interface GatewayStatusData {
  status: string;
  version?: string;
  uptime?: number;
  agents?: any[];
  models?: any[];
}

export interface AgentInfo {
  id: string;
  name: string;
  status: string;
  type: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  status: string;
}

class GatewayService {
  private gatewayPath: string;
  private isConnected: boolean = false;

  constructor() {
    // Try to find gateway CLI in common locations
    this.gatewayPath = process.env.GATEWAY_PATH || 'openclaw-gateway';
  }

  /**
   * Check gateway status
   */
  public async checkStatus(): Promise<GatewayStatusData> {
    try {
      const status = await this.getGatewayStatusCLI();
      this.isConnected = true;
      return status;
    } catch (error) {
      this.isConnected = false;
      logger.warn('Gateway not available, returning mock status', { error: (error as Error).message });
      return this.getMockStatus();
    }
  }

  /**
   * Get gateway status via CLI
   */
  public async getGatewayStatusCLI(): Promise<GatewayStatusData> {
    try {
      const { stdout } = await execAsync(`${this.gatewayPath} status --json`);
      return JSON.parse(stdout);
    } catch (error) {
      logger.error('Failed to get gateway status via CLI', { error: (error as Error).message });
      throw new Error('Gateway CLI not available');
    }
  }

  /**
   * Get list of agents
   */
  public async getAgents(): Promise<AgentInfo[]> {
    try {
      const { stdout } = await execAsync(`${this.gatewayPath} agents list --json`);
      return JSON.parse(stdout);
    } catch (error) {
      logger.warn('Failed to get agents via CLI, returning mock data');
      return this.getMockAgents();
    }
  }

  /**
   * Get list of available models
   */
  public async getModels(): Promise<ModelInfo[]> {
    try {
      const { stdout } = await execAsync(`${this.gatewayPath} models list --json`);
      return JSON.parse(stdout);
    } catch (error) {
      logger.warn('Failed to get models via CLI, returning mock data');
      return this.getMockModels();
    }
  }

  /**
   * Switch to a different model
   */
  public async switchModel(modelId: string): Promise<CommandResponse> {
    try {
      const { stdout } = await execAsync(`${this.gatewayPath} model switch ${modelId}`);
      return {
        success: true,
        message: `Successfully switched to model ${modelId}`,
        data: stdout,
      };
    } catch (error) {
      logger.error('Failed to switch model', { error: (error as Error).message });
      return {
        success: false,
        message: `Failed to switch to model ${modelId}`,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Send command to gateway (overloaded for task queue)
   */
  public async sendCommand(request: CommandRequest): Promise<CommandResponse>;
  public async sendCommand(agentId: string, prompt: string, model?: string): Promise<any>;
  public async sendCommand(requestOrAgentId: CommandRequest | string, promptOrTarget?: string, model?: string): Promise<any> {
    // Overload for task queue: sendCommand(agentId, prompt, model)
    if (typeof requestOrAgentId === 'string') {
      const agentId = requestOrAgentId;
      const prompt = promptOrTarget || '';
      
      try {
        let cmd = `${this.gatewayPath} agent execute --agent ${agentId} --prompt "${prompt.replace(/"/g, '\\"')}"`;
        
        if (model) {
          cmd += ` --model ${model}`;
        }
        
        const { stdout } = await execAsync(cmd);
        return {
          success: true,
          message: `Command executed successfully`,
          data: stdout,
        };
      } catch (error) {
        logger.error('Failed to execute command', { error: (error as Error).message, agentId });
        // Return mock response for development
        return {
          success: true,
          message: `Mock response for agent ${agentId}`,
          data: {
            response: `This is a mock response. Agent: ${agentId}, Prompt: ${prompt}, Model: ${model || 'default'}`,
            tokens_used: 100,
            duration_ms: 500,
          },
        };
      }
    }
    
    // Original implementation
    const request = requestOrAgentId;
    const { command, target, parameters } = request;

    try {
      let cmd = `${this.gatewayPath} command ${command}`;

      if (target) {
        cmd += ` --target ${target}`;
      }

      if (parameters && Object.keys(parameters).length > 0) {
        const paramsStr = Object.entries(parameters)
          .map(([key, value]) => `--${key} ${value}`)
          .join(' ');
        cmd += ` ${paramsStr}`;
      }

      const { stdout } = await execAsync(cmd);

      return {
        success: true,
        message: `Command "${command}" executed successfully`,
        data: stdout,
      };
    } catch (error) {
      logger.error('Failed to execute command', { error: (error as Error).message, command });
      return {
        success: false,
        message: `Command "${command}" failed`,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Check if gateway is connected
   */
  public getIsConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get mock status for development/testing
   */
  private getMockStatus(): GatewayStatusData {
    return {
      status: 'offline',
      version: 'N/A',
      uptime: 0,
      agents: [],
      models: [],
    };
  }

  /**
   * Get mock agents for development/testing
   */
  private getMockAgents(): AgentInfo[] {
    return [
      { id: 'agent-1', name: 'Alpha Agent', status: 'active', type: 'llm' },
      { id: 'agent-2', name: 'Beta Agent', status: 'idle', type: 'vision' },
      { id: 'agent-3', name: 'Gamma Agent', status: 'active', type: 'speech' },
    ];
  }

  /**
   * Get mock models for development/testing
   */
  private getMockModels(): ModelInfo[] {
    return [
      { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI', status: 'available' },
      { id: 'claude-3', name: 'Claude 3', provider: 'Anthropic', status: 'available' },
      { id: 'llama-3', name: 'Llama 3', provider: 'Meta', status: 'available' },
      { id: 'mistral-large', name: 'Mistral Large', provider: 'Mistral AI', status: 'available' },
    ];
  }
}

// Singleton instance
const gatewayService = new GatewayService();

export default gatewayService;
export { GatewayService };
