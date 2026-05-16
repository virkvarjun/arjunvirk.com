export type ChapterDefinition = {
  term: string;
  definition: string;
};

export type ChapterSection = {
  heading?: string;
  paragraphs?: string[];
  definitions?: ChapterDefinition[];
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
          "Linear regression, logistic regression, decision trees, random forests, gradient boosted trees, k-nearest neighbors, and support vector machines — each with their own inductive biases, failure modes, and use cases.",
          "This chapter walks through the canonical algorithms, when to reach for them, and why XGBoost still wins half the Kaggle tabular competitions.",
        ],
        image: {
          label: "decision boundary",
          caption: "Fig 0.1 — A decision boundary learned by a shallow tree on a 2D toy dataset.",
        },
      },
      {
        heading: "When to skip deep learning",
        paragraphs: [
          "Tabular data with strong feature engineering, small dataset regimes, and applications that require interpretability — these are the niches where tree ensembles still dominate.",
          "Knowing why is half the battle: gradient boosted trees exploit axis-aligned splits that match the structure of human-curated features almost perfectly.",
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
