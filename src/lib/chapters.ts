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
          "Chapter 1 stated the four equations of backpropagation and used them. This chapter builds them from the math up. Three prerequisites sit in the background: working linear algebra (the matrix–vector product, the transpose, the dot product, and the element-wise / Hadamard product $\\odot$); single-variable calculus, above all the chain rule; and partial derivatives.",
          "The whole story in one paragraph: a neural network is a function. Feed it an input $\\mathbf{x}$ and it produces $\\hat{\\mathbf{y}}$ by stacking layers, each a matrix multiply, a bias, and a nonlinearity. To train it is to choose the weights and biases so that $\\hat{\\mathbf{y}}$ is close to the true $\\mathbf{y}$, measured by a cost $C$. Gradient descent nudges every parameter in the direction that lowers $C$. Backpropagation is the algorithm that computes all of those gradients in one backward pass, instead of doing a separate derivative for each parameter.",
        ],
      },
      {
        heading: "Notation",
        paragraphs: [
          "Notation matters more here than almost anywhere, because so many indices fly around. The conventions used throughout:",
        ],
        list: [
          "Lowercase italic ($x$, $w$, $b$) are scalars; lowercase bold ($\\mathbf{x}$, $\\mathbf{w}$) are column vectors; uppercase ($W$) are matrices.",
          "A superscript $(\\ell)$ is the layer index — so $W^{(\\ell)}$, $\\mathbf{a}^{(\\ell)}$. The parentheses keep it distinct from an exponent.",
          "$w^{(\\ell)}_{jk}$ is the weight into neuron $j$ of layer $\\ell$, from neuron $k$ of layer $\\ell-1$. Destination first, source second.",
          "$z^{(\\ell)}_j$ is the weighted input (pre-activation); $a^{(\\ell)}_j = \\sigma(z^{(\\ell)}_j)$ is the activation; $C$ is the cost.",
          "$\\delta^{(\\ell)}_j = \\partial C / \\partial z^{(\\ell)}_j$ is the error of a neuron — the quantity backprop propagates.",
        ],
      },
      {
        heading: "Gradients and Jacobians",
        paragraphs: [
          "For a scalar function $f : \\mathbb{R}^n \\to \\mathbb{R}$, the gradient is the column vector of partial derivatives. It points in the direction of steepest ascent, so $-\\nabla f$ points downhill — which is exactly why gradient descent walks in the $-\\nabla f$ direction.",
        ],
        equations: [
          "\\nabla f = \\left[ \\frac{\\partial f}{\\partial x_1},\\ \\frac{\\partial f}{\\partial x_2},\\ \\dots,\\ \\frac{\\partial f}{\\partial x_n} \\right]^\\top",
        ],
      },
      {
        paragraphs: [
          "For a vector-valued function $\\mathbf{f} : \\mathbb{R}^n \\to \\mathbb{R}^m$, stack the gradient of each output into the Jacobian — an $m \\times n$ matrix whose rows are outputs and columns are inputs. The gradient is just the special case $m = 1$.",
        ],
        equations: [
          "J = \\frac{\\partial \\mathbf{f}}{\\partial \\mathbf{x}}, \\qquad J_{ij} = \\frac{\\partial f_i}{\\partial x_j}",
        ],
      },
      {
        paragraphs: [
          "One fact gets used over and over: for an element-wise function — each output depends only on the same-index input — the Jacobian is diagonal, $\\mathrm{diag}(g'(x_1), \\dots, g'(x_n))$. And a diagonal Jacobian acts like element-wise multiplication inside a chain-rule product: $\\mathrm{diag}(\\mathbf{v})\\,\\mathbf{w} = \\mathbf{v} \\odot \\mathbf{w}$. That is why every $\\mathrm{diag}(\\cdot)$ collapses into a $\\odot$ in the final equations. Activation functions are element-wise, so this happens at every layer.",
        ],
      },
      {
        heading: "The chain rule, as a sum over paths",
        paragraphs: [
          "The scalar chain rule generalizes in a way that makes the matrix version obvious. If $y$ depends on $x$ through several intermediates $u_p$, the total derivative sums over every path from $x$ to $y$:",
        ],
        equations: [
          "\\frac{dy}{dx} = \\sum_p \\frac{\\partial y}{\\partial u_p}\\,\\frac{d u_p}{dx}",
        ],
        diagram: {
          id: "sum-over-paths",
          caption:
            "Fig 2.1 — x influences y through two intermediates. The chain rule sums the product of partials along each path.",
        },
      },
      {
        paragraphs: [
          "The vector version is a product of Jacobians. If $\\mathbf{y} = \\mathbf{f}(\\mathbf{u})$ and $\\mathbf{u} = \\mathbf{g}(\\mathbf{x})$, then the dimensions chain cleanly ($m \\times k$ times $k \\times n$ gives $m \\times n$), and writing out a single entry recovers the sum over paths:",
        ],
        equations: [
          "\\frac{\\partial \\mathbf{y}}{\\partial \\mathbf{x}} = \\frac{\\partial \\mathbf{y}}{\\partial \\mathbf{u}}\\,\\frac{\\partial \\mathbf{u}}{\\partial \\mathbf{x}}",
        ],
      },
      {
        paragraphs: [
          "Backpropagation is, in essence, this: multiply Jacobians together as you traverse the network from the output back to the input.",
        ],
      },
      {
        heading: "Part II: Forward propagation",
        paragraphs: [
          "A neuron computes $z = \\mathbf{w}^\\top\\mathbf{x} + b$ and then $a = \\sigma(z)$. When you stack many neurons in many layers, the bookkeeping is the whole reason matrix notation buys you anything — and the key choice is the destination-first weight index $w^{(\\ell)}_{jk}$.",
        ],
        diagram: {
          id: "weight-indexing",
          caption:
            "Fig 2.2 — w⁽ˡ⁾₍ⱼₖ₎ is the weight into destination neuron j of layer ℓ from source neuron k of layer ℓ−1.",
        },
      },
      {
        paragraphs: [
          "Destination-first looks backwards, but it is exactly what makes the matrix–vector product $W^{(\\ell)}\\mathbf{a}^{(\\ell-1)}$ produce, in its $j$-th entry, the weighted sum that neuron $j$ wants — no transposes needed. The weight matrix $W^{(\\ell)}$ has shape $n_\\ell \\times n_{\\ell-1}$, and the bias $\\mathbf{b}^{(\\ell)} \\in \\mathbb{R}^{n_\\ell}$. A whole layer is then one line, and the entire network is a deeply nested function:",
        ],
        equations: [
          "\\mathbf{z}^{(\\ell)} = W^{(\\ell)}\\mathbf{a}^{(\\ell-1)} + \\mathbf{b}^{(\\ell)}, \\qquad \\mathbf{a}^{(\\ell)} = \\sigma(\\mathbf{z}^{(\\ell)})",
          "\\hat{\\mathbf{y}} = \\sigma\\!\\left( W^{(L)} \\sigma\\!\\left( \\cdots \\sigma\\!\\left( W^{(1)}\\mathbf{x} + \\mathbf{b}^{(1)} \\right) \\cdots \\right) + \\mathbf{b}^{(L)} \\right)",
        ],
      },
      {
        heading: "Part III: Differentiating the network",
        paragraphs: [
          "Take mean squared error as the cost. Working with a single training example keeps the indices clean — the full-dataset cost is just the average, and the gradient of an average is the average of the gradients, so nothing changes structurally:",
        ],
        equations: ["C = \\tfrac{1}{2}\\lVert \\mathbf{y} - \\hat{\\mathbf{y}} \\rVert^2"],
      },
      {
        paragraphs: [
          "We need the derivative of each operation a neuron performs. Three building blocks cover them. The element-wise (Hadamard) product has a diagonal Jacobian, $\\partial(\\mathbf{u}\\odot\\mathbf{v})/\\partial\\mathbf{u} = \\mathrm{diag}(\\mathbf{v})$. Addition — adding the bias — passes gradients straight through, an identity Jacobian. A sum collapses to the all-ones vector. And the activation, applied element-wise, has Jacobian $\\partial\\mathbf{a}/\\partial\\mathbf{z} = \\mathrm{diag}(\\sigma'(\\mathbf{z}))$.",
        ],
      },
      {
        paragraphs: [
          "The sigmoid's derivative is famously clean: if you already computed $\\sigma(z)$ on the forward pass, you have essentially already computed $\\sigma'(z)$ — no exponentials needed on the way back.",
        ],
        equations: ["\\sigma'(z) = \\sigma(z)\\,\\bigl(1 - \\sigma(z)\\bigr)"],
        diagram: {
          id: "sigmoid-derivative",
          caption:
            "Fig 2.3 — The sigmoid and its derivative σ′ = σ(1−σ), which peaks at just 0.25 — the seed of the vanishing-gradient problem.",
        },
      },
      {
        heading: "The slow way (and why it doesn't scale)",
        paragraphs: [
          "For the smallest network that still shows the structure — one neuron per layer, two layers — the chain rule gives the two weight gradients directly:",
        ],
        equations: [
          "\\frac{\\partial C}{\\partial w^{(2)}} = (a^{(2)} - y)\\,\\sigma'(z^{(2)})\\,a^{(1)}",
          "\\frac{\\partial C}{\\partial w^{(1)}} = (a^{(2)} - y)\\,\\sigma'(z^{(2)})\\,w^{(2)}\\,\\sigma'(z^{(1)})\\,x",
        ],
      },
      {
        paragraphs: [
          "Two patterns jump out. Reuse: the leading factors of $\\partial C/\\partial w^{(1)}$ are exactly what we already computed for $\\partial C/\\partial w^{(2)}$. Structural rhythm: every gradient is an error at the end, $(a^{(2)} - y)$, propagated backward and multiplied at the final step by the input that fed the weight in question. And each layer contributes one $\\sigma'$ factor — since the sigmoid's derivative maxes out at 0.25, the product shrinks fast with depth (the vanishing gradient again).",
          "Doing this naively across a full network costs about $O(L^2 n^3)$ per example and recomputes the same intermediate quantities over and over. The fix is to identify one reusable quantity and propagate it backward — the error of a node.",
        ],
      },
      {
        heading: "Part IV: The four equations",
        paragraphs: [
          "Define the error of a neuron as the sensitivity of the cost to its pre-activation, $\\delta^{(\\ell)}_j = \\partial C / \\partial z^{(\\ell)}_j$. We hinge on $z$ rather than $a$ because it sits exactly between the linear part (weights, bias, previous activations) and the nonlinear part (the activation), so everything upstream becomes easy once $\\delta$ is known. Backprop computes $\\boldsymbol{\\delta}^{(L)}$, then $\\boldsymbol{\\delta}^{(L-1)}$, and so on backward, reading off the gradients along the way.",
        ],
        diagram: {
          id: "error-backprop",
          caption:
            "Fig 2.4 — BP2 in pictures: the next layer's error is pulled back through Wᵀ, then gated by σ′(z) — neurons with saturated activations receive almost no signal.",
        },
      },
      {
        paragraphs: [
          "BP1 — the output-layer error is the cost gradient times the local activation slope. For MSE this is $(\\mathbf{a}^{(L)} - \\mathbf{y}) \\odot \\sigma'(\\mathbf{z}^{(L)})$:",
        ],
        equations: [
          "\\boldsymbol{\\delta}^{(L)} = \\nabla_{\\mathbf{a}^{(L)}} C \\,\\odot\\, \\sigma'(\\mathbf{z}^{(L)}) \\tag{BP1}",
        ],
      },
      {
        paragraphs: [
          "BP2 — the keystone. Propagate the error one layer back by multiplying with the transpose of the next layer's weight matrix, then take an element-wise product with the local slope:",
        ],
        equations: [
          "\\boldsymbol{\\delta}^{(\\ell)} = \\left( (W^{(\\ell+1)})^\\top \\boldsymbol{\\delta}^{(\\ell+1)} \\right) \\odot \\sigma'(\\mathbf{z}^{(\\ell)}) \\tag{BP2}",
        ],
      },
      {
        paragraphs: [
          "The transpose appears because we sum over the destination index of layer $\\ell+1$. Geometrically, $W^\\top$ redistributes the error to each upstream neuron in proportion to how much it contributed, and the $\\odot\\,\\sigma'(\\mathbf{z}^{(\\ell)})$ scales it by how much that neuron's $z$ was actually affecting its $a$. Saturated neurons ($\\sigma' \\approx 0$) receive almost no error — that is precisely why saturated sigmoids cause vanishing gradients.",
        ],
      },
      {
        paragraphs: [
          "BP3 and BP4 — the parameter gradients now fall out for free. The bias gradient is the error itself; the weight gradient is the outer product of the error and the incoming activation:",
        ],
        equations: [
          "\\frac{\\partial C}{\\partial \\mathbf{b}^{(\\ell)}} = \\boldsymbol{\\delta}^{(\\ell)} \\tag{BP3}",
          "\\frac{\\partial C}{\\partial W^{(\\ell)}} = \\boldsymbol{\\delta}^{(\\ell)}\\,(\\mathbf{a}^{(\\ell-1)})^\\top \\tag{BP4}",
        ],
      },
      {
        paragraphs: [
          "Intuitively (BP4): to find how the cost depends on one weight, multiply two numbers — the activation it receives and the error of the neuron it feeds.",
        ],
      },
      {
        heading: "The backpropagation algorithm",
        paragraphs: ["Put together, one training example runs through five steps:"],
        list: [
          "Forward pass — set $\\mathbf{a}^{(0)} = \\mathbf{x}$ and compute $\\mathbf{z}^{(\\ell)}, \\mathbf{a}^{(\\ell)}$ for every layer, caching them.",
          "Output error — $\\boldsymbol{\\delta}^{(L)} = \\nabla_{\\mathbf{a}^{(L)}} C \\odot \\sigma'(\\mathbf{z}^{(L)})$.",
          "Backpropagate — for $\\ell = L-1, \\dots, 1$: $\\boldsymbol{\\delta}^{(\\ell)} = ((W^{(\\ell+1)})^\\top \\boldsymbol{\\delta}^{(\\ell+1)}) \\odot \\sigma'(\\mathbf{z}^{(\\ell)})$.",
          "Read off gradients — $\\partial C/\\partial \\mathbf{b}^{(\\ell)} = \\boldsymbol{\\delta}^{(\\ell)}$ and $\\partial C/\\partial W^{(\\ell)} = \\boldsymbol{\\delta}^{(\\ell)}(\\mathbf{a}^{(\\ell-1)})^\\top$.",
          "Update — step each parameter against its gradient. For a mini-batch, average the gradients over examples first.",
        ],
      },
      {
        paragraphs: [
          "That is the entire mathematical content of backpropagation. The cost is now linear in the number of parameters instead of quadratic. Every architecture in the chapters ahead — CNNs, transformers, diffusion models — trains with exactly this procedure; only the structure of the layers changes.",
        ],
      },
    ],
  },
  {
    slug: "chapter-3-inference-engineering-and-compute",
    number: "3",
    title: "AI Hardware and Compute",
    summary:
      "From the CPU up through GPUs and TPUs to how a model scales across thousands of chips.",
    sections: [
      {
        paragraphs: [
          "Every modern frontier model is the product of a hardware stack working in concert — trillions of parameters, thousands of chips, all coordinating across high-speed interconnects to multiply matrices very, very fast. This chapter starts at the CPU, builds up through GPUs and TPUs, and ends with how a single model is split across an entire data center.",
        ],
      },
      {
        heading: "Three kinds of compute: the CPU",
        paragraphs: [
          "A CPU reads instructions and data from memory, computes, and writes results back — largely sequentially. Memory access is far slower than arithmetic, a gap so fundamental it has a name: the von Neumann bottleneck. The processor spends more time waiting for data than computing.",
          "CPUs fight this with elaborate machinery — deep instruction pipelines, branch predictors, multiple cache levels (L1/L2/L3), out-of-order execution — all to keep a small number of cores fed. The result is flexibility: a CPU can run a database, an OS, a game, or a neural network. But each core is large and complex, so a chip holds only a few dozen. For highly parallel, arithmetic-heavy work like neural networks, most of that flexibility is wasted.",
        ],
      },
      {
        heading: "The GPU",
        paragraphs: [
          "A GPU takes the opposite bet: strip out most of the control logic and caches, and replace one big core with thousands of small arithmetic units (ALUs) — 2,500 to 5,000+. This is perfect for workloads where the same operation runs over millions of independent data points. A multiplication of two 4096×4096 matrices is 16 million independent multiply-accumulates; a GPU eats this for breakfast.",
          "It is still a general-purpose processor, though — every ALU reads operands from registers or shared memory. The von Neumann bottleneck is reduced by the massively parallel memory system, not eliminated.",
        ],
        diagram: {
          id: "cpu-vs-gpu",
          caption:
            "Fig 3.1 — A CPU spends its silicon on a few complex cores; a GPU spends it on thousands of simple ALUs running in parallel.",
        },
      },
      {
        heading: "Inside a GPU: streaming multiprocessors",
        paragraphs: [
          "A GPU's fundamental compute unit is the Streaming Multiprocessor (SM). Each SM packs CUDA cores (basic ALUs, one floating-point op per clock), Tensor Cores (specialized matrix multiply-accumulate units), special function units (sin, cos, exp, sqrt), warp schedulers, a register file, and shared memory / L1 cache. A data-center GPU like the H100 has 132 SMs, each with 128 CUDA cores and 4 fourth-generation tensor cores — over 16,000 CUDA cores and 528 tensor cores on one chip.",
          "CUDA (Compute Unified Device Architecture) is NVIDIA's platform for general-purpose GPU computing; a CUDA core is its fundamental parallel processing unit.",
        ],
      },
      {
        heading: "Threads, warps, and SIMT",
        paragraphs: [
          "GPU code is written as a kernel — a function describing what one thread does. Launching a kernel starts millions of threads, organized into blocks, which are organized into a grid. Threads in a block share fast on-chip memory and can synchronize; blocks are independent and may run in any order.",
          "In hardware, threads execute in warps of 32. A warp runs in SIMT mode — Single Instruction, Multiple Threads — so all 32 share one instruction fetch and decode, just on different data. The consequence: branching is expensive. If half a warp takes the if and half the else, the warp runs both paths sequentially with the inactive threads masked off. This is warp divergence, and avoiding it is a major theme of GPU optimization. Neural networks barely branch, which is part of why they map so well to GPUs.",
        ],
      },
      {
        heading: "Tensor cores and precision",
        paragraphs: [
          "Tensor cores do the heavy lifting for deep learning: a single core performs an entire small matrix multiply-accumulate per clock, $D = A\\,B + C$. The dominant operation in deep learning is GEMM (general matrix multiply), and a large matmul decomposes into many small tiles that map directly onto tensor cores — the source of the roughly 1000× single-GPU inference speedup since 2017.",
          "Modern tensor cores support multiple precisions in hardware: FP32 (full), FP16 and BF16 (half; BF16 keeps FP32's exponent range), FP8, and INT8. Each step down roughly doubles throughput and halves memory traffic. Quantization is the technique of mapping high-precision weights/activations to lower-precision formats (e.g. INT8) to shrink memory and speed up inference, at the cost of some precision.",
        ],
        equations: ["D = A\\,B + C \\quad\\text{(a tensor-core tile)}"],
      },
      {
        heading: "The memory hierarchy",
        paragraphs: [
          "Performance lives and dies by where data sits. From fastest/smallest to slowest/largest: registers, shared memory / L1, L2 cache, HBM (the GPU's main memory, also called VRAM), and host RAM over PCIe. The gap is enormous — registers and shared memory are about 100× faster than HBM. Most GPU optimization is the art of keeping data in the fast levels and minimizing trips to HBM.",
        ],
        diagram: {
          id: "memory-hierarchy",
          caption:
            "Fig 3.2 — The GPU memory hierarchy. Each level down is larger but slower; registers and shared memory are ~100× faster than HBM.",
        },
      },
      {
        heading: "The CUDA software moat",
        paragraphs: [
          "CUDA's significance isn't only performance — it's the decade of optimized libraries built on top, which is what your framework actually calls into: cuBLAS (linear algebra), cuDNN (deep-net primitives — every PyTorch convolution ends up here), NCCL (multi-GPU communication for distributed training), TensorRT (inference optimization), plus Thrust, cuFFT, cuRAND, cuSPARSE. When you write model.cuda(), you hand your tensors to this entire stack.",
          "This is why NVIDIA's moat is hard to dislodge: the hardware can be replicated, but the libraries, developer mindshare, and framework integrations can't be — quickly. AMD's ROCm and Intel's oneAPI are catching up, but PyTorch and TensorFlow still target CUDA first by a wide margin. A useful mental model when reasoning about speed: big tensor ops are great (millions of parallel threads); tiny ops are wasteful (kernel launch overhead dwarfs the work — hence kernel fusion); memory layout matters (coalesced, consecutive accesses get full bandwidth); and communication between blocks is expensive.",
        ],
      },
      {
        heading: "TPUs and the systolic array",
        paragraphs: [
          "Google decided even GPUs weren't specialized enough and built the TPU (Tensor Processing Unit) from scratch for neural networks. Confusingly, Google also calls its compute unit a TensorCore — different from NVIDIA's. Each has three pieces: a Matrix Multiplication Unit (MXU, a systolic array — 256×256 multiply-accumulators in v6e/v7), a vector unit (activations, softmax, norms), and a scalar unit (control flow, addressing).",
          "The systolic array is the TPU's defining feature. Values of A flow in from the left moving right; values of B flow in from the top moving down; each cell multiplies what it sees, adds to a running total, and passes both operands to its neighbors. The critical property: data is loaded once and reused many times as it walks across the array — no memory access happens during the computation. It is a very large, very specialized GEMM engine wired directly in silicon.",
        ],
        diagram: {
          id: "systolic-array",
          caption:
            "Fig 3.3 — A TPU systolic array. A enters from the left, B from the top; each cell multiply-accumulates and passes operands on, so data is loaded once and reused across the whole grid.",
        },
      },
      {
        paragraphs: [
          "A subtle but important detail: TPU MXUs take bfloat16 inputs but accumulate in FP32. BF16 has FP32's exponent range with a smaller mantissa — great for inputs with wide dynamic range, bad for accumulation where small errors compound. Low precision for the multiplies, high precision for the adds: this pattern is now standard across all AI hardware, NVIDIA's tensor cores included. Recent TPUs also add SparseCores for the gather-heavy embedding lookups in recommendation systems.",
        ],
      },
      {
        heading: "From chips to pods",
        paragraphs: [
          "A single chip is rarely enough. Google connects chips into a slice via a custom high-speed Inter-Chip Interconnect (ICI); a TPU cube is a 4×4×4 topology of 64 chips (the 3D mesh maps gradient-communication patterns efficiently); a pod links thousands of chips; and multislice extends beyond a pod over the slower data-center network (DCN). Training a frontier model isn't done on one chip — it's thousands of chips constantly sharing gradients, and the interconnect speed can dominate the compute. You don't write TPU code directly: you write JAX, PyTorch/XLA, or TensorFlow, and the XLA compiler lowers your tensor ops to TPU instructions.",
        ],
      },
      {
        heading: "Scaling a model across many chips",
        paragraphs: [
          "Training a GPT-class model requires thousands of accelerators working in concert. The main parallelism strategies, usually combined:",
        ],
        diagram: {
          id: "parallelism",
          caption:
            "Fig 3.4 — Three ways to split work: replicate the model (data), split a layer (tensor), or split the network depth-wise (pipeline).",
        },
      },
      {
        list: [
          "Data parallelism — every chip holds a full copy of the model; the batch is split across chips, and gradients are averaged (all-reduce) before each update. Simple, until the model stops fitting on one chip.",
          "Tensor parallelism — split individual layers across chips (a weight matrix is cut into chunks). Needs very fast interconnect, because chunks communicate within every forward and backward pass.",
          "Pipeline parallelism — split the network depth-wise (chip 0 holds layers 1–10, chip 1 holds 11–20). Saves memory but introduces bubble overhead at the start and end of each batch.",
          "FSDP / ZeRO — shard the parameters, gradients, and optimizer states across chips and gather them on demand. Data-parallel simplicity with far lower per-chip memory. Real frontier training combines several of these, tuned to the model shape and cluster topology.",
        ],
      },
      {
        heading: "Practical numbers and the roofline",
        paragraphs: [
          "A few numbers recur. FLOPs measure raw throughput — an H100 does roughly 1,000 teraflops in FP16/BF16 and twice that in FP8, but real workloads hit only 30–60% of peak. Memory bandwidth is often the actual bottleneck (the H100 has ~3 TB/s of HBM). Whether you're limited by compute or by bandwidth is captured by the roofline model.",
        ],
        diagram: {
          id: "roofline",
          caption:
            "Fig 3.5 — The roofline. Below the ridge point an operation is memory-bound (limited by bandwidth); above it, compute-bound (limited by peak FLOPs).",
        },
      },
      {
        paragraphs: [
          "Arithmetic intensity — the ratio of operations to bytes moved — decides which side you're on. Large matmuls have high intensity (each loaded value is reused many times), so they are compute-bound and benefit from peak FLOPs. Element-wise operations have low intensity and are memory-bound — which is exactly why operator fusion matters, combining many small ops into one kernel to reuse loaded values. As a rule, inference for a small batch is memory-bandwidth bound (you reload all the weights per token), while training is more compute-bound.",
          "The arc, in one breath: CPUs are universal but slow at parallel math; GPUs trade some flexibility for thousands of cores and happen to be perfect for matrix multiplication; CUDA made GPUs programmable and built a software moat almost as valuable as the silicon; and TPUs go further with purpose-built systolic arrays networked into data-center-scale pods. When a training run is mysteriously slow, the answer is almost always somewhere in this hierarchy — a memory bottleneck, an interconnect bottleneck, a precision issue, or kernel-launch overhead.",
        ],
      },
    ],
  },
  {
    slug: "chapter-4-transformers",
    number: "4",
    title: "Transformers",
    summary:
      "Attention Is All You Need was published in 2017, and we're still living in its world.",
    sections: [
      {
        paragraphs: [
          "In 2017, eight researchers at Google published \"Attention Is All You Need,\" and machine learning was never the same. The Transformer they introduced underlies GPT, Claude, Gemini, LLaMA, and essentially every modern foundation model. To get there, it helps to see what came before and why each predecessor fell short.",
        ],
      },
      {
        heading: "Before transformers: RNNs",
        paragraphs: [
          "A feedforward network has a fixed input size and no notion of order, which makes it a dead end for sequences. Recurrent neural networks (RNNs) fixed this by feeding their own output back as input: a hidden state $\\mathbf{h}$ carries a running summary across timesteps, and the same weights are reused at every step, so the network handles arbitrary-length sequences.",
        ],
        equations: [
          "\\mathbf{h}_t = \\tanh(W_x \\mathbf{x}_t + W_h \\mathbf{h}_{t-1} + \\mathbf{b})",
        ],
        diagram: {
          id: "rnn-unroll",
          caption:
            "Fig 4.1 — An RNN unrolled over time. The hidden state threads context forward; the same weights apply at every step.",
        },
      },
      {
        paragraphs: [
          "RNNs gave networks memory, but it didn't last. Backpropagation through time multiplies the recurrent matrix once per step, so the gradient either vanishes (shrinks to nothing, the default with tanh) or explodes (blows up to NaN). In practice RNNs reliably learned dependencies of only 5–10 tokens, and the whole history had to be squeezed into one fixed-size hidden vector.",
        ],
      },
      {
        heading: "LSTMs and the memory highway",
        paragraphs: [
          "The LSTM (1997) was built to fix vanishing gradients. It adds a separate cell state $C_t$ — a memory highway that information can flow along with minimal interference — controlled by learnable gates: a forget gate decides what to erase, an input gate what to write, an output gate what to read. The critical line is the cell-state update, which is a gated add rather than a repeated matrix multiply, so gradients flow back across many steps:",
        ],
        equations: [
          "C_t = f_t \\odot C_{t-1} + i_t \\odot \\tilde{C}_t",
        ],
        diagram: {
          id: "lstm-cell",
          caption:
            "Fig 4.2 — An LSTM cell. When the forget gate is open and the input gate closed, information from far back flows through the cell state unchanged.",
        },
      },
      {
        paragraphs: [
          "The GRU (2014) is a simpler cousin that merges cell and hidden state and uses two gates instead of three. But two problems remained: training is inherently sequential (you can't parallelize across time, so GPUs sit idle), and long-range dependencies still degraded. In encoder–decoder setups for translation, the encoder also had to compress the entire source sentence into one fixed vector — an information bottleneck that hurt badly on long inputs.",
        ],
      },
      {
        heading: "Attention is born",
        paragraphs: [
          "Attention (Bahdanau, 2014) demolished the bottleneck. Instead of forcing the decoder to rely on one summary vector, it let the decoder look back at every encoder hidden state and decide which were relevant right now: score each, softmax the scores into weights that sum to 1, and take a weighted sum — a context vector. Translation quality jumped, especially on long sentences. The deeper lesson: direct token-to-token interaction, mediated by learned attention weights, beats threading everything through a recurrent state. The natural question Vaswani and coauthors asked: what if we keep only the attention and throw out the recurrence entirely?",
        ],
      },
      {
        heading: "The transformer, end to end",
        paragraphs: [
          "At the highest level a transformer takes a sequence in and produces a sequence out. Internally it splits into an encoder that processes the input in parallel and a decoder that generates the output one token at a time — in the original paper, stacks of six identical layers each. The decoder generates autoregressively: each step looks at what it has already produced and, via cross-attention, at the full encoder output.",
          "Modern LLMs like GPT are decoder-only — they keep the decoder stack and drop the encoder, since pure text generation needs no separate input stream. BERT is encoder-only, producing representations without generating. Inside the blocks, five mechanisms work together: attention (in a few variants), feed-forward networks, layer normalization, positional encoding, and residual connections.",
        ],
      },
      {
        heading: "Tokenization and embeddings",
        paragraphs: [
          "Computers work in numbers, humans in words, so text is first split into tokens — usually subword pieces, a balance between whole words and characters. Each token maps to an ID, and each ID indexes a row of a learned embedding matrix $W_{\\text{emb}} \\in \\mathbb{R}^{|V| \\times d}$ (vocabulary size by embedding dimension). The result is a sequence of dense vectors where semantically similar tokens sit close together — the actual input the transformer operates on.",
        ],
      },
      {
        heading: "Self-attention: Q, K, V",
        paragraphs: [
          "Self-attention lets each token gather context from every other token. Each token produces three vectors from its embedding via learned matrices: a query (what it's looking for), a key (what it offers), and a value (the content it contributes). The analogy is a search engine: your query is matched against keys, and the best matches return their values.",
        ],
        equations: [
          "Q = X W_Q, \\quad K = X W_K, \\quad V = X W_V",
        ],
        diagram: {
          id: "attention-qkv",
          caption:
            "Fig 4.3 — Scaled dot-product attention: score queries against keys, scale, softmax into weights, then take a weighted sum of values.",
        },
      },
      {
        paragraphs: [
          "Measure how well each query matches each key with a dot product, arranged into an $n \\times n$ score matrix. Two fixes make it usable: divide by $\\sqrt{d_k}$ so the scores don't grow with dimension (which would saturate the softmax and kill gradients), and softmax each row into a probability distribution. Multiplying those weights by the value matrix gives a new representation for each token that blends its own meaning with its context — the entire mechanism in one line:",
        ],
        equations: [
          "\\text{Attention}(Q, K, V) = \\text{softmax}\\!\\left( \\frac{Q K^\\top}{\\sqrt{d_k}} \\right) V",
        ],
      },
      {
        heading: "Multi-head attention",
        paragraphs: [
          "One attention pattern captures one kind of relationship. Multi-head attention runs $h$ of them in parallel (the original paper used $h = 8$), each with its own $W_Q, W_K, W_V$ operating on a smaller $d/h$-dimensional slice. The heads' outputs are concatenated and passed through a final projection $W_O$. Different heads specialize — some learn grammar, some coreference, some positional patterns — and the model decides what each learns through training.",
        ],
        equations: [
          "\\text{MultiHead}(Q,K,V) = \\text{Concat}(\\text{head}_1, \\dots, \\text{head}_h)\\,W_O",
        ],
        diagram: {
          id: "multi-head",
          caption:
            "Fig 4.4 — Multi-head attention. h heads each attend in a smaller subspace; their outputs are concatenated and mixed by Wₒ.",
        },
      },
      {
        heading: "Masked self-attention",
        paragraphs: [
          "In the decoder, the first attention layer is masked. During generation a token must not see the future, or training would be trivial — the model would just copy the next token and never learn to generate. A look-ahead mask sets every score above the diagonal to $-\\infty$ before the softmax, which turns those weights into exactly zero. This preserves the autoregressive property: the model writes strictly left to right.",
        ],
        diagram: {
          id: "causal-mask",
          caption:
            "Fig 4.5 — The causal mask. Positions above the diagonal are set to −∞ (→ 0 after softmax), so each token attends only to itself and earlier tokens.",
        },
      },
      {
        heading: "Cross-attention and the feed-forward network",
        paragraphs: [
          "After masked self-attention, the decoder still needs the input. Cross-attention is the bridge: the query comes from the decoder, the keys and values from the encoder output — so the decoder asks \"given what I've written, which input tokens are relevant?\" (Decoder-only models like GPT have no cross-attention, since there's no separate encoder.)",
          "Once attention has gathered context, the feed-forward network processes it, applied independently to each position. It's a two-layer MLP that expands to a larger dimension (the original used $d_{\\text{model}} = 512 \\to d_{\\text{ff}} = 2048$), applies a nonlinearity, and contracts back. The FFN holds most of a transformer's parameters — which is exactly why Mixture of Experts targets it.",
        ],
        equations: [
          "\\text{FFN}(x) = \\max(0,\\ x W_1 + b_1)\\,W_2 + b_2",
        ],
      },
      {
        heading: "Layer norm and residual connections",
        paragraphs: [
          "Two pieces hold deep stacks together. Layer normalization rescales each token's activations to zero mean and unit variance across its features, then learns a scale $\\gamma$ and shift $\\beta$ — stabilizing training without depending on batch size (unlike batch norm), which is why transformers use it.",
        ],
        equations: [
          "\\text{LayerNorm}(x) = \\gamma\\,\\frac{x - \\mu}{\\sqrt{\\sigma^2 + \\epsilon}} + \\beta",
        ],
      },
      {
        paragraphs: [
          "Residual connections (from ResNet) are why deep transformers train at all: a direct path bypasses each sublayer, so gradients flow straight back and each layer only has to learn a delta. Every sublayer is wrapped this way. (Modern models often use pre-norm — normalize before the sublayer — which is more stable for very deep networks.)",
        ],
        equations: ["\\text{output} = \\text{LayerNorm}(x + \\text{Sublayer}(x))"],
        diagram: {
          id: "transformer-block",
          caption:
            "Fig 4.6 — One encoder layer: multi-head attention and a feed-forward network, each wrapped in a residual connection and layer norm. Every layer has the same shape in and out, so you can stack as many as you want.",
        },
      },
      {
        heading: "Positional encoding",
        paragraphs: [
          "Self-attention treats its input as a set, not a sequence — \"I like cats\" and \"cats like I\" would look identical. Positional encodings fix this by injecting position into the embeddings before the first layer. The original transformer added sinusoids of different frequencies, giving each position a unique fingerprint and letting the model express relative offsets as linear functions:",
        ],
        equations: [
          "\\text{PE}_{(pos,\\,2i)} = \\sin\\!\\left(\\frac{pos}{10000^{2i/d}}\\right), \\quad \\text{PE}_{(pos,\\,2i+1)} = \\cos\\!\\left(\\frac{pos}{10000^{2i/d}}\\right)",
        ],
      },
      {
        paragraphs: [
          "Putting it together, one encoder layer takes embeddings-plus-positions of shape $(n, d)$, runs multi-head attention, adds and norms, runs the FFN, adds and norms, and outputs the same shape — so layers stack indefinitely. After the final layer, a linear projection maps each vector to vocabulary-size logits, and a softmax gives the next-token distribution. Train with cross-entropy against the true next token; at inference, sample (or take the argmax) and feed it back in.",
        ],
      },
      {
        heading: "Decoder-only, encoder-only, encoder–decoder",
        paragraphs: [
          "When the task is pure text generation, the input and output are the same sequence shifted by one, so you don't need two stacks. This realization gave us decoder-only models (GPT, LLaMA, Claude): a tall stack of masked-self-attention + FFN layers. Next-token prediction over a huge corpus turns out to be an extraordinarily general training signal — to predict the next token of code, a sonnet, or a proof, the model must understand programming, meter, and algebra.",
          "Encoder-only models (BERT) go the other way: bidirectional self-attention produces rich representations but doesn't generate. They're trained with masked language modeling — hide ~15% of tokens and predict them from both sides — and power embeddings, retrieval/reranking, and classification. Encoder–decoder models (T5, BART) keep both stacks and shine when input and output are clearly distinct sequences, like translation and summarization.",
        ],
      },
      {
        heading: "How modern models diverge",
        paragraphs: [
          "The 2017 recipe is still the skeleton; modern LLMs swap individual pieces. Positional encodings moved to RoPE (rotate Q and K by an angle that depends on position, so the dot product naturally depends on the relative offset $m-n$) and ALiBi (bias attention scores by distance) — both extrapolate to longer contexts better than sinusoids. RMSNorm replaces LayerNorm (drop the mean subtraction, ~10–15% cheaper), and SwiGLU — a gated activation — replaces ReLU in the FFN:",
        ],
        equations: [
          "\\text{RMSNorm}(x) = \\gamma\\,\\frac{x}{\\sqrt{\\frac{1}{d}\\sum_i x_i^2 + \\epsilon}}, \\qquad \\text{SwiGLU}(x) = \\big(\\text{Swish}(xW_1)\\big) \\odot (xW_2)",
        ],
      },
      {
        heading: "Attention efficiency and the KV cache",
        paragraphs: [
          "Full attention costs $O(n^2)$ in sequence length — fine at 1,000 tokens, ruinous at a million. Sparse and sliding-window attention (each token attends only to a local window of $w$ tokens, as in Mistral) cut this to $O(n \\cdot w)$; stacking layers grows the effective receptive field to $L \\cdot w$, so information still propagates globally. Patterns like Longformer (local + a few global tokens) and BigBird (local + global + random) recover near-full expressivity at far lower cost.",
          "The single most important inference optimization is the KV cache. Generating autoregressively, the keys and values of past tokens never change, so you compute them once and cache them — turning each step from $O(n^2)$ into $O(n)$. The cache is two big tensors that grow by one row per generated token, and managing it (it can reach tens of GB per user at long context) drives most production-serving work: quantized KV, PagedAttention, prefix caching.",
        ],
        diagram: {
          id: "kv-cache",
          caption:
            "Fig 4.7 — The KV cache. Past keys and values are stored and reused; only the new token's K, V are computed each step.",
        },
      },
      {
        paragraphs: [
          "Inference splits into two phases with different bottlenecks: prefill (process the whole prompt in parallel, compute-bound) and decode (generate one token at a time, memory-bandwidth-bound — it reads the entire cache and weights per token). Grouped-Query Attention shrinks the cache by sharing K and V across groups of query heads — Multi-Query is the extreme of one shared KV — recovering most of the memory with little quality loss.",
        ],
        diagram: {
          id: "grouped-query",
          caption:
            "Fig 4.8 — Multi-head, grouped-query, and multi-query attention trade KV-cache size against quality by sharing key/value heads.",
        },
      },
      {
        paragraphs: [
          "Flash Attention is a re-implementation of attention that's mathematically identical but never materializes the full $n \\times n$ score matrix — it processes attention in tiles that fit in fast on-chip SRAM with an online softmax, giving 2–4× speedups and linear (not quadratic) memory. It's a recurring theme in modern ML: many of the biggest wins come from better implementations of existing math, not new algorithms.",
        ],
      },
      {
        heading: "Mixture of Experts",
        paragraphs: [
          "Most parameters live in the FFN, so what if you had many FFNs but ran only a few per token? Mixture of Experts replaces each FFN with $N$ experts and a router that sends each token to its top-$k$ (usually 1 or 2). You get the capacity of all $N$ but the compute of $k$ — Mixtral 8×7B has ~47B total parameters but activates only ~13B per token. The costs are real: all experts must be held in memory, load balancing needs auxiliary losses, and routing complicates batching.",
        ],
        diagram: {
          id: "moe",
          caption:
            "Fig 4.9 — Mixture of Experts. A router picks the top-k experts per token; the rest sit idle. Huge parameter count, small compute per token.",
        },
      },
      {
        heading: "Training and fine-tuning",
        paragraphs: [
          "A modern assistant is trained in stages: pretraining (next-token prediction over trillions of tokens — the bulk of the compute), supervised fine-tuning (curated instruction–response pairs), and preference alignment (RLHF, or DPO which skips the reward model). Constitutional AI / RLAIF replace much of the human feedback with AI critique against a set of principles. Scaling laws (Kaplan, Chinchilla) make all of this predictable: for a given compute budget, optimal model and dataset size grow together.",
        ],
      },
      {
        paragraphs: [
          "Full fine-tuning of a large model is expensive, so LoRA freezes the base weights and learns a low-rank update $\\frac{\\alpha}{r} B A$ added to each weight matrix. Because the fine-tuning update has low intrinsic rank, two skinny matrices capture most of it — a rank-16 adapter on an 8B model is a few million parameters (~13 MB) versus 16 GB for a full copy. Adapters are cheap to store, swap, and serve many-at-once, and they're permanently bound to their base model.",
        ],
        equations: ["W' = W + \\tfrac{\\alpha}{r}\\,B A, \\qquad r \\ll d"],
        diagram: {
          id: "lora",
          caption:
            "Fig 4.10 — LoRA. The base weight W stays frozen; only the low-rank matrices B and A are trained, then added back at inference.",
        },
      },
      {
        heading: "Beyond transformers: GANs and VAEs",
        paragraphs: [
          "Two generative architectures round out the picture. A GAN pits a generator (noise → fake data) against a discriminator (real vs fake) in a minimax game; at the optimum the generator's distribution equals the data distribution and the discriminator is reduced to a coin flip. GANs produce sharp samples but are notoriously unstable (mode collapse, vanishing gradients). A VAE instead maps each input to a distribution — a mean $\\mu$ and spread $\\sigma$ — and samples $z = \\mu + \\sigma\\,\\varepsilon$, training with a reconstruction term plus a KL term that packs the latent clouds together so the space is smooth and samplable. VAEs are stable and give a clean latent space, at the cost of slightly blurry samples.",
        ],
      },
      {
        paragraphs: [
          "Every modern variant — RoPE, GQA, Flash Attention, MoE, million-token context — is an optimization of one specific piece of the 2017 design, not a replacement. Once you understand the original architecture, every new paper reads as \"here is the one part we improved.\"",
        ],
      },
    ],
  },
  {
    slug: "chapter-5-vision",
    number: "5",
    title: "Vision",
    summary:
      "From pixels to CNNs to YOLO, segmentation, SAM, and vision transformers — how machines learned to see.",
    sections: [
      {
        paragraphs: [
          "To a computer, an image is a grid of pixels, each a few intensity numbers. A color image is a 3-D tensor of height, width, and channels (3 for RGB), and a batch of them is 4-D: $(N, C, H, W)$. After the first convolutional layer, though, \"channels\" stop meaning colors — they become learned features (one channel fires on horizontal edges, another on red blobs), growing from 3 at the input to hundreds deep in the network.",
          "Raw pixel values in $[0, 255]$ are poor inputs — too large and not zero-centered — so the standard preprocessing divides by 255 and then subtracts the dataset mean and divides by the standard deviation, per channel. Always normalize the same way at inference as in training.",
        ],
        diagram: {
          id: "image-tensor",
          caption:
            "Fig 5.1 — An image as a (C, H, W) tensor. Channels start as colors and become learned feature maps deeper in the network.",
        },
      },
      {
        heading: "Why not just an MLP?",
        paragraphs: [
          "Flattening a 224×224×3 image into a 150,528-vector and feeding a fully connected layer fails for two reasons. Parameter explosion: the first weight matrix alone would have ~150M parameters. And no translation invariance: a dog in the top-left and the same dog in the bottom-right activate completely different neurons, so the network must relearn \"dog\" for every position. CNNs are engineered around the two facts MLPs ignore — locality (nearby pixels are correlated) and translation invariance (a feature means the same thing wherever it appears).",
        ],
      },
      {
        heading: "The convolution operation",
        paragraphs: [
          "A convolution slides a small filter (a 3×3 or 5×5 tensor of weights, with the same depth as the input) across the image. At each position it multiplies the filter element-wise with the patch it covers, sums, adds a bias, and writes one output value. Slide across the whole input and you get a 2-D feature map showing how strongly that filter's pattern is detected at each position:",
        ],
        equations: [
          "y(i, j) = \\sum_{m}\\sum_{n}\\sum_{c} x(i+m,\\, j+n,\\, c)\\,w(m, n, c) + b",
        ],
        diagram: {
          id: "convolution",
          caption:
            "Fig 5.2 — A filter slides over the input; each placement produces one output value. The output shrinks unless you pad.",
        },
      },
      {
        paragraphs: [
          "One filter detects one pattern, so a layer uses many in parallel — $K$ filters produce $K$ output channels. The payoff is parameter sharing: a 3×3 filter over a 3-channel input is just 28 parameters, reused at every one of the ~50,000 spatial positions — an 80,000× reduction versus the dense layer, with translation invariance for free. Padding (adding a zero border) keeps the spatial size from shrinking; stride (how far the filter jumps) downsamples. The output size along each axis is $\\lfloor (n + 2p - k)/s \\rfloor + 1$.",
        ],
      },
      {
        paragraphs: [
          "After every conv layer comes a nonlinearity, almost always ReLU — without it, stacked convolutions collapse to one linear map. The canonical block is Conv → BatchNorm → ReLU. To downsample and focus on what matters, networks pool: max pooling slides a small window and keeps the maximum, preserving the strongest response and giving a little translation invariance for free; global average pooling collapses each feature map to a single number at the very end.",
        ],
        equations: ["\\mathrm{ReLU}(x) = \\max(0,\\, x)"],
      },
      {
        heading: "The hierarchy of features",
        paragraphs: [
          "Stacking conv + pool blocks builds a hierarchy of increasing complexity, and it emerges from training, not design. Early layers detect edges and color blobs; middle layers combine them into corners, textures, and simple shapes; late layers respond to whole objects and parts — \"dog face,\" \"car wheel.\" This works because deeper neurons have larger receptive fields: each only looked at a small patch, but stacking widens the region of the input that influences it until a single neuron can see the whole image.",
        ],
        diagram: {
          id: "receptive-field",
          caption:
            "Fig 5.3 — The receptive field grows with depth. Early neurons see a tiny patch; deep neurons see whole objects.",
        },
      },
      {
        heading: "A complete CNN",
        paragraphs: [
          "Trace a ResNet-style classifier and a clear pattern appears: as you go deeper, spatial resolution shrinks (224 → 7) while channel count grows (3 → 512). The network trades spatial detail for semantic depth, then global-average-pools and applies a fully connected layer to produce class scores. Every classifier from AlexNet to EfficientNet is a variant of this recipe.",
        ],
        diagram: {
          id: "cnn-stack",
          caption:
            "Fig 5.4 — The canonical CNN: spatial size falls while channel depth rises, ending in global pooling and a classifier.",
        },
      },
      {
        paragraphs: [
          "Beyond convolution itself, three ideas turned CNNs from a 1990s curiosity into the dominant vision architecture: ReLU activations (AlexNet, 2012) for clean gradient flow, batch normalization (2015) for stable training at higher learning rates, and residual connections (ResNet, 2015) — skip connections that add the input back to each block, letting gradients flow through arbitrarily deep networks. That last idea is the same one transformers use today. The training tricks that matter most are data augmentation, batch norm, learning-rate schedules, and pretraining on ImageNet then fine-tuning.",
        ],
      },
      {
        heading: "YOLO: detection as one regression",
        paragraphs: [
          "Object detection asks where the objects are, not just what's in the image. The pre-deep-learning approach (DPM) and the first deep approach (R-CNN) both repurposed classifiers, running them at thousands of locations — accurate but slow (R-CNN took 40+ seconds per image). YOLO's insight: make detection one regression problem solved by a single network pass. Resize the image, run one CNN, threshold the detections — you only look once.",
          "YOLO divides the image into an $S \\times S$ grid (7×7 for VOC). Each cell predicts $B$ bounding boxes plus $C$ class probabilities, and the cell containing an object's center is responsible for detecting it. The output is a single $7 \\times 7 \\times 30$ tensor laid out spatially — for $B=2$ boxes (5 numbers each) plus 20 class probabilities.",
        ],
        diagram: {
          id: "yolo-grid",
          caption:
            "Fig 5.5 — YOLO's grid. Each cell predicts B boxes and class probabilities; the cell holding an object's center is responsible for it.",
        },
      },
      {
        paragraphs: [
          "Each box carries a center $(x, y)$ relative to its cell, a width and height relative to the whole image, and a confidence that bundles existence and accuracy together — the probability an object is present times how well the box fits:",
        ],
        equations: ["C = P(\\text{object}) \\cdot \\mathrm{IoU}^{\\text{truth}}_{\\text{pred}}"],
        diagram: {
          id: "iou",
          caption:
            "Fig 5.6 — Intersection over Union: the overlap between predicted and true boxes, the basis of confidence and of NMS.",
        },
      },
      {
        paragraphs: [
          "At inference, multiplying class probability by confidence gives a per-class score for each box; you threshold and then apply Non-Maximum Suppression to drop duplicate boxes (sort by score, keep the top, discard others that overlap it above an IoU threshold). YOLO's grid already enforces spatial diversity, so NMS adds only 2–3% — most duplicates never arise. Training uses a five-term squared-error loss (center, size with a $\\sqrt{\\cdot}$ trick for small boxes, object confidence, no-object confidence, and class), weighted so coordinates matter more and empty cells matter less. Its weaknesses are structural: each cell predicts only one class, so groups of small objects (a flock of birds) break it, and it generalizes poorly to unusual aspect ratios.",
        ],
      },
      {
        heading: "Segmentation",
        paragraphs: [
          "Segmentation labels every pixel. Semantic segmentation gives each pixel a class (all dogs become one mass); instance segmentation separates the individual dogs; panoptic does both — instances for countable \"things,\" classes for uncountable \"stuff\" like sky and road. The architectural tension is that a classifier aggressively downsamples (good for semantics, bad for pixel precision), but segmentation needs both deep semantics and full resolution. The Fully Convolutional Network first solved this by upsampling a coarse score grid back to full size, but the masks were blurry — the spatial detail had been thrown away.",
        ],
      },
      {
        heading: "U-Net",
        paragraphs: [
          "U-Net solved the resolution-versus-semantics problem with a clean, symmetric design: an encoder that downsamples (building semantics), a decoder that upsamples (recovering resolution), and skip connections that splice each encoder feature map into the matching decoder stage. The deep \"what\" flows up through the bottleneck; the precise \"where\" flows across through the skips; and the decoder's conv layers merge them. It's sample-efficient, gives sharp boundaries, works on 2-D and 3-D, and — a decade on — is still the backbone inside diffusion models.",
        ],
        diagram: {
          id: "unet",
          caption:
            "Fig 5.7 — U-Net. Skip connections carry high-resolution detail from the encoder directly across to the decoder.",
        },
      },
      {
        paragraphs: [
          "For instance segmentation, Mask R-CNN extends a two-stage detector with a third branch that predicts a small binary mask per detected box. Its key contribution is RoIAlign: instead of rounding region coordinates to the feature grid (which misaligns masks by a few pixels), it samples features at exact floating-point positions with bilinear interpolation. The mask head is decoupled from classification — each pixel only answers \"am I part of this object?\", a binary question — which gives cleaner masks and a simpler learning problem.",
        ],
      },
      {
        heading: "SAM: a foundation model for segmentation",
        paragraphs: [
          "In 2023 segmentation got its foundation model. The Segment Anything Model (SAM) shifts from task-specific to promptable: trained on 1.1 billion masks via a model-in-the-loop data engine, it segments whatever you point to — a click, a box, or a rough mask — zero-shot, including objects it never saw in training. The architecture is asymmetric for interactive speed: a heavy ViT image encoder runs once per image, a lightweight prompt encoder turns clicks/boxes into embeddings, and a small mask decoder produces masks in milliseconds. Inside the decoder, two-way attention lets prompts and image features update each other, and a hypernetwork turns each mask token into a tiny filter applied to the upsampled features. It's trained with a focal + dice loss (weighted 20:1). SAM 2 (2024) extends this to video with a memory bank that tracks each object across frames.",
        ],
      },
      {
        heading: "Vision Transformers",
        paragraphs: [
          "For a decade CNNs owned vision. Then ViT (2020) asked: can we drop the CNN's inductive biases and just feed a transformer raw image patches? Chop the image into fixed 16×16 patches, flatten and linearly project each into a token, prepend a learnable [CLS] token, add positional embeddings, and run a standard transformer encoder — identical to BERT, just on image tokens. The [CLS] token's final state feeds the classifier.",
        ],
        diagram: {
          id: "vit-patches",
          caption:
            "Fig 5.8 — A ViT turns 16×16 image patches into tokens (plus a [CLS] token) and runs a standard transformer encoder over them.",
        },
      },
      {
        paragraphs: [
          "The catch is data. With a few million images ViTs underperform CNNs, because they have weak inductive biases and must learn locality and translation invariance from scratch; with 300 million they overtake the best CNNs, and the gap widens with scale. This is the same inductive-bias-versus-scale story from language: strong priors win at small scale, weak priors plus parameters win at large scale. Follow-ups made ViTs practical without Google-scale data: DeiT (strong augmentation + distillation), Swin (windowed, hierarchical attention for high resolution), and the self-supervised pair MAE (mask 75% of patches and reconstruct) and DINO (self-distillation), which learn rich features with no labels at all.",
        ],
      },
      {
        heading: "Vision-language models",
        paragraphs: [
          "A VLM takes images and text and generates text. The winning recipe: encode the image with a ViT into tokens, project them into the LLM's space, and interleave them with text tokens — the LLM attends to visual tokens just like words. This is the unifying insight of modern ML: anything you can tokenize can become input to a transformer.",
        ],
        diagram: {
          id: "vlm",
          caption:
            "Fig 5.9 — A vision-language model: a ViT encodes the image, a projection maps patches into the LLM's token space, and the decoder generates text.",
        },
      },
      {
        paragraphs: [
          "The vision encoder is usually pretrained with CLIP or SigLIP, which align images and text in a shared space. CLIP trains an image encoder and a text encoder jointly on 400M pairs with a contrastive loss: build the similarity matrix between every image and every caption in a batch, then maximize the matched (diagonal) pairs and minimize the rest. SigLIP swaps the batch-wide softmax for a per-pair sigmoid loss, which trains better at both small and very large batches.",
        ],
        diagram: {
          id: "clip-matrix",
          caption:
            "Fig 5.10 — CLIP's contrastive objective: pull matched image–text pairs (the diagonal) together, push mismatches apart.",
        },
      },
      {
        paragraphs: [
          "VLMs are trained in stages — pretrained vision encoder and LLM, then an adapter-alignment phase, then instruction tuning, and optionally preference alignment. The connector can be a simple linear projection (LLaVA-style, each patch becomes one token), a Q-Former (a fixed set of query tokens summarize the image), or cross-attention layers (Flamingo-style). The same design extends to multiple images and video. VLMs are strong at semantic understanding — captioning, VQA, OCR, chart reading — but weaker at precise tasks: exact counts, fine spatial relations, and they can hallucinate details. The pattern echoes their training: captions are semantic, not precise.",
        ],
      },
      {
        paragraphs: [
          "The arc is one of the cleanest in ML: convolutions and residuals made deep vision work; detection and segmentation specialized it; and then the transformer — once it had enough data — absorbed vision too, until everything became tokens flowing into one model. CNN, detector, segmenter, ViT, VLM: the same conceptual DNA, scaled up.",
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
