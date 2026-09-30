/**
 * Inference & Model Strategy — Internal Types
 *
 * Re-exports shared types from types.ts and defines internal constants
 * for the inference routing subsystem.
 */

export type {
  SurvivalTier,
  ModelProvider,
  InferenceTaskType,
  ModelEntry,
  ModelPreference,
  RoutingMatrix,
  InferenceRequest,
  InferenceResult,
  InferenceCostRow,
  ModelRegistryRow,
  ModelStrategyConfig,
  ChatMessage,
} from "../types.js";

import type {
  RoutingMatrix,
  ModelEntry,
  ModelStrategyConfig,
} from "../types.js";

// === Default Retry Policy ===

export const DEFAULT_RETRY_POLICY = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
} as const;

// === Per-Task Timeout Overrides (ms) ===

export const TASK_TIMEOUTS: Record<string, number> = {
  heartbeat_triage: 15_000,
  safety_check: 30_000,
  summarization: 60_000,
  agent_turn: 120_000,
  planning: 120_000,
};

/// === Static Model Baseline ===
// Known models with realistic pricing (hundredths of cents per 1k tokens)

export const STATIC_MODEL_BASELINE: Omit<ModelEntry, "lastSeen" | "createdAt" | "updatedAt">[] = [
  {
    modelId: "anthropic/claude-3.5-sonnet:beta",
    provider: "anthropic",
    displayName: "Claude 3.5 Sonnet",
    tierMinimum: "normal",
    costPer1kInput: 30,    // $3.00/M
    costPer1kOutput: 150,  // $15.00/M
    maxTokens: 8192,
    contextWindow: 200000,
    supportsTools: true,
    supportsVision: true,
    parameterStyle: "max_tokens",
    enabled: true,
  },
  {
    modelId: "openai/gpt-4o",
    provider: "openai",
    displayName: "GPT-4o",
    tierMinimum: "normal",
    costPer1kInput: 25,    // $2.50/M
    costPer1kOutput: 100,  // $10.00/M
    maxTokens: 16384,
    contextWindow: 128000,
    supportsTools: true,
    supportsVision: true,
    parameterStyle: "max_completion_tokens",
    enabled: true,
  },
  {
    modelId: "openai/gpt-4o-mini",
    provider: "openai",
    displayName: "GPT-4o Mini",
    tierMinimum: "low_compute",
    costPer1kInput: 1,     // $0.15/M
    costPer1kOutput: 6,    // $0.60/M
    maxTokens: 16384,
    contextWindow: 128000,
    supportsTools: true,
    supportsVision: true,
    parameterStyle: "max_completion_tokens",
    enabled: true,
  },
  {
    modelId: "nvidia/nemotron-3-ultra-550b-a55b:free",
    provider: "omni",
    displayName: "Nemotron Ultra (Free)",
    tierMinimum: "normal",
    costPer1kInput: 0,
    costPer1kOutput: 0,
    maxTokens: 4096,
    contextWindow: 32000,
    supportsTools: true,
    supportsVision: false,
    parameterStyle: "max_tokens",
    enabled: true,
  },
  {
    modelId: "meta-llama/llama-3.1-8b-instruct:free",
    provider: "omni",
    displayName: "Llama 3.1 8B (Free)",
    tierMinimum: "critical",
    costPer1kInput: 0,
    costPer1kOutput: 0,
    maxTokens: 4096,
    contextWindow: 8192,
    supportsTools: true,
    supportsVision: false,
    parameterStyle: "max_tokens",
    enabled: true,
  },
  {
    modelId: "google/gemini-2.0-flash-exp:free",
    provider: "omni",
    displayName: "Gemini 2.0 Flash (Free)",
    tierMinimum: "low_compute",
    costPer1kInput: 0,
    costPer1kOutput: 0,
    maxTokens: 8192,
    contextWindow: 1048576,
    supportsTools: true,
    supportsVision: true,
    parameterStyle: "max_tokens",
    enabled: true,
  },
  {
    modelId: "deepseek/deepseek-chat",
    provider: "omni",
    displayName: "DeepSeek V3",
    tierMinimum: "normal",
    costPer1kInput: 1,     // $0.14/M
    costPer1kOutput: 3,    // $0.28/M
    maxTokens: 8192,
    contextWindow: 64000,
    supportsTools: true,
    supportsVision: false,
    parameterStyle: "max_tokens",
    enabled: true,
  },
  {
    modelId: "anthropic/claude-sonnet-5.5",
    provider: "anthropic",
    displayName: "Claude Sonnet 5.5",
    tierMinimum: "normal",
    costPer1kInput: 20,    // $2.00/M
    costPer1kOutput: 100,  // $10.00/M
    maxTokens: 16384,
    contextWindow: 1000000,
    supportsTools: true,
    supportsVision: true,
    parameterStyle: "max_tokens",
    enabled: true,
  },
  {
    modelId: "openai/gpt-6-sol-pro",
    provider: "openai",
    displayName: "GPT-6 Sol Pro",
    tierMinimum: "normal",
    costPer1kInput: 20,    // $2.00/M
    costPer1kOutput: 100,  // $10.00/M
    maxTokens: 32768,
    contextWindow: 1050000,
    supportsTools: true,
    supportsVision: true,
    parameterStyle: "max_completion_tokens",
    enabled: true,
  },
  {
    modelId: "deepseek/deepseek-v4.1-flash",
    provider: "omni",
    displayName: "DeepSeek V4.1 Flash",
    tierMinimum: "normal",
    costPer1kInput: 2,     // ~$0.02/M
    costPer1kOutput: 40,   // ~$0.40/M
    maxTokens: 8192,
    contextWindow: 1048576,
    supportsTools: true,
    supportsVision: true,
    parameterStyle: "max_tokens",
    enabled: true,
  },
  {
    modelId: "z-ai/glm-5.3-flash",
    provider: "omni",
    displayName: "GLM 5.3 Flash",
    tierMinimum: "low_compute",
    costPer1kInput: 2,     // $0.02/M
    costPer1kOutput: 25,   // $0.25/M
    maxTokens: 8192,
    contextWindow: 1048576,
    supportsTools: true,
    supportsVision: true,
    parameterStyle: "max_tokens",
    enabled: true,
  },
  {
    modelId: "openai/gpt-luna-latest",
    provider: "openai",
    displayName: "GPT Luna",
    tierMinimum: "low_compute",
    costPer1kInput: 1,     // $0.10/M
    costPer1kOutput: 5,    // $0.50/M
    maxTokens: 16384,
    contextWindow: 1050000,
    supportsTools: true,
    supportsVision: true,
    parameterStyle: "max_completion_tokens",
    enabled: true,
  }
];

