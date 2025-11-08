/**
 * API Request and Response Body Types
 * Types for parsing API request/response bodies in proxy
 */

/**
 * Standard AI API request body structure
 */
export interface AIRequestBody {
  model?: string;
  messages?: Array<{
    role: string;
    content: string | unknown[];
  }>;
  system?: string;
  tools?: Array<{
    name: string;
    description?: string;
    input_schema?: Record<string, unknown>;
  }>;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  [key: string]: unknown;
}

/**
 * Standard AI API response body structure
 */
export interface AIResponseBody {
  id?: string;
  model?: string;
  choices?: unknown[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
  [key: string]: unknown;
}

/**
 * Type guard to check if a value is an AI request body
 */
export function isAIRequestBody(body: unknown): body is AIRequestBody {
  if (!body || typeof body !== 'object') {
    return false;
  }
  const obj = body as Record<string, unknown>;
  // At minimum, it should have model, messages, or system
  return (
    'model' in obj ||
    'messages' in obj ||
    'system' in obj ||
    'tools' in obj
  );
}

/**
 * Type guard to check if a value is an AI response body
 */
export function isAIResponseBody(body: unknown): body is AIResponseBody {
  if (!body || typeof body !== 'object') {
    return false;
  }
  const obj = body as Record<string, unknown>;
  // Typical response has id, model, choices, or usage
  return (
    'id' in obj ||
    'model' in obj ||
    'choices' in obj ||
    'usage' in obj ||
    'error' in obj
  );
}
