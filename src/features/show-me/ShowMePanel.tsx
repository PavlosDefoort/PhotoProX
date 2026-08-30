import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  resolveUntrustedShowMeResponse,
  validateExecutableShowMePlan,
} from "@/features/show-me/createShowMePlan";
import { classifyShowMeIntent } from "@/features/show-me/classifyShowMeIntent";
import {
  resolveAssistantProviderId,
  resolveAssistantProvenance,
  shouldUseFallbackInterpreter,
} from "@/features/show-me/assistantRouting";
import { parseInterpretResult } from "@/features/show-me/interpretFallback";
import { getEditPlanProvider, toEditPlanToolManifest } from "@/features/show-me/providers";
import { ShowMeInteractionMode } from "@/features/show-me/providers/types";
import {
  readAssistantProviderMode,
  type AssistantProviderMode,
} from "@/features/show-me/assistantPreferences";
import {
  buildVisualAnalysisSummary,
  formatMetric,
  formatPlannerObservationLabel,
  formatPercentage,
  getFreshPlannerVisualContext,
  PlannerVisualContext,
  VISUAL_ANALYSIS_MAX_SNAPSHOT_EDGE,
  VisualAnalysis,
} from "@/features/show-me/visual-analysis";
import { createSelectedImageAnalysisRunner } from "@/features/show-me/visual-analysis/executor";
import {
  getZynaloTool,
  getZynaloToolManifest,
} from "@/features/show-me/tools/zynaloToolRegistry";
import { ZynaloToolId } from "@/features/show-me/tools/types";
import {
  AssistantResponse,
  ShowMeAnalysisAnswer,
  ShowMeClarification,
  ShowMeLearningAnswer,
  ShowMePlan,
} from "@/features/show-me/types";
import { useImageTransformActions } from "@/hooks/useImageTransformActions";
import { useProject } from "@/hooks/useProject";
import { cn } from "@/lib/utils";
import { getAdjustmentsForImage } from "@/models/editor/AdjustmentTargets";
import { findLayer } from "@/models/project/LayerManager";
import {
  BrightnessAdjustmentLayer,
  SaturationAdjustmentLayer,
} from "@/models/project/Layers/AdjustmentLayer";
import { AdjustmentLayer, ImageLayer } from "@/models/project/Layers/Layers";
import {
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  MessageSquare,
  PanelRightClose,
  PanelRightOpen,
  Send,
  Sparkles,
  User2,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

const HIGHLIGHT_CLASSES = [
  "ring-2",
  "ring-amber-400",
  "ring-offset-2",
  "ring-offset-navbarBackground",
];

const EXAMPLE_PROMPTS = [
  "Make this brighter",
  "Rotate 90° and resize",
  "Make colours more vivid",
];

type ConversationEntry =
  | {
      id: string;
      role: "user";
      text: string;
    }
  | {
      id: string;
      role: "assistant";
      text: string;
      tone?: "default" | "success" | "error";
    };

const buildAssistantSummary = (plan: ShowMePlan) => {
  const toolNames = Array.from(
    new Set(
      plan.steps.map((step) => getZynaloTool(step.toolId).displayName),
    ),
  );
  return `I can guide you with ${toolNames.join(
    ", ",
  )} using real Zynalo controls.`;
};

const getStepStatus = (
  stepIndex: number,
  currentStep: number,
  guideActive: boolean,
  planCompleted: boolean,
) => {
  if (planCompleted) return "completed";
  if (!guideActive) return "pending";
  if (stepIndex < currentStep) return "completed";
  if (stepIndex === currentStep) return "active";
  return "pending";
};

const statusBadgeVariant = {
  pending: "outline",
  active: "secondary",
  completed: "default",
} as const;

const statusLabel = {
  pending: "Pending",
  active: "Active",
  completed: "Completed",
} as const;

const statusIcon = {
  pending: CircleDashed,
  active: Sparkles,
  completed: CheckCircle2,
} as const;

type ImageAuditStatus =
  | "idle"
  | "loading"
  | "ready"
  | "stale"
  | "failed"
  | "unavailable";

interface ImageAuditViewState {
  status: ImageAuditStatus;
  analysis: VisualAnalysis | null;
  error?: string;
}

interface PlanAuditBadgeState {
  visualContext: PlannerVisualContext;
}

interface AnalysisAnswerViewState {
  answer: ShowMeAnalysisAnswer;
  visualContext: PlannerVisualContext | null;
}

interface LearningAnswerViewState {
  answer: ShowMeLearningAnswer;
}

interface ClarificationViewState {
  clarification: ShowMeClarification;
}

const isQuestionStyleRequest = (request: string) =>
  /^\s*(is|are|does|do|why|what|how)\b/i.test(request.trim());

const hashString = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
};

const buildImageAuditRevision = (
  layerId: string,
  imageSource: string,
  width: number,
  height: number,
) => `selected-image-source:${layerId}:${width}x${height}:${hashString(imageSource)}`;

interface AssistantContentProps {
  analysisAnswer: AnalysisAnswerViewState | null;
  clarification: ClarificationViewState | null;
  assistantProvenance: string;
  imageAudit: ImageAuditViewState;
  imageAuditSummary: string | null;
  imageAuditTargetLabel: string | null;
  learningAnswer: LearningAnswerViewState | null;
  planAuditBadge: PlanAuditBadgeState | null;
  conversation: ConversationEntry[];
  currentStep: number;
  draftRequest: string;
  guideActive: boolean;
  isPlanning: boolean;
  message: string;
  onApplyPlan: () => void;
  onAnalyzeSelectedImage: () => void;
  onChangeRequest: (value: string) => void;
  onExamplePrompt: (value: string) => void;
  onExitGuide: () => void;
  onNextStep: () => void;
  onPreviousStep: () => void;
  onRetryWithBuiltIn: (() => void) | null;
  onShowGuide: () => void;
  onSubmit: (event: FormEvent) => void;
  plan: ShowMePlan | null;
  planCompleted: boolean;
}

