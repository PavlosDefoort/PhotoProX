import assert from "node:assert/strict";
import test from "node:test";
import { resolveUntrustedShowMeResponse } from "../src/features/show-me/createShowMePlan";
import { toEditPlanToolManifest } from "../src/features/show-me/providers";
import { OllamaEditPlanProvider } from "../src/features/show-me/providers/OllamaEditPlanProvider";
import { getPhotoProxToolManifest } from "../src/features/show-me/tools/photoProxToolRegistry";
import {
  parseVisualAnalysis,
  toPlannerVisualContext,
  VISUAL_ANALYSIS_VERSION,
} from "../src/features/show-me/visual-analysis";

const imageContext = {
  selectedLayerKind: "image" as const,
  availableAdjustmentToolIds: [],
};

const providerInput = {
  request: "resize to 50%",
  interactionMode: "edit-plan" as const,
  context: {
    ...imageContext,
    imageDimensions: { width: 1920, height: 1080 },
    currentAdjustmentValues: {},
    supportedToolIds: getPhotoProxToolManifest(imageContext).tools.map(
      (tool) => tool.id,
    ),
  },
  toolManifest: toEditPlanToolManifest(getPhotoProxToolManifest(imageContext)),
};

const visualAnalysisFixture = parseVisualAnalysis({
  version: VISUAL_ANALYSIS_VERSION,
  target: {
    scope: "selected-image-source",
    selectedLayerId: "layer-1",
    imageLayerIds: ["layer-1"],
    adjustmentLayerIds: [],
    editorRevision: "revision-1",
  },
  snapshot: {
    originalWidth: 1920,
    originalHeight: 1080,
    sampleWidth: 512,
    sampleHeight: 288,
    colorSpace: "srgb",
    alphaMode: "straight",
  },
  metrics: {
    luminance: {
      mean: 0.32,
      median: 0.3,
      p05: 0.05,
      p95: 0.72,
      shadowFraction: 0.35,
      midtoneFraction: 0.55,
      highlightFraction: 0.1,
    },
    clipping: {
      blackClippedFraction: 0.01,
      whiteClippedFraction: 0,
      nearBlackFraction: 0.08,
      nearWhiteFraction: 0.02,
    },
    contrast: {
      globalStdDev: 0.17,
      p95MinusP05: 0.28,
      flatnessScore: 0.68,
    },
    saturation: {
      mean: 0.2,
      median: 0.18,
      mutedFraction: 0.52,
      highSaturationFraction: 0.05,
    },
    colorBalance: {
      meanRed: 0.49,
      meanGreen: 0.44,
      meanBlue: 0.39,
      temperatureScore: 0.18,
      temperatureBias: "warm",
      tintScore: -0.06,
      tintBias: "neutral",
      dominantColors: [
        { hex: "#806040", share: 0.42 },
        { hex: "#504030", share: 0.27 },
      ],
    },
  },
  observations: [
    {
      code: "low-exposure",
      severity: "warning",
      confidence: 0.82,
      summary: "The image is globally dark.",
    },
    {
      code: "low-contrast",
      severity: "warning",
      confidence: 0.78,
      summary: "The tonal separation looks restrained or flat.",
    },
  ],
  limits: {
    missingCapabilities: ["No semantic scene understanding."],
    warnings: ["Source-image only; current adjustment stack is not analysed yet."],
  },
  provenance: {
    producer: "deterministic",
    runtime: "main-thread",
    durationMs: 3.2,
  },
});

const originalFetch = globalThis.fetch;

