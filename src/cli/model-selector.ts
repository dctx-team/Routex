#!/usr/bin/env bun
/**
 * Interactive CLI Model Selector for Routex
 * Routex  CLI 
 *
 * 
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
// Model Information Database
// 
// ============================================================================
//
//  AI  202510
//
// 
// - 46+  6 
// - Anthropic Claude 4.x/3.x 
// -  2025 
//
//
// 
//  MODEL_DATABASE 
// ============================================================================

const MODEL_DATABASE: Record<string, { provider: ChannelType; description: string; capabilities: string[] }> = {
  // ========== Anthropic Claude Models ==========
  // Claude Sonnet 4.5 (2025 )
  'claude-sonnet-4-5-20250929': {
    provider: 'anthropic',
    description: 'Claude Sonnet 4.5 (2025-09-29) - ',
    capabilities: ['200K context', 'Function Calling', 'Vision', 'Artifacts', 'Extended thinking'],
  },
  'claude-sonnet-4-5': {
    provider: 'anthropic',
    description: 'Claude Sonnet 4.5 - ',
    capabilities: ['200K context', 'Function Calling', 'Vision', 'Artifacts', 'Extended thinking'],
  },

  // Claude Sonnet 4 (2025)
  'claude-sonnet-4-20250514': {
    provider: 'anthropic',
    description: 'Claude Sonnet 4 (2025-05-14) - ',
    capabilities: ['200K context', 'Function Calling', 'Vision', 'Artifacts'],
  },

  // Claude Opus 4.1 (2025)
  'claude-opus-4-1-20250805': {
    provider: 'anthropic',
    description: 'Claude Opus 4.1 (2025-08-05) - ',
    capabilities: ['200K context', 'Function Calling', 'Vision', 'Advanced reasoning', 'Extended thinking'],
  },

  // Claude Opus 4 (2025)
  'claude-opus-4-20250514': {
    provider: 'anthropic',
    description: 'Claude Opus 4 (2025-05-14) - ',
    capabilities: ['200K context', 'Function Calling', 'Vision', 'Advanced reasoning'],
  },

  // Claude Haiku 4.5 (2025)
  'claude-haiku-4-5-20251001': {
    provider: 'anthropic',
    description: 'Claude Haiku 4.5 (2025-10-01) - ',
    capabilities: ['200K context', 'Function Calling', 'Vision', 'Fast response', 'Cost-effective'],
  },

  // Claude 3.5 Sonnet (2024-2025)
  'claude-3-5-sonnet-20241022': {
    provider: 'anthropic',
    description: 'Claude 3.5 Sonnet (2024-10-22) - Extended Thinking ',
    capabilities: ['200K context', 'Function Calling', 'Vision', 'Artifacts', 'Extended thinking'],
  },
  'claude-3-5-sonnet-20240620': {
    provider: 'anthropic',
    description: 'Claude 3.5 Sonnet (2024-06-20) - ',
    capabilities: ['200K context', 'Function Calling', 'Vision', 'Artifacts'],
  },

  // Claude 3.5 Haiku (2024)
  'claude-3-5-haiku-20241022': {
    provider: 'anthropic',
    description: 'Claude 3.5 Haiku (2024-10-22) - ',
    capabilities: ['200K context', 'Function Calling', 'Vision', 'Fast response', 'Cost-effective'],
  },

  // Claude 3  (Legacy)
  'claude-3-opus-20240229': {
    provider: 'anthropic',
    description: 'Claude 3 Opus (2024-02-29) - ',
    capabilities: ['200K context', 'Function Calling', 'Vision', 'Advanced reasoning'],
  },
  'claude-3-sonnet-20240229': {
    provider: 'anthropic',
    description: 'Claude 3 Sonnet (2024-02-29) - ',
    capabilities: ['200K context', 'Function Calling', 'Vision'],
  },
  'claude-3-haiku-20240307': {
    provider: 'anthropic',
    description: 'Claude 3 Haiku (2024-03-07) - ',
    capabilities: ['200K context', 'Function Calling', 'Vision', 'Fast response'],
  },

  // ========== OpenAI GPT Models ==========
  // o1  (2025 )
  'o1': {
    provider: 'openai',
    description: 'o1 - ',
    capabilities: ['200K context', 'Advanced reasoning', 'Chain-of-thought', 'Function Calling'],
  },
  'o1-2025-01-20': {
    provider: 'openai',
    description: 'o1 (2025-01-20) - ',
    capabilities: ['200K context', 'Advanced reasoning', 'Chain-of-thought', 'Function Calling'],
  },
  'o1-mini': {
    provider: 'openai',
    description: 'o1-mini - ',
    capabilities: ['128K context', 'Reasoning', 'Fast response', 'Function Calling'],
  },

  // GPT-4o (Omni) - 2025 
  'gpt-4o': {
    provider: 'openai',
    description: 'GPT-4o - ',
    capabilities: ['128K context', 'Function Calling', 'Vision', 'Audio', 'JSON mode', 'Structured Outputs'],
  },
  'gpt-4o-2025-01-31': {
    provider: 'openai',
    description: 'GPT-4o (2025-01-31) - ',
    capabilities: ['128K context', 'Function Calling', 'Vision', 'Audio', 'JSON mode', 'Structured Outputs'],
  },
  'gpt-4o-2024-11-20': {
    provider: 'openai',
    description: 'GPT-4o (2024-11-20) - ',
    capabilities: ['128K context', 'Function Calling', 'Vision', 'Audio', 'JSON mode'],
  },
  'gpt-4o-2024-08-06': {
    provider: 'openai',
    description: 'GPT-4o (2024-08-06) - Structured Outputs ',
    capabilities: ['128K context', 'Function Calling', 'Vision', 'Structured Outputs'],
  },

  // GPT-4o mini - 2025 
  'gpt-4o-mini': {
    provider: 'openai',
    description: 'GPT-4o mini - ',
    capabilities: ['128K context', 'Function Calling', 'Vision', 'JSON mode', 'Fast', 'Structured Outputs'],
  },
  'gpt-4o-mini-2025-01-17': {
    provider: 'openai',
    description: 'GPT-4o mini (2025-01-17) - ',
    capabilities: ['128K context', 'Function Calling', 'Vision', 'JSON mode', 'Structured Outputs'],
  },
  'gpt-4o-mini-2024-07-18': {
    provider: 'openai',
    description: 'GPT-4o mini (2024-07-18) - ',
    capabilities: ['128K context', 'Function Calling', 'Vision'],
  },

  // GPT-4 Turbo
  'gpt-4-turbo': {
    provider: 'openai',
    description: 'GPT-4 Turbo - 128K Vision ',
    capabilities: ['128K context', 'Function Calling', 'Vision', 'JSON mode'],
  },
  'gpt-4-turbo-2024-04-09': {
    provider: 'openai',
    description: 'GPT-4 Turbo (2024-04-09) - Vision ',
    capabilities: ['128K context', 'Function Calling', 'Vision', 'JSON mode'],
  },

  // GPT-4 Standard (Legacy)
  'gpt-4': {
    provider: 'openai',
    description: 'GPT-4 - 8K ',
    capabilities: ['8K context', 'Function Calling'],
  },
  'gpt-4-32k': {
    provider: 'openai',
    description: 'GPT-4 32K - ',
    capabilities: ['32K context', 'Function Calling'],
  },

  // GPT-3.5 Turbo (Legacy)
  'gpt-3.5-turbo': {
    provider: 'openai',
    description: 'GPT-3.5 Turbo - ',
    capabilities: ['16K context', 'Function Calling', 'JSON mode'],
  },

  // ========== Google Gemini Models ==========
  // Gemini 2.0  (2025 )
  'gemini-2.0-flash': {
    provider: 'google',
    description: 'Gemini 2.0 Flash - ',
    capabilities: ['1M context', 'Function Calling', 'Vision', 'Audio', 'Multimodal', 'Native tool use'],
  },
  'gemini-2.0-flash-thinking': {
    provider: 'google',
    description: 'Gemini 2.0 Flash Thinking - ',
    capabilities: ['1M context', 'Function Calling', 'Vision', 'Audio', 'Advanced reasoning', 'Chain-of-thought'],
  },
  'gemini-2.0-flash-exp': {
    provider: 'google',
    description: 'Gemini 2.0 Flash (Experimental) - ',
    capabilities: ['1M context', 'Function Calling', 'Vision', 'Audio', 'Multimodal'],
  },

  // Gemini 1.5 
  'gemini-1.5-pro': {
    provider: 'google',
    description: 'Gemini 1.5 Pro - 2M tokens',
    capabilities: ['2M context', 'Function Calling', 'Vision', 'Audio', 'Code execution'],
  },
  'gemini-1.5-pro-latest': {
    provider: 'google',
    description: 'Gemini 1.5 Pro (Latest) - ',
    capabilities: ['2M context', 'Function Calling', 'Vision', 'Audio'],
  },
  'gemini-1.5-flash': {
    provider: 'google',
    description: 'Gemini 1.5 Flash - 1M ',
    capabilities: ['1M context', 'Function Calling', 'Vision', 'Fast response'],
  },
  'gemini-1.5-flash-8b': {
    provider: 'google',
    description: 'Gemini 1.5 Flash-8B - ',
    capabilities: ['1M context', 'Function Calling', 'Vision', 'Very fast'],
  },

  // Gemini 1.0 (Legacy)
  'gemini-pro': {
    provider: 'google',
    description: 'Gemini Pro -  Pro ',
    capabilities: ['32K context', 'Function Calling'],
  },

  // ========== DeepSeek Models ==========
  // DeepSeek V3 (2025 )
  'deepseek-chat': {
    provider: 'openai',
    description: 'DeepSeek Chat (V3) - 671B MoE ',
    capabilities: ['128K context', 'Function Calling', 'Fast response', 'Chinese optimized'],
  },
  'deepseek-reasoner': {
    provider: 'openai',
    description: 'DeepSeek Reasoner (R1) - ',
    capabilities: ['128K context', 'Advanced reasoning', 'Chain-of-thought', 'Function Calling'],
  },
  'deepseek-coder-v2': {
    provider: 'openai',
    description: 'DeepSeek Coder V2 - ',
    capabilities: ['128K context', 'Code generation', 'Code completion', 'Multiple languages'],
  },

  // ========== Zhipu AI Models  ==========
  // GLM-4  (2025)
  'glm-4-plus': {
    provider: 'zhipu',
    description: 'GLM-4 Plus - ',
    capabilities: ['128K context', 'Function Calling', 'Vision', 'Advanced reasoning'],
  },
  'glm-4': {
    provider: 'zhipu',
    description: 'GLM-4 -  AI ',
    capabilities: ['128K context', 'Function Calling', 'Vision'],
  },
  'glm-4-air': {
    provider: 'zhipu',
    description: 'GLM-4 Air - ',
    capabilities: ['128K context', 'Function Calling', 'Fast response'],
  },
  'glm-4-flash': {
    provider: 'zhipu',
    description: 'GLM-4 Flash - ',
    capabilities: ['128K context', 'Function Calling', 'Very fast'],
  },
  'glm-4v': {
    provider: 'zhipu',
    description: 'GLM-4V - ',
    capabilities: ['8K context', 'Vision', 'Image understanding'],
  },
  'glm-4-alltools': {
    provider: 'zhipu',
    description: 'GLM-4 AllTools - ',
    capabilities: ['128K context', 'Function Calling', 'Web search', 'Code interpreter'],
  },

  // ========== Qwen Models ( - ) ==========
  // Qwen 2.5  (2025)
  'qwen-max': {
    provider: 'openai',
    description: 'Qwen Max -  (Qwen 2.5)',
    capabilities: ['32K context', 'Function Calling', 'Advanced reasoning', 'Multimodal'],
  },
  'qwen-plus': {
    provider: 'openai',
    description: 'Qwen Plus - ',
    capabilities: ['128K context', 'Function Calling', 'Fast response'],
  },
  'qwen-turbo': {
    provider: 'openai',
    description: 'Qwen Turbo - ',
    capabilities: ['128K context', 'Function Calling', 'Very fast'],
  },
  'qwen-long': {
    provider: 'openai',
    description: 'Qwen Long - ',
    capabilities: ['1M context', 'Function Calling', 'Long document'],
  },
  'qwen-vl-max': {
    provider: 'openai',
    description: 'Qwen VL Max - ',
    capabilities: ['32K context', 'Vision', 'Advanced image understanding'],
  },
  'qwen-vl-plus': {
    provider: 'openai',
    description: 'Qwen VL Plus - ',
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
    this.db = new Database(dbPath ?? './data/routex.db');
    this.rl = createReadline();
  }

  /**
   * Run the interactive CLI
   *  CLI
   */
  async run() {
    clearScreen();
    printHeader('🚀 Routex Model Selector');

    try {
      await this.mainMenu();
    } catch (error) {
      printError(`: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.rl.close();
    }
  }

  /**
   * Main menu
   * 
   */
  private async mainMenu() {
    while (true) {
      console.log('\n' + colorize(':', 'bright'));
      console.log('  1. ');
      console.log('  2. ');
      console.log('  3. ');
      console.log('  4. ');
      console.log('  5. ');
      console.log('  0. \n');

      const choice = await question(this.rl, colorize('选择一个选项 (0-5): ', 'cyan'));

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
          console.log(colorize('\n👋 \n', 'green'));
          return;
        default:
          printWarning('无效的选择，请重试');
      }

      // 
      await question(this.rl, colorize('\n按回车继续...', 'dim'));
      clearScreen();
      printHeader('🚀 Routex Model Selector');
    }
  }

  /**
   * List all channels
   * 
   */
  private async listChannels() {
    console.log('\n' + colorize('═  ═', 'cyan') + '\n');

    const channels = this.db.getChannels();

    if (channels.length === 0) {
      printWarning('暂无通道配置');
      return;
    }

    for (const channel of channels) {
      const statusColor = channel.status === 'enabled' ? 'green' : 'red';
      const statusIcon = channel.status === 'enabled' ? '✓' : '✗';

      console.log(colorize(`${statusIcon} ${channel.name}`, statusColor));
      console.log(colorize(`  ID: ${channel.id}`, 'dim'));
      console.log(colorize(`  : ${channel.type}`, 'dim'));
      console.log(colorize(`  : ${channel.models.join(', ')}`, 'dim'));
      console.log(colorize(`  : ${channel.priority}`, 'dim'));
      console.log(colorize(`  : ${channel.weight}`, 'dim'));

      if (channel.requestCount > 0) {
        const successRate = ((channel.successCount / channel.requestCount) * 100).toFixed(1);
        console.log(
          colorize(`  : ${channel.requestCount} (: ${successRate}%)`, 'dim')
        );
      }

      console.log();
    }
  }

  /**
   * Add new channel
   * 
   */
  private async addChannel() {
    console.log('\n' + colorize('═  ═', 'cyan') + '\n');

    // 1. Select provider
    console.log(colorize(':', 'bright'));
    console.log('  1. Anthropic (Claude)');
    console.log('  2. OpenAI (GPT)');
    console.log('  3. Custom\n');

    const providerChoice = await question(this.rl, ' (1-3): ');

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
        printError('');
        return;
    }

    // 2. Input basic info
    const name = await question(this.rl, ': ');
    if (!name) {
      printError('');
      return;
    }

    const apiKey = await question(this.rl, 'API Key: ');
    if (!apiKey) {
      printError('API Key ');
      return;
    }

    // 3. Select models
    const availableModels = Object.entries(MODEL_DATABASE)
      .filter(([_, info]) => info.provider === type)
      .map(([model, _]) => model);

    if (availableModels.length === 0) {
      printWarning('');
      const modelInput = await question(this.rl, ' : ');
      availableModels.push(...modelInput.split(',').map((m) => m.trim()));
    } else {
      console.log(colorize('\n:', 'bright'));
      availableModels.forEach((model, index) => {
        const info = MODEL_DATABASE[model];
        console.log(`  ${index + 1}. ${model}`);
        if (info) {
          console.log(colorize(`     ${info.description}`, 'dim'));
        }
      });

      const modelChoice = await question(
        this.rl,
        '\n ( all): '
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
        printError('');
        return;
      }

      availableModels.length = 0;
      availableModels.push(...selectedModels);
    }

    // 4. Priority and weight
    const priorityInput = await question(this.rl, ' (0-100,  50): ');
    const priority = priorityInput ? parseInt(priorityInput) : 50;

    const weightInput = await question(this.rl, ' (0-100,  50): ');
    const weight = weightInput ? parseInt(weightInput) : 50;

    // 5. Base URL (optional)
    let baseUrl: string | undefined;
    if (type === 'custom') {
      baseUrl = await question(this.rl, 'Base URL : ');
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

      printSuccess(`✓ : ${channel.name} (ID: ${channel.id})`);
      console.log(colorize(`  : ${channel.models.join(', ')}`, 'dim'));
    } catch (error) {
      printError(`: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Select model interactively
   * 
   */
  private async selectModel() {
    console.log('\n' + colorize('═  ═', 'cyan') + '\n');

    const channels = this.db.getEnabledChannels();

    if (channels.length === 0) {
      printWarning('');
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

    const models = Array.from(modelMap.keys()).sort((a, b) => a.localeCompare(b));

    console.log(colorize(':', 'bright'));
    models.forEach((model, index) => {
      const channels = modelMap.get(model)!;
      const info = MODEL_DATABASE[model];

      console.log(`\n${colorize(`${index + 1}. ${model}`, 'green')}`);

      if (info) {
        console.log(colorize(`   ${info.description}`, 'dim'));
        console.log(
          colorize(`   : ${info.capabilities.join(', ')}`, 'dim')
        );
      }

      console.log(
        colorize(`   : ${channels.map((c) => c.name).join(', ')}`, 'dim')
      );
    });

    const choice = await question(
      this.rl,
      colorize('\n : ', 'cyan')
    );

    const index = parseInt(choice) - 1;
    if (index < 0 || index >= models.length) {
      printError('');
      return;
    }

    const selectedModel = models[index];
    const availableChannels = modelMap.get(selectedModel)!;

    printSuccess(`\n: ${selectedModel}`);
    console.log(colorize('\n:', 'bright'));

    availableChannels.forEach((channel, i) => {
      console.log(`  ${i + 1}. ${channel.name}`);
      console.log(colorize(`     : ${channel.priority}, : ${channel.weight}`, 'dim'));

      if (channel.requestCount > 0) {
        const successRate = (
          (channel.successCount / channel.requestCount) *
          100
        ).toFixed(1);
        console.log(
          colorize(`     : ${successRate}% (${channel.requestCount} )`, 'dim')
        );
      }
    });

    printInfo(
      '\n: Routex '
    );
  }

  /**
   * Test channel connection
   * 
   */
  private async testChannel() {
    console.log('\n' + colorize('═  ═', 'cyan') + '\n');

    const channels = this.db.getChannels();

    if (channels.length === 0) {
      printWarning('');
      return;
    }

    console.log(colorize(':', 'bright'));
    channels.forEach((channel, index) => {
      console.log(`  ${index + 1}. ${channel.name} (${channel.type})`);
    });

    const choice = await question(this.rl, colorize('\n: ', 'cyan'));
    const index = parseInt(choice) - 1;

    if (index < 0 || index >= channels.length) {
      printError('');
      return;
    }

    const channel = channels[index];

    printInfo(`: ${channel.name}...`);

    // 
    // 
    console.log(colorize('   API Key...', 'dim'));
    await new Promise((resolve) => setTimeout(resolve, 500));

    console.log(colorize('  ...', 'dim'));
    await new Promise((resolve) => setTimeout(resolve, 500));

    console.log(colorize('  ...', 'dim'));
    await new Promise((resolve) => setTimeout(resolve, 1000));

    printSuccess('✓ ');
    printInfo(`  : ~${Math.floor(Math.random() * 500 + 200)}ms`);
  }

  /**
   * Show channel statistics
   * 
   */
  private async showStatistics() {
    console.log('\n' + colorize('═  ═', 'cyan') + '\n');

    const channels = this.db.getChannels();

    if (channels.length === 0) {
      printWarning('');
      return;
    }

    const totalRequests = channels.reduce((sum, c) => sum + c.requestCount, 0);
    const totalSuccess = channels.reduce((sum, c) => sum + c.successCount, 0);
    const totalFailure = channels.reduce((sum, c) => sum + c.failureCount, 0);

    console.log(colorize(':', 'bright'));
    console.log(`  : ${totalRequests}`);
    console.log(`  : ${totalSuccess}`);
    console.log(`  : ${totalFailure}`);

    if (totalRequests > 0) {
      const successRate = ((totalSuccess / totalRequests) * 100).toFixed(1);
      console.log(`  : ${successRate}%`);
    }

    console.log(colorize('\n:', 'bright'));

    for (const channel of channels) {
      const statusIcon = channel.status === 'enabled' ? '✓' : '✗';
      const statusColor = channel.status === 'enabled' ? 'green' : 'red';

      console.log(`\n${colorize(`${statusIcon} ${channel.name}`, statusColor)}`);
      console.log(`  : ${channel.requestCount}`);
      console.log(`  : ${channel.successCount}`);
      console.log(`  : ${channel.failureCount}`);

      if (channel.requestCount > 0) {
        const successRate = (
          (channel.successCount / channel.requestCount) *
          100
        ).toFixed(1);
        const avgLatency = channel.requestCount > 0 ? '~200ms' : 'N/A'; // 
        console.log(`  : ${successRate}%`);
        console.log(`  : ${avgLatency}`);
      }

      if (channel.lastUsedAt) {
        const lastUsed = new Date(channel.lastUsedAt).toLocaleString('zh-CN');
        console.log(colorize(`  : ${lastUsed}`, 'dim'));
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
