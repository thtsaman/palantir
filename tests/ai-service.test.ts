import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  isAiConfigured,
  getAiConfig,
  analyzeOperationReport,
} from "@/lib/ai";

describe("Central Hugging Face AI Service", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("isAiConfigured returns false when HF_API_KEY or HF_MODEL is missing", () => {
    delete process.env.HF_API_KEY;
    delete process.env.HF_MODEL;
    expect(isAiConfigured()).toBe(false);

    process.env.HF_API_KEY = "hf_test_123";
    delete process.env.HF_MODEL;
    expect(isAiConfigured()).toBe(false);

    delete process.env.HF_API_KEY;
    process.env.HF_MODEL = "meta-llama/Llama-3.2-3B-Instruct";
    expect(isAiConfigured()).toBe(false);
  });

  it("isAiConfigured returns true when both HF_API_KEY and HF_MODEL are set", () => {
    process.env.HF_API_KEY = "hf_test_123";
    process.env.HF_MODEL = "meta-llama/Llama-3.2-3B-Instruct";
    expect(isAiConfigured()).toBe(true);
  });

  it("getAiConfig reads HF_API_KEY and HF_MODEL", () => {
    process.env.HF_API_KEY = "hf_test_key_abc";
    process.env.HF_MODEL = "Qwen/Qwen2.5-72B-Instruct";

    const cfg = getAiConfig();
    expect(cfg.apiKey).toBe("hf_test_key_abc");
    expect(cfg.model).toBe("Qwen/Qwen2.5-72B-Instruct");
    expect(cfg.enabled).toBe(true);
  });

  it("getAiConfig respects NEXT_PUBLIC_ENABLE_AI=false", () => {
    process.env.HF_API_KEY = "hf_test_key_abc";
    process.env.HF_MODEL = "Qwen/Qwen2.5-72B-Instruct";
    process.env.NEXT_PUBLIC_ENABLE_AI = "false";

    const cfg = getAiConfig();
    expect(cfg.enabled).toBe(false);
  });

  it("getAiConfig reads HF_API_KEY and HF_MODEL when present", () => {
    process.env.HF_API_KEY = "hf_valid_key";
    process.env.HF_MODEL = "meta-llama/Llama-3.2-3B-Instruct";

    const cfg = getAiConfig();
    expect(cfg.isConfigured).toBe(true);
    expect(cfg.apiKey).toBe("hf_valid_key");
    expect(cfg.model).toBe("meta-llama/Llama-3.2-3B-Instruct");
  });

  it("analyzeOperationReport uses fallback demo mode when HF credentials are missing", async () => {
    delete process.env.HF_API_KEY;
    delete process.env.HF_MODEL;

    const report = "Operation Alpha\nTerrain: Mountain\nDuration: 6 hours";
    const res = await analyzeOperationReport(report);

    expect(res.mode).toBe("demo");
    expect(res.result.title).toBeDefined();
    expect(res.result.terrain).toBe("MOUNTAIN");
  });
});
