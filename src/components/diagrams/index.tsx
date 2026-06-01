import type { ComponentType } from "react";
import { DiagramFrame, InteractiveFrame } from "./frame";
import { GradientDescentInteractive } from "./interactive/gradient-descent";
import { ConvolutionInteractive } from "./interactive/convolution";
import { NeuronPlayground } from "./interactive/neuron-playground";
import { LinearCollapse } from "./interactive/linear-collapse";
import { ActivationExplorer } from "./interactive/activation-explorer";
import { SoftmaxConverter } from "./interactive/softmax-converter";
import { LayerMatvec } from "./interactive/LayerMatvec";
import { UniversalApproximation } from "./interactive/UniversalApproximation";
import { LossExplorer } from "./interactive/loss-explorer";
import { CostSurface } from "./interactive/cost-surface";
import { ChainRule } from "./interactive/chain-rule";
import { BackpropVisualizer } from "./interactive/backprop-visualizer";
import { OptimizerRace } from "./interactive/optimizer-race";
import { MomentumFocus } from "./interactive/momentum-focus";
import { NesterovLookahead } from "./interactive/NesterovLookahead";
import { AdagradRates } from "./interactive/AdagradRates";
import { AdagradVsRmsprop } from "./interactive/AdagradVsRmsprop";
import { AdamDecomposition } from "./interactive/AdamDecomposition";
import { LrSchedule } from "./interactive/lr-schedule";
import { OverUnderfitting } from "./interactive/OverUnderfitting";
import { WeightIndexDecoder } from "./interactive/WeightIndexDecoder";
import { JacobianBuilder } from "./interactive/JacobianBuilder";
import { SumOverPathsGraph } from "./interactive/SumOverPathsGraph";
import { JacobianChainShapes } from "./interactive/jacobian-chain-shapes";
import { ForwardPassUnroller } from "./interactive/ForwardPassUnroller";
import { ChainRuleWalk } from "./interactive/chain-rule-walk";
import { NaiveVsBackprop } from "./interactive/NaiveVsBackprop";
import { FourEquationsWalk } from "./interactive/four-equations-walk";
import { OuterProduct } from "./interactive/OuterProduct";
import { LinregFit } from "./interactive/linreg-fit";
import { LogisticExplainer } from "./interactive/logistic-explainer";
import { KnnPlayground } from "./interactive/KnnPlayground";
import { SvmPlayground } from "./interactive/svm-playground";
import { NaiveBayesSpam } from "./interactive/NaiveBayesSpam";
import { DecisionTreeExplainer } from "./interactive/decision-tree-explainer";
import { RandomForest } from "./interactive/RandomForest";
import { BoostingRounds } from "./interactive/boosting-rounds";
import { KmeansMotion } from "./interactive/KmeansMotion";
import { PcaExplorer } from "./interactive/PcaExplorer";
import { VonNeumannBottleneck } from "./interactive/von-neumann-bottleneck";
import { CpuVsGpuRace } from "./interactive/cpu-vs-gpu-race";
import { GpuHierarchy } from "./interactive/gpu-hierarchy";
import { WarpDivergence } from "./interactive/warp-divergence";
import { GemmTiling } from "./interactive/GemmTiling";
import { SystolicArrayAnim } from "./interactive/SystolicArrayAnim";
import { PrecisionFormats } from "./interactive/precision-formats";
import { MemoryPyramid } from "./interactive/MemoryPyramid";
import { CudaTower } from "./interactive/cuda-tower";
import { ParallelismStrategies } from "./interactive/parallelism-strategies";
import { RooflineInteractive } from "./interactive/roofline";
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
  // chapter 1 (Neural Networks) — interactive
  "neuron-playground": { Comp: NeuronPlayground, interactive: true },
  "linear-collapse": { Comp: LinearCollapse, interactive: true },
  "activation-explorer": { Comp: ActivationExplorer, interactive: true },
  "softmax-converter": { Comp: SoftmaxConverter, interactive: true },
  "layer-matvec": { Comp: LayerMatvec, interactive: true },
  "universal-approximation": { Comp: UniversalApproximation, interactive: true },
  "loss-explorer": { Comp: LossExplorer, interactive: true },
  "cost-surface": { Comp: CostSurface, interactive: true },
  "chain-rule": { Comp: ChainRule, interactive: true },
  "backprop-visualizer": { Comp: BackpropVisualizer, interactive: true },
  "optimizer-race": { Comp: OptimizerRace, interactive: true },
  "momentum-focus": { Comp: MomentumFocus, interactive: true },
  "nesterov-lookahead": { Comp: NesterovLookahead, interactive: true },
  "adagrad-rates": { Comp: AdagradRates, interactive: true },
  "adagrad-vs-rmsprop": { Comp: AdagradVsRmsprop, interactive: true },
  "adam-decomposition": { Comp: AdamDecomposition, interactive: true },
  "lr-schedule": { Comp: LrSchedule, interactive: true },
  "over-underfitting": { Comp: OverUnderfitting, interactive: true },
  // chapter 2 (Math of Neural Networks) — interactive
  "weight-index-decoder": { Comp: WeightIndexDecoder, interactive: true },
  "jacobian-builder": { Comp: JacobianBuilder, interactive: true },
  "sum-over-paths-graph": { Comp: SumOverPathsGraph, interactive: true },
  "jacobian-chain-shapes": { Comp: JacobianChainShapes, interactive: true },
  "forward-pass-unroller": { Comp: ForwardPassUnroller, interactive: true },
  "chain-rule-walk": { Comp: ChainRuleWalk, interactive: true },
  "naive-vs-backprop": { Comp: NaiveVsBackprop, interactive: true },
  "four-equations-walk": { Comp: FourEquationsWalk, interactive: true },
  "outer-product": { Comp: OuterProduct, interactive: true },
  // chapter 3 (Classical ML Algorithms) — interactive
  "linreg-fit": { Comp: LinregFit, interactive: true },
  "logistic-explainer": { Comp: LogisticExplainer, interactive: true },
  "knn-playground": { Comp: KnnPlayground, interactive: true },
  "svm-playground": { Comp: SvmPlayground, interactive: true },
  "naive-bayes-spam": { Comp: NaiveBayesSpam, interactive: true },
  "decision-tree-explainer": { Comp: DecisionTreeExplainer, interactive: true },
  "random-forest": { Comp: RandomForest, interactive: true },
  "boosting-rounds": { Comp: BoostingRounds, interactive: true },
  "kmeans-motion": { Comp: KmeansMotion, interactive: true },
  "pca-explorer": { Comp: PcaExplorer, interactive: true },
  // chapter 4 (AI Hardware and Compute) — interactive
  "von-neumann-bottleneck": { Comp: VonNeumannBottleneck, interactive: true },
  "cpu-vs-gpu-race": { Comp: CpuVsGpuRace, interactive: true },
  "gpu-hierarchy": { Comp: GpuHierarchy, interactive: true },
  "warp-divergence": { Comp: WarpDivergence, interactive: true },
  "gemm-tiling": { Comp: GemmTiling, interactive: true },
  "precision-formats": { Comp: PrecisionFormats, interactive: true },
  "memory-pyramid": { Comp: MemoryPyramid, interactive: true },
  "cuda-tower": { Comp: CudaTower, interactive: true },
  "parallelism-strategies": { Comp: ParallelismStrategies, interactive: true },
  "roofline-interactive": { Comp: RooflineInteractive, interactive: true },
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
  "systolic-array-anim": { Comp: SystolicArrayAnim, interactive: true },
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
  convolution: { Comp: ConvolutionInteractive, interactive: true },
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