const AssistantContent: React.FC<AssistantContentProps> = ({
  analysisAnswer,
  clarification,
  assistantProvenance,
  imageAudit,
  imageAuditSummary,
  imageAuditTargetLabel,
  learningAnswer,
  planAuditBadge,
  conversation,
  currentStep,
  draftRequest,
  guideActive,
  isPlanning,
  message,
  onApplyPlan,
  onAnalyzeSelectedImage,
  onChangeRequest,
  onExamplePrompt,
  onExitGuide,
  onNextStep,
  onPreviousStep,
  onRetryWithBuiltIn,
  onShowGuide,
  onSubmit,
  plan,
  planCompleted,
}) => {
  const activeStep = plan?.steps[currentStep] ?? null;
  const auditActionLabel =
    imageAudit.status === "stale" || imageAudit.status === "failed"
      ? "Re-analyze selected image"
      : "Analyze selected image";
  const planAuditObservationLabels = planAuditBadge
    ? formatPlannerObservationLabel(planAuditBadge.visualContext)
    : [];
  const analysisAnswerObservationLabels = analysisAnswer?.visualContext
    ? formatPlannerObservationLabel(analysisAnswer.visualContext)
    : [];

  return (
    <div className="flex h-full min-h-0 select-text flex-col bg-navbarBackground text-black dark:text-white">
      <div className="border-b border-gray-500 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/15 text-blue-500">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Zynalo Assistant</h2>
            <p className="text-xs text-muted-foreground">
              I answer, explain, and plan edits with real Zynalo tools.
            </p>
          </div>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex select-text flex-col gap-4 px-4 py-4">
          {conversation.length === 0 && !plan && !analysisAnswer && !learningAnswer && !clarification && (
            <Card className="border-dashed bg-transparent shadow-none">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base">Start with a real edit or question</CardTitle>
                <CardDescription>
                  Ask for an edit, a grounded image analysis, or a tool explanation.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_PROMPTS.map((prompt) => (
                    <Button
                      key={prompt}
                      className="h-auto whitespace-normal text-left"
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={() => onExamplePrompt(prompt)}
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-gray-500/80 bg-background/80">
            <CardHeader className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Image Audit</CardTitle>
                  <CardDescription className="mt-1">
                    Local-only tonal and colour analysis for the selected image source.
                  </CardDescription>
                </div>
                <Badge variant="outline">Local</Badge>
              </div>
              {imageAuditTargetLabel && (
                <p className="text-xs text-muted-foreground">
                  Target: {imageAuditTargetLabel}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              {imageAudit.status === "unavailable" && (
                <div className="rounded-lg border border-dashed border-gray-500/60 px-3 py-3 text-sm text-muted-foreground">
                  Select an image layer to run a local audit.
                </div>
              )}

              {imageAudit.status === "idle" && (
                <div className="rounded-lg border border-dashed border-gray-500/60 px-3 py-3 text-sm text-muted-foreground">
                  Analyze the selected image to inspect exposure, contrast, colour balance, clipping risk, and dominant colours.
                </div>
              )}

              {imageAudit.status === "loading" && (
                <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-3 text-sm">
                  Analyzing the selected image locally from a capped snapshot...
                </div>
              )}

              {imageAudit.status === "failed" && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-3 text-sm">
                  {imageAudit.error || "Image analysis failed."}
                </div>
              )}

              {imageAudit.status === "stale" && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm">
                  The last audit no longer matches the current selected image. Re-run the local audit for fresh results.
                </div>
              )}

              {imageAuditSummary && (
                <div className="rounded-lg border border-gray-500/60 bg-background/70 px-3 py-3 text-sm">
                  {imageAuditSummary}
                </div>
              )}

              {imageAudit.analysis && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {imageAudit.analysis.observations.length > 0 ? (
                      imageAudit.analysis.observations.map((observation) => (
                        <Badge key={observation.code} variant="secondary">
                          {observation.summary}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="outline">No strong deterministic warnings</Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {imageAudit.analysis.metrics.colorBalance.dominantColors.map(
                      (color) => (
                        <div
                          key={color.hex}
                          className="flex items-center gap-2 rounded-full border border-gray-500/50 px-2 py-1 text-xs"
                        >
                          <span
                            className="h-3 w-3 rounded-full border border-black/10"
                            style={{ backgroundColor: color.hex }}
                          />
                          <span>{color.hex}</span>
                          <span className="text-muted-foreground">
                            {formatPercentage(color.share)}
                          </span>
                        </div>
                      ),
                    )}
                  </div>

                  <details className="rounded-lg border border-gray-500/60 bg-background/40 px-3 py-3">
                    <summary className="cursor-pointer list-none text-sm font-medium">
                      Exact metrics
                    </summary>
                    <div className="mt-3 space-y-3 text-xs text-muted-foreground">
                      <div className="grid grid-cols-2 gap-2">
                        <div>Snapshot</div>
                        <div>
                          {imageAudit.analysis.snapshot.sampleWidth}×
                          {imageAudit.analysis.snapshot.sampleHeight} from{" "}
                          {imageAudit.analysis.snapshot.originalWidth}×
                          {imageAudit.analysis.snapshot.originalHeight}
                        </div>
                        <div>Mean luminance</div>
                        <div>{formatMetric(imageAudit.analysis.metrics.luminance.mean)}</div>
                        <div>Median luminance</div>
                        <div>{formatMetric(imageAudit.analysis.metrics.luminance.median)}</div>
                        <div>5th–95th percentile</div>
                        <div>
                          {formatMetric(imageAudit.analysis.metrics.luminance.p05)} -{" "}
                          {formatMetric(imageAudit.analysis.metrics.luminance.p95)}
                        </div>
                        <div>Shadow / midtone / highlight</div>
                        <div>
                          {formatPercentage(
                            imageAudit.analysis.metrics.luminance.shadowFraction,
                          )}{" "}
                          /{" "}
                          {formatPercentage(
                            imageAudit.analysis.metrics.luminance.midtoneFraction,
                          )}{" "}
                          /{" "}
                          {formatPercentage(
                            imageAudit.analysis.metrics.luminance.highlightFraction,
                          )}
                        </div>
                        <div>Near black / clipped black</div>
                        <div>
                          {formatPercentage(
                            imageAudit.analysis.metrics.clipping.nearBlackFraction,
                          )}{" "}
                          /{" "}
                          {formatPercentage(
                            imageAudit.analysis.metrics.clipping.blackClippedFraction,
                          )}
                        </div>
                        <div>Near white / clipped white</div>
                        <div>
                          {formatPercentage(
                            imageAudit.analysis.metrics.clipping.nearWhiteFraction,
                          )}{" "}
                          /{" "}
                          {formatPercentage(
                            imageAudit.analysis.metrics.clipping.whiteClippedFraction,
                          )}
                        </div>
                        <div>Contrast std dev</div>
                        <div>
                          {formatMetric(imageAudit.analysis.metrics.contrast.globalStdDev)}
                        </div>
                        <div>Contrast range</div>
                        <div>
                          {formatMetric(imageAudit.analysis.metrics.contrast.p95MinusP05)}
                        </div>
                        <div>Flatness score</div>
                        <div>
                          {formatMetric(imageAudit.analysis.metrics.contrast.flatnessScore)}
                        </div>
                        <div>Mean / median saturation</div>
                        <div>
                          {formatMetric(imageAudit.analysis.metrics.saturation.mean)} /{" "}
                          {formatMetric(imageAudit.analysis.metrics.saturation.median)}
                        </div>
                        <div>Muted / high saturation</div>
                        <div>
                          {formatPercentage(
                            imageAudit.analysis.metrics.saturation.mutedFraction,
                          )}{" "}
                          /{" "}
                          {formatPercentage(
                            imageAudit.analysis.metrics.saturation
                              .highSaturationFraction,
                          )}
                        </div>
                        <div>Warmth / tint</div>
                        <div>
                          {imageAudit.analysis.metrics.colorBalance.temperatureBias} (
                          {formatMetric(
                            imageAudit.analysis.metrics.colorBalance.temperatureScore,
                          )}
                          ) / {imageAudit.analysis.metrics.colorBalance.tintBias} (
                          {formatMetric(
                            imageAudit.analysis.metrics.colorBalance.tintScore,
                          )}
                          )
                        </div>
                        <div>Mean RGB</div>
                        <div>
                          {formatMetric(imageAudit.analysis.metrics.colorBalance.meanRed)} /{" "}
                          {formatMetric(
                            imageAudit.analysis.metrics.colorBalance.meanGreen,
                          )}{" "}
                          /{" "}
                          {formatMetric(imageAudit.analysis.metrics.colorBalance.meanBlue)}
                        </div>
                        <div>Runtime</div>
                        <div>
                          {imageAudit.analysis.provenance.runtime},{" "}
                          {imageAudit.analysis.provenance.durationMs} ms
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Limits</p>
                        <ul className="mt-1 list-disc pl-4">
                          {imageAudit.analysis.limits.missingCapabilities.map((limit) => (
                            <li key={limit}>{limit}</li>
                          ))}
                          {imageAudit.analysis.limits.warnings.map((warning) => (
                            <li key={warning}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </details>
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={onAnalyzeSelectedImage}
                disabled={
                  imageAudit.status === "loading" || imageAudit.status === "unavailable"
                }
              >
                {imageAudit.status === "loading" ? "Analyzing..." : auditActionLabel}
              </Button>
            </CardContent>
          </Card>

          {conversation.map((entry) => (
            <div
              key={entry.id}
              className={cn(
                "flex w-full",
                entry.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "flex max-w-[90%] gap-3 rounded-2xl px-4 py-3 shadow-sm",
                  entry.role === "user"
                    ? "bg-blue-500 text-white"
                    : entry.tone === "success"
                      ? "border border-emerald-500/30 bg-emerald-500/10"
                      : entry.tone === "error"
                        ? "border border-red-500/30 bg-red-500/10"
                        : "border border-gray-500/60 bg-background/70",
                )}
              >
                <div className="mt-0.5">
                  {entry.role === "user" ? (
                    <User2 className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <p className="select-text text-sm leading-6">{entry.text}</p>
              </div>
            </div>
          ))}

          {analysisAnswer && (
            <Card className="border-gray-500/80 bg-background/80">
              <CardHeader className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">Image analysis answer</CardTitle>
                    <CardDescription className="mt-1">
                      Grounded in local deterministic audit data when available.
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="outline">{assistantProvenance}</Badge>
                    <Badge variant="outline">
                      {analysisAnswer.answer.confidence
                        ? `${analysisAnswer.answer.confidence} confidence`
                        : "Audit answer"}
                    </Badge>
                  </div>
                </div>

                {analysisAnswer.visualContext && (
                  <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs">
                    <p className="font-medium text-blue-700 dark:text-blue-200">
                      Answer informed by local Image Audit
                    </p>
                    {analysisAnswerObservationLabels.length > 0 && (
                      <p className="mt-1 text-muted-foreground">
                        Using local observations:{" "}
                        {analysisAnswerObservationLabels.slice(0, 3).join(", ")}.
                      </p>
                    )}
                  </div>
                )}
              </CardHeader>

              <CardContent className="space-y-3 p-4 pt-0">
                <p className="text-sm leading-6">{analysisAnswer.answer.answer}</p>

                {analysisAnswer.answer.followUp && (
                  <p className="text-xs text-muted-foreground">
                    {analysisAnswer.answer.followUp}
                  </p>
                )}

                {analysisAnswer.answer.evidence.length > 0 && (
                  <div className="space-y-2 rounded-lg border border-gray-500/50 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Evidence
                    </p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {analysisAnswer.answer.evidence.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysisAnswer.answer.limitations.length > 0 && (
                  <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-200">
                      Limitations
                    </p>
                    <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-200">
                      {analysisAnswer.answer.limitations.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {learningAnswer && (
            <Card className="border-emerald-500/40 bg-background/80">
              <CardHeader className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">Tool explanation</CardTitle>
                    <CardDescription className="mt-1">
                      Trusted guidance from the Zynalo Tool Registry.
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="outline">{assistantProvenance}</Badge>
                    <Badge variant="outline">Learn</Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 p-4 pt-0">
                <p className="text-sm leading-6">{learningAnswer.answer.answer}</p>
                {learningAnswer.answer.bullets.length > 0 && (
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {learningAnswer.answer.bullets.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                )}
                {learningAnswer.answer.relatedTools.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {learningAnswer.answer.relatedTools.map((toolId) => (
                      <Badge key={toolId} variant="outline">
                        {getZynaloTool(toolId).displayName}
                      </Badge>
                    ))}
                  </div>
                )}
                {learningAnswer.answer.followUp && (
                  <p className="text-xs text-muted-foreground">
                    {learningAnswer.answer.followUp}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {clarification && (
            <Card className="border-amber-500/40 bg-background/80">
              <CardHeader className="space-y-2 p-4">
                <CardTitle className="text-base">Need one clarification</CardTitle>
                <CardDescription>
                  I want to avoid guessing whether you want an explanation or an edit.
                </CardDescription>
                <Badge variant="outline" className="w-fit">
                  {assistantProvenance}
                </Badge>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-sm leading-6">{clarification.clarification.question}</p>
              </CardContent>
            </Card>
          )}

          {plan && (
            <Card className="border-gray-500/80 bg-background/80">
              <CardHeader className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">Planned edit</CardTitle>
                    <CardDescription className="mt-1">
                      {plan.steps.length} step{plan.steps.length === 1 ? "" : "s"}{" "}
                      using real Zynalo tools.
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="outline">{assistantProvenance}</Badge>
                    <Badge
                      variant={planCompleted ? "default" : guideActive ? "secondary" : "outline"}
                    >
                      {planCompleted
                        ? "Completed"
                        : guideActive
                          ? `Step ${currentStep + 1} active`
                          : "Ready"}
                    </Badge>
                  </div>
                </div>

                {planAuditBadge && (
                  <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs">
                    <p className="font-medium text-blue-700 dark:text-blue-200">
                      Plan informed by local Image Audit
                    </p>
                    {planAuditObservationLabels.length > 0 && (
                      <p className="mt-1 text-muted-foreground">
                        Using local observations:{" "}
                        {planAuditObservationLabels.slice(0, 3).join(", ")}.
                      </p>
                    )}
                  </div>
                )}

                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-200">
                  {guideActive
                    ? "The matching Zynalo control is highlighted in the editor."
                    : planCompleted
                      ? "The plan was applied with the real Zynalo controls and remains undoable."
                      : "Use Show me to walk through the real controls, or Do it for me to apply the same validated plan."}
                </div>
              </CardHeader>

              <CardContent className="space-y-3 p-4 pt-0">
                {plan.steps.map((step, stepIndex) => {
                  const tool = getZynaloTool(step.toolId as ZynaloToolId);
                  const status = getStepStatus(
                    stepIndex,
                    currentStep,
                    guideActive,
                    planCompleted,
                  );
                  const Icon = statusIcon[status];

                  return (
                    <div
                      key={step.id}
                      className={cn(
                        "rounded-xl border px-3 py-3 transition-colors",
                        status === "active"
                          ? "border-blue-500/50 bg-blue-500/10"
                          : status === "completed"
                            ? "border-emerald-500/30 bg-emerald-500/10"
                            : "border-gray-500/50 bg-transparent",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                            status === "active"
                              ? "bg-blue-500 text-white"
                              : status === "completed"
                                ? "bg-emerald-500 text-white"
                                : "bg-muted text-muted-foreground",
                          )}
                        >
                          {stepIndex + 1}
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium">{step.title}</p>
                            <Badge variant="outline">{tool.displayName}</Badge>
                            <Badge variant={statusBadgeVariant[status]}>
                              <Icon className="mr-1 h-3 w-3" />
                              {statusLabel[status]}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {step.explanation}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>

              <div className="flex flex-wrap gap-2 border-t border-gray-500/60 p-4">
                {!guideActive && !planCompleted && (
                  <Button type="button" variant="outline" onClick={onShowGuide}>
                    Show me
                  </Button>
                )}
                {!planCompleted && (
                  <Button type="button" onClick={onApplyPlan}>
                    Do it for me
                  </Button>
                )}
                {guideActive && (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={onPreviousStep}
                      disabled={currentStep === 0}
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={onNextStep}
                      disabled={!plan || currentStep >= plan.steps.length - 1}
                    >
                      Next
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={onExitGuide}>
                      Exit guide
                    </Button>
                  </>
                )}
              </div>
            </Card>
          )}

          {message && (
            <div className="rounded-xl border border-gray-500/60 bg-background/70 px-4 py-3 text-sm">
              {message}
            </div>
          )}

          {!plan && conversation.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Ask another edit request to continue the conversation.
            </p>
          )}

          {planCompleted && activeStep && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm">
              Completed: {activeStep.title}. The change remains editable and undoable.
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-gray-500 px-4 py-4 pb-6">
        <form className="space-y-3" onSubmit={onSubmit}>
          <p className="text-xs text-muted-foreground">
            Runs locally on this device.
          </p>
          <Input
            aria-label="Ask Zynalo how to edit"
            placeholder="Ask Zynalo how to edit..."
            value={draftRequest}
            onChange={(event) => onChangeRequest(event.target.value)}
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Press Enter to send.
            </p>
            <Button type="submit" disabled={!draftRequest.trim()}>
              <Send className="mr-2 h-4 w-4" />
              {isPlanning ? "Planning..." : "Send"}
            </Button>
          </div>
          {onRetryWithBuiltIn && (
            <Button type="button" variant="outline" onClick={onRetryWithBuiltIn}>
              Retry with built-in planner
            </Button>
          )}
        </form>
      </div>
    </div>
  );
};

const ShowMePanel = () => {
  const [draftRequest, setDraftRequest] = useState("");
  const [plan, setPlan] = useState<ShowMePlan | null>(null);
  const [analysisAnswer, setAnalysisAnswer] =
    useState<AnalysisAnswerViewState | null>(null);
  const [learningAnswer, setLearningAnswer] =
    useState<LearningAnswerViewState | null>(null);
  const [clarification, setClarification] =
    useState<ClarificationViewState | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [message, setMessage] = useState("");
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [guideActive, setGuideActive] = useState(false);
  const [planCompleted, setPlanCompleted] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);
  const [assistantProviderMode, setAssistantProviderMode] =
    useState<AssistantProviderMode>("auto");
  const [imageAudit, setImageAudit] = useState<ImageAuditViewState>({
    status: "unavailable",
    analysis: null,
  });
  const [assistantProvenance, setAssistantProvenance] = useState("Needs clarification");
  const [planAuditBadge, setPlanAuditBadge] = useState<PlanAuditBadgeState | null>(
    null,
  );
  const [retryBuiltInRequest, setRetryBuiltInRequest] = useState<string | null>(
    null,
  );
  const entryId = useRef(0);
  const planningRequestCounter = useRef(0);
  const activePlanningController = useRef<AbortController | null>(null);
  const imageAnalysisRunnerRef = useRef(createSelectedImageAnalysisRunner());
  const { editMode, layerManager, setEditMode } = useProject();
  const { dispatchSelectedImageActions } = useImageTransformActions();

  useEffect(() => {
    setAssistantProviderMode(readAssistantProviderMode());
    const handleStorage = () => {
      setAssistantProviderMode(readAssistantProviderMode());
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const selectedLayer = findLayer(
    layerManager.layers,
    layerManager.target,
  );
  const selectedLayerKind =
    selectedLayer instanceof ImageLayer
      ? ("image" as const)
      : selectedLayer instanceof BrightnessAdjustmentLayer
        ? ("brightness-adjustment" as const)
        : selectedLayer instanceof SaturationAdjustmentLayer
          ? ("saturation-adjustment" as const)
          : selectedLayer
            ? ("other" as const)
            : ("none" as const);
  const availableAdjustmentToolIds: ZynaloToolId[] = useMemo(
    () =>
      selectedLayer instanceof ImageLayer
        ? getAdjustmentsForImage(
            selectedLayer,
            layerManager.layers,
          ).flatMap((adjustment) =>
            adjustment instanceof BrightnessAdjustmentLayer
              ? [
                  "adjustment.brightness" as const,
                  "adjustment.contrast" as const,
                ]
              : adjustment instanceof SaturationAdjustmentLayer
                ? ["adjustment.saturation" as const]
                : [],
          )
        : [],
    [layerManager.layers, selectedLayer],
  );
  const toolContext = useMemo(
    () => ({
      selectedLayerKind,
      availableAdjustmentToolIds,
    }),
    [availableAdjustmentToolIds, selectedLayerKind],
  );
  const imageDimensions =
    selectedLayer instanceof ImageLayer
      ? {
          width: selectedLayer.imageData.imageWidth,
          height: selectedLayer.imageData.imageHeight,
        }
      : null;
  const currentAdjustmentValues =
    selectedLayer instanceof BrightnessAdjustmentLayer
      ? {
          brightness: selectedLayer.brightness,
          contrast: selectedLayer.contrast,
        }
      : selectedLayer instanceof SaturationAdjustmentLayer
        ? { saturation: selectedLayer.saturation }
        : {};
  const selectedImageAdjustmentLayerIds = useMemo(
    () =>
      selectedLayer instanceof ImageLayer
        ? getAdjustmentsForImage(selectedLayer, layerManager.layers).map(
            (layer) => layer.id,
          )
        : [],
    [layerManager.layers, selectedLayer],
  );
  const selectedImageAuditInput = useMemo(
    () =>
      selectedLayer instanceof ImageLayer
        ? {
            selectedLayerId: selectedLayer.id,
            imageLayerId: selectedLayer.id,
            adjustmentLayerIds: selectedImageAdjustmentLayerIds,
            editorRevision: buildImageAuditRevision(
              selectedLayer.id,
              selectedLayer.imageData.src,
              selectedLayer.imageData.imageWidth,
              selectedLayer.imageData.imageHeight,
            ),
            imageSource: selectedLayer.imageData.src,
            originalWidth: selectedLayer.imageData.imageWidth,
            originalHeight: selectedLayer.imageData.imageHeight,
            maxSnapshotEdge: VISUAL_ANALYSIS_MAX_SNAPSHOT_EDGE,
          }
        : null,
    [selectedImageAdjustmentLayerIds, selectedLayer],
  );
  const imageAuditSummary = imageAudit.analysis
    ? buildVisualAnalysisSummary(imageAudit.analysis)
    : null;
  const freshPlannerVisualContext =
    imageAudit.status === "ready"
      ? getFreshPlannerVisualContext(
          imageAudit.analysis,
          selectedImageAuditInput
            ? {
                selectedLayerId: selectedImageAuditInput.selectedLayerId,
                editorRevision: selectedImageAuditInput.editorRevision,
              }
            : null,
        )
      : null;
  const imageAuditTargetLabel = selectedLayer
    ? selectedLayer instanceof ImageLayer
      ? `${selectedLayer.name} (source image)`
      : `${selectedLayer.name} (not an image layer)`
    : null;
  const availableToolManifest = useMemo(
    () => getZynaloToolManifest(toolContext),
    [toolContext],
  );
  const supportedToolIds = useMemo(
    () => availableToolManifest.tools.map((tool) => tool.id),
    [availableToolManifest],
  );
  const activeStep =
    guideActive && plan ? plan.steps[currentStep] : null;

  useEffect(() => {
    imageAnalysisRunnerRef.current.cancel();
    setImageAudit((current) => {
      if (!selectedImageAuditInput) {
        return {
          status: "unavailable",
          analysis: null,
        };
      }
      if (
        current.analysis &&
        current.analysis.target.editorRevision ===
          selectedImageAuditInput.editorRevision
      ) {
        return current;
      }
      return {
        status: current.analysis ? "stale" : "idle",
        analysis: current.analysis,
      };
    });
  }, [selectedImageAuditInput]);

  useEffect(() => {
    if (!activeStep) {
      return;
    }

    if (
      activeStep.controlId.startsWith("transform.") &&
      editMode !== "transform"
    ) {
      setEditMode("transform");
      return;
    }

    const selector = `[data-show-me-control="${activeStep.controlId}"]`;
    const control = document.querySelector<HTMLElement>(selector);
    if (!control) {
      return;
    }

    control.classList.add(...HIGHLIGHT_CLASSES);
    control.scrollIntoView({ behavior: "smooth", block: "nearest" });
    return () => {
      control.classList.remove(...HIGHLIGHT_CLASSES);
    };
  }, [activeStep, editMode, setEditMode]);

  const pushConversation = (
    role: ConversationEntry["role"],
    text: string,
    tone?: "default" | "success" | "error",
  ) => {
    entryId.current += 1;
    setConversation((current) => [
      ...current,
      { id: `${role}-${entryId.current}`, role, text, tone },
    ]);
  };

  useEffect(
    () => () => {
      activePlanningController.current?.abort();
      imageAnalysisRunnerRef.current.cancel();
    },
    [],
  );

  const applyResolvedResponse = (
    resolved: AssistantResponse,
    visualContext: PlannerVisualContext | null,
    provenance: string,
  ) => {
    setRetryBuiltInRequest(null);
    setMessage("");
    setAssistantProvenance(provenance);

    if (resolved.mode === "analysis-answer") {
      setLearningAnswer(null);
      setClarification(null);
      setAnalysisAnswer({
        answer: resolved.answer,
        visualContext,
      });
      setPlan(null);
      setGuideActive(false);
      setPlanCompleted(false);
      setPlanAuditBadge(null);
      pushConversation("assistant", resolved.answer.answer);
      return;
    }

    if (resolved.mode === "learning-answer") {
      setAnalysisAnswer(null);
      setClarification(null);
      setLearningAnswer({ answer: resolved.answer });
      setPlan(null);
      setGuideActive(false);
      setPlanCompleted(false);
      setPlanAuditBadge(null);
      pushConversation("assistant", resolved.answer.answer);
      return;
    }

    if (resolved.mode === "clarification") {
      setAnalysisAnswer(null);
      setLearningAnswer(null);
      setClarification({ clarification: resolved.clarification });
      setPlan(null);
      setGuideActive(false);
      setPlanCompleted(false);
      setPlanAuditBadge(null);
      pushConversation("assistant", resolved.clarification.question);
      return;
    }

    setAnalysisAnswer(null);
    setLearningAnswer(null);
    setClarification(null);
    setPlan(resolved.plan);
    setCurrentStep(0);
    setGuideActive(false);
    setPlanCompleted(false);
    setPlanAuditBadge(visualContext ? { visualContext } : null);
    pushConversation(
      "assistant",
      resolved.summary || buildAssistantSummary(resolved.plan),
    );
  };

  const handleAnalyzeSelectedImage = async () => {
    if (!selectedImageAuditInput) {
      setImageAudit({ status: "unavailable", analysis: null });
      return;
    }

    setImageAudit((current) => ({
      status: "loading",
      analysis: current.analysis,
    }));

    const result = await imageAnalysisRunnerRef.current.run(selectedImageAuditInput);
    if (result.ok) {
      setImageAudit({
        status: "ready",
        analysis: result.analysis,
      });
      return;
    }

    if (result.reason === "stale") {
      setImageAudit((current) => ({
        status: "stale",
        analysis: current.analysis,
      }));
      return;
    }

    if (result.reason === "cancelled") {
      setImageAudit((current) =>
        selectedImageAuditInput
          ? {
              status: current.analysis ? "stale" : "idle",
              analysis: current.analysis,
            }
          : {
              status: "unavailable",
              analysis: null,
            },
      );
      return;
    }

    setImageAudit((current) => ({
      status: "failed",
      analysis: current.analysis,
      error: result.error,
    }));
  };

  const ensureFreshPlannerVisualContext = async () => {
    if (freshPlannerVisualContext) {
      return freshPlannerVisualContext;
    }

    if (!selectedImageAuditInput) {
      return null;
    }

    setImageAudit((current) => ({
      status: "loading",
      analysis: current.analysis,
    }));

    const result = await imageAnalysisRunnerRef.current.run(selectedImageAuditInput);
    if (!result.ok) {
      if (result.reason === "stale") {
        setImageAudit((current) => ({
          status: "stale",
          analysis: current.analysis,
        }));
      } else if (result.reason === "failed") {
        setImageAudit((current) => ({
          status: "failed",
          analysis: current.analysis,
          error: result.error,
        }));
      }
      return null;
    }

    setImageAudit({
      status: "ready",
      analysis: result.analysis,
    });

    return getFreshPlannerVisualContext(
      result.analysis,
      {
        selectedLayerId: selectedImageAuditInput.selectedLayerId,
        editorRevision: selectedImageAuditInput.editorRevision,
      },
    );
  };

  const handlePlanRequest = async (rawRequest: string) => {
    const normalizedRequest = rawRequest.trim();
    if (!normalizedRequest) {
      return;
    }
    planningRequestCounter.current += 1;
    const requestId = planningRequestCounter.current;
    activePlanningController.current?.abort();
    activePlanningController.current = null;
    setIsPlanning(false);

    setDraftRequest("");
    setMessage("");
    setAssistantProvenance("Needs clarification");
    setPlanAuditBadge(null);
    setAnalysisAnswer(null);
    setLearningAnswer(null);
    setClarification(null);
    pushConversation("user", normalizedRequest);

    if (
      !(selectedLayer instanceof ImageLayer) &&
      !(selectedLayer instanceof AdjustmentLayer)
    ) {
      setPlan(null);
      setAnalysisAnswer(null);
      setLearningAnswer(null);
      setClarification(null);
      setGuideActive(false);
      setPlanCompleted(false);
      setRetryBuiltInRequest(null);
      const errorMessage =
        "Select an image or supported adjustment layer first.";
      setMessage(errorMessage);
      pushConversation("assistant", errorMessage, "error");
      return;
    }

    const controller = new AbortController();
    activePlanningController.current = controller;
    setIsPlanning(true);
    setRetryBuiltInRequest(null);
    const intent = classifyShowMeIntent(normalizedRequest, toolContext);

    const settle = () => {
      setIsPlanning(false);
      if (activePlanningController.current === controller) {
        activePlanningController.current = null;
      }
    };

    const clarify = (question?: string) => {
      applyResolvedResponse(
        {
          mode: "clarification",
          clarification: {
            question:
              question ||
              intent.clarificationQuestion ||
              "Do you want an explanation or an editable suggestion?",
          },
        },
        null,
        "Needs clarification",
      );
    };

    const fallbackContext = {
      ...toolContext,
      imageDimensions,
      currentAdjustmentValues,
      supportedToolIds,
    };

    // Local AI fallback interpreter. It only routes a low-confidence request; it
    // never owns facts or execution. Edit routes are re-validated by the Tool
    // Registry; analysis/learn routes are re-answered deterministically so the
    // model's own words are always discarded.
    const attemptFallbackInterpreter = async (): Promise<
      "handled" | "clarify" | "stale"
    > => {
      const interpretProvider = getEditPlanProvider("ollama-local");
      const interpretResult = await interpretProvider.createPlan(
        {
          request: normalizedRequest,
          interactionMode: "interpret",
          toolManifest: toEditPlanToolManifest(availableToolManifest),
          context: fallbackContext,
          visualContext: freshPlannerVisualContext || undefined,
        },
        { signal: controller.signal },
      );
      if (requestId !== planningRequestCounter.current) {
        return "stale";
      }
      if (!interpretResult.ok) {
        return "clarify";
      }

      const { route, steps } = parseInterpretResult(interpretResult.response);

      if (route === "edit") {
        const resolved = resolveUntrustedShowMeResponse(
          normalizedRequest,
          { mode: "edit-plan", steps },
          toolContext,
        );
        if (resolved.ok && resolved.resolved.mode === "edit-plan") {
          applyResolvedResponse(
            resolved.resolved,
            null,
            "Local AI",
          );
          return "handled";
        }
        return "clarify";
      }

      if (route === "analysis") {
        const analysisContext = await ensureFreshPlannerVisualContext();
        if (requestId !== planningRequestCounter.current) {
          return "stale";
        }
        if (!analysisContext) {
          return "clarify";
        }
        const analysisResult = await getEditPlanProvider(
          "deterministic",
        ).createPlan(
          {
            request: normalizedRequest,
            interactionMode: "analysis-answer",
            toolManifest: toEditPlanToolManifest(availableToolManifest),
            context: fallbackContext,
            visualContext: analysisContext,
          },
          { signal: controller.signal },
        );
        if (requestId !== planningRequestCounter.current) {
          return "stale";
        }
        const resolved = analysisResult.ok
          ? resolveUntrustedShowMeResponse(
              normalizedRequest,
              analysisResult.response,
              toolContext,
            )
          : null;
        if (resolved?.ok && resolved.resolved.mode === "analysis-answer") {
          applyResolvedResponse(
            resolved.resolved,
            analysisContext,
            "Image analysis",
          );
          return "handled";
        }
        return "clarify";
      }

      if (route === "learn") {
        const learnResult = await getEditPlanProvider("deterministic").createPlan(
          {
            request: normalizedRequest,
            interactionMode: "learn-answer",
            toolManifest: toEditPlanToolManifest(availableToolManifest),
            context: fallbackContext,
          },
          { signal: controller.signal },
        );
        if (requestId !== planningRequestCounter.current) {
          return "stale";
        }
        const resolved = learnResult.ok
          ? resolveUntrustedShowMeResponse(
              normalizedRequest,
              learnResult.response,
              toolContext,
            )
          : null;
        if (resolved?.ok && resolved.resolved.mode === "learning-answer") {
          applyResolvedResponse(
            resolved.resolved,
            null,
            "Photo guide",
          );
          return "handled";
        }
        return "clarify";
      }

      return "clarify";
    };

    if (intent.intent === "ambiguous") {
      if (shouldUseFallbackInterpreter(intent.intent, assistantProviderMode)) {
        setMessage("Interpreting your request locally...");
        const outcome = await attemptFallbackInterpreter();
        if (outcome === "stale") {
          return;
        }
        settle();
        if (outcome !== "handled") {
          clarify();
        }
        return;
      }
      settle();
      clarify();
      return;
    }

    const interactionMode: ShowMeInteractionMode =
      intent.intent === "analysis"
        ? "analysis-answer"
        : intent.intent === "learn"
          ? "learn-answer"
          : "edit-plan";
    const visualContext =
      interactionMode === "analysis-answer"
        ? await ensureFreshPlannerVisualContext()
        : intent.intent === "subjective"
          ? freshPlannerVisualContext || (await ensureFreshPlannerVisualContext())
          : null;

    const effectiveProviderId = resolveAssistantProviderId(
      intent.intent,
      assistantProviderMode,
    );
    const provider = getEditPlanProvider(effectiveProviderId);
    const planProviderInput = {
      request: normalizedRequest,
      interactionMode,
      toolManifest: toEditPlanToolManifest(availableToolManifest),
      context: {
        ...toolContext,
        imageDimensions,
        currentAdjustmentValues,
        supportedToolIds,
      },
      visualContext: visualContext || undefined,
    };

    const tryDeterministicFallback = async (fallbackReason: string) => {
      const fallbackProvider = getEditPlanProvider("deterministic");
      const fallbackResult = await fallbackProvider.createPlan(planProviderInput, {
        signal: controller.signal,
      });
      if (requestId !== planningRequestCounter.current || !fallbackResult.ok) {
        return false;
      }

      const fallbackTrusted = resolveUntrustedShowMeResponse(
        normalizedRequest,
        fallbackResult.response,
        toolContext,
      );
      if (!fallbackTrusted.ok) {
        return false;
      }

      applyResolvedResponse(
        fallbackTrusted.resolved.mode === "edit-plan"
          ? {
              ...fallbackTrusted.resolved,
              summary: `${fallbackReason} Built-in planner fallback created a grounded edit plan.`,
            }
          : fallbackTrusted.resolved,
        null,
        "Instant",
      );
      return true;
    };

    setMessage(
      effectiveProviderId === "ollama-local"
        ? "Interpreting request locally..."
        : interactionMode === "analysis-answer"
          ? "Analyzing image..."
          : interactionMode === "learn-answer"
            ? "Looking up tool guidance..."
            : "Planning edit...",
    );

    const providerResult = await provider.createPlan(planProviderInput, {
      signal: controller.signal,
    });

    if (requestId !== planningRequestCounter.current) {
      return;
    }

    if (providerResult.ok) {
      const trustedResult = resolveUntrustedShowMeResponse(
        normalizedRequest,
        providerResult.response,
        toolContext,
      );
      if (!trustedResult.ok) {
        if (
          effectiveProviderId === "ollama-local" &&
          (await tryDeterministicFallback(
            "Local AI could not produce a usable grounded response.",
          ))
        ) {
          setMessage("");
          setIsPlanning(false);
          if (activePlanningController.current === controller) {
            activePlanningController.current = null;
          }
          return;
        }

        // A deterministic edit command that did not parse (e.g. "scale by a
        // third") gets one validated Local AI interpretation attempt before we
        // fall back to a single, non-duplicated clarification.
        if (
          intent.intent === "edit" &&
          effectiveProviderId === "deterministic" &&
          assistantProviderMode !== "deterministic"
        ) {
          setMessage("Interpreting your request locally...");
          const outcome = await attemptFallbackInterpreter();
          if (outcome === "stale") {
            return;
          }
          settle();
          if (outcome !== "handled") {
            clarify(trustedResult.error);
          }
          return;
        }

        settle();
        clarify(trustedResult.error);
        return;
      }
      applyResolvedResponse(
        trustedResult.resolved,
        visualContext,
        resolveAssistantProvenance(intent.intent, effectiveProviderId),
      );
    } else if (providerResult.reason !== "cancelled") {
      setPlan(null);
      setAnalysisAnswer(null);
      setLearningAnswer(null);
      setClarification(null);
      setGuideActive(false);
      setPlanCompleted(false);
      setPlanAuditBadge(null);
      if (
        effectiveProviderId === "ollama-local" &&
        providerResult.suggestDeterministic &&
        (await tryDeterministicFallback(`${providerResult.error}`))
      ) {
        setMessage("");
        setIsPlanning(false);
        if (activePlanningController.current === controller) {
          activePlanningController.current = null;
        }
        return;
      }
      const errorMessage =
        effectiveProviderId === "ollama-local"
          ? `${providerResult.error} You can retry with the built-in planner.`
          : providerResult.error;
      setMessage(errorMessage);
      pushConversation("assistant", errorMessage, "error");
      if (
        effectiveProviderId === "ollama-local" &&
        providerResult.suggestDeterministic
      ) {
        setRetryBuiltInRequest(normalizedRequest);
      }
    }

    if (requestId === planningRequestCounter.current) {
      setIsPlanning(false);
      if (activePlanningController.current === controller) {
        activePlanningController.current = null;
      }
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void handlePlanRequest(draftRequest);
  };

  const handleApplyPlan = () => {
    if (!plan) {
      return;
    }
    const validation = validateExecutableShowMePlan(plan, toolContext);
    if (!validation.ok) {
      setMessage(validation.error);
      pushConversation("assistant", validation.error, "error");
      return;
    }
    const result = dispatchSelectedImageActions(
      validation.actions,
      "Apply Show Me plan",
    );
    const nextMessage = result.ok
      ? "Plan applied with the real Zynalo controls. You can undo it as one action."
      : result.error;
    setMessage(nextMessage);
    pushConversation(
      "assistant",
      nextMessage,
      result.ok ? "success" : "error",
    );
    if (result.ok) {
      setPlanCompleted(true);
      setGuideActive(false);
    }
  };

  const contentProps: AssistantContentProps = {
    analysisAnswer,
    clarification,
    assistantProvenance,
    imageAudit,
    imageAuditSummary,
    imageAuditTargetLabel,
    learningAnswer,
    planAuditBadge,
    conversation,
    currentStep,
    draftRequest,
    guideActive,
    isPlanning,
    message,
    onApplyPlan: handleApplyPlan,
    onAnalyzeSelectedImage: () => {
      void handleAnalyzeSelectedImage();
    },
    onChangeRequest: setDraftRequest,
    onExamplePrompt: setDraftRequest,
    onExitGuide: () => setGuideActive(false),
    onNextStep: () =>
      setCurrentStep((step) =>
        plan ? Math.min(step + 1, plan.steps.length - 1) : step,
      ),
    onPreviousStep: () =>
      setCurrentStep((step) => Math.max(step - 1, 0)),
    onRetryWithBuiltIn: retryBuiltInRequest
      ? () => {
          void handlePlanRequest(retryBuiltInRequest);
        }
      : null,
    onShowGuide: () => {
      setGuideActive(true);
      setPlanCompleted(false);
    },
    onSubmit: handleSubmit,
    plan,
    planCompleted,
  };

  return (
    <>
      <div className="hidden h-full min-h-0 border-l border-gray-500 bg-navbarBackground xl:flex">
        {desktopOpen ? (
          <aside className="flex h-full min-h-0 w-[24rem] min-w-[24rem] flex-col">
            <div className="flex items-center justify-between border-b border-gray-500 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <MessageSquare className="h-4 w-4" />
                Show Me
              </div>
              <Button
                aria-label="Collapse Zynalo Assistant"
                size="icon"
                type="button"
                variant="ghost"
                onClick={() => setDesktopOpen(false)}
              >
                <PanelRightClose className="h-4 w-4" />
              </Button>
            </div>
            <AssistantContent {...contentProps} />
          </aside>
        ) : (
          <div className="flex h-full w-12 items-start justify-center pt-4">
            <Button
              aria-label="Open Zynalo Assistant"
              className="rounded-full"
              size="icon"
              type="button"
              variant="secondary"
              onClick={() => setDesktopOpen(true)}
            >
              <PanelRightOpen className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="xl:hidden">
        <Button
          aria-label="Open Zynalo Assistant"
          className="fixed right-4 top-20 z-40 rounded-full shadow-lg"
          size="icon"
          type="button"
          onClick={() => setMobileOpen(true)}
        >
          <Sparkles className="h-4 w-4" />
        </Button>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            className="h-full w-[min(92vw,26rem)] border-l-0 bg-navbarBackground p-0 text-black dark:text-white sm:max-w-none"
            side="right"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Zynalo Assistant</SheetTitle>
              <SheetDescription>
                Chat-style editing guidance using real Zynalo tools.
              </SheetDescription>
            </SheetHeader>
            <AssistantContent {...contentProps} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
};

export default ShowMePanel;
