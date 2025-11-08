/**
 * 
 *  $VAR_NAME  ${VAR_NAME} 
 * : claude-code-router  cce-master
 */

/**
 * 
 * @param obj 
 * @returns 
 */
export function interpolateEnvVars<T>(obj: T): T {
  if (typeof obj === 'string') {
    return interpolateString(obj) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => interpolateEnvVars(item)) as T;
  }

  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = interpolateEnvVars(value);
    }
    return result as T;
  }

  return obj;
}

/**
 * 
 * :
 * - $VAR_NAME
 * - ${VAR_NAME}
 */
function interpolateString(str: string): string {
  //  ${VAR_NAME} 
  let result = str.replace(/\$\{([A-Z_][A-Z0-9_]*)\}/g, (_, varName) => {
    const value = process.env[varName];
    if (value === undefined) {
      console.warn(` :  ${varName} ,`);
      return `\${${varName}}`;
    }
    return value;
  });

  //  $VAR_NAME  
  result = result.replace(/\$([A-Z_][A-Z0-9_]*)(?![}\w])/g, (_, varName) => {
    const value = process.env[varName];
    if (value === undefined) {
      console.warn(` :  ${varName} ,`);
      return `$${varName}`;
    }
    return value;
  });

  return result;
}

/**
 * 
 * @param obj 
 * @returns 
 */
export function validateEnvVars(obj: unknown): string {
  const missing = new Set<string>;

  function check(value: unknown): void {
    if (typeof value === 'string') {
      //  ${VAR_NAME}
      const bracketMatches = value.matchAll(/\$\{([A-Z_][A-Z0-9_]*)\}/g);
      for (const match of bracketMatches) {
        if (process.env[match[1]] === undefined) {
          missing.add(match[1]);
        }
      }

      //  $VAR_NAME
      const simpleMatches = value.matchAll(/\$([A-Z_][A-Z0-9_]*)(?![}\w])/g);
      for (const match of simpleMatches) {
        if (process.env[match[1]] === undefined) {
          missing.add(match[1]);
        }
      }
    } else if (Array.isArray(value)) {
      value.forEach(check);
    } else if (value && typeof value === 'object') {
      Object.values(value).forEach(check);
    }
  }

  check(obj);
  return Array.from(missing).sort;
}

/**
 * 
 * @param obj 
 * @returns 
 */
export function extractEnvVars(obj: unknown): string {
  const vars = new Set<string>;

  function extract(value: unknown): void {
    if (typeof value === 'string') {
      //  ${VAR_NAME}
      const bracketMatches = value.matchAll(/\$\{([A-Z_][A-Z0-9_]*)\}/g);
      for (const match of bracketMatches) {
        vars.add(match[1]);
      }

      //  $VAR_NAME
      const simpleMatches = value.matchAll(/\$([A-Z_][A-Z0-9_]*)(?![}\w])/g);
      for (const match of simpleMatches) {
        vars.add(match[1]);
      }
    } else if (Array.isArray(value)) {
      value.forEach(extract);
    } else if (value && typeof value === 'object') {
      Object.values(value).forEach(extract);
    }
  }

  extract(obj);
  return Array.from(vars).sort;
}

/**
 * 
 * @param configObj 
 * @returns .env 
 */
export function generateEnvExample(configObj: unknown): string {
  const vars = extractEnvVars(configObj);
  if (vars.length === 0) {
    return '# \n';
  }

  const lines = [
    '# Routex ',
    '#  .env ',
    '',
  ];

  for (const varName of vars) {
    lines.push(`# ${varName}=${varName}_VALUE`);
    lines.push(`${varName}=`);
    lines.push('');
  }

  return lines.join('\n');
}
