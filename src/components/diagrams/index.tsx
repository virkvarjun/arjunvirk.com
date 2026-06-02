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
import { TfFeedforward } from "./interactive/tf-feedforward-neural-network";
import { TfRnnUnrolled } from "./interactive/tf-rnn-unrolled-through-time";
import { TfLstmCell } from "./interactive/tf-lstm-cell";
import { TfSeq2seq } from "./interactive/tf-seq2seq-encoder-decoder-lstm";
import { TfBahdanau } from "./interactive/tf-bahdanau-attention-added-to-seq2seq";
import { TfTransformer } from "./interactive/tf-the-transformer-encoder-decoder";
import { TfTokenization } from "./interactive/tf-tokenization";
import { TfTokenEmbeddings } from "./interactive/tf-token-embeddings";
import { TfSelfAttention } from "./interactive/tf-scaled-dot-product-self-attention";
import { TfMultiHead } from "./interactive/tf-multi-head-attention";
import { TfMaskedAttention } from "./interactive/tf-masked-self-attention";
import { TfCrossAttention } from "./interactive/tf-cross-attention";
import { TfFFN } from "./interactive/tf-position-wise-feed-forward-network";
import { TfLayerNorm } from "./interactive/tf-layer-normalization-vs-batch-normalization";
import { TfResidual } from "./interactive/tf-residual-connection-add-norm";
import { TfPositionalEncoding } from "./interactive/tf-sinusoidal-positional-encoding";
import { TfFullTrace } from "./interactive/tf-one-encoder-layer-one-decoder-layer-full-trace";
import { TfDecoderOnly } from "./interactive/tf-decoder-only-transformer-gpt-style";
import { TfEncoderOnly } from "./interactive/tf-encoder-only-transformer-masked-language-modeling-bert";
import { TfRope } from "./interactive/tf-rope-rotary-positional-embedding";
import { TfSwiglu } from "./interactive/tf-swiglu-ffn-vs-relu-ffn";
import { TfSlidingWindow } from "./interactive/tf-sliding-window-attention-the-depth-trick";
import { TfKvCache } from "./interactive/tf-kv-cache";
import { TfPrefillDecode } from "./interactive/tf-prefill-vs-decode";
import { TfMhaGqaMqa } from "./interactive/tf-mha-vs-gqa-vs-mqa";
import { TfFlashAttention } from "./interactive/tf-flash-attention-tiling-online-softmax";
import { TfMixtureOfExperts } from "./interactive/tf-mixture-of-experts-moe";
import { TfQuantization } from "./interactive/tf-quantization";
import { TfSpeculativeDecoding } from "./interactive/tf-speculative-decoding";
import { TfRag } from "./interactive/tf-retrieval-augmented-generation-rag";
import { TfThreePhases } from "./interactive/tf-three-phases-of-training-an-llm";
import { TfLora } from "./interactive/tf-lora-low-rank-decomposition-of-the-update";
import { TfLoraWithoutRegret } from "./interactive/tf-lora-without-regret-when-lora-matches-full-fine-tuning";
import { TfGan } from "./interactive/tf-gan-generator-vs-discriminator";
import { TfGanConvergence } from "./interactive/tf-why-gan-training-converges";
import { TfAutoencoder } from "./interactive/tf-autoencoder";
import { TfVaeDotsVsClouds } from "./interactive/tf-why-a-vae-can-generate-dots-vs-clouds";
import { TfVaeTwoPulls } from "./interactive/tf-vae-generation-and-the-two-pulls";
import { TfGenerativeTradeoffs } from "./interactive/tf-generative-model-tradeoffs-autoencoder-vs-vae-vs-gan";
import { VisImageIsATensor } from "./interactive/vis-an-image-is-just-a-tensor";
import { VisNormalizationPipeline } from "./interactive/vis-image-normalization-pipeline";
import { VisWhyMlpFails } from "./interactive/vis-why-an-mlp-fails-on-images";
import { VisConvolutionSlide } from "./interactive/vis-the-convolution-slide-and-dot-product";
import { VisWorkedConvolution } from "./interactive/vis-worked-convolution-example-5x5-input-3x3-edge-filter";
import { VisManyFilters } from "./interactive/vis-many-filters-many-feature-maps";
import { VisConvVsFcParams } from "./interactive/vis-conv-vs-fully-connected-parameter-count";
import { VisPaddingStride } from "./interactive/vis-padding-stride-and-output-size";
import { VisReluBlock } from "./interactive/vis-relu-and-the-conv-batchnorm-relu-block";
import { VisPooling } from "./interactive/vis-pooling-max-average-and-global";
import { VisFeatureHierarchy } from "./interactive/vis-the-emergent-feature-hierarchy";
import { VisReceptiveField } from "./interactive/vis-how-the-receptive-field-grows-with-depth";
import { VisFullCnnShapes } from "./interactive/vis-a-full-cnn-tensor-shapes-from-input-to-logits";
import { VisThreeCnnIdeas } from "./interactive/vis-the-three-ideas-that-made-cnns-dominate";
import { VisDpmSlidingWindow } from "./interactive/vis-dpm-detection-by-sliding-window";
import { VisRcnnTwoStage } from "./interactive/vis-r-cnn-two-stage-detection";
import { VisYoloPipeline } from "./interactive/vis-yolo-one-shot-detection-pipeline";
import { VisYoloGrid } from "./interactive/vis-yolo-s-s-x-s-grid-and-the-responsible-cell";
import { VisOneByOneConv } from "./interactive/vis-1x1-convolution-cheap-channel-mixing";
import { VisYoloArchitecture } from "./interactive/vis-yolo-architecture-448x448x3-7x7x30";
import { VisLeakyRelu } from "./interactive/vis-leaky-relu-vs-relu";
import { VisYoloBoxEncoding } from "./interactive/vis-how-a-yolo-box-is-encoded";
import { VisIou } from "./interactive/vis-intersection-over-union-iou";
import { VisCellPredictionsToScores } from "./interactive/vis-from-cell-predictions-to-final-scores";
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
  // chapter 5 (Transformers) — interactive
  "tf-feedforward-neural-network": { Comp: TfFeedforward, interactive: true },
  "tf-rnn-unrolled-through-time": { Comp: TfRnnUnrolled, interactive: true },
  "tf-lstm-cell": { Comp: TfLstmCell, interactive: true },
  "tf-seq2seq-encoder-decoder-lstm": { Comp: TfSeq2seq, interactive: true },
  "tf-bahdanau-attention-added-to-seq2seq": { Comp: TfBahdanau, interactive: true },
  "tf-the-transformer-encoder-decoder": { Comp: TfTransformer, interactive: true },
  "tf-tokenization": { Comp: TfTokenization, interactive: true },
  "tf-token-embeddings": { Comp: TfTokenEmbeddings, interactive: true },
  "tf-scaled-dot-product-self-attention": { Comp: TfSelfAttention, interactive: true },
  "tf-multi-head-attention": { Comp: TfMultiHead, interactive: true },
  "tf-masked-self-attention": { Comp: TfMaskedAttention, interactive: true },
  "tf-cross-attention": { Comp: TfCrossAttention, interactive: true },
  "tf-position-wise-feed-forward-network": { Comp: TfFFN, interactive: true },
  "tf-layer-normalization-vs-batch-normalization": { Comp: TfLayerNorm, interactive: true },
  "tf-residual-connection-add-norm": { Comp: TfResidual, interactive: true },
  "tf-sinusoidal-positional-encoding": { Comp: TfPositionalEncoding, interactive: true },
  "tf-one-encoder-layer-one-decoder-layer-full-trace": { Comp: TfFullTrace, interactive: true },
  "tf-decoder-only-transformer-gpt-style": { Comp: TfDecoderOnly, interactive: true },
  "tf-encoder-only-transformer-masked-language-modeling-bert": { Comp: TfEncoderOnly, interactive: true },
  "tf-rope-rotary-positional-embedding": { Comp: TfRope, interactive: true },
  "tf-swiglu-ffn-vs-relu-ffn": { Comp: TfSwiglu, interactive: true },
  "tf-sliding-window-attention-the-depth-trick": { Comp: TfSlidingWindow, interactive: true },
  "tf-kv-cache": { Comp: TfKvCache, interactive: true },
  "tf-prefill-vs-decode": { Comp: TfPrefillDecode, interactive: true },
  "tf-mha-vs-gqa-vs-mqa": { Comp: TfMhaGqaMqa, interactive: true },
  "tf-flash-attention-tiling-online-softmax": { Comp: TfFlashAttention, interactive: true },
  "tf-mixture-of-experts-moe": { Comp: TfMixtureOfExperts, interactive: true },
  "tf-quantization": { Comp: TfQuantization, interactive: true },
  "tf-speculative-decoding": { Comp: TfSpeculativeDecoding, interactive: true },
  "tf-retrieval-augmented-generation-rag": { Comp: TfRag, interactive: true },
  "tf-three-phases-of-training-an-llm": { Comp: TfThreePhases, interactive: true },
  "tf-lora-low-rank-decomposition-of-the-update": { Comp: TfLora, interactive: true },
  "tf-lora-without-regret-when-lora-matches-full-fine-tuning": { Comp: TfLoraWithoutRegret, interactive: true },
  "tf-gan-generator-vs-discriminator": { Comp: TfGan, interactive: true },
  "tf-why-gan-training-converges": { Comp: TfGanConvergence, interactive: true },
  "tf-autoencoder": { Comp: TfAutoencoder, interactive: true },
  "tf-why-a-vae-can-generate-dots-vs-clouds": { Comp: TfVaeDotsVsClouds, interactive: true },
  "tf-vae-generation-and-the-two-pulls": { Comp: TfVaeTwoPulls, interactive: true },
  "tf-generative-model-tradeoffs-autoencoder-vs-vae-vs-gan": { Comp: TfGenerativeTradeoffs, interactive: true },
  "vis-an-image-is-just-a-tensor": { Comp: VisImageIsATensor, interactive: true },
  "vis-image-normalization-pipeline": { Comp: VisNormalizationPipeline, interactive: true },
  "vis-why-an-mlp-fails-on-images": { Comp: VisWhyMlpFails, interactive: true },
  "vis-the-convolution-slide-and-dot-product": { Comp: VisConvolutionSlide, interactive: true },
  "vis-worked-convolution-example-5x5-input-3x3-edge-filter": { Comp: VisWorkedConvolution, interactive: true },
  "vis-many-filters-many-feature-maps": { Comp: VisManyFilters, interactive: true },
  "vis-conv-vs-fully-connected-parameter-count": { Comp: VisConvVsFcParams, interactive: true },
  "vis-padding-stride-and-output-size": { Comp: VisPaddingStride, interactive: true },
  "vis-relu-and-the-conv-batchnorm-relu-block": { Comp: VisReluBlock, interactive: true },
  "vis-pooling-max-average-and-global": { Comp: VisPooling, interactive: true },
  "vis-the-emergent-feature-hierarchy": { Comp: VisFeatureHierarchy, interactive: true },
  "vis-how-the-receptive-field-grows-with-depth": { Comp: VisReceptiveField, interactive: true },
  "vis-a-full-cnn-tensor-shapes-from-input-to-logits": { Comp: VisFullCnnShapes, interactive: true },
  "vis-the-three-ideas-that-made-cnns-dominate": { Comp: VisThreeCnnIdeas, interactive: true },
  "vis-dpm-detection-by-sliding-window": { Comp: VisDpmSlidingWindow, interactive: true },
  "vis-r-cnn-two-stage-detection": { Comp: VisRcnnTwoStage, interactive: true },
  "vis-yolo-one-shot-detection-pipeline": { Comp: VisYoloPipeline, interactive: true },
  "vis-yolo-s-s-x-s-grid-and-the-responsible-cell": { Comp: VisYoloGrid, interactive: true },
  "vis-1x1-convolution-cheap-channel-mixing": { Comp: VisOneByOneConv, interactive: true },
  "vis-yolo-architecture-448x448x3-7x7x30": { Comp: VisYoloArchitecture, interactive: true },
  "vis-leaky-relu-vs-relu": { Comp: VisLeakyRelu, interactive: true },
  "vis-how-a-yolo-box-is-encoded": { Comp: VisYoloBoxEncoding, interactive: true },
  "vis-intersection-over-union-iou": { Comp: VisIou, interactive: true },
  "vis-from-cell-predictions-to-final-scores": { Comp: VisCellPredictionsToScores, interactive: true },
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