const mockFetch = (
  impl: (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => Promise<Response>,
) => {
  globalThis.fetch = impl as typeof fetch;
};

const restoreFetch = () => {
  globalThis.fetch = originalFetch;
};

const createJsonResponse = (body: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as Response;

test("accepts a valid local AI tool plan and resolves it through registry validation", async () => {
  mockFetch(async () =>
    createJsonResponse({
      message: {
        content: JSON.stringify({
          summary: "Resize with one supported tool.",
          mode: "edit-plan",
          steps: [
            {
              toolId: "image.scale.percent",
              parameters: { percent: 50 },
            },
          ],
        }),
      },
    }),
  );

  const provider = new OllamaEditPlanProvider({ timeoutMs: 3000 });
  const result = await provider.createPlan(providerInput);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const resolved = resolveUntrustedShowMeResponse(
    providerInput.request,
    result.response,
    imageContext,
  );
  assert.equal(resolved.ok, true);
});

test("rejects unknown tools after local AI output via registry boundary", async () => {
  mockFetch(async () =>
    createJsonResponse({
      message: {
        content: JSON.stringify({
          mode: "edit-plan",
          steps: [
            {
              toolId: "image.magically-enhance",
              parameters: {},
            },
          ],
        }),
      },
    }),
  );

  const provider = new OllamaEditPlanProvider({ timeoutMs: 3000 });
  const result = await provider.createPlan(providerInput);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const resolved = resolveUntrustedShowMeResponse(
    providerInput.request,
    result.response,
    imageContext,
  );
  assert.equal(resolved.ok, false);
  if (!resolved.ok) {
    assert.match(resolved.error, /Unknown PhotoProx tool/);
  }
});

test("rejects invalid parameters after local AI output via registry boundary", async () => {
  mockFetch(async () =>
    createJsonResponse({
      message: {
        content: JSON.stringify({
          mode: "edit-plan",
          steps: [
            {
              toolId: "image.scale.percent",
              parameters: { percent: 0 },
            },
          ],
        }),
      },
    }),
  );

  const provider = new OllamaEditPlanProvider({ timeoutMs: 3000 });
  const result = await provider.createPlan(providerInput);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const resolved = resolveUntrustedShowMeResponse(
    providerInput.request,
    result.response,
    imageContext,
  );
  assert.equal(resolved.ok, false);
  if (!resolved.ok) {
    assert.match(resolved.error, /Invalid parameters/);
  }
});

test("handles malformed JSON from local AI safely", async () => {
  mockFetch(async () =>
    createJsonResponse({
      message: {
        content: "{ this is not valid JSON",
      },
    }),
  );

  const provider = new OllamaEditPlanProvider({ timeoutMs: 3000 });
  const result = await provider.createPlan(providerInput);
  assert.deepEqual(result, {
    ok: false,
    reason: "invalid-response",
    error: "Local AI returned malformed JSON.",
    suggestDeterministic: true,
  });
});

test("rejects echo clarifications that only repeat the why-style request", async () => {
  mockFetch(async () =>
    createJsonResponse({
      message: {
        content: JSON.stringify({
          mode: "edit-plan",
          steps: [],
          clarification: {
            needed: true,
            question: "why is the color insentity strong",
          },
        }),
      },
    }),
  );

  const provider = new OllamaEditPlanProvider({ timeoutMs: 3000 });
  const result = await provider.createPlan({
    ...providerInput,
    request: "why is the color insentity strong",
  });
  assert.deepEqual(result, {
    ok: false,
    reason: "invalid-response",
    error: "Local AI returned a non-actionable clarification.",
    suggestDeterministic: true,
  });
});

test("recovers valid JSON when local AI wraps it in think tags and code fences", async () => {
  mockFetch(async () =>
    createJsonResponse({
      message: {
        content:
          '<think>reasoning</think>\n```json\n{"mode":"edit-plan","steps":[{"toolId":"image.scale.percent","parameters":{"percent":50}}]}\n```',
      },
    }),
  );

  const provider = new OllamaEditPlanProvider({ timeoutMs: 3000 });
  const result = await provider.createPlan(providerInput);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const resolved = resolveUntrustedShowMeResponse(
    providerInput.request,
    result.response,
    imageContext,
  );
  assert.equal(resolved.ok, true);
});

test("handles local AI timeout/unavailable service safely", async () => {
  mockFetch(
    async (_input: RequestInfo | URL, init?: RequestInit) =>
      await new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const abortError = Object.assign(new Error("aborted"), {
            name: "AbortError",
          });
          reject(abortError);
        });
      }),
  );

  const timeoutProvider = new OllamaEditPlanProvider({ timeoutMs: 10 });
  const timeoutResult = await timeoutProvider.createPlan(providerInput);
  assert.equal(timeoutResult.ok, false);
  if (!timeoutResult.ok) {
    assert.equal(timeoutResult.reason, "timeout");
  }

  mockFetch(async () => {
    throw new Error("connect ECONNREFUSED");
  });
  const unavailableProvider = new OllamaEditPlanProvider({ timeoutMs: 500 });
  const unavailableResult = await unavailableProvider.createPlan(providerInput);
  assert.equal(unavailableResult.ok, false);
  if (!unavailableResult.ok) {
    assert.equal(unavailableResult.reason, "unavailable");
  }
});

