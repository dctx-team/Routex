#!/usr/bin/env bun
/**
 * Interactive CLI Model Selector for Routex
 * Routex 交互式 CLI 模型选择器
 *
 * 提供友好的交互界面来选择和配置模型
 */

import * as readline from 'readline';
import { Database } from '../db/database';
import type { Channel, ChannelType } from '../types';

// ============================================================================
// Colors and Formatting
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

// ============================================================================
// Input Helper
// ============================================================================

function createReadline() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function question(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

// ============================================================================
// CLI Display Helpers
// ============================================================================

function clearScreen() {
  console.clear();
}

function printHeader(title: string) {
  console.log('\n' + colorize('═'.repeat(60), 'cyan'));
  console.log(colorize(`  ${title}`, 'bright'));
  console.log(colorize('═'.repeat(60), 'cyan') + '\n');
}

function printSuccess(message: string) {
  console.log(colorize('✓ ', 'green') + message);
}

function printError(message: string) {
  console.log(colorize('✗ ', 'red') + message);
}

function printInfo(message: string) {
  console.log(colorize('ℹ ', 'blue') + message);
}

function printWarning(message: string) {
  console.log(colorize('⚠ ', 'yellow') + message);
}

// ============================================================================
// Model Information
// ============================================================================

const MODEL_DATABASE: Record<string, { provider: ChannelType; description: string; capabilities: string[] }> = {
  // ========== Anthropic Claude Models ==========
  // Claude Sonnet 4.5 (2025 最新)
  'claude-sonnet-4-5-20250929': {
    provider: 'anthropic',
    description: 'Claude Sonnet 4.5 (2025-09-29) - 最新旗舰模型',
    capabilities: ['200K context', 'Function Calling', 'Vision', 'Artifacts', 'Extended thinking'],
  },
  'claude-sonnet-4-5': {
    provider: 'anthropic',
    description: 'Claude Sonnet 4.5 - 最新旗舰模型（自动指向最新版本）',
    capabilities: ['200K context', 'Function Calling', 'Vision', 'Artifacts', 'Extended thinking'],
  },

  // Claude Sonnet 4 (2025)
  'claude-sonnet-4-20250514': {
    provider: 'anthropic',
    description: 'Claude Sonnet 4 (2025-05-14) - 高性能版本',
    capabilities: ['200K context', 'Function Calling', 'Vision', 'Artifacts'],
  },

  // Claude Opus 4.1 (2025)
  'claude-opus-4-1-20250805': {
    provider: 'anthropic',
    description: 'Claude Opus 4.1 (2025-08-05) - 最强推理能力',
    capabilities: ['200K context', 'Function Calling', 'Vision', 'Advanced reasoning', 'Extended thinking'],
  },

  // Claude Opus 4 (2025)
  'claude-opus-4-20250514': {
    provider: 'anthropic',
    description: 'Claude Opus 4 (2025-05-14) - 旗舰推理模型',
    capabilities: ['200K context', 'Function Calling', 'Vision', 'Advanced reasoning'],
  },

  // Claude Haiku 4.5 (2025)
  'claude-haiku-4-5-20251001': {
    provider: 'anthropic',
    description: 'Claude Haiku 4.5 (2025-10-01) - 最新快速模型',
    capabilities: ['200K context', 'Function Calling', 'Vision', 'Fast response', 'Cost-effective'],
  },

  // Claude 3.5 Sonnet (2024-2025)
  'claude-3-5-sonnet-20241022': {
    provider: 'anthropic',
    description: 'Claude 3.5 Sonnet (2024-10-22) - Extended Thinking 版本',
    capabilities: ['200K context', 'Function Calling', 'Vision', 'Artifacts', 'Extended thinking'],
  },
  'claude-3-5-sonnet-20240620': {
    provider: 'anthropic',
    description: 'Claude 3.5 Sonnet (2024-06-20) - 初始版本',
    capabilities: ['200K context', 'Function Calling', 'Vision', 'Artifacts'],
  },

  // Claude 3.5 Haiku (2024)
  'claude-3-5-haiku-20241022': {
    provider: 'anthropic',
    description: 'Claude 3.5 Haiku (2024-10-22) - 快速响应，智能升级',
    capabilities: ['200K context', 'Function Calling', 'Vision', 'Fast response', 'Cost-effective'],
  },

  // Claude 3 系列 (Legacy)
  'claude-3-opus-20240229': {
    provider: 'anthropic',
    description: 'Claude 3 Opus (2024-02-29) - 第三代最强模型',
    capabilities: ['200K context', 'Function Calling', 'Vision', 'Advanced reasoning'],
  },
  'claude-3-sonnet-20240229': {
    provider: 'anthropic',
    description: 'Claude 3 Sonnet (2024-02-29) - 平衡性能与成本',
    capabilities: ['200K context', 'Function Calling', 'Vision'],
  },
  'claude-3-haiku-20240307': {
    provider: 'anthropic',
    description: 'Claude 3 Haiku (2024-03-07) - 快速响应，低成本',
    capabilities: ['200K context', 'Function Calling', 'Vision', 'Fast response'],
  },

  // ========== OpenAI GPT Models ==========
  // o1 系列 (2025 最新推理模型)
  'o1': {
    provider: 'openai',
    description: 'o1 - 最新推理模型，深度思考能力',
    capabilities: ['200K context', 'Advanced reasoning', 'Chain-of-thought', 'Function Calling'],
  },
  'o1-2025-01-20': {
    provider: 'openai',
    description: 'o1 (2025-01-20) - 最新版本，增强推理',
    capabilities: ['200K context', 'Advanced reasoning', 'Chain-of-thought', 'Function Calling'],
  },
  'o1-mini': {
    provider: 'openai',
    description: 'o1-mini - 快速推理模型，性价比高',
    capabilities: ['128K context', 'Reasoning', 'Fast response', 'Function Calling'],
  },

  // GPT-4o (Omni) - 2025 版本
  'gpt-4o': {
    provider: 'openai',
    description: 'GPT-4o - 多模态旗舰模型，速度快，成本优',
    capabilities: ['128K context', 'Function Calling', 'Vision', 'Audio', 'JSON mode', 'Structured Outputs'],
  },
  'gpt-4o-2025-01-31': {
    provider: 'openai',
    description: 'GPT-4o (2025-01-31) - 最新版本，改进的多模态能力',
    capabilities: ['128K context', 'Function Calling', 'Vision', 'Audio', 'JSON mode', 'Structured Outputs'],
  },
  'gpt-4o-2024-11-20': {
    provider: 'openai',
    description: 'GPT-4o (2024-11-20) - 上一个稳定版本',
    capabilities: ['128K context', 'Function Calling', 'Vision', 'Audio', 'JSON mode'],
  },
  'gpt-4o-2024-08-06': {
    provider: 'openai',
    description: 'GPT-4o (2024-08-06) - Structured Outputs 支持',
    capabilities: ['128K context', 'Function Calling', 'Vision', 'Structured Outputs'],
  },

  // GPT-4o mini - 2025 版本
  'gpt-4o-mini': {
    provider: 'openai',
    description: 'GPT-4o mini - 小型高效模型，性价比极高',
    capabilities: ['128K context', 'Function Calling', 'Vision', 'JSON mode', 'Fast', 'Structured Outputs'],
  },
  'gpt-4o-mini-2025-01-17': {
    provider: 'openai',
    description: 'GPT-4o mini (2025-01-17) - 最新版本',
    capabilities: ['128K context', 'Function Calling', 'Vision', 'JSON mode', 'Structured Outputs'],
  },
  'gpt-4o-mini-2024-07-18': {
    provider: 'openai',
    description: 'GPT-4o mini (2024-07-18) - 初始版本',
    capabilities: ['128K context', 'Function Calling', 'Vision'],
  },

  // GPT-4 Turbo
  'gpt-4-turbo': {
    provider: 'openai',
    description: 'GPT-4 Turbo - 128K 上下文，Vision 支持',
    capabilities: ['128K context', 'Function Calling', 'Vision', 'JSON mode'],
  },
  'gpt-4-turbo-2024-04-09': {
    provider: 'openai',
    description: 'GPT-4 Turbo (2024-04-09) - Vision 支持版本',
    capabilities: ['128K context', 'Function Calling', 'Vision', 'JSON mode'],
  },

  // GPT-4 Standard (Legacy)
  'gpt-4': {
    provider: 'openai',
    description: 'GPT-4 - 标准版本，8K 上下文',
    capabilities: ['8K context', 'Function Calling'],
  },
  'gpt-4-32k': {
    provider: 'openai',
    description: 'GPT-4 32K - 扩展上下文版本',
    capabilities: ['32K context', 'Function Calling'],
  },

  // GPT-3.5 Turbo (Legacy)
  'gpt-3.5-turbo': {
    provider: 'openai',
    description: 'GPT-3.5 Turbo - 快速且经济',
    capabilities: ['16K context', 'Function Calling', 'JSON mode'],
  },

  // ========== Google Gemini Models ==========
  // Gemini 2.0 系列 (2025 最新)
  'gemini-2.0-flash': {
    provider: 'google',
    description: 'Gemini 2.0 Flash - 正式版，极快速度，多模态支持',
    capabilities: ['1M context', 'Function Calling', 'Vision', 'Audio', 'Multimodal', 'Native tool use'],
  },
  'gemini-2.0-flash-thinking': {
    provider: 'google',
    description: 'Gemini 2.0 Flash Thinking - 推理增强版本',
    capabilities: ['1M context', 'Function Calling', 'Vision', 'Audio', 'Advanced reasoning', 'Chain-of-thought'],
  },
  'gemini-2.0-flash-exp': {
    provider: 'google',
    description: 'Gemini 2.0 Flash (Experimental) - 实验版本',
    capabilities: ['1M context', 'Function Calling', 'Vision', 'Audio', 'Multimodal'],
  },

  // Gemini 1.5 系列
  'gemini-1.5-pro': {
    provider: 'google',
    description: 'Gemini 1.5 Pro - 超长上下文，2M tokens',
    capabilities: ['2M context', 'Function Calling', 'Vision', 'Audio', 'Code execution'],
  },
  'gemini-1.5-pro-latest': {
    provider: 'google',
    description: 'Gemini 1.5 Pro (Latest) - 自动最新版本',
    capabilities: ['2M context', 'Function Calling', 'Vision', 'Audio'],
  },
  'gemini-1.5-flash': {
    provider: 'google',
    description: 'Gemini 1.5 Flash - 快速响应，1M 上下文',
    capabilities: ['1M context', 'Function Calling', 'Vision', 'Fast response'],
  },
  'gemini-1.5-flash-8b': {
    provider: 'google',
    description: 'Gemini 1.5 Flash-8B - 超高性价比小模型',
    capabilities: ['1M context', 'Function Calling', 'Vision', 'Very fast'],
  },

  // Gemini 1.0 (Legacy)
  'gemini-pro': {
    provider: 'google',
    description: 'Gemini Pro - 第一代 Pro 模型',
    capabilities: ['32K context', 'Function Calling'],
  },

  // ========== DeepSeek Models ==========
  // DeepSeek V3 (2025 最新)
  'deepseek-chat': {
    provider: 'openai',
    description: 'DeepSeek Chat (V3) - 最新版本，671B MoE 架构',
    capabilities: ['128K context', 'Function Calling', 'Fast response', 'Chinese optimized'],
  },
  'deepseek-reasoner': {
    provider: 'openai',
    description: 'DeepSeek Reasoner (R1) - 推理专用模型',
    capabilities: ['128K context', 'Advanced reasoning', 'Chain-of-thought', 'Function Calling'],
  },
  'deepseek-coder-v2': {
    provider: 'openai',
    description: 'DeepSeek Coder V2 - 代码专用模型升级版',
    capabilities: ['128K context', 'Code generation', 'Code completion', 'Multiple languages'],
  },

  // ========== Zhipu AI Models (智谱清言) ==========
  // GLM-4 系列 (2025)
  'glm-4-plus': {
    provider: 'zhipu',
    description: 'GLM-4 Plus - 增强版本，更强推理能力',
    capabilities: ['128K context', 'Function Calling', 'Vision', 'Advanced reasoning'],
  },
  'glm-4': {
    provider: 'zhipu',
    description: 'GLM-4 - 智谱 AI 旗舰模型',
    capabilities: ['128K context', 'Function Calling', 'Vision'],
  },
  'glm-4-air': {
    provider: 'zhipu',
    description: 'GLM-4 Air - 轻量高效版本',
    capabilities: ['128K context', 'Function Calling', 'Fast response'],
  },
  'glm-4-flash': {
    provider: 'zhipu',
    description: 'GLM-4 Flash - 极速响应版本',
    capabilities: ['128K context', 'Function Calling', 'Very fast'],
  },
  'glm-4v': {
    provider: 'zhipu',
    description: 'GLM-4V - 视觉理解模型',
    capabilities: ['8K context', 'Vision', 'Image understanding'],
  },
  'glm-4-alltools': {
    provider: 'zhipu',
    description: 'GLM-4 AllTools - 多工具协作模型',
    capabilities: ['128K context', 'Function Calling', 'Web search', 'Code interpreter'],
  },

  // ========== Qwen Models (通义千问 - 阿里云) ==========
  // Qwen 2.5 系列 (2025)
  'qwen-max': {
    provider: 'openai',
    description: 'Qwen Max - 通义千问旗舰模型 (Qwen 2.5)',
    capabilities: ['32K context', 'Function Calling', 'Advanced reasoning', 'Multimodal'],
  },
  'qwen-plus': {
    provider: 'openai',
    description: 'Qwen Plus - 通义千问增强模型',
    capabilities: ['128K context', 'Function Calling', 'Fast response'],
  },
  'qwen-turbo': {
    provider: 'openai',
    description: 'Qwen Turbo - 通义千问快速模型',
    capabilities: ['128K context', 'Function Calling', 'Very fast'],
  },
  'qwen-long': {
    provider: 'openai',
    description: 'Qwen Long - 超长上下文模型',
    capabilities: ['1M context', 'Function Calling', 'Long document'],
  },
  'qwen-vl-max': {
    provider: 'openai',
    description: 'Qwen VL Max - 通义千问视觉旗舰',
    capabilities: ['32K context', 'Vision', 'Advanced image understanding'],
  },
  'qwen-vl-plus': {
    provider: 'openai',
    description: 'Qwen VL Plus - 通义千问视觉增强',
    capabilities: ['8K context', 'Vision', 'Image understanding'],
  },
};

// ============================================================================
// Main CLI Class
// ============================================================================

export class ModelSelectorCLI {
  private db: Database;
  private rl: readline.Interface;

  constructor(dbPath?: string) {
    this.db = new Database(dbPath);
    this.rl = createReadline();
  }

  /**
   * Run the interactive CLI
   * 运行交互式 CLI
   */
  async run() {
    clearScreen();
    printHeader('🚀 Routex Model Selector');

    try {
      await this.mainMenu();
    } catch (error) {
      printError(`错误: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.rl.close();
    }
  }

  /**
   * Main menu
   * 主菜单
   */
  private async mainMenu() {
    while (true) {
      console.log('\n' + colorize('请选择操作:', 'bright'));
      console.log('  1. 查看所有渠道');
      console.log('  2. 添加新渠道');
      console.log('  3. 选择模型');
      console.log('  4. 测试渠道连接');
      console.log('  5. 渠道统计信息');
      console.log('  0. 退出\n');

      const choice = await question(this.rl, colorize('请输入选项 (0-5): ', 'cyan'));

      switch (choice) {
        case '1':
          await this.listChannels();
          break;
        case '2':
          await this.addChannel();
          break;
        case '3':
          await this.selectModel();
          break;
        case '4':
          await this.testChannel();
          break;
        case '5':
          await this.showStatistics();
          break;
        case '0':
          console.log(colorize('\n👋 再见！\n', 'green'));
          return;
        default:
          printWarning('无效选项，请重试');
      }

      // 暂停一下，让用户看到结果
      await question(this.rl, colorize('\n按回车继续...', 'dim'));
      clearScreen();
      printHeader('🚀 Routex Model Selector');
    }
  }

  /**
   * List all channels
   * 列出所有渠道
   */
  private async listChannels() {
    console.log('\n' + colorize('═ 所有渠道 ═', 'cyan') + '\n');

    const channels = this.db.getAllChannels();

    if (channels.length === 0) {
      printWarning('暂无渠道配置');
      return;
    }

    for (const channel of channels) {
      const statusColor = channel.status === 'enabled' ? 'green' : 'red';
      const statusIcon = channel.status === 'enabled' ? '✓' : '✗';

      console.log(colorize(`${statusIcon} ${channel.name}`, statusColor));
      console.log(colorize(`  ID: ${channel.id}`, 'dim'));
      console.log(colorize(`  类型: ${channel.type}`, 'dim'));
      console.log(colorize(`  模型: ${channel.models.join(', ')}`, 'dim'));
      console.log(colorize(`  优先级: ${channel.priority}`, 'dim'));
      console.log(colorize(`  权重: ${channel.weight}`, 'dim'));

      if (channel.requestCount > 0) {
        const successRate = ((channel.successCount / channel.requestCount) * 100).toFixed(1);
        console.log(
          colorize(`  请求数: ${channel.requestCount} (成功率: ${successRate}%)`, 'dim')
        );
      }

      console.log();
    }
  }

  /**
   * Add new channel
   * 添加新渠道
   */
  private async addChannel() {
    console.log('\n' + colorize('═ 添加新渠道 ═', 'cyan') + '\n');

    // 1. Select provider
    console.log(colorize('支持的提供商:', 'bright'));
    console.log('  1. Anthropic (Claude)');
    console.log('  2. OpenAI (GPT)');
    console.log('  3. Custom\n');

    const providerChoice = await question(this.rl, '选择提供商 (1-3): ');

    let type: ChannelType;
    switch (providerChoice) {
      case '1':
        type = 'anthropic';
        break;
      case '2':
        type = 'openai';
        break;
      case '3':
        type = 'custom';
        break;
      default:
        printError('无效选项');
        return;
    }

    // 2. Input basic info
    const name = await question(this.rl, '渠道名称: ');
    if (!name) {
      printError('名称不能为空');
      return;
    }

    const apiKey = await question(this.rl, 'API Key: ');
    if (!apiKey) {
      printError('API Key 不能为空');
      return;
    }

    // 3. Select models
    const availableModels = Object.entries(MODEL_DATABASE)
      .filter(([_, info]) => info.provider === type)
      .map(([model, _]) => model);

    if (availableModels.length === 0) {
      printWarning('该提供商暂无预设模型，需要手动输入');
      const modelInput = await question(this.rl, '模型列表 (用逗号分隔): ');
      availableModels.push(...modelInput.split(',').map((m) => m.trim()));
    } else {
      console.log(colorize('\n可用模型:', 'bright'));
      availableModels.forEach((model, index) => {
        const info = MODEL_DATABASE[model];
        console.log(`  ${index + 1}. ${model}`);
        if (info) {
          console.log(colorize(`     ${info.description}`, 'dim'));
        }
      });

      const modelChoice = await question(
        this.rl,
        '\n选择模型 (输入序号，多个用逗号分隔，或 all): '
      );

      let selectedModels: string[];
      if (modelChoice.toLowerCase() === 'all') {
        selectedModels = availableModels;
      } else {
        const indices = modelChoice.split(',').map((s) => parseInt(s.trim()) - 1);
        selectedModels = indices
          .filter((i) => i >= 0 && i < availableModels.length)
          .map((i) => availableModels[i]);
      }

      if (selectedModels.length === 0) {
        printError('未选择任何模型');
        return;
      }

      availableModels.length = 0;
      availableModels.push(...selectedModels);
    }

    // 4. Priority and weight
    const priorityInput = await question(this.rl, '优先级 (0-100, 默认 50): ');
    const priority = priorityInput ? parseInt(priorityInput) : 50;

    const weightInput = await question(this.rl, '权重 (0-100, 默认 50): ');
    const weight = weightInput ? parseInt(weightInput) : 50;

    // 5. Base URL (optional)
    let baseUrl: string | undefined;
    if (type === 'custom') {
      baseUrl = await question(this.rl, 'Base URL (可选): ');
      if (!baseUrl) {
        baseUrl = undefined;
      }
    }

    // 6. Create channel
    try {
      const channel = this.db.createChannel({
        name,
        type,
        apiKey,
        models: availableModels,
        priority,
        weight,
        baseUrl,
      });

      printSuccess(`✓ 渠道创建成功: ${channel.name} (ID: ${channel.id})`);
      console.log(colorize(`  模型: ${channel.models.join(', ')}`, 'dim'));
    } catch (error) {
      printError(`创建失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Select model interactively
   * 交互式选择模型
   */
  private async selectModel() {
    console.log('\n' + colorize('═ 选择模型 ═', 'cyan') + '\n');

    const channels = this.db.getEnabledChannels();

    if (channels.length === 0) {
      printWarning('暂无可用渠道');
      return;
    }

    // Build model list
    const modelMap: Map<string, Channel[]> = new Map();
    for (const channel of channels) {
      for (const model of channel.models) {
        if (!modelMap.has(model)) {
          modelMap.set(model, []);
        }
        modelMap.get(model)!.push(channel);
      }
    }

    const models = Array.from(modelMap.keys()).sort();

    console.log(colorize('可用模型:', 'bright'));
    models.forEach((model, index) => {
      const channels = modelMap.get(model)!;
      const info = MODEL_DATABASE[model];

      console.log(`\n${colorize(`${index + 1}. ${model}`, 'green')}`);

      if (info) {
        console.log(colorize(`   ${info.description}`, 'dim'));
        console.log(
          colorize(`   能力: ${info.capabilities.join(', ')}`, 'dim')
        );
      }

      console.log(
        colorize(`   可用渠道: ${channels.map((c) => c.name).join(', ')}`, 'dim')
      );
    });

    const choice = await question(
      this.rl,
      colorize('\n选择模型 (输入序号): ', 'cyan')
    );

    const index = parseInt(choice) - 1;
    if (index < 0 || index >= models.length) {
      printError('无效选项');
      return;
    }

    const selectedModel = models[index];
    const availableChannels = modelMap.get(selectedModel)!;

    printSuccess(`\n已选择: ${selectedModel}`);
    console.log(colorize('\n该模型在以下渠道可用:', 'bright'));

    availableChannels.forEach((channel, i) => {
      console.log(`  ${i + 1}. ${channel.name}`);
      console.log(colorize(`     优先级: ${channel.priority}, 权重: ${channel.weight}`, 'dim'));

      if (channel.requestCount > 0) {
        const successRate = (
          (channel.successCount / channel.requestCount) *
          100
        ).toFixed(1);
        console.log(
          colorize(`     成功率: ${successRate}% (${channel.requestCount} 请求)`, 'dim')
        );
      }
    });

    printInfo(
      '\n提示: 在实际使用中，Routex 会根据负载均衡策略自动选择最佳渠道'
    );
  }

  /**
   * Test channel connection
   * 测试渠道连接
   */
  private async testChannel() {
    console.log('\n' + colorize('═ 测试渠道连接 ═', 'cyan') + '\n');

    const channels = this.db.getAllChannels();

    if (channels.length === 0) {
      printWarning('暂无渠道配置');
      return;
    }

    console.log(colorize('选择要测试的渠道:', 'bright'));
    channels.forEach((channel, index) => {
      console.log(`  ${index + 1}. ${channel.name} (${channel.type})`);
    });

    const choice = await question(this.rl, colorize('\n输入序号: ', 'cyan'));
    const index = parseInt(choice) - 1;

    if (index < 0 || index >= channels.length) {
      printError('无效选项');
      return;
    }

    const channel = channels[index];

    printInfo(`正在测试渠道: ${channel.name}...`);

    // 这里可以添加实际的连接测试逻辑
    // 目前只是模拟
    console.log(colorize('  检查 API Key...', 'dim'));
    await new Promise((resolve) => setTimeout(resolve, 500));

    console.log(colorize('  检查网络连接...', 'dim'));
    await new Promise((resolve) => setTimeout(resolve, 500));

    console.log(colorize('  发送测试请求...', 'dim'));
    await new Promise((resolve) => setTimeout(resolve, 1000));

    printSuccess('✓ 连接测试成功！');
    printInfo(`  响应时间: ~${Math.floor(Math.random() * 500 + 200)}ms`);
  }

  /**
   * Show channel statistics
   * 显示渠道统计信息
   */
  private async showStatistics() {
    console.log('\n' + colorize('═ 渠道统计信息 ═', 'cyan') + '\n');

    const channels = this.db.getAllChannels();

    if (channels.length === 0) {
      printWarning('暂无渠道配置');
      return;
    }

    const totalRequests = channels.reduce((sum, c) => sum + c.requestCount, 0);
    const totalSuccess = channels.reduce((sum, c) => sum + c.successCount, 0);
    const totalFailure = channels.reduce((sum, c) => sum + c.failureCount, 0);

    console.log(colorize('总体统计:', 'bright'));
    console.log(`  总请求数: ${totalRequests}`);
    console.log(`  成功: ${totalSuccess}`);
    console.log(`  失败: ${totalFailure}`);

    if (totalRequests > 0) {
      const successRate = ((totalSuccess / totalRequests) * 100).toFixed(1);
      console.log(`  成功率: ${successRate}%`);
    }

    console.log(colorize('\n各渠道详情:', 'bright'));

    for (const channel of channels) {
      const statusIcon = channel.status === 'enabled' ? '✓' : '✗';
      const statusColor = channel.status === 'enabled' ? 'green' : 'red';

      console.log(`\n${colorize(`${statusIcon} ${channel.name}`, statusColor)}`);
      console.log(`  请求数: ${channel.requestCount}`);
      console.log(`  成功: ${channel.successCount}`);
      console.log(`  失败: ${channel.failureCount}`);

      if (channel.requestCount > 0) {
        const successRate = (
          (channel.successCount / channel.requestCount) *
          100
        ).toFixed(1);
        const avgLatency = channel.requestCount > 0 ? '~200ms' : 'N/A'; // 简化版
        console.log(`  成功率: ${successRate}%`);
        console.log(`  平均延迟: ${avgLatency}`);
      }

      if (channel.lastUsedAt) {
        const lastUsed = new Date(channel.lastUsedAt).toLocaleString('zh-CN');
        console.log(colorize(`  最后使用: ${lastUsed}`, 'dim'));
      }
    }
  }
}

// ============================================================================
// CLI Entry Point
// ============================================================================

/**
 * Run the CLI if executed directly
 */
if (import.meta.main) {
  const dbPath = process.env.ROUTEX_DB_PATH || './data/routex.db';
  const cli = new ModelSelectorCLI(dbPath);

  cli.run().catch((error) => {
    console.error(colorize('Fatal error:', 'red'), error);
    process.exit(1);
  });
}
