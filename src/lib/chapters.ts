export type ChapterDefinition = {
  term: string;
  definition: string;
};

export type ChapterSection = {
  heading?: string;
  // Paragraphs and list items may contain inline math wrapped in `$...$`.
  paragraphs?: string[];
  definitions?: ChapterDefinition[];
  // Display (block) equations rendered with KaTeX, one per line.
  equations?: string[];
  // A bulleted list of points.
  list?: string[];
  // A custom diagram, referenced by id from the diagram registry
  // (src/components/diagrams). Replaces the old text-only `image`.
  diagram?: { id: string; caption?: string };
  image?: { label: string; caption: string };
};

export type Chapter = {
  slug: string;
  number: string;
  title: string;
  summary: string;
  sections: ChapterSection[];
};

export const mlGuideChapters: Chapter[] = [
  {
    slug: "chapter-0-ml-algorithms",
    number: "0",
    title: "ML Algorithms",
    summary:
      "Before deep learning ate everything, classical ML algorithms quietly powered most of what worked in production.",
    sections: [
      {
        paragraphs: [
          "Before deep learning ate everything, classical ML algorithms quietly powered most of what worked in production — and on tabular data they still do. Each carries its own inductive bias, failure modes, and ideal use case.",
          "This chapter walks through the canonical algorithms — what they optimize, the math behind them, and when to reach for each — closing with a quick guide for picking one.",
        ],
      },
      {
        heading: "Linear Regression",
        paragraphs: [
          "The simplest supervised algorithm. Linear regression fits a straight line (a hyperplane in higher dimensions) through the data by choosing the weights that minimize squared error:",
        ],
        equations: ["\\hat{y} = w_1 x_1 + w_2 x_2 + \\cdots + w_n x_n + b"],
      },
      {
        paragraphs: [
          "The loss is the mean squared error — the average of the squared vertical gaps (residuals) between each point and the line. A closed-form solution exists, the normal equation $\\theta = (X^\\top X)^{-1} X^\\top y$, though gradient descent is used on large datasets. Reach for it when you suspect a roughly linear relationship between the features and a continuous target.",
        ],
        diagram: {
          id: "lin-reg",
          caption:
            "Fig 0.1 — Linear regression minimizes the sum of squared residuals (dashed) between each point and the fitted line.",
        },
      },
      {
        heading: "Logistic Regression",
        paragraphs: [
          "Despite the name, this is a classification algorithm. It computes a linear combination of features and squashes it through the sigmoid function to produce a probability:",
        ],
        equations: [
          "P(y = 1 \\mid x) = \\sigma(w^\\top x + b) = \\frac{1}{1 + e^{-(w^\\top x + b)}}",
        ],
      },
      {
        paragraphs: [
          "It is trained with binary cross-entropy loss. The decision boundary is linear, but the output is a calibrated probability. Logistic regression is the workhorse of binary classification in industry: fast, interpretable (each weight is that feature's log-odds contribution), and a strong baseline for any classification problem.",
        ],
      },
      {
        heading: "K-Nearest Neighbours (KNN)",
        paragraphs: [
          "A non-parametric method for both classification and regression. To predict, it looks at the $k$ closest training examples and either takes a majority vote (classification) or averages them (regression). There is no real training phase — it simply stores the dataset and does all the work at prediction time.",
        ],
        diagram: {
          id: "knn",
          caption:
            "Fig 0.2 — With k = 5, the new point's neighborhood holds 3 blue and 2 coral points, so it is classified blue.",
        },
      },
      {
        paragraphs: [
          "The choice of $k$ sets the bias–variance tradeoff. A small $k$ is sensitive to noise (it can carve an island around a single mislabeled point); a large $k$ smooths over genuine structure. KNN is surprisingly effective on small, low-dimensional datasets, but scales poorly: every prediction requires a pass over the entire training set.",
        ],
        diagram: {
          id: "knn-fitting",
          caption:
            "Fig 0.3 — k controls model complexity: a huge k underfits, k = 1 overfits (memorizing noise), and a moderate k captures the real structure.",
        },
      },
      {
        heading: "Support Vector Machine (SVM)",
        paragraphs: [
          "An SVM finds not just any separating boundary but the one that maximally separates the two classes — the boundary with the widest possible margin between the closest points of each class. Those closest points are the support vectors, and they alone define the boundary.",
        ],
        diagram: {
          id: "svm-margin",
          caption:
            "Fig 0.4 — The SVM maximizes the margin between classes; the circled support vectors sit on the margin and determine the boundary.",
        },
      },
      {
        paragraphs: ["For linearly separable data, the optimization problem is:"],
        equations: [
          "\\min_{w,\\, b}\\ \\tfrac{1}{2}\\lVert w \\rVert^2 \\quad \\text{subject to} \\quad y_i\\,(w^\\top x_i + b) \\ge 1",
        ],
      },
      {
        paragraphs: [
          "For non-linearly separable data, SVMs use the kernel trick: implicitly map the data into a higher-dimensional space where it becomes separable, without ever explicitly computing the high-dimensional coordinates. Common kernels include the polynomial and RBF (radial basis function) kernels. SVMs dominated ML in the 1990s–2000s and remain strong for small-to-medium datasets with clear class boundaries.",
        ],
      },
      {
        heading: "Naive Bayes",
        paragraphs: [
          "A probabilistic classifier built on Bayes' theorem with one strong \"naive\" assumption: every feature is conditionally independent of every other feature given the class. That assumption is almost always false, yet the classifier works remarkably well anyway — especially for text.",
        ],
        equations: [
          "P(y \\mid x_1, \\dots, x_n) \\;\\propto\\; P(y)\\prod_{i=1}^{n} P(x_i \\mid y)",
        ],
      },
      {
        paragraphs: [
          "To classify, compute this quantity for each class and pick the largest. Training is just counting how often each feature value co-occurs with each class, which makes Naive Bayes extremely fast. It is the classic baseline for spam filtering and document classification.",
        ],
      },
      {
        heading: "Decision Trees",
        paragraphs: [
          "A tree-structured model that classifies or regresses by asking a sequence of yes/no questions about the features. Each internal node tests one feature; each leaf assigns a class or value. Trees are built greedily: at each node, choose the feature and threshold that best split the data according to some criterion — Gini impurity, entropy, or variance reduction.",
        ],
        diagram: {
          id: "decision-tree",
          caption:
            "Fig 0.5 — A decision tree routes an example through a series of feature tests down to a leaf prediction.",
        },
      },
      {
        paragraphs: [
          "Decision trees are highly interpretable — you can literally read off the rules — and they handle numerical and categorical features without preprocessing. Their weakness is that a single deep tree easily overfits, memorizing training quirks. The fix is to combine many trees, which leads to ensemble methods.",
        ],
      },
      {
        heading: "Ensembles: Bagging and Random Forests",
        paragraphs: [
          "Bagging (bootstrap aggregating) trains each model on a different random sample of the training data, drawn with replacement, then averages (regression) or majority-votes (classification) their predictions. This reduces variance — wild individual predictions cancel out.",
          "Random forests apply bagging to decision trees with one extra twist: at each split, a tree may only consider a random subset of features. This decorrelates the trees so they don't all latch onto the same dominant feature. Random forests are robust, need almost no tuning, and remain one of the best off-the-shelf algorithms for tabular data.",
        ],
      },
      {
        heading: "Ensembles: Boosting",
        paragraphs: [
          "Boosting trains models sequentially, each one trying to fix the errors of the ensemble so far; predictions are a weighted combination. Unlike bagging — which trains models in parallel and averages — boosting is intrinsically sequential and reduces bias more than variance.",
          "Modern gradient-boosting libraries (XGBoost, LightGBM, CatBoost) are devastatingly effective on tabular data, winning an enormous share of Kaggle competitions and serving as the production default at countless companies. Working with structured data and unsure what to try? Start with gradient boosting.",
          "Variance, here, is the error caused by a model's sensitivity to small fluctuations in the training data — usually from a model complex enough to fit random noise rather than the underlying pattern.",
        ],
      },
      {
        heading: "K-Means Clustering",
        paragraphs: [
          "We now turn to unsupervised learning, where there are no labels. K-means is the classic clustering algorithm. Given a dataset and a chosen number of clusters $k$, it alternates two steps until convergence: an assignment step (assign each point to the nearest cluster centroid) and an update step (move each centroid to the mean of its assigned points).",
        ],
        diagram: {
          id: "kmeans",
          caption:
            "Fig 0.6 — k-means partitions points into k clusters; each square marks a centroid, the mean of its cluster's points.",
        },
      },
      {
        paragraphs: [
          "Mathematically, k-means minimizes the within-cluster sum of squared distances:",
        ],
        equations: [
          "\\sum_{i=1}^{k} \\sum_{x \\in C_i} \\lVert x - \\mu_i \\rVert^2",
        ],
      },
      {
        paragraphs: [
          "It is cheap, simple, and effective when clusters are roughly spherical and similar in size. Weaknesses: you must pick $k$ in advance, it is sensitive to initialization (use k-means++ for smarter starts), and it struggles with non-spherical clusters or very different cluster sizes.",
        ],
      },
      {
        heading: "Principal Component Analysis (PCA)",
        paragraphs: [
          "The classic linear dimensionality-reduction method. PCA finds the directions of maximum variance in the data and projects onto them. The first principal component is the direction along which the data varies most; the second is the direction of greatest remaining variance, orthogonal to the first; and so on. Projecting onto the top $k$ components gives the best $k$-dimensional linear approximation of the data in terms of preserved variance.",
        ],
        diagram: {
          id: "pca",
          caption:
            "Fig 0.7 — PC1 captures the dominant direction of variation; PC2 is orthogonal. Projecting onto PC1 gives a 1-D representation.",
        },
      },
      {
        paragraphs: [
          "Mathematically, PCA computes the eigenvectors of the covariance matrix (equivalently, the singular value decomposition of the centered data matrix). Each eigenvector is a principal component, and its eigenvalue is the variance captured along that direction. PCA assumes linear structure — for non-linear manifolds, t-SNE and UMAP are better choices, especially for visualization.",
        ],
      },
      {
        heading: "Choosing an Algorithm",
        paragraphs: ["A rough mental decision tree for when to reach for what:"],
        list: [
          "Tabular data, want interpretability → linear/logistic regression or a small decision tree.",
          "Tabular data, want maximum accuracy → gradient boosting (XGBoost, LightGBM).",
          "Tabular data, low-effort solid baseline → random forest.",
          "Small dataset with clean class boundaries → SVM.",
          "Text classification baseline → Naive Bayes or logistic regression.",
          "Just want to see what's similar to what → KNN.",
          "Images, audio, language, or any unstructured data at scale → neural networks.",
          "No labels, want to find groups → k-means.",
          "No labels, want to visualize or compress → PCA (linear), UMAP / t-SNE (non-linear).",
        ],
      },
      {
        paragraphs: [
          "The classical algorithms haven't been replaced — they've been joined. For most tabular business data, gradient boosting still beats neural networks. Deep learning's dominance is concentrated in the domains where representation learning matters most.",
        ],
      },
    ],
  },
  {
    slug: "chapter-1-fundamentals",
    number: "1",
    title: "ML Fundamentals",
    summary:
      "The vocabulary and ground rules of machine learning — the terms every later chapter assumes you already know.",
    sections: [
      {
        heading: "Part 1: Preliminary Definitions",
        definitions: [
          {
            term: "Model",
            definition:
              "A function with learnable parameters that maps inputs to outputs. Formally, f(x, θ) where x is the input and θ are the parameters learned during training.",
          },
          {
            term: "Label",
            definition:
              "The output a supervised model is trained to predict, typically denoted y — e.g. the house price in a price-prediction model.",
          },
          {
            term: "Features",
            definition:
              "The input variables that describe each example, typically denoted x — e.g. square footage in a house-price model.",
          },
          {
            term: "Supervised Learning",
            definition:
              "A training regime where every example carries a label, and the model learns to map inputs to those labels.",
          },
          {
            term: "Unsupervised Learning",
            definition:
              "A training regime with no labels. The model must discover structure — clusters, manifolds, latent factors — on its own.",
          },
          {
            term: "Semi-Supervised Learning",
            definition:
              "Training on a small pool of labeled data alongside a much larger pool of unlabeled data. Useful when labels are expensive to obtain (e.g. medical imaging).",
          },
          {
            term: "Self-Supervised Learning",
            definition:
              "The model generates its own labels from the structure of the input, then trains on them in a supervised fashion. Next-token prediction (Chapter 3) is the canonical example.",
          },
          {
            term: "Classification",
            definition:
              "A supervised task where the label is a discrete category. The model assigns each input to one of a finite set of classes — spam detection is the textbook example.",
          },
          {
            term: "Regression",
            definition:
              "A supervised task where the label is a continuous numerical value. The model predicts a real number rather than a category — e.g. a house price.",
          },
          {
            term: "Train / Validation / Test Split",
            definition:
              "A partition of the dataset. Train fits parameters, validation tunes hyperparameters, test is held out and used only for final performance estimates.",
          },
          {
            term: "Cross-Validation",
            definition:
              "Estimating model performance by repeatedly training and evaluating on different splits of the data. Especially useful when data is limited.",
          },
          {
            term: "Parameters",
            definition:
              "The internal variables learned from data during training. In linear regression y = wx + b, the weight w and bias b are parameters.",
          },
          {
            term: "Hyperparameters",
            definition:
              "Configuration values set before training that are not learned from data — learning rate, batch size, model depth, and so on.",
          },
          {
            term: "Underfitting",
            definition:
              "When a model is too simple or under-trained to capture the underlying structure in the data, resulting in poor performance on both training and unseen examples.",
          },
          {
            term: "Overfitting",
            definition:
              "When a model memorizes the noise and idiosyncrasies of the training data instead of learning generalizable patterns. Train accuracy is high; test accuracy isn't.",
          },
          {
            term: "Generalization",
            definition:
              "The ability of a model to perform well on new, unseen data drawn from the same distribution as the training data. The ultimate goal of machine learning.",
          },
          {
            term: "Tensor",
            definition:
              "A multi-dimensional array of numbers — the fundamental data structure of modern ML. Its rank is the number of dimensions. Tensors map cleanly onto GPU and TPU hardware.",
          },
          {
            term: "Matrix",
            definition:
              "A two-dimensional, rectangular array of numbers — a rank-2 tensor.",
          },
          {
            term: "Pre-Training",
            definition:
              "The initial training phase where a model learns broad, general representations from large quantities of (typically unlabeled) data. Expensive, done once per model family.",
          },
          {
            term: "Post-Training",
            definition:
              "Everything that follows pre-training to specialize a model: supervised fine-tuning, RLHF, alignment, evaluation. Cheap relative to pre-training, but where most of the product polish happens.",
          },
        ],
      },
      {
        heading: "Part 2: Neural Networks",
        paragraphs: [
          "Coming soon — perceptrons, MLPs, activation functions, backpropagation, and what makes a network 'deep.'",
        ],
      },
    ],
  },
  {
    slug: "chapter-2-inference-engineering-and-compute",
    number: "2",
    title: "Inference Engineering and Compute",
    summary:
      "Training is glamorous; inference pays the bills. The bag of tricks for serving a 70B parameter model on commodity hardware.",
    sections: [
      {
        paragraphs: [
          "KV caching, paged attention, speculative decoding, quantization (INT8, INT4, FP8), tensor parallel vs. pipeline parallel — the vocabulary of modern serving stacks.",
        ],
        image: {
          label: "kv cache layout",
          caption: "Fig 2.1 — Paged attention rearranges the KV cache into fixed-size blocks.",
        },
      },
      {
        heading: "Measuring what matters",
        paragraphs: [
          "This chapter is unapologetically practical. We'll measure latency in milliseconds, throughput in tokens/second, and cost in dollars per million tokens.",
          "The right mental model: every inference deployment is a queueing problem in disguise.",
        ],
      },
    ],
  },
  {
    slug: "chapter-3-transformers",
    number: "3",
    title: "Transformers",
    summary:
      "Attention Is All You Need was published in 2017 and we're still living in its world.",
    sections: [
      {
        paragraphs: [
          "Self-attention, multi-head attention, positional encodings (sinusoidal, learned, RoPE, ALiBi), causal masking, the residual stream — a vocabulary that has taken over the field.",
        ],
        image: {
          label: "attention pattern",
          caption: "Fig 3.1 — Multi-head attention pattern from a small toy transformer.",
        },
      },
      {
        heading: "Building one from scratch",
        paragraphs: [
          "We'll build a transformer from scratch, then take it apart and look at what each piece actually does. The exercise is short — under 200 lines of PyTorch — and surprisingly clarifying.",
        ],
      },
    ],
  },
  {
    slug: "chapter-4-vision",
    number: "4",
    title: "Vision",
    summary: "From LeNet to ViT to Sora — a tour of how machines learned to see.",
    sections: [
      {
        paragraphs: [
          "Convolutions exploit spatial locality. Transformers throw that prior out the window and learn it back from data. The pendulum has swung back and forth, and the answer depends on how much data you have.",
        ],
        image: {
          label: "feature map",
          caption: "Fig 4.1 — Early-layer feature maps from a pretrained CNN look like edge detectors.",
        },
      },
      {
        heading: "The modern stack",
        paragraphs: [
          "We'll walk through CNNs, ResNet, the great debates about pooling, the rise of vision transformers, contrastive pretraining (CLIP), and the current state of generative vision models.",
        ],
      },
    ],
  },
  {
    slug: "chapter-5-rl",
    number: "5",
    title: "RL",
    summary:
      "Where rewards are sparse, environments are non-stationary, and your gradients are a noisy mess.",
    sections: [
      {
        paragraphs: [
          "We'll cover the classics — value iteration, Q-learning, policy gradients, actor-critic — then move to PPO, GRPO, and the techniques powering the RLHF revolution.",
        ],
        image: {
          label: "policy rollout",
          caption: "Fig 5.1 — A policy rollout visualized as a trajectory through state space.",
        },
      },
      {
        heading: "Why it's hard",
        paragraphs: [
          "Three structural difficulties: credit assignment over long horizons, exploration vs. exploitation, and off-policy correction. Most modern algorithms are clever workarounds for one of these.",
        ],
      },
    ],
  },
  {
    slug: "chapter-5-advanced-topics",
    number: "5",
    title: "Advanced Topics",
    summary: "What didn't fit elsewhere — the frontier topics worth knowing.",
    sections: [
      {
        paragraphs: [
          "Diffusion models and their probabilistic interpretation, flow matching, state-space models (Mamba, RWKV), mixture-of-experts routing, world models, and the latest attempts at lifelong learning.",
        ],
        image: {
          label: "diffusion process",
          caption: "Fig 5b.1 — The forward diffusion process gradually corrupts data into noise.",
        },
      },
    ],
  },
  {
    slug: "chapter-6-programming-ml-models",
    number: "6",
    title: "Programming ML Models",
    summary: "PyTorch, JAX, and the tooling around them.",
    sections: [
      {
        paragraphs: [
          "Autograd internals, custom CUDA kernels, distributed training with FSDP, dataloader bottlenecks that silently halve your throughput, and the dark art of debugging NaN losses at 3am.",
        ],
        image: {
          label: "tensor parallel layout",
          caption: "Fig 6.1 — Sharding a weight matrix across four GPUs.",
        },
      },
      {
        heading: "What's worth your time",
        paragraphs: [
          "Most ML engineering pain comes from a small number of recurring failure modes. We'll catalog them, then go deep on the debugging tools that actually help.",
        ],
      },
    ],
  },
  {
    slug: "chapter-7-agentic-engineering",
    number: "7",
    title: "Agentic Engineering",
    summary:
      "Models call tools, tools change state, state informs the next call. Building reliable agent loops requires care.",
    sections: [
      {
        paragraphs: [
          "Prompt design, schema validation, planning vs. reaction, memory, error recovery, and evaluation. This is software engineering with a stochastic core.",
        ],
        image: {
          label: "agent loop",
          caption: "Fig 7.1 — A minimal agent loop: observe, think, act, repeat.",
        },
      },
      {
        heading: "Evaluation is the hard part",
        paragraphs: [
          "Anyone can build a demo agent. The interesting engineering problem is knowing whether your agent is getting better over time, on tasks that don't have closed-form answers.",
        ],
      },
    ],
  },
];

