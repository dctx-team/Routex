/**
 * 代码质量分析器
 * 用于评估简洁UI设计的代码质量和架构改进
 */

interface ComponentMetrics {
  name: string;
  linesOfCode: number;
  cyclomaticComplexity: number;
  dependencies: number;
  propsCount: number;
  reusabilityScore: number;
  testCoverage?: number;
  maintainabilityIndex: number;
}

interface ArchitectureMetrics {
  componentCount: number;
  reusableComponents: number;
  couplingScore: number;
  cohesionScore: number;
  duplicateCode: number;
  technicalDebt: number;
}

interface QualityReport {
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  componentMetrics: ComponentMetrics[];
  architectureMetrics: ArchitectureMetrics;
  recommendations: string[];
  strengths: string[];
  improvements: string[];
}

/**
 * 代码质量分析器类
 */
export class CodeQualityAnalyzer {
  private components: Map<string, ComponentMetrics> = new Map();

  /**
   * 分析组件代码质量
   */
  async analyzeComponent(componentName: string, componentCode: string): Promise<ComponentMetrics> {
    const lines = componentCode.split('\n');
    const loc = lines.filter(line => line.trim() && !line.trim().startsWith('//')).length;

    // 计算圈复杂度（简化版本）
    const complexity = this.calculateCyclomaticComplexity(componentCode);

    // 计算依赖数量
    const dependencies = this.countDependencies(componentCode);

    // 计算Props数量（针对React组件）
    const propsCount = this.countProps(componentCode);

    // 计算可复用性评分
    const reusabilityScore = this.calculateReusabilityScore(componentCode, dependencies, propsCount);

    // 计算可维护性指数
    const maintainabilityIndex = this.calculateMaintainabilityIndex(loc, complexity, dependencies);

    const metrics: ComponentMetrics = {
      name: componentName,
      linesOfCode: loc,
      cyclomaticComplexity: complexity,
      dependencies,
      propsCount,
      reusabilityScore,
      maintainabilityIndex
    };

    this.components.set(componentName, metrics);
    return metrics;
  }

