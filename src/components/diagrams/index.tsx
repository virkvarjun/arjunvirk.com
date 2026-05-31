import type { ComponentType } from "react";
import { DiagramFrame, InteractiveFrame } from "./frame";
import { GradientDescentInteractive } from "./interactive/gradient-descent";
import {
  LinearRegression,
  KNN,
  KNNFitting,
  SVMMargin,
  DecisionTree,
  KMeans,
  PCA,
} from "./ch0";
import {
  MLPNetwork,
  ActivationFunctions,
  BackpropFlow,
  TrainValLoss,
} from "./ch1";
import {
  SumOverPaths,
  WeightIndexing,
  ErrorBackprop,
  SigmoidDerivative,
} from "./ch2";
import {
  CpuVsGpu,
  MemoryHierarchy,
  SystolicArray,
  Roofline,
  Parallelism,
} from "./ch3";
import {
  RnnUnroll,
  LstmCell,
  AttentionQKV,
  MultiHead,
  CausalMask,
  TransformerBlock,
  KvCache,
  GroupedQuery,
  MoE,
  LoRA,
} from "./ch4";
import {
  ImageTensor,
  Convolution,
  CnnStack,
  ReceptiveField,
  YoloGrid,
  IoU,
  UNet,
  VitPatches,
  Vlm,
  ClipMatrix,
} from "./ch5";
import {
  AgentLoop,
  FourLevels,
  ToolCall,
  McpNxM,
  AgentPatterns,
  LethalTrifecta,
} from "./ch6";

type Entry = { Comp: ComponentType; viewBox?: string; interactive?: boolean };

// Maps the `diagram.id` referenced in chapters.ts to a rendered component.
const registry: Record<string, Entry> = {
  "lin-reg": { Comp: LinearRegression },
  knn: { Comp: KNN },
  "knn-fitting": { Comp: KNNFitting, viewBox: "0 0 680 245" },
  "svm-margin": { Comp: SVMMargin },
  "decision-tree": { Comp: DecisionTree, viewBox: "0 0 470 228" },
  kmeans: { Comp: KMeans },
  pca: { Comp: PCA },
  // chapter 1
  "mlp-network": { Comp: MLPNetwork, viewBox: "0 0 400 224" },
  "activation-functions": { Comp: ActivationFunctions, viewBox: "0 0 400 220" },
  "gradient-descent": { Comp: GradientDescentInteractive, interactive: true },
  "backprop-flow": { Comp: BackpropFlow, viewBox: "0 0 470 150" },
  "train-val-loss": { Comp: TrainValLoss },
  // chapter 2
  "sum-over-paths": { Comp: SumOverPaths, viewBox: "0 0 400 200" },
  "weight-indexing": { Comp: WeightIndexing, viewBox: "0 0 400 205" },
  "error-backprop": { Comp: ErrorBackprop, viewBox: "0 0 420 205" },
  "sigmoid-derivative": { Comp: SigmoidDerivative, viewBox: "0 0 400 215" },
  // chapter 3
  "cpu-vs-gpu": { Comp: CpuVsGpu, viewBox: "0 0 420 205" },
  "memory-hierarchy": { Comp: MemoryHierarchy, viewBox: "0 0 400 225" },
  "systolic-array": { Comp: SystolicArray, viewBox: "0 0 400 235" },
  roofline: { Comp: Roofline, viewBox: "0 0 400 235" },
  parallelism: { Comp: Parallelism, viewBox: "0 0 600 165" },
  // chapter 4
  "rnn-unroll": { Comp: RnnUnroll, viewBox: "0 0 460 185" },
  "lstm-cell": { Comp: LstmCell, viewBox: "0 0 440 165" },
  "attention-qkv": { Comp: AttentionQKV, viewBox: "0 0 420 235" },
  "multi-head": { Comp: MultiHead, viewBox: "0 0 420 205" },
  "causal-mask": { Comp: CausalMask, viewBox: "0 0 280 245" },
  "transformer-block": { Comp: TransformerBlock, viewBox: "0 0 350 320" },
  "kv-cache": { Comp: KvCache, viewBox: "0 0 430 180" },
  "grouped-query": { Comp: GroupedQuery, viewBox: "0 0 480 160" },
  moe: { Comp: MoE, viewBox: "0 0 400 228" },
  lora: { Comp: LoRA, viewBox: "0 0 400 185" },
  // chapter 5
  "image-tensor": { Comp: ImageTensor, viewBox: "0 0 400 235" },
  convolution: { Comp: Convolution, viewBox: "0 0 420 180" },
  "cnn-stack": { Comp: CnnStack, viewBox: "0 0 420 200" },
  "receptive-field": { Comp: ReceptiveField, viewBox: "0 0 430 170" },
  "yolo-grid": { Comp: YoloGrid, viewBox: "0 0 400 262" },
  iou: { Comp: IoU, viewBox: "0 0 320 250" },
  unet: { Comp: UNet, viewBox: "0 0 450 245" },
  "vit-patches": { Comp: VitPatches, viewBox: "0 0 440 200" },
  vlm: { Comp: Vlm, viewBox: "0 0 410 165" },
  "clip-matrix": { Comp: ClipMatrix, viewBox: "0 0 320 250" },
  // chapter 6
  "agent-loop": { Comp: AgentLoop, viewBox: "0 0 400 235" },
  "four-levels": { Comp: FourLevels, viewBox: "0 0 420 195" },
  "tool-call": { Comp: ToolCall, viewBox: "0 0 430 185" },
  "mcp-nxm": { Comp: McpNxM, viewBox: "0 0 440 220" },
  "agent-patterns": { Comp: AgentPatterns, viewBox: "0 0 330 185" },
  "lethal-trifecta": { Comp: LethalTrifecta, viewBox: "0 0 380 260" },
};

export function Diagram({ id, caption }: { id: string; caption?: string }) {
  const entry = registry[id];
  if (!entry) {
    return null;
  }
  const { Comp, viewBox, interactive } = entry;
  if (interactive) {
    return (
      <InteractiveFrame caption={caption}>
        <Comp />
      </InteractiveFrame>
    );
  }
  return (
    <DiagramFrame caption={caption} viewBox={viewBox}>
      <Comp />
    </DiagramFrame>
  );
}
