import type { ComponentType } from "react";
import { DiagramFrame } from "./frame";
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
  GradientDescent,
  BackpropFlow,
  TrainValLoss,
} from "./ch1";

type Entry = { Comp: ComponentType; viewBox?: string };

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
  "gradient-descent": { Comp: GradientDescent },
  "backprop-flow": { Comp: BackpropFlow, viewBox: "0 0 470 150" },
  "train-val-loss": { Comp: TrainValLoss },
};

export function Diagram({ id, caption }: { id: string; caption?: string }) {
  const entry = registry[id];
  if (!entry) {
    return null;
  }
  const { Comp, viewBox } = entry;
  return (
    <DiagramFrame caption={caption} viewBox={viewBox}>
      <Comp />
    </DiagramFrame>
  );
}
