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
          "A neural network is a parameterized function that maps inputs to outputs through many small operations — linear transformations followed by nonlinear functions, stacked in layers. Formally, it composes $L$ layers:",
        ],
        equations: [
          "f(x;\\theta) = f_L \\circ f_{L-1} \\circ \\cdots \\circ f_2 \\circ f_1(x)",
        ],
      },
      {
        paragraphs: [
          "This works because of the universal approximation theorem: a network with even a single hidden layer of sufficient width can approximate any continuous function. Depth doesn't add expressive power here — it adds efficiency, letting the network represent the same functions with far fewer neurons.",
        ],
        diagram: {
          id: "mlp-network",
          caption:
            "Fig 1.1 — A feedforward network. Information flows input → hidden layers → output; every edge is a weight, every node adds a bias and a nonlinearity.",
        },
      },
      {
        heading: "The neuron",
        paragraphs: [
          "A neuron is the atomic unit of a network. It takes a vector input, computes a weighted sum, adds a bias, and applies a nonlinear activation. A weight is the strength of a connection between neurons; a bias is a learned offset that shifts the neuron's output.",
        ],
        equations: ["z = \\mathbf{w}^\\top \\mathbf{x} + b, \\qquad a = \\sigma(z)"],
      },
      {
        paragraphs: [
          "The weights determine how much each input feature matters; the bias shifts the decision threshold (even with all inputs zero, $z = b$); and the activation $\\sigma$ introduces the nonlinearity. Without it, the entire network — no matter how many layers — would collapse into a single linear transformation.",
        ],
      },
      {
        heading: "A layer",
        paragraphs: [
          "A layer is a group of neurons that all receive the same input and operate in parallel. A fully connected (dense) layer of $m$ neurons over an $n$-dimensional input has a weight matrix $W \\in \\mathbb{R}^{m \\times n}$ (row $i$ is neuron $i$'s weights), a bias vector $\\mathbf{b} \\in \\mathbb{R}^m$, and an output $\\mathbf{a} \\in \\mathbb{R}^m$:",
        ],
        equations: [
          "\\mathbf{z} = W\\mathbf{x} + \\mathbf{b}, \\qquad \\mathbf{a} = \\sigma(\\mathbf{z})",
        ],
      },
      {
        paragraphs: [
          "Here $\\sigma$ is applied element-wise. Stacking layers means feeding one layer's output as the next layer's input, so a network's parameters are $\\theta = \\{W^{(1)}, \\mathbf{b}^{(1)}, \\dots, W^{(L)}, \\mathbf{b}^{(L)}\\}$. The first layer is the input layer, the last is the output layer, and everything between is hidden.",
        ],
      },
      {
        heading: "Activation functions",
        paragraphs: [
          "The nonlinearity is what gives neural networks their power — a chain of linear layers is equivalent to a single linear layer, because the composition of linear maps is linear. The common choices each have characteristic shapes and failure modes.",
        ],
        diagram: {
          id: "activation-functions",
          caption:
            "Fig 1.2 — The workhorse activations. Sigmoid and tanh saturate (flat tails → vanishing gradients); ReLU and GELU stay responsive for positive inputs.",
        },
      },
      {
        definitions: [
          {
            term: "Sigmoid",
            definition:
              "$\\sigma(z) = \\frac{1}{1 + e^{-z}}$. Squashes inputs to $(0, 1)$. Historically popular, now mostly used for binary outputs. Suffers from vanishing gradients: for large $|z|$ the derivative is nearly zero, so learning stalls.",
          },
          {
            term: "Tanh",
            definition:
              "$\\tanh(z) = \\frac{e^{z} - e^{-z}}{e^{z} + e^{-z}}$. Squashes to $(-1, 1)$. Zero-centered, which helps optimization, but still saturates.",
          },
          {
            term: "ReLU",
            definition:
              "$\\mathrm{ReLU}(z) = \\max(0, z)$. Cheap, and the default for hidden layers since 2012. Derivative is 1 for positive inputs and 0 for negative — no vanishing gradient for active neurons. The downside is the dying-ReLU problem: a neuron stuck negative produces zero gradient and stops learning.",
          },
          {
            term: "Leaky ReLU",
            definition:
              "$\\max(\\alpha z, z)$ with small $\\alpha$ (e.g. 0.01). Fixes dying ReLU by letting a small gradient flow for negative inputs.",
          },
          {
            term: "GELU",
            definition:
              "$z \\cdot \\Phi(z)$, where $\\Phi$ is the standard normal CDF. Smooth, with a soft transition; used in transformers (BERT, GPT).",
          },
          {
            term: "Softmax",
            definition:
              "$\\mathrm{softmax}(\\mathbf{z})_i = \\frac{e^{z_i}}{\\sum_{j=1}^{K} e^{z_j}}$. Converts a vector of reals into a probability distribution (positive, sums to 1) — used in the output layer for multi-class classification.",
          },
        ],
      },
      {
        heading: "Part 3: How the network learns",
        paragraphs: [
          "To improve, the network needs a way to measure how wrong its predictions are. The loss function $L(\\hat{y}, y)$ takes a prediction and a true label and returns a scalar. Training searches for the parameters $\\theta$ that minimize the average loss over the training set:",
        ],
        equations: [
          "\\mathcal{L}(\\theta) = \\frac{1}{N} \\sum_{i=1}^{N} L\\!\\left( f(\\mathbf{x}_i; \\theta),\\, \\mathbf{y}_i \\right)",
        ],
      },
      {
        paragraphs: [
          "Two losses cover most cases. Mean squared error for regression penalizes large errors heavily because of the square; cross-entropy for classification is equivalent to maximizing the log-likelihood of the correct label under the model's predicted distribution:",
        ],
        equations: [
          "L_{\\text{MSE}}(\\hat{y}, y) = (\\hat{y} - y)^2 \\qquad L_{\\text{CE}} = -\\sum_{k=1}^{K} y_k \\log p_k",
        ],
      },
      {
        heading: "Gradient descent",
        paragraphs: [
          "Once we have a loss, we minimize it. The gradient $\\nabla\\mathcal{L}(\\theta)$ points in the direction of steepest increase, so we step the opposite way:",
        ],
        equations: [
          "\\theta_{t+1} = \\theta_t - \\eta\\,\\nabla\\mathcal{L}(\\theta_t)",
        ],
      },
      {
        paragraphs: [
          "The learning rate $\\eta > 0$ controls the step size: too small and learning crawls; too large and the optimizer overshoots or diverges. Geometrically, you stand on the loss surface and repeatedly step downhill, perpendicular to the contours of equal cost.",
        ],
        diagram: {
          id: "gradient-descent",
          caption:
            "Fig 1.3 — Gradient descent on a loss surface (contours). Each step moves against the gradient toward the minimum.",
        },
      },
      {
        paragraphs: [
          "Plain descent oscillates in narrow ravines. Momentum accumulates an exponentially-decaying average of past gradients — a velocity vector — and steps in that direction, like a heavy ball rolling downhill that builds speed in consistent directions and damps oscillations:",
        ],
        equations: [
          "\\mathbf{v}_{t+1} = \\beta\\mathbf{v}_t + \\nabla\\mathcal{L}(\\theta_t), \\qquad \\theta_{t+1} = \\theta_t - \\eta\\,\\mathbf{v}_{t+1}",
        ],
      },
      {
        heading: "Part 4: Backpropagation",
        paragraphs: [
          "How do we actually compute $\\nabla\\mathcal{L}$ for a network with millions or billions of parameters? Backpropagation computes the entire gradient in one backward pass through the network, in time roughly equal to one forward pass.",
          "Think of the network as a graph where nodes are operations and edges carry tensors. The forward pass flows data forward to compute the loss; the backward pass flows derivatives backward, multiplying local Jacobians along each edge. Every modern framework (PyTorch, JAX, TensorFlow) implements this as automatic differentiation.",
        ],
        diagram: {
          id: "backprop-flow",
          caption:
            "Fig 1.4 — Forward, activations flow left → right to the loss; backward, the error signal δ flows right → left, and every weight's gradient is read off locally.",
        },
      },
      {
        paragraphs: [
          "Concretely, set $\\mathbf{a}^{(0)} = \\mathbf{x}$ and for each layer compute $\\mathbf{z}^{(\\ell)} = W^{(\\ell)}\\mathbf{a}^{(\\ell-1)} + \\mathbf{b}^{(\\ell)}$ and $\\mathbf{a}^{(\\ell)} = \\sigma(\\mathbf{z}^{(\\ell)})$, caching each. Define the error signal at a layer as $\\boldsymbol{\\delta}^{(\\ell)} = \\partial L / \\partial \\mathbf{z}^{(\\ell)}$. For a softmax output with cross-entropy loss, the output error simplifies beautifully:",
        ],
        equations: ["\\boldsymbol{\\delta}^{(L)} = \\hat{\\mathbf{y}} - \\mathbf{y}"],
      },
      {
        paragraphs: ["Then propagate the error backward through the layers:"],
        equations: [
          "\\boldsymbol{\\delta}^{(\\ell)} = \\left( W^{(\\ell+1)\\top}\\,\\boldsymbol{\\delta}^{(\\ell+1)} \\right) \\odot \\sigma'(\\mathbf{z}^{(\\ell)})",
        ],
      },
      {
        paragraphs: [
          "and read off every parameter gradient as a cheap local product of the error signal and the layer's input activation:",
        ],
        equations: [
          "\\frac{\\partial L}{\\partial W^{(\\ell)}} = \\boldsymbol{\\delta}^{(\\ell)}\\,(\\mathbf{a}^{(\\ell-1)})^\\top, \\qquad \\frac{\\partial L}{\\partial \\mathbf{b}^{(\\ell)}} = \\boldsymbol{\\delta}^{(\\ell)}",
        ],
      },
      {
        paragraphs: [
          "These are the four equations of backpropagation — Chapter 2 derives each of them from first principles. A few failure modes recur often enough to name:",
        ],
        list: [
          "Vanishing gradients — when $\\sigma'$ is small (a saturated sigmoid), $\\delta$ shrinks exponentially as it propagates backward and early layers barely learn. Mitigated by ReLU, careful initialization, normalization, and residual connections.",
          "Exploding gradients — the opposite: gradients grow exponentially and parameters blow up to NaN. Mitigated by gradient clipping (capping the gradient norm) and good initialization.",
          "Initialization matters — starting all weights at zero is fatal: every neuron in a layer computes the same thing and receives the same gradient, so they never differentiate. Random initialization with carefully chosen variance is the standard.",
        ],
      },
      {
        heading: "Optimizers",
        paragraphs: [
          "Training navigates high-dimensional, non-convex loss surfaces, and the optimizer chooses how. The lineage runs from plain SGD to the adaptive methods that dominate today.",
        ],
        list: [
          "SGD — sample a mini-batch (typical sizes 32–256), compute its gradient, step against it. Cheap and noisy; the noise often helps escape shallow minima and saddles.",
          "Momentum — a velocity vector averages out oscillations (typically $\\beta = 0.9$).",
          "Nesterov (NAG) — look ahead with the momentum step first, compute the gradient there, then correct. Slightly faster convergence.",
          "AdaGrad — give each parameter its own learning rate, scaled by $1/\\sqrt{\\text{accumulated squared gradients}}$. Great for sparse features, but the effective rate monotonically decays to zero.",
          "RMSProp — fixes AdaGrad's decay by using an exponentially-decaying average of squared gradients instead of a sum.",
        ],
      },
      {
        paragraphs: [
          "Adam (Adaptive Moment Estimation) combines momentum (first moment) with RMSProp's adaptive scaling (second moment), with bias correction for the zero-initialized averages. It is the de facto default:",
        ],
        equations: [
          "\\begin{aligned} m_t &= \\beta_1 m_{t-1} + (1-\\beta_1)\\,g_t \\\\ v_t &= \\beta_2 v_{t-1} + (1-\\beta_2)\\,g_t^2 \\\\ \\hat{m}_t &= \\frac{m_t}{1-\\beta_1^t}, \\quad \\hat{v}_t = \\frac{v_t}{1-\\beta_2^t} \\\\ \\theta_{t+1} &= \\theta_t - \\eta\\,\\frac{\\hat{m}_t}{\\sqrt{\\hat{v}_t} + \\epsilon} \\end{aligned}",
        ],
      },
      {
        paragraphs: [
          "Typical values are $\\beta_1 = 0.9$, $\\beta_2 = 0.999$, $\\epsilon = 10^{-8}$. AdamW is a small but important fix: in plain Adam, L2 weight decay gets scaled by the adaptive rate (wrong); AdamW decouples it, applying the decay directly. AdamW is the actual default for transformers and LLMs:",
        ],
        equations: [
          "\\theta_{t+1} = \\theta_t - \\eta\\left( \\frac{\\hat{m}_t}{\\sqrt{\\hat{v}_t} + \\epsilon} + \\lambda\\theta_t \\right)",
        ],
      },
      {
        heading: "Learning-rate schedules",
        paragraphs: [
          "The learning rate is arguably the single most important hyperparameter, and a fixed value is rarely optimal — you want big steps early and small steps near a minimum.",
        ],
        list: [
          "Step decay — drop $\\eta$ by a factor every $N$ epochs.",
          "Exponential decay — $\\eta_t = \\eta_0\\,\\gamma^t$ for $\\gamma < 1$.",
          "Cosine annealing — $\\eta$ follows a cosine curve from $\\eta_{\\max}$ down to $\\eta_{\\min}$ over the run. Very popular for transformers.",
          "Warmup — start tiny and linearly ramp up over the first few thousand steps. Critical for transformers, where large initial Adam steps destabilize the variance estimates.",
          "Warmup + cosine decay — the standard combo for modern large-model training.",
        ],
      },
      {
        heading: "Regularization",
        paragraphs: [
          "Regularization is anything that narrows the generalization gap — making test performance closer to training performance — usually by discouraging the model from fitting noise.",
        ],
        list: [
          "L2 (weight decay) — add $\\lambda\\lVert\\theta\\rVert^2$ to the loss. Penalizes large weights; equivalent to a Gaussian prior.",
          "L1 — add $\\lambda\\lVert\\theta\\rVert_1$. Encourages sparse weights (many exactly zero); useful for feature selection.",
          "Dropout — randomly zero a fraction of activations during training ($p = 0.1$–$0.5$). Forces redundant, robust representations.",
          "Early stopping — halt when validation loss stops improving.",
          "Data augmentation — apply label-preserving transforms (crops, flips, color jitter; back-translation for text) to enlarge the dataset and bake in invariances.",
          "Label smoothing — replace one-hot targets with soft ones to curb overconfidence and improve calibration.",
          "Mixup / CutMix — train on linear combinations of pairs of examples and labels. Strong regularizers for vision.",
        ],
      },
      {
        heading: "Normalization",
        paragraphs: [
          "Normalization layers stabilize training by controlling the distribution of activations and gradients — arguably the biggest advance since backprop. The common idea: rescale activations to zero mean and unit variance, then learn a scale $\\gamma$ and shift $\\beta$ to undo it when useful.",
        ],
        equations: [
          "\\hat{x}_i = \\frac{x_i - \\mu_B}{\\sqrt{\\sigma_B^2 + \\epsilon}}, \\qquad y_i = \\gamma\\hat{x}_i + \\beta",
        ],
      },
      {
        list: [
          "Batch Norm — normalize across the batch dimension. Dramatically accelerates CNN training, but needs reasonable batch sizes and behaves differently at train vs test time.",
          "Layer Norm — normalize across features instead of the batch. No batch-size dependence; standard in transformers.",
          "RMSNorm — a cheaper LayerNorm that drops the mean subtraction and only divides by the root-mean-square. Used in LLaMA and many modern LLMs.",
          "Group Norm — normalize within groups of channels; useful for small batches.",
          "Instance Norm — normalize per-sample, per-channel; used in style transfer.",
        ],
      },
      {
        heading: "Initialization",
        paragraphs: [
          "How you initialize weights matters enormously — bad initialization causes vanishing or exploding activations before training even begins.",
        ],
        list: [
          "Zero — fatal. All neurons compute the same thing and receive the same gradient, so symmetry is never broken.",
          "Random Gaussian (small variance) — better, but too small and activations shrink through layers; too large and they explode.",
          "Xavier / Glorot — variance $2/(n_{\\text{in}} + n_{\\text{out}})$. Derived for tanh and unit-variance signals.",
          "He — variance $2/n_{\\text{in}}$. Designed for ReLU (which halves the variance by zeroing negatives). The standard for ReLU networks.",
          "Orthogonal — initialize weight matrices to be orthogonal, preserving gradient norms; helps very deep or recurrent networks.",
        ],
      },
      {
        heading: "Architectural ideas that scale",
        paragraphs: [
          "A handful of structural ideas, layered on top of the basics, are what make very large networks trainable and efficient.",
        ],
        list: [
          "Residual / skip connections — compute $\\mathbf{a}^{(\\ell)} = f(\\mathbf{a}^{(\\ell-1)}) + \\mathbf{a}^{(\\ell-1)}$. The identity shortcut lets gradients flow straight back, making networks with hundreds of layers trainable. This single idea (ResNet, 2015) underlies every modern deep architecture, transformers included.",
          "Gating — learnable multiplicative gates that control information flow (LSTM / GRU gates, GLU in transformers).",
          "Attention — let the network weight all parts of the input by learned relevance; the core of the transformer (Chapter 4).",
          "Mixture of Experts (MoE) — replace a dense layer with many experts and a router that sends each token to a few. Grows parameters without proportional compute.",
          "Mixed precision — compute in 16-bit (bf16) for speed and memory while keeping a master copy in fp32. Roughly 2× faster with no quality loss.",
          "Gradient accumulation & checkpointing — simulate larger batches, or trade compute for memory by recomputing activations in the backward pass. Distributed training (data / tensor / pipeline / ZeRO-FSDP) splits work across devices when a model or dataset doesn't fit.",
        ],
      },
      {
        heading: "Reading the loss curves",
        paragraphs: [
          "A trained intuition for what training curves mean is one of the most valuable skills in deep learning.",
        ],
        diagram: {
          id: "train-val-loss",
          caption:
            "Fig 1.5 — The classic overfitting signature: training loss keeps falling while validation loss turns back up. The early-stopping point is the validation minimum.",
        },
      },
      {
        list: [
          "Loss not decreasing at all — learning rate too low, dead activations, a bug in the loss, misaligned labels, or gradients not flowing.",
          "Loss explodes to NaN — learning rate too high, exploding gradients, or numerical instability like $\\log(0)$. Clip gradients and lower the rate.",
          "Train loss falls but validation loss rises — classic overfitting. Add regularization, get more data, shrink the model, or stop earlier.",
          "Both plateau high — underfitting. Bigger model, better features, more training, less regularization.",
          "Loss oscillates wildly — learning rate too high or batch size too small.",
        ],
      },
      {
        paragraphs: [
          "Sanity checks worth doing first: can the model overfit a single batch (if not, something is fundamentally broken)? Does the initial loss match the value for random predictions ($\\log K$ for $K$-class cross-entropy)? Are gradient magnitudes reasonable across all layers?",
        ],
      },
    ],
  },
  {
    slug: "chapter-2-advanced-math",
    number: "2",
    title: "Advanced Math Behind Deep Learning",
    summary:
      "Matrix calculus and the four equations of backpropagation, derived from the ground up.",
    sections: [
      {
        paragraphs: [
          "Coming soon — the full mathematical derivation of backpropagation.",
        ],
      },
    ],
  },
  {
    slug: "chapter-3-inference-engineering-and-compute",
    number: "3",
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
    slug: "chapter-4-transformers",
    number: "4",
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
    slug: "chapter-5-vision",
    number: "5",
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
    slug: "chapter-6-agentic-engineering",
    number: "6",
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
