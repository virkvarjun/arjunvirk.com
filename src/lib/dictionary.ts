export type DictionaryTerm = {
  term: string;
  definition: string;
};

export const mlDictionary: DictionaryTerm[] = [
  {
    term: "Activation function",
    definition:
      "A nonlinear transformation applied element-wise to a layer's outputs (ReLU, GELU, sigmoid). Without nonlinearity, stacked linear layers collapse into a single linear layer.",
  },
  {
    term: "Attention",
    definition:
      "A mechanism that lets a model dynamically weight different parts of its input. The query/key/value formulation lets each output position attend to any input position.",
  },
  {
    term: "Backpropagation",
    definition:
      "The algorithm for computing gradients of a loss with respect to every parameter in a neural network by applying the chain rule from output back to input.",
  },
  {
    term: "Batch normalization",
    definition:
      "A technique that normalizes activations within a mini-batch to stabilize training. Operates on the batch dimension and is sensitive to small batch sizes.",
  },
  {
    term: "Cross-entropy",
    definition:
      "The dominant loss function for classification. Measures the divergence between the predicted distribution and the true distribution.",
  },
  {
    term: "Diffusion model",
    definition:
      "A generative model that learns to reverse a gradual noising process. Powers most state-of-the-art image and video generators.",
  },
  {
    term: "Dropout",
    definition:
      "A regularization technique that randomly zeroes activations during training to prevent co-adaptation of neurons.",
  },
  {
    term: "Embedding",
    definition:
      "A learned mapping from discrete tokens to dense vectors. The first step in most NLP pipelines.",
  },
  {
    term: "Epoch",
    definition:
      "One full pass through the training dataset. Modern training often measures progress in tokens or steps rather than epochs.",
  },
  {
    term: "Feature engineering",
    definition:
      "The (often manual) process of constructing input features that expose useful structure to a model. Less central in deep learning, still critical in tabular ML.",
  },
  {
    term: "Gradient descent",
    definition:
      "The optimization algorithm at the core of neural network training. Updates parameters in the direction opposite to the gradient of the loss.",
  },
  {
    term: "Hyperparameter",
    definition:
      "A model setting fixed before training (learning rate, batch size, hidden dim) as opposed to a learned parameter (weights).",
  },
  {
    term: "KV cache",
    definition:
      "A memory of previously computed key and value tensors in transformer inference. Avoids recomputing attention over the prompt at every generation step.",
  },
  {
    term: "Learning rate",
    definition:
      "The step size used by an optimizer. Often the single most important hyperparameter to tune.",
  },
  {
    term: "Loss function",
    definition:
      "A scalar measure of how wrong a model's predictions are. The function gradients flow back from.",
  },
  {
    term: "Mixture of experts",
    definition:
      "An architecture where a router activates only a subset of the model's parameters per token, decoupling parameter count from compute cost.",
  },
  {
    term: "Overfitting",
    definition:
      "When a model memorizes the training set instead of learning generalizable patterns. Diagnosed by a growing gap between train and validation loss.",
  },
  {
    term: "Quantization",
    definition:
      "Reducing the numerical precision of weights (FP16, INT8, INT4) to shrink memory and accelerate inference, usually with minor accuracy loss.",
  },
  {
    term: "Regularization",
    definition:
      "Any technique that biases learning toward simpler hypotheses to improve generalization (L2 weight decay, dropout, data augmentation).",
  },
  {
    term: "Reinforcement learning",
    definition:
      "Learning from interaction: an agent takes actions in an environment, observes rewards, and updates a policy to maximize expected return over time.",
  },
  {
    term: "Softmax",
    definition:
      "A function that converts a vector of logits into a probability distribution. Sharpens differences via exponentiation.",
  },
  {
    term: "Tensor",
    definition: "A multi-dimensional array. The basic data type in every modern ML framework.",
  },
  {
    term: "Transformer",
    definition:
      "A neural architecture built around self-attention, popularized by 'Attention Is All You Need' (2017). The dominant architecture as of 2026.",
  },
];
