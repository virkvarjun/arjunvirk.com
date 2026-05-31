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