// === Default Routing Matrix ===
// Maps (tier, taskType) -> ModelPreference with candidate models

export const DEFAULT_ROUTING_MATRIX: RoutingMatrix = {
  high: {
    agent_turn: { candidates: ["anthropic/claude-sonnet-5.5", "openai/gpt-6-sol-pro"], maxTokens: 8192, ceilingCents: -1 },
    heartbeat_triage: { candidates: ["openai/gpt-luna-latest", "z-ai/glm-5.3-flash"], maxTokens: 2048, ceilingCents: 5 },
    safety_check: { candidates: ["anthropic/claude-sonnet-5.5", "openai/gpt-6-sol-pro"], maxTokens: 4096, ceilingCents: 20 },
    summarization: { candidates: ["openai/gpt-6-sol-pro", "openai/gpt-luna-latest"], maxTokens: 4096, ceilingCents: 15 },
    planning: { candidates: ["anthropic/claude-sonnet-5.5", "openai/gpt-6-sol-pro"], maxTokens: 8192, ceilingCents: -1 },
  },
  normal: {
    agent_turn: { candidates: ["anthropic/claude-sonnet-5.5", "openai/gpt-luna-latest"], maxTokens: 4096, ceilingCents: -1 },
    heartbeat_triage: { candidates: ["openai/gpt-luna-latest", "z-ai/glm-5.3-flash"], maxTokens: 2048, ceilingCents: 5 },
    safety_check: { candidates: ["openai/gpt-6-sol-pro", "openai/gpt-luna-latest"], maxTokens: 4096, ceilingCents: 10 },
    summarization: { candidates: ["openai/gpt-6-sol-pro", "openai/gpt-luna-latest"], maxTokens: 4096, ceilingCents: 10 },
    planning: { candidates: ["anthropic/claude-sonnet-5.5", "openai/gpt-luna-latest"], maxTokens: 4096, ceilingCents: -1 },
  },
  low_compute: {
    agent_turn: { candidates: ["openai/gpt-luna-latest", "z-ai/glm-5.3-flash"], maxTokens: 4096, ceilingCents: 10 },
    heartbeat_triage: { candidates: ["z-ai/glm-5.3-flash"], maxTokens: 1024, ceilingCents: 2 },
    safety_check: { candidates: ["openai/gpt-luna-latest", "z-ai/glm-5.3-flash"], maxTokens: 2048, ceilingCents: 5 },
    summarization: { candidates: ["openai/gpt-luna-latest"], maxTokens: 2048, ceilingCents: 5 },
    planning: { candidates: ["openai/gpt-luna-latest"], maxTokens: 2048, ceilingCents: 5 },
  },
  critical: {
    agent_turn: { candidates: ["z-ai/glm-5.3-flash"], maxTokens: 2048, ceilingCents: 3 },
    heartbeat_triage: { candidates: ["z-ai/glm-5.3-flash"], maxTokens: 512, ceilingCents: 1 },
    safety_check: { candidates: ["z-ai/glm-5.3-flash"], maxTokens: 1024, ceilingCents: 2 },
    summarization: { candidates: [], maxTokens: 0, ceilingCents: 0 },
    planning: { candidates: [], maxTokens: 0, ceilingCents: 0 },
  },
  dead: {
    agent_turn: { candidates: [], maxTokens: 0, ceilingCents: 0 },
    heartbeat_triage: { candidates: [], maxTokens: 0, ceilingCents: 0 },
    safety_check: { candidates: [], maxTokens: 0, ceilingCents: 0 },
    summarization: { candidates: [], maxTokens: 0, ceilingCents: 0 },
    planning: { candidates: [], maxTokens: 0, ceilingCents: 0 },
  },
};

// === Default Model Strategy Config ===

export const DEFAULT_MODEL_STRATEGY_CONFIG: ModelStrategyConfig = {
  inferenceModel: "anthropic/claude-sonnet-5.5",
  lowComputeModel: "openai/gpt-luna-latest",
  criticalModel: "z-ai/glm-5.3-flash",
  maxTokensPerTurn: 4096,
  hourlyBudgetCents: 0,
  sessionBudgetCents: 0,
  perCallCeilingCents: 0,
  enableModelFallback: true,
  anthropicApiVersion: "2023-06-01",
};