  /**
   * 计算圈复杂度
   */
  private calculateCyclomaticComplexity(code: string): number {
    const complexityKeywords = [
      'if', 'else', 'for', 'while', 'do', 'switch', 'case',
      'catch', '&&', '||', '?', 'throw', 'return'
    ];

    let complexity = 1; // 基础复杂度

    complexityKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = code.match(regex);
      if (matches) {
        complexity += matches.length;
      }
    });

    return complexity;
  }

  /**
   * 计算依赖数量
   */
  private countDependencies(code: string): number {
    const importRegex = /import\s+.*\s+from\s+['"][^'"]+['"]/g;
    const requireRegex = /require\s*\(['"][^'"]+['"]\)/g;

    const importMatches = code.match(importRegex) || [];
    const requireMatches = code.match(requireRegex) || [];

    return importMatches.length + requireMatches.length;
  }

  /**
   * 计算Props数量
   */
  private countProps(code: string): number {
    const interfaceMatch = code.match(/interface\s+\w+Props\s*{([^}]+)}/);
    if (!interfaceMatch) return 0;

    const propsContent = interfaceMatch[1];
    const propLines = propsContent.split('\n').filter(line =>
      line.trim() && line.includes(':') && !line.trim().startsWith('//')
    );

    return propLines.length;
  }

  /**
   * 计算可复用性评分
   */
  private calculateReusabilityScore(code: string, dependencies: number, propsCount: number): number {
    let score = 100;

    // 过多的外部依赖降低可复用性
    if (dependencies > 10) score -= 30;
    else if (dependencies > 5) score -= 15;

    // 过多的Props可能表示组件职责过多
    if (propsCount > 10) score -= 25;
    else if (propsCount > 7) score -= 10;

    // 检查是否使用了通用设计模式
    if (code.includes('children')) score += 10;
    if (code.includes('className')) score += 10;
    if (code.includes('style')) score += 5;

    // 检查是否包含硬编码值
    const hardCodedValues = code.match(/['"]\w+['"]/g) || [];
    if (hardCodedValues.length > 10) score -= 15;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 计算可维护性指数
   */
  private calculateMaintainabilityIndex(loc: number, complexity: number, dependencies: number): number {
    // 简化的可维护性指数计算
    const volume = loc * Math.log2(Math.max(loc, 1));
    const difficulty = complexity / 2;
    const effort = volume * difficulty;

    // 基于Microsoft的可维护性指数公式（简化版）
    let maintainability = 171 - 5.2 * Math.log(effort) - 0.23 * complexity - 16.2 * Math.log(loc);

    // 归一化到0-100范围
    maintainability = Math.max(0, Math.min(100, maintainability));

    return Math.round(maintainability);
  }

  /**
   * 分析整体架构质量
   */
  analyzeArchitecture(): ArchitectureMetrics {
    const componentArray = Array.from(this.components.values());

    // 计算组件数量
    const componentCount = componentArray.length;

    // 计算可复用组件数量（高可复用性评分的组件）
    const reusableComponents = componentArray.filter(c => c.reusabilityScore >= 80).length;

    // 计算耦合度评分
    const couplingScore = this.calculateCouplingScore(componentArray);

    // 计算内聚度评分
    const cohesionScore = this.calculateCohesionScore(componentArray);

    // 计算重复代码（简化版本）
    const duplicateCode = this.estimateDuplicateCode(componentArray);

    // 计算技术债务
    const technicalDebt = this.calculateTechnicalDebt(componentArray);

    return {
      componentCount,
      reusableComponents,
      couplingScore,
      cohesionScore,
      duplicateCode,
      technicalDebt
    };
  }

  /**
   * 计算耦合度评分
   */
  private calculateCouplingScore(components: ComponentMetrics[]): number {
    const avgDependencies = components.reduce((sum, c) => sum + c.dependencies, 0) / components.length;

    // 依赖越少，耦合度越低，评分越高
    if (avgDependencies <= 3) return 90;
    if (avgDependencies <= 5) return 75;
    if (avgDependencies <= 8) return 60;
    return 40;
  }

  /**
   * 计算内聚度评分
   */
  private calculateCohesionScore(components: ComponentMetrics[]): number {
    // 基于Props数量和复杂度评估内聚度
    const avgProps = components.reduce((sum, c) => sum + c.propsCount, 0) / components.length;
    const avgComplexity = components.reduce((sum, c) => sum + c.cyclomaticComplexity, 0) / components.length;

    let score = 100;
    if (avgProps > 8) score -= 20;
    if (avgProps > 12) score -= 20;
    if (avgComplexity > 10) score -= 20;
    if (avgComplexity > 15) score -= 20;

    return Math.max(0, score);
  }

  /**
   * 估算重复代码
   */
  private estimateDuplicateCode(components: ComponentMetrics[]): number {
    // 这里可以实现更复杂的代码相似度检测算法
    // 简化版本：基于组件大小的差异来估算
    const sizes = components.map(c => c.linesOfCode).sort((a, b) => a - b);
    const avgSize = sizes.reduce((sum, size) => sum + size, 0) / sizes.length;

    // 如果组件大小差异很小，可能存在重复代码
    const variance = sizes.reduce((sum, size) => sum + Math.pow(size - avgSize, 2), 0) / sizes.length;
    const standardDeviation = Math.sqrt(variance);

    // 标准差小说明组件大小相似，可能存在重复
    if (standardDeviation < avgSize * 0.2) return 30;
    if (standardDeviation < avgSize * 0.4) return 15;
    return 5;
  }

  /**
   * 计算技术债务
   */
  private calculateTechnicalDebt(components: ComponentMetrics[]): number {
    let debt = 0;

    components.forEach(component => {
      // 高复杂度增加技术债务
      if (component.cyclomaticComplexity > 15) debt += 20;
      else if (component.cyclomaticComplexity > 10) debt += 10;

      // 低可维护性增加技术债务
      if (component.maintainabilityIndex < 50) debt += 25;
      else if (component.maintainabilityIndex < 70) debt += 15;

      // 低可复用性增加技术债务
      if (component.reusabilityScore < 60) debt += 15;
    });

    return Math.min(100, debt);
  }

  /**
   * 生成质量报告
   */
  generateQualityReport(): QualityReport {
    const componentArray = Array.from(this.components.values());
    const architectureMetrics = this.analyzeArchitecture();

    // 计算总体评分
    const avgMaintainability = componentArray.reduce((sum, c) => sum + c.maintainabilityIndex, 0) / componentArray.length;
    const avgReusability = componentArray.reduce((sum, c) => sum + c.reusabilityScore, 0) / componentArray.length;
    const architectureScore = (architectureMetrics.cohesionScore + architectureMetrics.couplingScore) / 2;

    const overallScore = Math.round(
      (avgMaintainability * 0.4 + avgReusability * 0.3 + architectureScore * 0.3)
    );

    // 确定等级
    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (overallScore >= 90) grade = 'A';
    else if (overallScore >= 80) grade = 'B';
    else if (overallScore >= 70) grade = 'C';
    else if (overallScore >= 60) grade = 'D';
    else grade = 'F';

    // 生成建议
    const recommendations = this.generateRecommendations(componentArray, architectureMetrics);
    const strengths = this.identifyStrengths(componentArray, architectureMetrics);
    const improvements = this.identifyImprovements(componentArray, architectureMetrics);

    return {
      overallScore,
      grade,
      componentMetrics: componentArray,
      architectureMetrics,
      recommendations,
      strengths,
      improvements
    };
  }

  /**
   * 生成改进建议
   */
  private generateRecommendations(components: ComponentMetrics[], architecture: ArchitectureMetrics): string[] {
    const recommendations: string[] = [];

    // 基于组件质量生成建议
    const highComplexityComponents = components.filter(c => c.cyclomaticComplexity > 10);
    if (highComplexityComponents.length > 0) {
      recommendations.push(`考虑拆分${highComplexityComponents.length}个高复杂度组件，降低圈复杂度`);
    }

    const lowReusabilityComponents = components.filter(c => c.reusabilityScore < 70);
    if (lowReusabilityComponents.length > 0) {
      recommendations.push(`提高${lowReusabilityComponents.length}个组件的可复用性，减少硬编码和外部依赖`);
    }

    // 基于架构质量生成建议
    if (architecture.couplingScore < 70) {
      recommendations.push('降低组件间耦合度，考虑使用依赖注入或事件系统');
    }

    if (architecture.duplicateCode > 20) {
      recommendations.push('存在较多重复代码，考虑抽象公共组件或工具函数');
    }

    if (architecture.technicalDebt > 40) {
      recommendations.push('技术债务较高，建议安排重构计划');
    }

    if (recommendations.length === 0) {
      recommendations.push('代码质量良好，继续保持当前的开发标准');
    }

    return recommendations;
  }

  /**
   * 识别优势
   */
  private identifyStrengths(components: ComponentMetrics[], architecture: ArchitectureMetrics): string[] {
    const strengths: string[] = [];

    const highMaintainability = components.filter(c => c.maintainabilityIndex >= 80).length;
    if (highMaintainability > 0) {
      strengths.push(`${highMaintainability}个组件具有高可维护性`);
    }

    const highReusability = components.filter(c => c.reusabilityScore >= 80).length;
    if (highReusability > 0) {
      strengths.push(`${highReusability}个组件具有高可复用性`);
    }

    if (architecture.cohesionScore >= 80) {
      strengths.push('组件内聚度高，职责划分清晰');
    }

    if (architecture.couplingScore >= 80) {
      strengths.push('组件耦合度低，架构设计良好');
    }

    if (architecture.duplicateCode < 10) {
      strengths.push('重复代码少，代码复用率高');
    }

    return strengths;
  }

  /**
   * 识别改进点
   */
  private identifyImprovements(components: ComponentMetrics[], architecture: ArchitectureMetrics): string[] {
    const improvements: string[] = [];

    const lowMaintainability = components.filter(c => c.maintainabilityIndex < 60).length;
    if (lowMaintainability > 0) {
      improvements.push(`${lowMaintainability}个组件需要提高可维护性`);
    }

    const highComplexity = components.filter(c => c.cyclomaticComplexity > 10).length;
    if (highComplexity > 0) {
      improvements.push(`${highComplexity}个组件复杂度过高，需要简化`);
    }

    if (architecture.technicalDebt > 30) {
      improvements.push('需要处理技术债务，提升代码质量');
    }

    if (architecture.reusableComponents < components.length * 0.5) {
      improvements.push('可复用组件比例偏低，建议提高组件抽象程度');
    }

    return improvements;
  }

  /**
   * 重置分析器
   */
  reset(): void {
    this.components.clear();
  }
}

/**
 * 创建代码质量分析器实例
 */
export const createCodeQualityAnalyzer = (): CodeQualityAnalyzer => {
  return new CodeQualityAnalyzer();
};