export const roboticsGuideChapters: Chapter[] = [
  {
    slug: "chapter-1-fundamentals",
    number: "1",
    title: "Fundamentals",
    summary:
      "Robotics sits at the messy intersection of physics, control, perception, and software.",
    sections: [
      {
        paragraphs: [
          "This chapter covers the fundamentals: rigid body transformations, forward and inverse kinematics, dynamics (Lagrangian and Newton-Euler), and the sensor stack that makes a robot aware of itself and the world.",
        ],
        image: {
          label: "kinematic chain",
          caption: "Fig 1.1 — A serial kinematic chain with three revolute joints.",
        },
      },
      {
        heading: "Coordinate frames",
        paragraphs: [
          "Half of robotics is bookkeeping: which frame is this vector expressed in, and what's the transform to where I need it? Get this right and the rest gets easier.",
        ],
      },
    ],
  },
  {
    slug: "chapter-2-classical-robotics",
    number: "2",
    title: "Classical Robotics",
    summary:
      "PID controllers still run most of the world. SLAM gets you a map. Filters keep state estimates honest.",
    sections: [
      {
        paragraphs: [
          "The Kalman filter and its many descendants (EKF, UKF, particle filters) form the backbone of state estimation. SLAM stitches these together with a map. PID is everywhere, and tuning it well is a craft.",
        ],
        image: {
          label: "occupancy grid",
          caption: "Fig 2.1 — An occupancy grid built from simulated LiDAR scans.",
        },
      },
      {
        heading: "Why classical still matters",
        paragraphs: [
          "Learned policies are great when they work, but a classical controller you can reason about is often the difference between a robot that ships and one that doesn't. Most production stacks are hybrids.",
        ],
      },
    ],
  },
];