test("supports cancellation so stale requests can be ignored safely", async () => {
  mockFetch(
    async (_input: RequestInfo | URL, init?: RequestInit) =>
      await new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const abortError = Object.assign(new Error("aborted"), {
            name: "AbortError",
          });
          reject(abortError);
        });
      }),
  );

  const provider = new OllamaEditPlanProvider({ timeoutMs: 3000 });
  const controller = new AbortController();
  const pending = provider.createPlan(providerInput, { signal: controller.signal });
  controller.abort();
  const result = await pending;

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, "cancelled");
  }
});

test("supports analysis-answer responses for conversational visual questions", async () => {
  mockFetch(async () =>
    createJsonResponse({
      message: {
        content: JSON.stringify({
          mode: "analysis-answer",
          answer: "Yes — the local image audit suggests saturation is high.",
          confidence: "high",
          evidence: ["Saturation level: high.", "Mean saturation: 0.78."],
          limitations: ["Global audit only; no semantic scene understanding."],
          followUp: "Want an editable suggestion?",
        }),
      },
    }),
  );

  const provider = new OllamaEditPlanProvider({ timeoutMs: 3000 });
  const result = await provider.createPlan({
    ...providerInput,
    request: "is the saturation on this image high?",
    interactionMode: "analysis-answer",
    visualContext: toPlannerVisualContext(visualAnalysisFixture),
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const resolved = resolveUntrustedShowMeResponse(
    "is the saturation on this image high?",
    result.response,
    imageContext,
  );
  assert.equal(resolved.ok, true);
  if (resolved.ok) {
    assert.equal(resolved.resolved.mode, "analysis-answer");
    if (resolved.resolved.mode === "analysis-answer") {
      assert.match(resolved.resolved.answer.followUp || "", /editable suggestion/i);
    }
  }
});

test("rejects learn-answer mode in Ollama provider so trusted education stays deterministic", async () => {
  const provider = new OllamaEditPlanProvider({ timeoutMs: 3000 });
  const result = await provider.createPlan({
    ...providerInput,
    request: "what does contrast do?",
    interactionMode: "learn-answer",
  });

  assert.deepEqual(result, {
    ok: false,
    reason: "invalid-response",
    error: "Learning responses are served from the trusted Tool Registry.",
    suggestDeterministic: true,
  });
});

test("rejects generic capability replies for analysis-answer mode", async () => {
  mockFetch(async () =>
    createJsonResponse({
      message: {
        content: JSON.stringify({
          mode: "analysis-answer",
          answer:
            "I can answer questions about overall brightness, contrast, saturation, clipping risk, and colour balance when a fresh local Image Audit is available.",
          confidence: "low",
          evidence: ["General capability statement."],
          limitations: ["No fresh answer provided."],
        }),
      },
    }),
  );

  const provider = new OllamaEditPlanProvider({ timeoutMs: 3000 });
  const result = await provider.createPlan({
    ...providerInput,
    request: "is this image dark?",
    interactionMode: "analysis-answer",
    visualContext: toPlannerVisualContext(visualAnalysisFixture),
  });

  assert.deepEqual(result, {
    ok: false,
    reason: "invalid-response",
    error: "Local AI returned a non-grounded visual answer.",
    suggestDeterministic: true,
  });
});

test("rejects analysis-answer requests without fresh visual context", async () => {
  const provider = new OllamaEditPlanProvider({ timeoutMs: 3000 });
  const result = await provider.createPlan({
    ...providerInput,
    request: "is this image dark?",
    interactionMode: "analysis-answer",
    visualContext: undefined,
  });

  assert.deepEqual(result, {
    ok: false,
    reason: "invalid-response",
    error: "Local AI needs a fresh Image Audit for that visual question.",
    suggestDeterministic: true,
  });
});

test("includes fresh reduced visual context in the local AI request when provided", async () => {
  let capturedBody = "";
  mockFetch(async (_input, init) => {
    capturedBody = String(init?.body || "");
    return createJsonResponse({
      message: {
        content: JSON.stringify({
          steps: [{ toolId: "image.scale.percent", parameters: { percent: 50 } }],
          mode: "edit-plan",
        }),
      },
    });
  });

  const provider = new OllamaEditPlanProvider({ timeoutMs: 3000 });
  const result = await provider.createPlan({
    ...providerInput,
    visualContext: toPlannerVisualContext(visualAnalysisFixture),
  });

  assert.equal(result.ok, true);
  assert.match(capturedBody, /\\"visualContext\\":\{/);
  assert.match(capturedBody, /\\"responseStyle\\":null/);
  assert.match(capturedBody, /"format":\{/);
  assert.match(capturedBody, /"temperature":0/);
  assert.doesNotMatch(capturedBody, /data:image\//);
  assert.doesNotMatch(capturedBody, /sampleWidth|sampleHeight|imageLayerIds|selectedLayerId/);
});

test("includes analysis response style hints for Ollama visual questions", async () => {
  let capturedBody = "";
  mockFetch(async (_input, init) => {
    capturedBody = String(init?.body || "");
    return createJsonResponse({
      message: {
        content: JSON.stringify({
          mode: "analysis-answer",
          answer: "Yes — the local image audit suggests the image is globally dark.",
          confidence: "high",
          evidence: ["Exposure level: low.", "Mean luminance: 0.32."],
          limitations: ["Global audit only."],
        }),
      },
    });
  });

  const provider = new OllamaEditPlanProvider({ timeoutMs: 3000 });
  const result = await provider.createPlan({
    ...providerInput,
    request: "is this image dark?",
    interactionMode: "analysis-answer",
    visualContext: toPlannerVisualContext(visualAnalysisFixture),
  });

  assert.equal(result.ok, true);
  assert.match(capturedBody, /\\"interactionMode\\":\\"analysis-answer\\"/);
  assert.match(capturedBody, /\\"responseStyle\\":\{/);
  assert.match(capturedBody, /\\"questionForm\\":\\"binary\\"/);
  assert.match(capturedBody, /\\"primaryAxis\\":\\"exposure\\"/);
});

test("interpret mode returns a route without answering or executing", async () => {
  let capturedBody = "";
  mockFetch(async (_input, init) => {
    capturedBody = String(init?.body || "");
    return createJsonResponse({
      message: {
        content: JSON.stringify({
          mode: "interpret",
          route: "edit",
          confidence: "high",
          steps: [
            { toolId: "image.rotate.clockwise", parameters: { degrees: 33 } },
          ],
        }),
      },
    });
  });

  const provider = new OllamaEditPlanProvider({ timeoutMs: 3000 });
  const result = await provider.createPlan({
    ...providerInput,
    request: "turn it a third of the way around",
    interactionMode: "interpret",
    visualContext: undefined,
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.match(capturedBody, /\\"interactionMode\\":\\"interpret\\"/);
  assert.match(capturedBody, /"format":\{/);
  assert.deepEqual(result.response, {
    mode: "interpret",
    route: "edit",
    confidence: "high",
    steps: [{ toolId: "image.rotate.clockwise", parameters: { degrees: 33 } }],
  });
});

test.after(() => {
  restoreFetch();
});
