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
  // A "check your understanding" prompt with a collapsible answer.
  quiz?: { question: string; answer: string };
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
    slug: "chapter-1-fundamentals",
    number: "1",
    title: "Neural Networks",
    summary:
      "From a single neuron up through backpropagation, optimizers, and the practical craft of training a neural network.",
    sections: [
      {
        heading: "1. What Machine Learning Is Doing",
        paragraphs: [
          "Start with the big picture. Normally, to make a computer do something, you write down the rules yourself. \"If the email contains the word *lottery*, mark it as spam.\" The computer follows your rules to the letter. That approach works fine until the rules get too tangled to write down, and for a surprising number of useful problems, they are impossible to write down at all.",
        ],
      },
      {
        paragraphs: [
          "Try to write the rules that separate a cat from a dog in a photo. Not a loose description, but real instructions a computer could follow, stated in terms of the millions of pixel values it actually receives. You can't do it. Nobody can. You know a cat when you see one, but that knowledge lives in your head as intuition, and intuition doesn't come with instructions attached.",
        ],
      },
      {
        paragraphs: [
          "Machine learning turns the problem around. Instead of writing the rules, you write a program that figures out the rules from examples. You show it thousands of photos already labeled \"cat\" or \"dog,\" and it works out the pattern on its own. You never have to say what makes a cat a cat. You just need examples and a procedure for turning examples into a rule.",
        ],
      },
      {
        paragraphs: [
          "That is the whole enterprise. Everything in this chapter exists to do that one thing well: take a pile of examples and squeeze a rule out of them.",
        ],
      },
      {
        paragraphs: [
          "So what is the rule, in practice? It's always a **function**, which is just a machine that takes something in and gives something out. You hand it an input, it hands you back an output. We write it $f(x)$, read as \"the output of the function $f$ on input $x$.\" Feed in the pixels of a photo, get back \"cat.\" Feed in the square footage of a house, get back a predicted price.",
        ],
      },
      {
        paragraphs: [
          "The part that makes this *learning* rather than just *a function* is that ours has adjustable knobs inside it. Picture a machine with a few million little dials on the side. Set the dials one way and it maps cat photos to \"dog.\" Set them another way and it gets the answer right. Learning is the process of finding the dial settings that make the function behave. We call those dials the **parameters** and bundle them under one symbol, the Greek letter theta, $\\theta$. So a more honest way to write the function is $f(x; \\theta)$: the output depends both on the input $x$ and on the current setting $\\theta$ of all the knobs. The semicolon just separates \"the thing we're classifying\" from \"the thing we're tuning.\"",
        ],
      },
      {
        paragraphs: [
          "Training means finding a good setting of $\\theta$. Hold on to that sentence, because the rest of this chapter is in service of it.",
        ],
      },
      {
        quiz: {
          question: "Why can't we just write explicit rules for a task like recognizing cats in photos, the way we would for sorting numbers?",
          answer: "Because the rule lives in our intuition, not as something we can state in terms of raw pixel values. For most perception and language tasks, no human can actually write the rule down, so instead we let the model learn it from labeled examples.",
        },
      },
      {
        heading: "2. Preliminary Definitions",
        paragraphs: [
          "Here is the working vocabulary. Skim it now to get the shape of each term, and it will settle in as we start using them.",
        ],
      },
      {
        definitions: [
          { term: "Model", definition: "A function, with \"learnable\" values, that maps inputs to outputs. Formally, a model is a function $f(x, \\theta)$ where $x$ is the input and $\\theta$ are the learnable parameters set during training." },
          { term: "Label", definition: "The output or target variable the model is trying to predict, typically denoted $y$. For example, the house price in a model that predicts house prices." },
          { term: "Features", definition: "The input variables that describe each example, typically denoted $x$ or $X$. For example, square footage in a house price model." },
          { term: "Supervised Learning", definition: "A method of training where a model is trained on input-output pairs, with each training example having a label." },
          { term: "Unsupervised Learning", definition: "A method of training where the model is only given inputs and no labels, and must discover the structure in the data on its own. The goal here is to get the model to discover hidden patterns by itself." },
          { term: "Semi-Supervised", definition: "The model trains on a small amount of labeled data and a lot of unlabeled data. This is particularly useful when labels are \"expensive,\" for example medical imaging." },
          { term: "Self-Supervised Learning", definition: "The model generates its own labels from the structure of the input data, then trains in a supervised manner on those auto-generated labels. For example, next-token prediction (Chapter 3) is a form of SSL." },
          { term: "Classification", definition: "A supervised learning task where the output (label) is a discrete category, assigning each input to one of a finite set of classes. For instance, spam detection is a classification task (just as in the name)." },
          { term: "Regression", definition: "A supervised learning task where the output is a continuous numerical value. The model predicts a real number rather than a category. For example, predicting house prices." },
          { term: "Train/Validation/Test Split", definition: "When working with a model, we split our dataset into subsets. The training set is used to fit model parameters. The validation set is used to tune hyperparameters. The test set is used only for estimating model performance (e.g. accuracy)." },
          { term: "Cross-Validation", definition: "A method for estimating model performance, used especially for scenarios with limited data." },
          { term: "Parameters", definition: "The internal variables of a model learned from data during training. In a linear regression model, given by $y = wx + b$, the weights $w$ and the bias $b$ are parameters." },
          { term: "Hyperparameters", definition: "Configuration values set before training begins that are not learned from data. For example, the learning rate (we'll explore this in a bit)." },
          { term: "Underfitting", definition: "When a model is too simple or undertrained to capture the underlying structure in the data, resulting in poor performance on both the training data and unseen data." },
          { term: "Overfitting", definition: "When a model memorizes idiosyncrasies and noise of the training data rather than learning generalizable patterns. This results in very high accuracy on training data but poor performance on unseen data." },
          { term: "Generalization", definition: "The ability of a model to perform well on new, unseen data drawn from the same distribution as the training data. It is the ultimate goal of machine learning." },
          { term: "Tensor", definition: "A multi-dimensional array of numbers, and the fundamental data structure of modern ML. A tensor's rank describes how many dimensions it has. These allow operations to run efficiently on GPUs and TPUs." },
          { term: "Matrix", definition: "A two-dimensional, rectangular array." },
          { term: "Pre-Training", definition: "The first and most expensive training phase, where a model learns broad, general-purpose patterns from a large body of data before it is adapted to any specific task." },
          { term: "Post-Training", definition: "Everything done after pre-training to adapt the model to do something useful, such as fine-tuning on curated examples or learning from human feedback." },
        ],
      },
      {
        quiz: {
          question: "What's the difference between a parameter and a hyperparameter?",
          answer: "A parameter is learned from the data during training, like the weights and bias. A hyperparameter is something you set by hand before training starts and training never changes it, like the learning rate or the number of layers.",
        },
      },
      {
        heading: "3. Building a Neuron",
        paragraphs: [
          "At a high level, a neuron is a tiny decision-maker: it looks at some inputs, decides how much each one matters, and produces a single number. That's all it is. Let's build one from scratch and motivate every piece as we add it.",
        ],
      },
      {
        paragraphs: [
          "Suppose you want to predict one number from a handful of input numbers. Say you're guessing whether a loan should be approved, with inputs like income, credit score, and existing debt. The natural first idea is that some inputs matter more than others, so you give each one an importance and add them up. High income should push toward approval, high debt should push against it. So you assign each input a **weight**, a number saying how much that input counts and in which direction. A large positive weight means \"this input is strong evidence for yes,\" a large negative weight means \"strong evidence for no,\" and a weight near zero means \"ignore this one.\"",
        ],
      },
      {
        paragraphs: [
          "Then you combine them the obvious way: multiply each input by its weight and add up the results.",
        ],
      },
      {
        equations: [
          "z = w_1 x_1 + w_2 x_2 + \\cdots + w_n x_n + b",
        ],
      },
      {
        paragraphs: [
          "Let's read every symbol, because this small formula is the atom of everything that follows. The $x_1, x_2, \\ldots, x_n$ are your $n$ input numbers (the features). The $w_1, \\ldots, w_n$ are their weights, one per input. You multiply each input by its weight and add up the products. The $b$ on the end is the **bias**, and $z$ is the result, which we'll call the **pre-activation** for a reason that will be clear in a minute.",
        ],
      },
      {
        paragraphs: [
          "The bias earns its place because, without it, when all your inputs happen to be zero the output is forced to be zero too, and that's an arbitrary limitation. The bias is a constant offset that lets the neuron shift its whole output up or down regardless of the inputs. You can think of it as the neuron's default leaning, where it sits before it has looked at any evidence. In the line $y = wx + b$ you saw in school, $w$ is the slope and $b$ is where the line crosses the axis. Same $b$, same job.",
        ],
      },
      {
        paragraphs: [
          "That sum-of-products has a compact name and notation. If you gather the weights into a vector $\\mathbf{w}$ (bold, to signal it's a whole list of numbers rather than one number) and the inputs into a vector $\\mathbf{x}$, then \"multiply matching entries and add them all up\" is the **dot product**, written $\\mathbf{w}^\\top \\mathbf{x}$. The small $\\top$ means \"transpose,\" which here is just bookkeeping that lines the shapes up so the multiplication is defined; you can read $\\mathbf{w}^\\top \\mathbf{x}$ as \"the dot product of $\\mathbf{w}$ and $\\mathbf{x}$.\" So the whole formula shortens to:",
        ],
      },
      {
        equations: [
          "z = \\mathbf{w}^\\top \\mathbf{x} + b",
        ],
      },
      {
        paragraphs: [
          "This is identical to the long version; we've only stopped writing out the sum. Get comfortable with it, because from here on, whenever you see a weight vector dotted with an input vector, your mind should translate it straight back to \"weighted sum of the inputs.\"",
        ],
      },
      {
        diagram: { id: "neuron-playground", caption: "Fig 1.1 — A neuron playground: drag each input, its weight, and the bias, and watch the weighted sum z respond." },
      },
      {
        paragraphs: [
          "So now we have something that takes inputs, weighs them, sums them, and adds an offset. Is that a neuron? Almost. There is one missing ingredient, and it turns out to be the ingredient that everything depends on. It gets its own section.",
        ],
      },
      {
        quiz: {
          question: "What does the bias let a neuron do that the weighted sum alone cannot?",
          answer: "It shifts the neuron's output up or down independent of the inputs, so the output isn't forced to zero when all inputs are zero. It sets the neuron's default leaning, or threshold for activating.",
        },
      },
      {
        heading: "4. Nonlinearity: Why a Network Needs a Bend",
        paragraphs: [
          "High-level idea first: a plain weighted sum can only draw straight lines, and the world is not made of straight lines. So we add a gentle bend to each neuron, and that single change is what lets a deep stack of them represent genuinely complicated patterns. Now let's see why, by trying to build something out of just weighted sums and watching it fall short.",
        ],
      },
      {
        paragraphs: [
          "What we want from depth is layering: early units detect simple things, later units combine them into complex things, the way you might first notice edges, then shapes, then faces. So stack two weighted-sum units. The first takes input $x$ and produces an intermediate value. The second takes that value and produces the output. Each is just \"multiply by a weight, add a bias.\"",
        ],
      },
      {
        paragraphs: [
          "Watch what happens. The first unit gives $w_1 x + b_1$. Feed that into the second: $w_2 (w_1 x + b_1) + b_2$. Multiply it out: $w_2 w_1 x + w_2 b_1 + b_2$. Look at that result. The thing multiplying $x$ is just a single number ($w_2 w_1$), and the rest is just another number ($w_2 b_1 + b_2$). So the whole two-layer contraption is exactly the same as one weighted-sum unit with weight $w_2 w_1$ and bias $w_2 b_1 + b_2$. We stacked two and got nothing more than one.",
        ],
      },
      {
        paragraphs: [
          "This is not a quirk of two layers. Stack a hundred and they still collapse into a single weighted sum, because a chain of straight-line operations is itself a straight line. The formal way to say it is that the composition of linear functions is linear, where \"linear\" means straight-line, no curves. A weighted sum can only ever split the world with a straight cut. It can never bend. And almost nothing worth predicting is separable by a straight cut.",
        ],
      },
      {
        paragraphs: [
          "So we give it a bend. After the weighted sum produces $z$, we pass $z$ through one more step: a curved, **nonlinear** function written $\\sigma$ (the Greek letter sigma), called the **activation function**. The neuron's output is then:",
        ],
      },
      {
        equations: [
          "a = \\sigma(z)",
        ],
      },
      {
        paragraphs: [
          "Here $z$ is the weighted sum, $\\sigma$ is some fixed curve we apply to it, and $a$ is the neuron's final output, called the **activation**. That's the full neuron, start to finish: take inputs, weigh and sum them into $z$, then bend $z$ through $\\sigma$ to get $a$. The weighted sum decides which inputs matter and the bias sets the threshold, but it's the bend that gives the network the ability to represent curves, corners, and the complicated shapes real patterns demand. Now when you stack neurons, each bend stays a bend, and the stack can express things a single unit never could. That is why depth buys you anything. Take the bends out and the whole tower collapses back into one straight line.",
        ],
      },
      {
        diagram: { id: "linear-collapse", caption: "Fig 1.2 — Two stacked linear layers collapse into a single line — until you insert a nonlinearity between them." },
      },
      {
        paragraphs: [
          "So which curve do we use for $\\sigma$? A few have been popular, and going through them in order is really a tour of the field correcting its own mistakes.",
        ],
      },
      {
        paragraphs: [
          "The old favorite is the **sigmoid**, $\\sigma(z) = \\frac{1}{1 + e^{-z}}$. The symbol $e$ is a fixed number, about $2.718$, that shows up everywhere in math because it makes calculus clean; $e^{-z}$ means $e$ raised to the power $-z$. When $z$ is a large positive number, $e^{-z}$ is nearly zero, so the fraction is nearly $1$. When $z$ is a large negative number, $e^{-z}$ is huge, so the fraction is nearly $0$. In between it slides smoothly from $0$ up to $1$ in a soft S-shape. That's its appeal: it squashes any input, however large, into the range between $0$ and $1$, which is exactly what you want if you're going to read the output as a probability. The sigmoid ruled the early decades and still earns its keep at the very end of a network when you want a single yes/no probability.",
        ],
      },
      {
        paragraphs: [
          "But the sigmoid has a quiet flaw that nearly stalled deep learning for good, and it's worth seeing now because it returns in the training sections. Look at the flat parts of the S. When $z$ is very positive or very negative, the curve is almost horizontal, so nudging $z$ barely changes the output. Training, as we'll see, depends on those nudges carrying a signal. When the curve goes flat, the signal dies. Stack many sigmoid layers and the signal, passing through one flat region after another, fades to nothing before it reaches the early layers, and they stop learning. This is the **vanishing gradient problem**, which we'll name properly once we have gradients in hand. Its cousin **tanh** (hyperbolic tangent) is the same S-shape squashed into the range $-1$ to $1$ instead of $0$ to $1$. Being centered on zero helps training a little, but it has the same flat-tails problem.",
        ],
      },
      {
        paragraphs: [
          "The fix, and a big reason deep learning took off after 2012, is simple. It's called **ReLU**, the Rectified Linear Unit, and it's just $\\sigma(z) = \\max(0, z)$: if the input is positive, pass it through unchanged; if it's negative, output zero. A flat line for negatives, a 45-degree ramp for positives, with a sharp corner at zero. It looks too crude to work, yet it's the default for almost every hidden layer built today. The reason is the flat-tail problem in reverse: on the positive side ReLU has no flat region, so the learning signal passes through undamped no matter how many layers you stack. It's also very cheap to compute, which matters when you do it billions of times.",
        ],
      },
      {
        paragraphs: [
          "ReLU isn't perfect. A neuron can get pushed into the negative region and stay there, where its output is always zero and, since the curve is flat there too, no learning signal ever reaches it to revive it. The neuron is effectively dead. This is the **dying ReLU problem**. The patch is **Leaky ReLU**, $\\max(\\alpha z, z)$ with a small $\\alpha$ like $0.01$, which gives the negative side a gentle slope instead of a flat zero, so a stuck neuron always has a thread of signal to climb back out on. The smooth, modern relative used in transformers like GPT is **GELU**, the Gaussian Error Linear Unit, which behaves like ReLU but rounds the sharp corner into a soft transition.",
        ],
      },
      {
        paragraphs: [
          "GELU is worth a short detour because it leans on a concept you'll meet again: the **Gaussian**, also called the normal distribution, the famous bell curve. The idea: take a quantity that's the sum of many small random influences, like a person's height or the noise in a measurement, and it tends to pile up symmetrically around an average, common near the middle and rare at the extremes. Plot how often each value occurs and you get the bell shape. GELU uses the bell curve's running total, the probability that a standard bell-curve draw lands below your value $z$, as a soft, smoothly increasing gate on the input. You don't need to compute it by hand; just picture a smoothed-out ReLU and you have the intuition.",
        ],
      },
      {
        diagram: { id: "activation-explorer", caption: "Fig 1.3 — Activation explorer: each curve with its slope (derivative). The slope vanishes in the flat tails of sigmoid and tanh." },
      },
      {
        paragraphs: [
          "There's one more activation that lives in a special place, the output. When you classify among several classes, you don't want one number, you want a full set of probabilities, one per class, all positive and summing to exactly $1$ (because the answer is *some* class, with total certainty $1$ split across the options). The function that turns a raw vector of scores into exactly such a distribution is **softmax**:",
        ],
      },
      {
        equations: [
          "\\text{softmax}(\\mathbf{z})_i = \\frac{e^{z_i}}{\\sum_{j=1}^{K} e^{z_j}}",
        ],
      },
      {
        paragraphs: [
          "Take it piece by piece. You have $K$ classes and a raw score $z_i$ for each. The $\\sum_{j=1}^{K}$ means \"add up the following over every class $j$ from $1$ to $K$.\" So for class $i$, you exponentiate its score, $e^{z_i}$, and divide by the sum of the exponentiated scores of all classes. Exponentiating makes every number positive (no negative probabilities) and exaggerates differences (so the network can express confidence), and dividing by the total forces the whole set to sum to $1$. Out comes a clean probability distribution. Softmax sits at the end of nearly every classifier.",
        ],
      },
      {
        diagram: { id: "softmax-converter", caption: "Fig 1.4 — Softmax turns raw scores into probabilities that always sum to 1; temperature sharpens or flattens them." },
      },
      {
        quiz: {
          question: "If you stack two linear layers with no activation between them, what do you end up with, and why does that matter?",
          answer: "You end up with something equivalent to a single linear layer, a plain straight-line function, so the extra depth bought you nothing. The nonlinear activation between layers is what lets a deep stack represent curved, complicated patterns instead of one straight cut.",
        },
      },
      {
        heading: "5. From One Neuron to a Network",
        paragraphs: [
          "The high-level picture: one neuron makes one bent cut through the data, which isn't much. Put many neurons side by side into a **layer**, then stack layers, and you get a function flexible enough to describe almost anything.",
        ],
      },
      {
        paragraphs: [
          "A layer is a row of neurons that all look at the same input at the same time and each produce their own output. If $n$ inputs come in and you want $m$ neurons in the layer, each neuron has its own weight vector of length $n$ and its own bias. Rather than track $m$ separate weight vectors, we stack them as the rows of a single grid of numbers, a **matrix**, written $W$. So $W$ has $m$ rows (one per neuron) and $n$ columns (one per input), summarized as $W \\in \\mathbb{R}^{m \\times n}$. (The symbol $\\mathbb{R}$ means \"the real numbers,\" ordinary numbers; $\\mathbb{R}^{m \\times n}$ means \"an $m$-by-$n$ grid of ordinary numbers.\") The biases of all $m$ neurons stack into one vector $\\mathbf{b}$, and the whole layer computes:",
        ],
      },
      {
        equations: [
          "\\mathbf{z} = W \\mathbf{x} + \\mathbf{b}, \\qquad \\mathbf{a} = \\sigma(\\mathbf{z})",
        ],
      },
      {
        paragraphs: [
          "This is the single-neuron equation from before, done $m$ times in parallel and packed into matrix form. The matrix-vector product $W\\mathbf{x}$ means \"take the dot product of each row of $W$ with $\\mathbf{x}$,\" which produces every neuron's weighted sum in one operation. Add the bias vector, apply $\\sigma$ to every entry (that's what \"element-wise\" means, one bend per neuron), and you have the layer's output vector $\\mathbf{a}$, one number per neuron. The reason for all the matrix machinery, instead of looping over neurons one at a time, is the tensor point from the definitions: a matrix-vector product is exactly the operation a GPU runs fastest, so writing it this way is what makes the whole thing practical to run.",
        ],
      },
      {
        diagram: { id: "layer-matvec", caption: "Fig 1.5 — A layer as a matrix–vector product: each row of W is one neuron, and the product runs every neuron at once." },
      },
      {
        paragraphs: [
          "To build a deep network you feed the output of one layer in as the input to the next. The first layer reads the raw features, the last layer produces the final answer, and the layers between are called **hidden** layers, because you never directly observe what they compute; they're the network's private scratch space for inventing intermediate features. A network with $L$ layers strung together is the composition:",
        ],
      },
      {
        equations: [
          "f(x; \\theta) = f_L \\circ f_{L-1} \\circ \\cdots \\circ f_2 \\circ f_1(x)",
        ],
      },
      {
        paragraphs: [
          "The small circle $\\circ$ means \"compose,\" that is, \"feed the output of the right-hand function into the left-hand one.\" Read right to left: $f_1$ runs on the input $x$, its output feeds $f_2$, and so on up to $f_L$, whose output is the prediction. The full bundle of parameters $\\theta$ is every weight matrix and every bias vector across all the layers: $\\theta = \\{W^{(1)}, \\mathbf{b}^{(1)}, \\ldots, W^{(L)}, \\mathbf{b}^{(L)}\\}$. The superscripts in parentheses are just layer labels, \"the weights of layer 1,\" not exponents.",
        ],
      },
      {
        paragraphs: [
          "It's fair to ask how much this stacking actually buys us. Are there shapes a neural network *cannot* represent? The reassuring answer is a result called the **universal approximation theorem**, which says a network with even a single hidden layer, given enough neurons, can approximate essentially any continuous function to any accuracy you like. So expressiveness is not the bottleneck. Then why bother with depth, if one wide layer can in principle do anything? Because \"in principle\" hides a hard \"in practice.\" A shallow network might need an enormous number of neurons to capture a pattern a deep network captures with few. Depth lets the network reuse its intermediate features, building complex ideas out of simpler ones layer by layer, and that reuse is the difference between a model that's merely possible and one you can actually train. Depth buys efficiency, not new powers.",
        ],
      },
      {
        diagram: { id: "universal-approximation", caption: "Fig 1.6 — Universal approximation: sum a handful of simple bent pieces to mold almost any target curve." },
      },
      {
        paragraphs: [
          "So we now have our function with knobs: a deep stack of weighted sums and bends, with millions of weights and biases waiting to be set. But notice what we *don't* have yet. A freshly built network has random knobs, so it's useless; it maps cat photos to nonsense. Nothing so far makes it *learn*. Learning, concretely, means adjusting those knobs until the network's outputs fit the data, and we don't yet have any procedure for doing the adjusting.",
        ],
      },
      {
        paragraphs: [
          "That procedure is what the next three sections build, in order, each one needed by the next. First we need a way to measure how wrong the network currently is, because you can't improve what you can't measure; that's the **loss** (section 6). Once we can score wrongness, we need a rule for which way to turn each knob to make that score smaller; that's **gradient descent** (section 7), the actual learning mechanism. And gradient descent turns out to need one ingredient it can't easily get, the slope of the loss with respect to every knob at once; computing that efficiently for millions of knobs is what **backpropagation** does (section 8). Loss tells us how wrong, gradient descent tells us which way to move, backprop makes the move computable. Keep that chain in mind as we go.",
        ],
      },
      {
        quiz: {
          question: "What does each row of a layer's weight matrix $W$ represent?",
          answer: "One neuron's weights. Multiplying W by the input vector takes the dot product of each row with the input, which computes every neuron's weighted sum at once.",
        },
      },
      {
        heading: "6. The Loss: Measuring How Wrong We Are",
        paragraphs: [
          "Before we can make the network better, we need a single number that says how bad it is right now. You can't improve what you can't measure. That number is the **loss**.",
        ],
      },
      {
        paragraphs: [
          "The loss function takes the network's prediction, written $\\hat{y}$ (the small hat means \"predicted,\" to set it apart from the true answer $y$), compares it to the true answer, and returns one number that's large when the prediction is far off and small when it's close. Training then has a clear target: turn the knobs to make that number as small as possible, averaged over all the training examples.",
        ],
      },
      {
        paragraphs: [
          "For regression, where the answer is a number, the natural measure of wrongness is the gap between prediction and truth, squared:",
        ],
      },
      {
        equations: [
          "L(\\hat{y}, y) = (\\hat{y} - y)^2",
        ],
      },
      {
        paragraphs: [
          "The $(\\hat{y} - y)$ is the error, the difference between your guess and the truth. We square it for two reasons. First, squaring removes the sign, so being off by $+5$ or by $-5$ counts the same. Second, squaring punishes big misses far more than small ones (an error of $10$ contributes $100$, an error of $2$ contributes only $4$), which pushes the network away from catastrophic mistakes. Averaged over many examples, this is **mean squared error**, the standard loss for regression.",
        ],
      },
      {
        paragraphs: [
          "For classification, where the network outputs a probability distribution from softmax, we want a loss that's happy when the model puts high probability on the correct class and unhappy when it confidently backs the wrong one. That loss is **cross-entropy**:",
        ],
      },
      {
        equations: [
          "L = -\\sum_{k=1}^{K} y_k \\log \\hat{y}_k",
        ],
      },
      {
        paragraphs: [
          "Here's how to read it. The true label $y$ is a **one-hot vector**: a list with a $1$ in the slot of the correct class and $0$ everywhere else (if the answer is \"class 3 of 5,\" then $y = [0, 0, 1, 0, 0]$). The prediction $\\hat{y}$ is the probability the model assigned to each class. The sum runs over all $K$ classes, but because $y_k$ is zero for every class except the correct one, every term drops out except the single term for the right answer. So the loss reduces to $-\\log(\\text{probability the model gave the correct class})$. Recall what a **logarithm** does: $\\log$ is the inverse of exponentiation, and the key fact is that the log of a number close to $1$ is close to $0$, while the log of a number close to $0$ falls toward negative infinity. So if the model gave the right answer probability $0.99$, then $-\\log(0.99)$ is a tiny loss, nearly zero, good. If it gave the right answer probability $0.01$, then $-\\log(0.01)$ is a large positive loss, a heavy penalty for being confidently wrong. Cross-entropy rewards the model for assigning high probability to the truth.",
        ],
      },
      {
        diagram: { id: "loss-explorer", caption: "Fig 1.7 — Loss explorer: squared error punishes big misses quadratically; cross-entropy punishes confident wrong answers." },
      },
      {
        paragraphs: [
          "Whichever loss we use, the full training objective is to minimize its average over the entire training set:",
        ],
      },
      {
        equations: [
          "\\mathcal{L}(\\theta) = \\frac{1}{N} \\sum_{i=1}^{N} L\\big(f(x_i; \\theta), y_i\\big)",
        ],
      },
      {
        paragraphs: [
          "Reading it: $N$ is the number of training examples, the sum runs over all of them, $f(x_i; \\theta)$ is the network's prediction on example $i$ given the current knobs $\\theta$, $y_i$ is that example's true answer, and the $\\frac{1}{N}$ averages the whole thing. The capital $\\mathcal{L}(\\theta)$ is the average loss as a function of the knobs. The job from section 1 is now precise: **find the $\\theta$ that makes $\\mathcal{L}(\\theta)$ as small as possible.**",
        ],
      },
      {
        quiz: {
          question: "Why does cross-entropy punish a confident wrong answer so heavily?",
          answer: "The loss reduces to -log(probability assigned to the correct class). As that probability approaches zero, -log of it shoots toward infinity, so the more confident the model was in the wrong answer, the larger the penalty.",
        },
      },
      {
        heading: "7. Gradient Descent",
        paragraphs: [
          "This is the section where the network finally learns. We have a network full of random knobs and a loss that scores how wrong they are. What we're missing is the actual mechanism of learning: a rule that takes the current knobs and the current wrongness and produces *better* knobs. Gradient descent is that rule. It's how the network fits the data, by repeatedly nudging every knob in whatever direction lowers the loss a little, until the loss is small and the outputs match the answers.",
        ],
      },
      {
        heading: "The Cost Function, Seen as a Surface",
        paragraphs: [
          "We already met this number in the last section as the loss. (People say \"loss\" and \"cost\" almost interchangeably.",
        ],
      },
      {
        paragraphs: [
          "Stop thinking of the cost as a function of the *data*, and start thinking of it as a function of the *knobs*. The training data is fixed, baked in. What's free to vary is the millions of weights and biases. So the cost is really a function that takes in one complete setting of every weight and bias and returns a single number: how badly that setting does across the data. Write it $C(\\theta)$, where $\\theta$ is the whole bundle of weights and biases and $C$ is the cost. Training the network means hunting through the space of possible $\\theta$ for the setting that makes $C$ smallest.",
        ],
      },
      {
        paragraphs: [
          "Now try to picture that function, and do it by climbing the dimensions one at a time. Suppose the network had a single weight. Then $C$ depends on one number, and you can draw it as an ordinary curve: the weight along the horizontal axis, the cost along the vertical. Making the network better is just finding the bottom of the curve. Now suppose it had two weights. Then $C$ depends on two numbers, and you draw it as a surface: a landscape floating above a flat plane of the two weights, where the height at each point is the cost there, full of hills and valleys. Making the network better is rolling a ball to the lowest point of that surface. A real network has not one or two weights but millions, so the true cost surface lives in a space with millions of directions, which nobody can draw or even imagine. And here is the leap worth making: you do not need to. The reasoning that works for the curve and the surface, find the downhill direction and step that way, works exactly the same with a million directions. Everything we figure out from the 2D and 3D pictures is literally what happens up in the enormous space; there are just more directions to choose a step in.",
        ],
      },
      {
        diagram: { id: "cost-surface", caption: "Fig 1.8 — The cost as a surface over the weights: training is the search for the lowest valley." },
      },
      {
        paragraphs: [
          "This reframing is what gradient descent acts on. The cost surface is the thing we want to get to the bottom of, and from here the section is really just answering one question: standing somewhere on that surface, which way is downhill, and how big a step do we take?",
        ],
      },
      {
        paragraphs: [
          "The high-level idea is a hike in fog. You have a number, the cost, that depends on millions of knobs, and you want it small. So you imagine standing on the surface we just described, feel which way is downhill, take a step, and repeat. Let's make that precise.",
        ],
      },
      {
        paragraphs: [
          "That surface is the landscape. Every setting of the knobs $\\theta$ is a location on it, and the height there is the cost at that setting. Bad settings sit up on hills and ridges; good settings sit down in valleys. Training is the search for the lowest valley. You're standing somewhere on this landscape, in thick fog, and you want to get downhill. What do you do? You feel the slope under your feet and step in the steepest downhill direction. Then you feel the slope again and repeat. That's the whole method. The only thing we need to make it work is a way to feel the slope, and that's where calculus comes in.",
        ],
      },
      {
        paragraphs: [
          "The slope of a function is its **derivative**. For a function of one variable, the derivative at a point answers a single question: if I nudge the input a tiny bit, how much, and in which direction, does the output move? A positive derivative means the output rises as you move right; a negative one means it falls. The size of the derivative tells you how steep the slope is. That's all a derivative is, a rate of change, the steepness of the curve at a point.",
        ],
      },
      {
        paragraphs: [
          "Our loss doesn't depend on one knob, though, it depends on millions. So instead of a single slope we have a slope for each knob: if I nudge this particular weight a tiny bit and hold all the others fixed, how does the loss move? That per-knob slope is a **partial derivative** (partial because you vary one variable at a time and freeze the rest). Collect all those partial derivatives into one big vector, one slope per knob, and you have the **gradient**, written $\\nabla \\mathcal{L}(\\theta)$. The upside-down triangle $\\nabla$ is just the symbol for \"gradient of.\" The gradient is the many-dimensional version of a slope, and it has a useful property: it points in the direction of steepest increase of the loss, the most uphill direction. Its exact opposite, the negative gradient, points most steeply downhill, which is the way we want to walk.",
        ],
      },
      {
        paragraphs: [
          "So the update rule follows directly. Stand at your current knobs $\\theta_t$ (the subscript $t$ labels which step you're on), compute the gradient, and step in the downhill direction:",
        ],
      },
      {
        equations: [
          "\\theta_{t+1} = \\theta_t - \\eta \\nabla \\mathcal{L}(\\theta_t)",
        ],
      },
      {
        paragraphs: [
          "The new setting $\\theta_{t+1}$ is the old one minus a small multiple of the gradient. The minus sign turns \"uphill\" into \"downhill.\" And $\\eta$ (the Greek letter eta) is the **learning rate**, the size of the step you take. This is the single most important hyperparameter you'll tune. Too small and you inch down the mountain so slowly you may never arrive. Too large and you take giant reckless leaps, overshooting the valley floor, maybe bouncing out of the valley entirely or flying off to infinity. Getting $\\eta$ right, or scheduling how it changes over training, is much of the practical art. Repeat the step over and over and you descend toward a valley. The whole procedure is **gradient descent**, and it's the engine underneath essentially all of modern machine learning.",
        ],
      },
      {
        paragraphs: [
          "One honest caveat. The loss landscape of a real network is not a single smooth bowl with one obvious bottom. It's a crinkled, high-dimensional terrain with countless valleys, some deeper than others. Gradient descent only promises to bring you to *a* low point near where you started, not *the* lowest point anywhere. For years people assumed this would be fatal. In practice, in these huge spaces, the many valleys tend to be roughly as good as each other, and the method works remarkably well anyway. We'll mostly set the worry aside.",
        ],
      },
      {
        diagram: { id: "gradient-descent", caption: "Fig 1.9 — Gradient descent: drag the learning rate and step the ball downhill. Too large a rate overshoots and diverges." },
      },
      {
        quiz: {
          question: "What happens if the learning rate is set too large?",
          answer: "The steps overshoot the bottom of the valley, so instead of settling at a minimum the parameters bounce back and forth across it or diverge entirely toward infinity.",
        },
      },
      {
        heading: "8. Backpropagation",
        paragraphs: [
          "Gradient descent told us the rule for learning: nudge every knob opposite its slope. But it quietly assumed we already had those slopes, the gradient, the partial derivative of the loss with respect to every single knob. That assumption is the whole catch. A real network has millions or billions of knobs, and gradient descent is useless until we can actually produce that gradient. So gradient descent and backpropagation are two halves of one idea: gradient descent decides *which way* to move each knob, and backpropagation is what makes computing that direction, for all the knobs at once, fast enough to be possible. Without backprop, the learning rule from the last section stays a nice idea you can't run.",
        ],
      },
      {
        paragraphs: [
          "At a high level, backpropagation is just careful bookkeeping with the chain rule. It computes the whole gradient in one sweep backward through the network, reusing shared work so nothing is recomputed.",
        ],
      },
      {
        paragraphs: [
          "First, why the obvious approach fails. You could, for each weight, trace by hand how a nudge to it ripples forward through every later layer to finally move the loss, then write down that one partial derivative. But each such trace walks the whole depth of the network, and you'd repeat it for every one of billions of weights, redoing nearly all of the same intermediate work each time. The cost explodes with depth and width. It doesn't scale.",
        ],
      },
      {
        paragraphs: [
          "The escape rests on one idea from calculus, the **chain rule**, which is the rule for differentiating a function of a function. In plain terms: if a change in $x$ causes a change in $u$, and that change in $u$ causes a change in $y$, then the effect of $x$ on $y$ is the product of the two link-by-link effects. Sensitivities multiply along a chain. A neural network is one long chain (the input feeds layer 1, which feeds layer 2, on up to the loss), so the chain rule is exactly the right tool. It tells us we can find how the loss responds to an early weight by multiplying together the local sensitivities of each link along the way. What makes it fast is that those link sensitivities are shared across all the weights, so if we compute them in the right order and reuse them, we never redo work.",
        ],
      },
      {
        diagram: { id: "chain-rule", caption: "Fig 1.10 — The chain rule: a nudge to x is scaled by each local derivative along the path to y." },
      },
      {
        paragraphs: [
          "Here is how it runs. Picture the network as a graph of operations with data flowing through it. First the **forward pass**: push the input through the network layer by layer, computing and remembering each layer's $\\mathbf{z}$ and $\\mathbf{a}$ along the way (we keep them because the backward pass will need them), until we reach the end and compute the loss. For each layer $\\ell$ from first to last:",
        ],
      },
      {
        equations: [
          "\\mathbf{z}^{(\\ell)} = W^{(\\ell)} \\mathbf{a}^{(\\ell-1)} + \\mathbf{b}^{(\\ell)}, \\qquad \\mathbf{a}^{(\\ell)} = \\sigma(\\mathbf{z}^{(\\ell)})",
        ],
      },
      {
        paragraphs: [
          "This is the layer equation from section 5 applied down the stack, with $\\mathbf{a}^{(0)}$ being the raw input $x$ and the final $\\mathbf{a}^{(L)}$ being the prediction $\\hat{y}$ (run through softmax if you're classifying). Then compute the loss.",
        ],
      },
      {
        paragraphs: [
          "Now the **backward pass**, where the real work happens. The quantity we send backward is the sensitivity of the loss to each layer's pre-activation $\\mathbf{z}^{(\\ell)}$. We name it $\\boldsymbol{\\delta}^{(\\ell)}$ (the Greek letter delta) and define it as exactly that:",
        ],
      },
      {
        equations: [
          "\\boldsymbol{\\delta}^{(\\ell)} = \\frac{\\partial L}{\\partial \\mathbf{z}^{(\\ell)}}",
        ],
      },
      {
        paragraphs: [
          "In words, $\\boldsymbol{\\delta}^{(\\ell)}$ is the error signal at layer $\\ell$: how much the final loss would change if you jiggled that layer's pre-activations. The reason to track this quantity is that once you have it for a layer, the gradients of that layer's actual knobs follow with almost no extra work. So the plan is: get $\\boldsymbol{\\delta}$ at the last layer, then pass it backward layer by layer, reading off the weight and bias gradients at each stop.",
        ],
      },
      {
        paragraphs: [
          "Getting it started, at the output layer, is where an earlier design choice pays off. If you used softmax with cross-entropy (the standard classification pairing), the error signal at the final layer simplifies to something very clean:",
        ],
      },
      {
        equations: [
          "\\boldsymbol{\\delta}^{(L)} = \\hat{\\mathbf{y}} - \\mathbf{y}",
        ],
      },
      {
        paragraphs: [
          "Just the prediction minus the truth. This isn't luck; softmax and cross-entropy were chosen because they combine into this tidy form, which also avoids the vanishing-gradient trouble right where the network is most sensitive.",
        ],
      },
      {
        paragraphs: [
          "To pass the error from one layer back to the previous one, we use this rule:",
        ],
      },
      {
        equations: [
          "\\boldsymbol{\\delta}^{(\\ell)} = \\left( W^{(\\ell+1)\\top} \\boldsymbol{\\delta}^{(\\ell+1)} \\right) \\odot \\sigma'(\\mathbf{z}^{(\\ell)})",
        ],
      },
      {
        paragraphs: [
          "It looks busy but it tells a two-step story. The piece $W^{(\\ell+1)\\top} \\boldsymbol{\\delta}^{(\\ell+1)}$ takes the error from the layer ahead and pushes it back through the weights that connected the two layers (the transpose $\\top$ reverses the direction of flow, sending the signal backward instead of forward). That spreads the blame for the error across the neurons of the current layer, in proportion to how much each contributed. Then the $\\odot \\, \\sigma'(\\mathbf{z}^{(\\ell)})$ part scales that blame by how sensitive each neuron's bend actually was. The $\\odot$ symbol means element-wise multiplication (multiply matching entries, no matrix product), and $\\sigma'$ is the derivative of the activation, the slope of the bend at that point. This is exactly where the vanishing gradient bites: if a neuron's activation was saturated, out on a flat tail of the sigmoid, then $\\sigma'$ there is nearly zero, so it multiplies the error signal down to almost nothing, and that neuron and everything behind it get almost no signal to learn from. Use ReLU, whose slope is a healthy $1$ on the positive side, and the signal survives the trip.",
        ],
      },
      {
        paragraphs: [
          "Finally, the payoff. Once you have $\\boldsymbol{\\delta}^{(\\ell)}$ for a layer, its parameter gradients are immediate:",
        ],
      },
      {
        equations: [
          "\\frac{\\partial L}{\\partial W^{(\\ell)}} = \\boldsymbol{\\delta}^{(\\ell)} \\, \\mathbf{a}^{(\\ell-1)\\top}, \\qquad \\frac{\\partial L}{\\partial \\mathbf{b}^{(\\ell)}} = \\boldsymbol{\\delta}^{(\\ell)}",
        ],
      },
      {
        paragraphs: [
          "The bias gradient is just the error signal itself. The weight gradient is an outer product of the error signal with the input that came into the layer, which is a compact way of saying each individual weight's gradient is \"how wrong the neuron it feeds was\" times \"what input rode in on that weight.\" A weight gets a big correction when the neuron it serves was badly wrong and the input flowing through it was large. That single idea, blame times input, is the heart of the algorithm.",
        ],
      },
      {
        diagram: { id: "backprop-visualizer", caption: "Fig 1.11 — Backpropagation: the forward pass fills activations; the backward pass sends the error signal back, gated by each slope." },
      },
      {
        paragraphs: [
          "So one training step, in full: run the forward pass and store the intermediate values; compute the loss; compute $\\boldsymbol{\\delta}$ at the output; walk it backward layer by layer, reading off each layer's weight and bias gradients as you go; then hand all those gradients to gradient descent, which nudges every knob a little downhill. Repeat over many batches and the network learns. You'll rarely code this by hand, because every framework computes it automatically through **automatic differentiation**, where each basic operation knows its own local derivative and the framework chains them together for you. But knowing what's underneath is the difference between fixing a stuck network and staring at it.",
        ],
      },
      {
        quiz: {
          question: "Why do we compute the error signal $\\boldsymbol{\\delta}$ for a layer before computing that layer's weight gradients?",
          answer: "Because once you know delta for a layer, every weight and bias gradient in that layer follows immediately (the weight gradient is delta times the incoming activation), and the same delta is reused for all of them. Tracking delta is what lets backprop avoid recomputing shared work for each weight.",
        },
      },
      {
        heading: "9. Optimizers",
        paragraphs: [
          "This is the densest section in the chapter, so we'll take it slowly and build up one step at a time. The good news is that every optimizer here is a small patch on the one before it. If you understand plain gradient descent from the last section, you can understand all of these, because each one keeps that same core idea (step opposite the gradient) and only changes how the step is sized or smoothed.",
        ],
      },
      {
        paragraphs: [
          "Plain gradient descent, step opposite the gradient, works, but it's a little dumb, and seeing exactly how it's dumb motivates every improvement people have added. Each optimizer here fixes a specific weakness of the one before it, so read it as a sequence of repairs.",
        ],
      },
      {
        paragraphs: [
          "The starting point is **SGD**: sample a mini-batch (a small random handful of training examples, since using all of them every step is too slow), compute the gradient $g_t$ on it, and step against it. Its signature failure shows up in a **ravine**, a long narrow gully in the landscape, steep on the sides but only gently sloped along the floor toward the minimum. Plain SGD, following the steepest local direction, bounces back and forth between the steep walls while crawling along the gentle floor, wasting most of its motion rattling side to side. (Sampling a mini-batch each step rather than the full dataset also adds a little noise to the gradient, which is mostly fine and sometimes even helps, by jostling you out of shallow dead-end valleys. One full pass through the training data is called an **epoch**.)",
        ],
      },
      {
        diagram: { id: "optimizer-race", caption: "Fig 1.12 — An optimizer race down a ravine: plain SGD zig-zags while momentum and Adam glide along the floor." },
      },
      {
        paragraphs: [
          "The first repair is **momentum**, and the picture is exactly what the word suggests. Instead of each step depending only on the current gradient, give the optimizer inertia, like a heavy ball rolling downhill. The ball builds up speed in directions where the gradient consistently points, and the back-and-forth jitter across the ravine walls cancels out because it keeps reversing. We track a running velocity $v$ and step along it:",
        ],
      },
      {
        equations: [
          "v_{t+1} = \\beta v_t + g_t, \\qquad \\theta_{t+1} = \\theta_t - \\eta v_{t+1}",
        ],
      },
      {
        paragraphs: [
          "The velocity $v_{t+1}$ blends the old velocity (scaled by $\\beta$, typically $0.9$, so about $90\\%$ of the previous momentum carries over) with the current gradient $g_t$. Then we step along that accumulated velocity rather than the raw gradient. Consistent directions build speed; oscillating ones average to nearly nothing. The ravine problem largely goes away.",
        ],
      },
      {
        diagram: { id: "momentum-focus", caption: "Fig 1.13 — Momentum builds velocity along the valley floor while the side-to-side oscillation cancels out." },
      },
      {
        paragraphs: [
          "A refinement called **Nesterov Accelerated Gradient (NAG)** adds a bit of foresight. Plain momentum measures the slope where it currently stands and then leaps. Nesterov first looks ahead to roughly where the momentum is about to carry it, measures the slope there, and uses that to correct the jump mid-flight, like a runner adjusting before the corner instead of after. On well-behaved problems it converges a little faster:",
        ],
      },
      {
        equations: [
          "v_{t+1} = \\beta v_t + \\nabla \\mathcal{L}(\\theta_t - \\eta \\beta v_t), \\qquad \\theta_{t+1} = \\theta_t - \\eta v_{t+1}",
        ],
      },
      {
        paragraphs: [
          "The only change is where the gradient is evaluated: at the looked-ahead point $\\theta_t - \\eta \\beta v_t$ rather than at $\\theta_t$.",
        ],
      },
      {
        diagram: { id: "nesterov-lookahead", caption: "Fig 1.14 — Nesterov look-ahead: measure the gradient where momentum is about to land, then correct the step." },
      },
      {
        paragraphs: [
          "The next family attacks a different weakness: one global learning rate for all knobs is crude, because some knobs need large updates and others tiny ones. **AdaGrad** gives every parameter its own learning rate by tracking how much gradient each one has accumulated and shrinking the step for the busy ones:",
        ],
      },
      {
        equations: [
          "G_t = G_{t-1} + g_t^2, \\qquad \\theta_{t+1} = \\theta_t - \\frac{\\eta}{\\sqrt{G_t + \\epsilon}} g_t",
        ],
      },
      {
        paragraphs: [
          "Here $G_t$ is a running sum of the squared gradients for each parameter, and dividing the step by $\\sqrt{G_t}$ throttles parameters that have seen large gradients while keeping large steps for rarely-touched ones. (The $\\epsilon$ is a microscopic constant, around $10^{-8}$, parked in the denominator only to avoid dividing by zero; you'll see this guard everywhere.) This helps with rare, sparse features, like uncommon words in text. But AdaGrad dies slowly: $G_t$ only grows, so the effective learning rate $\\frac{\\eta}{\\sqrt{G_t}}$ marches toward zero, and eventually the model freezes and stops learning.",
        ],
      },
      {
        diagram: { id: "adagrad-rates", caption: "Fig 1.15 — AdaGrad gives each parameter its own rate, but its accumulator only grows, so the rate decays toward zero." },
      },
      {
        paragraphs: [
          "**RMSProp** fixes that death by replacing the ever-growing sum with a decaying average that gently forgets old gradients, so it can't blow up forever:",
        ],
      },
      {
        equations: [
          "v_t = \\beta v_{t-1} + (1 - \\beta) g_t^2, \\qquad \\theta_{t+1} = \\theta_t - \\frac{\\eta}{\\sqrt{v_t + \\epsilon}} g_t",
        ],
      },
      {
        paragraphs: [
          "Now $v_t$ is a weighted average leaning mostly on recent squared gradients (with $\\beta$ around $0.9$), so it stays responsive instead of grinding to a halt. (A small piece of history: RMSProp was never formally published. Geoff Hinton described it in an online lecture and it caught on anyway.)",
        ],
      },
      {
        diagram: { id: "adagrad-vs-rmsprop", caption: "Fig 1.16 — AdaGrad keeps accumulating and freezes; RMSProp forgets old gradients and stays responsive." },
      },
      {
        paragraphs: [
          "Combine the two good ideas, momentum's inertia and RMSProp's per-parameter scaling, and you get **Adam (Adaptive Moment Estimation)**, the default optimizer for almost everything today:",
        ],
      },
      {
        equations: [
          "m_t = \\beta_1 m_{t-1} + (1 - \\beta_1) g_t",
          "v_t = \\beta_2 v_{t-1} + (1 - \\beta_2) g_t^2",
          "\\hat{m}_t = \\frac{m_t}{1 - \\beta_1^t}, \\qquad \\hat{v}_t = \\frac{v_t}{1 - \\beta_2^t}",
          "\\theta_{t+1} = \\theta_t - \\frac{\\eta \\, \\hat{m}_t}{\\sqrt{\\hat{v}_t} + \\epsilon}",
        ],
      },
      {
        paragraphs: [
          "Two running averages: $m_t$ tracks the gradient itself (the momentum, the \"first moment\") and $v_t$ tracks the squared gradient (the scale, the \"second moment\"). The $\\hat{m}_t$ and $\\hat{v}_t$ are bias-corrected versions; the correction matters early in training because both averages start at zero and would otherwise be pulled toward zero for a while, and dividing by $1 - \\beta^t$ undoes that startup bias (note $\\beta^t$ shrinks to nothing as training proceeds, so the correction quietly switches itself off). The final step uses the momentum direction $\\hat{m}_t$ scaled per-parameter by $\\sqrt{\\hat{v}_t}$. Typical settings are $\\beta_1 = 0.9$, $\\beta_2 = 0.999$, $\\epsilon = 10^{-8}$, and they work across a wide range of problems with little tuning, which is why Adam is everywhere.",
        ],
      },
      {
        diagram: { id: "adam-decomposition", caption: "Fig 1.17 — Adam = momentum (first moment) + RMSProp (second moment). Toggle each ingredient on and off." },
      },
      {
        paragraphs: [
          "Adam has one subtle issue with weight decay (a regularization technique from the next section), where the decay gets unintentionally scaled by the per-parameter learning rate. The fix is **AdamW**, which separates the weight decay out and applies it cleanly:",
        ],
      },
      {
        equations: [
          "\\theta_{t+1} = \\theta_t - \\eta \\left( \\frac{\\hat{m}_t}{\\sqrt{\\hat{v}_t} + \\epsilon} + \\lambda \\theta_t \\right)",
        ],
      },
      {
        paragraphs: [
          "The extra $\\lambda \\theta_t$ shrinks every weight a little on each step, untouched by the adaptive scaling. AdamW is the standard for training large modern models.",
        ],
      },
      {
        paragraphs: [
          "One more lever, separate from the choice of optimizer: the learning rate doesn't have to stay fixed. You usually want bold steps early, when you're far from any good solution, and small steps later, when you're closing in on a valley floor and a big step would overshoot. A **learning rate schedule** varies $\\eta$ over training. You can drop it by a factor every so often (**step decay**), shrink it smoothly (**exponential decay**), or ease it down along a cosine curve from a high value to a low one (**cosine annealing**), a common choice for transformers:",
        ],
      },
      {
        equations: [
          "\\eta_t = \\eta_{\\min} + \\tfrac{1}{2}(\\eta_{\\max} - \\eta_{\\min})\\left(1 + \\cos\\left(\\tfrac{t}{T}\\pi\\right)\\right)",
        ],
      },
      {
        paragraphs: [
          "Here $t$ is the current step and $T$ is the total number of steps, so as $t$ runs from $0$ to $T$ the cosine sweeps the rate smoothly from $\\eta_{\\max}$ down to $\\eta_{\\min}$. There's also a counterintuitive move at the very start called **warmup**, where you ramp the rate up from nearly zero over the first few thousand steps before letting it decay, because the adaptive averages are unreliable at the very beginning and a big early step can throw them off. Warmup followed by cosine decay is a common recipe.",
        ],
      },
      {
        diagram: { id: "lr-schedule", caption: "Fig 1.18 — Learning-rate schedules shape the step size over training: bold early, gentle late." },
      },
      {
        quiz: {
          question: "What problem does momentum solve compared to plain SGD?",
          answer: "In a narrow ravine, plain SGD zig-zags across the steep walls and crawls along the floor. Momentum builds up velocity in the consistent downhill direction while the side-to-side oscillation cancels itself out, so it moves much faster toward the minimum.",
        },
      },
      {
        heading: "10. Regularization",
        paragraphs: [
          "The big idea: stop the model from memorizing. Recall the villain from the definitions, overfitting, where the model latches onto the noise in the training data and falls apart on anything new. Everything in this section works against it. The umbrella term is **regularization**: any technique that shrinks the gap between training performance and unseen-data performance, usually by discouraging the model from getting too complicated or too sure of itself.",
        ],
      },
      {
        diagram: { id: "over-underfitting", caption: "Fig 1.19 — Underfitting vs overfitting: training error keeps falling while validation error bottoms out and turns back up." },
      },
      {
        paragraphs: [
          "The most direct approach is to penalize complexity. An overfit model often does its overfitting by cranking some weights to extreme values to thread the needle through every noisy point. So we add a term to the loss that grows whenever the weights get large, nudging the model to keep them modest. **L2 regularization** (also called **weight decay**) adds $\\lambda \\|\\theta\\|^2$ to the loss, where $\\|\\theta\\|^2$ is the sum of the squares of all the weights (a measure of their overall size) and $\\lambda$ is a hyperparameter setting how hard you push. The result is a preference for smaller, smoother solutions that don't lurch around to chase noise. A close relative, **L1 regularization**, adds $\\lambda \\|\\theta\\|_1$ (the sum of absolute values instead of squares), which tends to drive many weights to exactly zero, in effect letting the model ignore some features entirely.",
        ],
      },
      {
        paragraphs: [
          "A different and surprisingly effective idea is **dropout**. During training, on each step, you randomly switch off a fraction of the neurons (say $10\\%$ to $50\\%$), forcing the network to cope without them. Because any given neuron might vanish at any moment, the network can't build fragile arrangements that lean on one specific neuron being present; it has to spread its knowledge redundantly across many neurons, which is exactly the robustness that generalizes. At test time you switch all the neurons back on (with a small rescaling to keep the math consistent) and keep the benefit.",
        ],
      },
      {
        paragraphs: [
          "There's also the simplest effective move, **early stopping**: watch the validation loss as you train, and the moment it stops improving and starts creeping back up, stop. That upward creep is overfitting beginning, so you quit while you're ahead. It costs nothing.",
        ],
      },
      {
        paragraphs: [
          "If you can't get more data, you can manufacture more with **data augmentation**: apply changes to your training examples that don't change the answer. Flip, rotate, crop, or recolor an image and it's still the same cat, but to the network it's a fresh example, and training on these variants teaches it to ignore irrelevant details. The text equivalent is swapping in synonyms or translating a sentence back and forth.",
        ],
      },
      {
        paragraphs: [
          "A few subtler regularizers round out the toolkit. **Label smoothing** softens the targets so the model aims for, say, $90\\%$ confidence on the right answer rather than a brittle $100\\%$, which keeps it from getting overconfident. **Mixup** and **CutMix** train on blended combinations of pairs of examples and their labels, a strong regularizer for images. And **stochastic depth** randomly drops entire layers during training in very deep networks, the dropout idea scaled up from neurons to whole layers.",
        ],
      },
      {
        quiz: {
          question: "During training you notice the training loss is still falling while the validation loss has started rising. What's happening, and what can you do about it?",
          answer: "That's overfitting, the model is memorizing the training set instead of learning a general pattern. You can add regularization (L2 or dropout), get more data, shrink the model, or stop training earlier (early stopping).",
        },
      },
      {
        heading: "11. Normalization and Initialization",
        paragraphs: [
          "Two practical concerns can sink a network before it learns anything, and both come down to keeping the numbers flowing through it in a sensible range. The high-level point: if activations or gradients drift too large or too small, training becomes unstable or stalls, so we manage their scale deliberately.",
        ],
      },
      {
        paragraphs: [
          "The first concern is **normalization**. As data passes through layer after layer, the scale of the numbers can drift, ballooning in some layers and shrinking in others, which makes training erratic and slow. Normalization layers fix this by rescaling the activations back to a steady distribution at each step, then letting the network learn to shift and scale them as it sees fit. The best-known is **batch normalization**, which for each feature normalizes across the current mini-batch to zero average and unit spread:",
        ],
      },
      {
        equations: [
          "\\hat{x}_i = \\frac{x_i - \\mu_B}{\\sqrt{\\sigma_B^2 + \\epsilon}}, \\qquad y_i = \\gamma \\hat{x}_i + \\beta",
        ],
      },
      {
        paragraphs: [
          "Reading it: $\\mu_B$ is the **mean** (the average) of that feature over the batch, and $\\sigma_B^2$ is its **variance** (a measure of how spread out the values are, the average squared distance from the mean). Subtracting the mean re-centers the values on zero, and dividing by the square root of the variance (the standard deviation) rescales them to a standard spread. The $\\gamma$ and $\\beta$ are learnable knobs that let the network stretch and shift the normalized result if a different scale serves it better, so we keep full expressiveness while gaining stability. Batch norm speeds up training of convolutional networks a lot, though it behaves differently during training (where it uses the live batch statistics) than at test time (where it uses running averages collected during training), and it needs a reasonably large batch to estimate those statistics well.",
        ],
      },
      {
        paragraphs: [
          "That batch-size dependence is why **layer normalization** exists: it normalizes across the features within a single example rather than across the batch, so it doesn't care how big your batch is, which suits transformers, where it's standard. A leaner version called **RMSNorm** skips the mean-subtraction and only rescales, which is cheaper and used in many recent large models. There are further variants (**group normalization** for small batches, **instance normalization** for style transfer), all the same idea applied to a different slice of the data.",
        ],
      },
      {
        paragraphs: [
          "The second concern is **initialization**: where the knobs start before training. This matters more than you'd guess, because a bad starting point can make activations explode or vanish before the first gradient step lands. The clear mistake is setting all weights to zero: if every neuron in a layer starts identical, they all receive identical gradients and update identically forever, so they never differentiate into doing different jobs. The symmetry is never broken and a wide layer collapses into the behavior of a single neuron. The fix is random initialization, but the scale of the randomness has to match the size of the layer, because too small and the signal shrinks layer by layer toward nothing, too large and it explodes. Two recipes solve this by tuning the variance of the random weights: **Xavier (Glorot) initialization** uses variance $2/(n_\\text{in} + n_\\text{out})$ and is tuned for tanh-style activations, while **He initialization** uses variance $2/n_\\text{in}$ and is tuned for ReLU (which, by zeroing the negatives, halves the variance and so needs a compensating boost). For ReLU networks, which is most of them, He initialization is standard. ($n_\\text{in}$ and $n_\\text{out}$ are simply the number of inputs and outputs of the layer.)",
        ],
      },
      {
        quiz: {
          question: "Why is initializing all the weights to zero a bad idea?",
          answer: "Every neuron in a layer would compute the same thing and receive the same gradient, so they would update identically and never become different from one another. The symmetry is never broken, and the whole layer behaves like a single neuron.",
        },
      },
      {
        heading: "12. Diagnostics",
        paragraphs: [
          "A trained sense for what a training curve means is one of the most useful skills in deep learning, and it separates people who can fix a broken model from people who just re-run it and hope. The loss curve is the network's vital sign. Here is what the common patterns are telling you.",
        ],
      },
      {
        definitions: [
          { term: "Loss not decreasing at all", definition: "Learning rate too low, dead activations, a bug in the loss function, labels misaligned with inputs, or gradients not flowing (check for ReLU saturation or missing skip connections)." },
          { term: "Loss explodes to NaN", definition: "Learning rate too high, exploding gradients, numerical instability in the loss (e.g. $\\log(0)$), or bad initialization. Apply gradient clipping, lower the learning rate, and check for division by zero." },
          { term: "Training loss decreases but validation loss increases", definition: "Classic overfitting. Add regularization, get more data, reduce model size, or stop earlier." },
          { term: "Training and validation both plateau high", definition: "Underfitting. Use a bigger model, better features, more training, or less regularization." },
          { term: "Loss oscillates wildly", definition: "Learning rate too high, or batch size too small." },
          { term: "Loss decreases then suddenly spikes", definition: "Often a single bad batch or numerical instability. Inspect the outlier examples." },
        ],
      },
      {
        paragraphs: [
          "A few sanity checks are worth running first, because they catch most catastrophic bugs in minutes:",
        ],
      },
      {
        list: [
          "Can the model overfit a single batch? If it can't drive the loss to nearly zero on five examples, something is fundamentally broken and no tuning will save it.",
          "Does the initial loss match the expected value for random predictions (e.g. $\\log K$ for $K$-class cross-entropy)? If it's wildly off, your loss or labels are wrong.",
          "Are the gradients a reasonable magnitude across all layers, rather than vanishing in the early ones?",
        ],
      },
      {
        paragraphs: [
          "That's the foundation. A function with knobs, a loss that measures wrongness, a gradient that points downhill, and backpropagation to compute it efficiently. The architectures get fancier, but the spine stays the same.",
        ],
      },
      {
        paragraphs: [
          "Next, we look at the advanced math behind these networks.",
        ],
      },
    ],
  },
  {
    slug: "chapter-2-advanced-math",
    number: "2",
    title: "Math of Neural Networks",
    summary:
      "Matrix calculus and the four equations of backpropagation, derived from the ground up.",
    sections: [
      {
        paragraphs: [
          "Chapter 1 stated the four equations of backpropagation and put them to work. Here we're going to earn them — build them up from the math, one step at a time. You'll want three things sitting comfortably in your head: enough linear algebra to be at ease with the matrix–vector product, the transpose, the dot product, and the element-wise (Hadamard) product $\\odot$; single-variable calculus, and above all the chain rule; and partial derivatives. You do not need to have seen any of this derived before.",
          "Here's the whole story in one breath. A neural network is a function. You feed it an input $\\mathbf{x}$, and it produces $\\hat{\\mathbf{y}}$ by stacking layers, each one a matrix multiply, a bias, and a nonlinearity. Training means choosing the weights and biases so that $\\hat{\\mathbf{y}}$ lands close to the true $\\mathbf{y}$, with a cost $C$ measuring how close. Gradient descent nudges every parameter in the direction that lowers $C$. And backpropagation is the trick that gets you all of those gradients in a single backward pass, instead of grinding out a separate derivative for each parameter. Everything below is just detail on that sentence.",
        ],
      },
      {
        heading: "Notation",
        paragraphs: [
          "Notation matters more in this chapter than almost anywhere else, simply because there are so many indices flying around — and bad notation will sink you. So here are the conventions, and it's worth keeping them nearby:",
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
          "One fact here gets used over and over, so it's worth slowing down on. For an element-wise function — one where each output depends only on the input at the same position — the Jacobian is diagonal: $\\mathrm{diag}(g'(x_1), \\dots, g'(x_n))$. And a diagonal Jacobian behaves like element-wise multiplication inside a chain-rule product, since $\\mathrm{diag}(\\mathbf{v})\\,\\mathbf{w} = \\mathbf{v} \\odot \\mathbf{w}$. That's the reason every $\\mathrm{diag}(\\cdot)$ you'd expect to see ends up written as a $\\odot$ in the final equations. Activation functions are element-wise, so this happens at every single layer.",
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
          "And that, stripped to its bones, is all backpropagation is: multiply Jacobians together as you walk the network from the output back to the input. Everything that follows is just figuring out what those Jacobians actually are.",
        ],
      },
      {
        heading: "Part II: Forward propagation",
        paragraphs: [
          "A single neuron computes $z = \\mathbf{w}^\\top\\mathbf{x} + b$ and then $a = \\sigma(z)$ — nothing new there. The trouble starts when you stack many neurons across many layers and have to keep track of all of it. That bookkeeping is the whole reason matrix notation earns its keep, and the one choice that makes or breaks it is the destination-first weight index $w^{(\\ell)}_{jk}$.",
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
          "Let's take mean squared error as the cost and work with a single training example — that keeps the indices clean, and we lose nothing by it. The full-dataset cost is just the average over examples, and the gradient of an average is the average of the gradients, so the structure is identical either way:",
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
          "Before the clever algorithm, it's worth seeing the naive one — partly so you appreciate why the clever one exists. Take the smallest network that still shows the structure: one neuron per layer, two layers. Crank the chain rule and the two weight gradients come out directly:",
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
          "Here is the reusable quantity. Define the error of a neuron as how sensitive the cost is to its pre-activation, $\\delta^{(\\ell)}_j = \\partial C / \\partial z^{(\\ell)}_j$. Why hinge on $z$ and not $a$? Because $z$ sits exactly at the seam between the linear part (weights, bias, previous activations) and the nonlinear part (the activation) — and once you know $\\delta$, everything upstream of it falls out almost for free. Backprop computes $\\boldsymbol{\\delta}^{(L)}$ first, then $\\boldsymbol{\\delta}^{(L-1)}$, and so on backward, reading off the gradients as it goes.",
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
          "And that's it — that is the entire mathematical content of backpropagation. The cost is now linear in the number of parameters instead of quadratic, which is the whole reason training deep networks is even feasible. Keep this in your back pocket: every architecture in the chapters ahead — CNNs, transformers, diffusion models — trains with exactly this procedure. Only the shape of the layers changes; the engine underneath stays the same.",
        ],
      },
    ],
  },
  {
    slug: "chapter-0-ml-algorithms",
    number: "3",
    title: "Classical ML Algorithms",
    summary:
      "Before deep learning ate everything, classical ML algorithms quietly powered most of what worked in production.",
    sections: [
      {
        paragraphs: [
          "Before deep learning ate everything, classical ML algorithms quietly powered most of what actually worked in production — and on tabular data, they still do. Each one comes with its own assumptions about the world, its own ways of failing, and its own sweet spot.",
          "We'll go through the canonical ones here: what each is really optimizing, the bit of math that makes it tick, and when you'd reach for it. At the end there's a quick cheat sheet for picking one.",
        ],
      },
      {
        heading: "Linear Regression",
        paragraphs: [
          "The simplest supervised algorithm there is. Linear regression fits a straight line — a hyperplane once you have more than one feature — through the data by picking the weights that make the squared error as small as possible:",
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
          "You train it with binary cross-entropy loss. The decision boundary is still a straight line, but now the output is a calibrated probability rather than a hard label. This is the workhorse of binary classification in industry — it's fast, you can actually read what it learned (each weight is that feature's contribution to the log-odds), and it's a strong baseline for basically any classification problem you'll meet.",
        ],
      },
      {
        heading: "K-Nearest Neighbours (KNN)",
        paragraphs: [
          "A non-parametric method that works for both classification and regression. To make a prediction it looks at the $k$ closest training examples and either takes a majority vote (classification) or averages their values (regression). There's no real training phase at all — KNN just memorizes the dataset and does all of its work at prediction time.",
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
          "Trees are about as interpretable as models get — you can literally read the decision rules off the diagram — and they happily take numerical and categorical features without any preprocessing. The catch is that a single deep tree overfits easily, memorizing the quirks of your training set. The fix is to stop relying on one tree and combine many of them, which is where ensemble methods come in.",
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
          "The modern gradient-boosting libraries — XGBoost, LightGBM, CatBoost — are devastatingly good on tabular data. They've won an enormous share of Kaggle competitions and are the production default at countless companies. If you're working with structured data and aren't sure what to try, start here.",
          "One term worth pinning down: variance is the error that comes from a model being too sensitive to small wiggles in the training data — usually because it's complex enough to fit the random noise instead of the underlying pattern.",
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
          "The thing to take away: these classical algorithms haven't been replaced, they've been joined. For most tabular business data, gradient boosting still beats neural networks outright. Deep learning's dominance is concentrated in the places where the model has to learn its own representations — images, audio, language — which is exactly where we head next.",
        ],
      },
    ],
  },
  {
    slug: "chapter-3-inference-engineering-and-compute",
    number: "4",
    title: "AI Hardware and Compute",
    summary:
      "From the CPU up through GPUs and TPUs to how a model scales across thousands of chips.",
    sections: [
      {
        paragraphs: [
          "Behind every frontier model is a hardware stack working in concert — trillions of parameters, thousands of chips, all coordinating across high-speed interconnects to do one thing: multiply matrices very, very fast. It's easy to treat all of this as a black box, but a surprising amount of why models are slow, expensive, or memory-starved lives down here. So we'll start at the CPU, build up through GPUs and TPUs, and end with how a single model gets split across an entire data center.",
        ],
      },
      {
        heading: "Three kinds of compute: the CPU",
        paragraphs: [
          "Start with the chip you already know. A CPU reads instructions and data from memory, computes, and writes the results back — largely one thing after another. The catch is that memory access is far slower than arithmetic, and that gap is so fundamental it has a name: the von Neumann bottleneck. More often than not, the processor is sitting around waiting for data rather than actually computing.",
          "CPUs fight this with a lot of clever machinery — deep instruction pipelines, branch predictors, several cache levels (L1/L2/L3), out-of-order execution — all of it in service of keeping a small number of cores fed. What you get in return is flexibility: one CPU can run a database, an operating system, a game, or a neural network. But that flexibility isn't free. Each core is large and complicated, so a chip only fits a few dozen of them. And for the kind of work neural networks do — massively parallel, arithmetic-heavy — most of that cleverness just goes to waste.",
        ],
      },
      {
        heading: "The GPU",
        paragraphs: [
          "A GPU makes the opposite bet. Strip out most of the control logic and the big caches, and trade that one heavyweight core for thousands of small arithmetic units (ALUs) — somewhere from 2,500 to 5,000 and up. That's a terrible design for running an operating system and a perfect one for any workload where the same operation runs over millions of independent data points. The original use case was 3D graphics: every pixel on the screen needs the same shading calculation, just on different inputs. Neural networks turned out to fit that pattern exactly. Multiplying two 4096×4096 matrices is 16 million independent multiply-accumulates; a GPU eats that for breakfast.",
          "It's worth being honest that this is still a general-purpose processor — every ALU is reading operands from registers or shared memory. The massively parallel memory system softens the von Neumann bottleneck; it doesn't make it disappear.",
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
          "Here's how you actually program one. GPU code is written as a kernel — a function that describes what a single thread does. When you launch a kernel you spin up millions of threads, organized into blocks, which are themselves organized into a grid. Threads inside a block share fast on-chip memory and can synchronize with each other; blocks are independent and may run in any order the hardware likes.",
          "Down at the hardware level, threads execute in warps of 32. A warp runs in SIMT mode — Single Instruction, Multiple Threads — meaning all 32 threads share one instruction fetch and decode and just operate on different data. One consequence is worth burning into memory: branching is expensive. If half a warp takes the if and half takes the else, the warp runs both paths one after the other, masking off the threads that shouldn't be active for each. That's warp divergence, and dodging it is a recurring theme in GPU optimization. Neural networks happen to barely branch at all, which is a big part of why they map onto GPUs so beautifully.",
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
          "Performance lives and dies by where data sits. From fastest/smallest to slowest/largest: registers, shared memory / L1, L2 cache, HBM (the GPU's main memory, also called VRAM), and host memory (system RAM) reached over PCIe at a relatively pokey ~32–64 GB/s — going there is a last resort. The gap is enormous — registers and shared memory are about 100× faster than HBM. Most GPU optimization is the art of keeping data in the fast levels and minimizing trips to HBM.",
        ],
        diagram: {
          id: "memory-hierarchy",
          caption:
            "Fig 3.2 — The GPU memory hierarchy. Each level down is larger but slower; registers and shared memory are ~100× faster than HBM.",
        },
      },
      {
        heading: "From C++ to cubin: the CUDA toolchain",
        paragraphs: [
          "It's worth knowing the stack your kernels pass through on the way to the metal. Every GPU has a Compute Capability (CC) number written as major.minor — CC 12.0, say, which also names the SM architecture target (sm_120). Sitting underneath everything is the NVIDIA Driver (something like r580), effectively the operating system of the GPU. Above that, the CUDA Toolkit gives you the libraries, headers, and tools for writing GPU software, and the CUDA Runtime is the API you actually call to allocate memory, copy data, and launch kernels.",
          "When you compile, your C++ is first lowered to PTX (Parallel Thread Execution), a high-level assembly that acts as an abstraction layer over the GPU's instruction set architecture (ISA). PTX is then compiled to a cubin (a CUDA binary) for a specific target. To keep one program runnable across many GPUs, the compiled code is bundled into a fatbin — a container holding cubins and PTX for several different targets at once. The path, end to end: C++ → PTX → cubin, packaged in a fatbin.",
        ],
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
          "Google looked at GPUs and decided even they weren't specialized enough, so they built the TPU (Tensor Processing Unit) from scratch with neural networks as the only customer. The first TPU was deployed in 2015, purely for inference; later generations handle both training and inference. TPUs power Google's own ML across products like Search, Translate, and Photos, and are available to external users through Google Cloud.",
          "Confusingly, Google also named its compute unit a TensorCore — not the same thing as NVIDIA's. Each one has three pieces: a Matrix Multiplication Unit (the MXU, a systolic array — 256×256 multiply-accumulators in v6e/v7 (\"Ironwood\"); earlier versions used 128×128), a vector unit for activations, softmax, and norms, and a scalar unit for control flow and addressing. A single MXU performs about 16,000 multiply-accumulate operations per cycle — a staggering number out of one unit.",
          "The systolic array is the TPU's defining trick, and it's genuinely elegant once you picture it. Values of A flow in from the left and move right; values of B flow in from the top and move down; each cell multiplies whatever two numbers happen to be passing through it, adds the result to a running total, and hands both operands along to its neighbors. The payoff is in one property: data gets loaded once and then reused over and over as it walks across the array — no memory access happens at all during the computation itself. It's really just a very large, very specialized GEMM engine wired straight into silicon.",
        ],
        diagram: {
          id: "systolic-array",
          caption:
            "Fig 3.3 — A TPU systolic array. A enters from the left, B from the top; each cell multiply-accumulates and passes operands on, so data is loaded once and reused across the whole grid.",
        },
      },
      {
        paragraphs: [
          "A subtle but important detail: TPU MXUs take bfloat16 inputs but accumulate in FP32. BF16 has FP32's exponent range with a smaller mantissa — great for inputs with wide dynamic range, bad for accumulation where small errors compound. Low precision for the multiplies, high precision for the adds: this pattern is now standard across all AI hardware, NVIDIA's tensor cores included.",
          "Recent TPU generations (v5p, v6e, v7) also include SparseCores alongside the main TensorCores. These are dataflow processors specialized for sparse operations — primarily the embedding lookups in recommendation systems. Picture a recommendation model with a tens-of-billions-row embedding table where each training step only touches a few thousand rows: a dense compute unit would be hopelessly wasteful on that, so the SparseCores handle the gather-heavy workload efficiently instead.",
        ],
      },
      {
        heading: "From chips to pods",
        paragraphs: [
          "A single chip is rarely enough. Google connects chips into a slice via a custom high-speed Inter-Chip Interconnect (ICI) — faster and lower-latency than standard data-center networking; a TPU cube is a 4×4×4 topology of 64 chips, applicable starting with TPU v4 (the 3D mesh maps gradient-communication patterns efficiently); a pod links thousands of chips; and multislice extends beyond a single pod over the slower data-center network (DCN) — within a slice the fast ICI handles communication, across slices the slower DCN does. Training a frontier model isn't done on one chip — it's thousands of chips constantly sharing gradients, and the interconnect speed can dominate the compute. You don't write TPU code directly: you write JAX, PyTorch/XLA, or TensorFlow, and the XLA compiler lowers your tensor ops to TPU instructions.",
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
        paragraphs: [
          "This is where the interconnect investment pays off. Whether it's NVIDIA's NVLink + InfiniBand or Google's ICI + DCN, the network is half the supercomputer — the speed of moving gradients between chips can matter as much as the speed of the chips themselves.",
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
          "Arithmetic intensity — the ratio of operations to bytes moved — decides which side you're on. Large matmuls have high intensity (each loaded value is reused many times), so they are compute-bound and benefit from peak FLOPs. Element-wise operations have low intensity and are memory-bound — which is exactly why operator fusion matters, combining many small ops into one kernel to reuse loaded values. As a rule, inference for a small batch is memory-bandwidth bound (you reload all the weights per token), while training is more compute-bound. Attention in long contexts is its own beast — quadratic in sequence length, with specific memory-access patterns that motivated optimizations like FlashAttention.",
          "Here's the whole arc in one breath. CPUs are universal but slow at parallel math. GPUs give up some of that flexibility for thousands of cores and turn out to be perfect for matrix multiplication. CUDA made GPUs programmable and, in doing so, built a software moat that's nearly as valuable as the silicon underneath it. And TPUs push further still, with purpose-built systolic arrays networked into pods the size of data centers. So the next time a training run is mysteriously slow, trust that the answer is almost always hiding somewhere in this hierarchy — a memory bottleneck, an interconnect bottleneck, a precision issue, or plain old kernel-launch overhead.",
        ],
      },
    ],
  },
  {
    slug: "chapter-4-transformers",
    number: "5",
    title: "Transformers",
    summary:
      "Attention Is All You Need was published in 2017, and we're still living in its world.",
    sections: [
      {
        paragraphs: [
          "In 2017, eight researchers at Google published a paper with the slightly cocky title \"Attention Is All You Need,\" and machine learning genuinely has not been the same since. The Transformer they introduced is the thing underneath GPT, Claude, Gemini, LLaMA — essentially every modern foundation model. But to really appreciate why it works, you have to see what came before it and exactly where each predecessor hit a wall.",
        ],
      },
      {
        heading: "Before transformers: RNNs",
        paragraphs: [
          "Start with the problem. A feedforward network has a fixed input size and no notion of order at all, which makes it a dead end the moment you care about sequences. Recurrent neural networks (RNNs) got around this by feeding their own output back in as input: a hidden state $\\mathbf{h}$ carries a running summary forward across timesteps, and the same weights are reused at every step, so suddenly the network can handle sequences of any length.",
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
          "RNNs gave networks a memory — it just turned out to be a very short one. Backpropagation through time multiplies by the recurrent matrix once per step, so the gradient either vanishes (shrinks to nothing, which is the default with tanh) or explodes (blows up to NaN). In practice that meant an RNN reliably learned dependencies of only 5–10 tokens, and on top of that, the entire history had to be crammed into one fixed-size hidden vector.",
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
          "Attention (Bahdanau, 2014) is what finally demolished that bottleneck. Rather than forcing the decoder to lean on one summary vector, it let the decoder look back at every encoder hidden state and decide which ones mattered right now: score each one, softmax the scores into weights that sum to 1, and take a weighted sum — a context vector. Translation quality jumped, especially on long sentences. And the deeper lesson is the one to hold onto: direct token-to-token interaction, mediated by learned attention weights, beats threading everything through a single recurrent state. Which sets up the question Vaswani and his coauthors actually asked — what if we keep only the attention and throw out the recurrence entirely?",
        ],
      },
      {
        heading: "Seq2Seq and Bahdanau attention",
        paragraphs: [
          "The bridge from RNNs to attention runs through Seq2Seq, a model Ilya Sutskever built from two LSTMs: an encoder that reads the input sentence and produces a single final hidden state $h_{\\text{enc}}$, and a decoder LSTM initialized with that state that generates the output one token at a time. \"I like cats\" goes in, the encoder compresses the whole sentence into $h_{\\text{enc}}$, and the decoder unrolls \"J'aime les chats\" from it. It worked well for translation, but every drop of information had to flow through that one fixed-size vector — for a paragraph, the model forgot the beginning of the input by the time it generated the end.",
          "Bahdanau attention (2014) was bolted on as the fix. The decoder's current hidden state $s_{i-1}$ acts as a query, each encoder hidden state $h_j$ as a key and value; you score how relevant each $h_j$ is to $s_{i-1}$, softmax the scores into weights $\\alpha_{ij}$ that sum to 1, and form a context vector $c_i = \\sum_j \\alpha_{ij}\\,h_j$ to generate the next token. This is exactly self-attention, generalized: instead of the decoder attending to the encoder, every token attends to every other. One detail to flag — Bahdanau computed the compatibility score with a small feedforward network, not the dot product the transformer would later use. But this was the birth of attention.",
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
          "Now the heart of it. Self-attention lets each token gather context from every other token. From its embedding, each token produces three vectors through learned matrices: a query (what it's looking for), a key (what it offers to others), and a value (the content it actually contributes). The cleanest analogy is a search engine — your query gets matched against a bunch of keys, and the best-matching ones hand back their values.",
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
          "A single attention pattern can only capture one kind of relationship at a time. Multi-head attention gets around that by running $h$ of them in parallel (the original paper used $h = 8$), each with its own $W_Q, W_K, W_V$ working on a smaller $d/h$-dimensional slice. You concatenate the heads' outputs and push them through a final projection $W_O$. What's nice is that the heads end up specializing on their own — some learn grammar, some coreference, some positional patterns — and nobody assigns those roles by hand; training does it.",
          "Why eight, though? It's a hyperparameter balancing two failure modes: too few heads and each must learn too many relationships at once, losing specialization; too many and each head's dimension gets too small to represent anything meaningful (while you pay more in compute). With $d = 512$ and $h = 8$, each head gets 64 dimensions — diverse enough to learn multiple patterns, large enough to keep useful capacity. Modern large models often use far more heads (32, 64, even 128), with proportionally smaller per-head dimensions.",
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
          "In the decoder, the first attention layer comes with a catch — it's masked. The reason is simple: during generation a token must not be allowed to see the future, because if it could, training would be trivial and pointless. The model would just peek at the next token, copy it, and never actually learn to generate anything. A look-ahead mask handles this by setting every score above the diagonal to $-\\infty$ before the softmax, which makes those weights come out as exactly zero. That keeps the autoregressive property intact: the model writes strictly left to right.",
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
          "Once attention has gathered context, the feed-forward network processes it, applied independently to each position. It's a two-layer MLP that expands to a larger dimension (the original used $d_{\\text{model}} = 512 \\to d_{\\text{ff}} = 2048$, a 4× expansion), applies a nonlinearity, and contracts back. Here's why it matters that the FFN holds most of a transformer's parameters: with $d_{\\text{model}} = 512$ and $d_{\\text{ff}} = 2048$, each FFN layer has roughly $4 \\times 512 \\times 2048 \\approx 4$ million parameters, while multi-head attention at the same $d_{\\text{model}}$ has only about $4 \\times 512^2 \\approx 1$ million. In large LLMs the FFN is where most of the model's \"knowledge\" lives — which is exactly why Mixture of Experts targets it.",
        ],
        equations: [
          "\\text{FFN}(x) = \\max(0,\\ x W_1 + b_1)\\,W_2 + b_2",
        ],
      },
      {
        heading: "Layer norm and residual connections",
        paragraphs: [
          "Two pieces hold deep stacks together. Layer normalization rescales each token's activations to zero mean and unit variance across its features, then learns a scale $\\gamma$ and shift $\\beta$. The contrast with batch norm — which computes its statistics across a batch of examples rather than across one example's features — is exactly why transformers prefer layer norm, for three reasons: it doesn't depend on batch size (transformers train at wildly varying batch sizes), it works fine with variable-length sequences, and it's compatible with autoregressive generation, where you process one token at a time at inference. (LLaMA and many recent LLMs go a step further with RMSNorm, dropping the mean subtraction entirely.)",
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
        heading: "What encoders are still for",
        paragraphs: [
          "In the GPT era encoders aren't obsolete, just specialized into the parts of the pipeline where bidirectional representation beats generation. Embedding models — OpenAI's text-embedding-3, Cohere Embed, BGE, Voyage, sentence-transformers — are encoders: text in, vector out, powering semantic search, RAG retrieval, clustering. Reranking uses a cross-encoder that takes the query and a candidate document jointly and outputs one relevance score — slower than a vector lookup but more accurate, run after the initial retrieval. And classification and structured tasks — sentiment, intent detection, named-entity recognition, content moderation — are often faster, cheaper, and more accurate with a fine-tuned encoder than with an LLM. (The vision side of multimodal models, typically a ViT, is an encoder too.)",
        ],
      },
      {
        heading: "RAG and tool use",
        paragraphs: [
          "Even the best LLM has three hard limits: it doesn't know facts from after its training cutoff, it can't see your private data, and it can confabulate plausible-sounding nonsense. Both fixes augment the model with external systems. Retrieval-augmented generation (RAG) retrieves relevant documents — via those encoder embedding models — and feeds them into the prompt so the model answers from real, current, private sources instead of parametric memory. Tool use lets the model call external functions (search, code execution, databases, APIs) and condition on the results. Either way, the model stops being a closed box and starts grounding its output in something verifiable.",
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
        heading: "What sliding window sacrifices",
        paragraphs: [
          "Windowed attention isn't free context. A token at position 50,000 can't directly attend to one at position 100 — the information has to ripple up through layers — and that produces real failure modes: needle-in-a-haystack retrieval at long distance (the answer at position 1,000 and the question at 50,000 can get lost as information propagates through $L$ layers without being overwritten), multi-hop reasoning whose reference chains span the whole document, and long-range copying of a specific phrase from far back. The usual mitigations are periodic full-attention layers and attention sinks — always attending to the first few tokens, which empirically stabilizes long-context behavior.",
        ],
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
          "Flash Attention is worth dwelling on because of what it represents. It's a re-implementation of attention that is mathematically identical to the original but never actually materializes the full $n \\times n$ score matrix — it works through attention in tiles small enough to fit in fast on-chip SRAM, using an online softmax, and the result is a 2–4× speedup with memory that grows linearly instead of quadratically. That's a pattern you'll see again and again in modern ML: some of the biggest wins don't come from new math at all, but from implementing the existing math more cleverly.",
        ],
      },
      {
        heading: "Quantization",
        paragraphs: [
          "Quantization maps high-precision numbers down to fewer bits. The ladder runs FP32 → FP16/BF16 (already standard, 2× memory and bandwidth savings at minimal quality cost), FP8 (newer, another 2× on top, common in training on H100s and beyond), INT8 (common for inference — weights, sometimes activations), and INT4/NF4 (aggressive, for running large models on consumer hardware, with some quality loss on harder tasks). Per-group or per-channel schemes quantize different slices of the weights with different scales for better precision than naive uniform quantization.",
          "There are two main approaches: post-training quantization (PTQ) trains in high precision and quantizes after — cheap but lossy, with tools like GPTQ and AWQ — while quantization-aware training (QAT) simulates quantization during training so the model learns to be robust to it, costing more but giving better quality. Quantization is what lets a 70B-parameter model run on a single workstation GPU: at 4 bits, 70B params = 35 GB, which fits in a 48 GB card. Without it, frontier models would be inaccessible to anyone outside a major data center.",
        ],
      },
      {
        heading: "Speculative decoding",
        paragraphs: [
          "Decode is bottlenecked by memory bandwidth: each step reads the full KV cache and model weights for one token's worth of compute. Speculative decoding exploits a clever asymmetry — a small, fast \"draft\" model proposes $k$ tokens cheaply, and the big model verifies all $k$ in a single parallel forward pass (the same work it would have done for one token anyway). You compare the proposals against the big model's predictions and accept the longest matching prefix, then continue from the big model's correction.",
          "When the draft agrees with the big model most of the time — which holds for easy tokens like punctuation, common words, and predictable completions — you get a 2–3× speedup with no quality loss, since the big model still has the final say. It's now standard in production inference. Variants include Medusa (multiple prediction heads on the same model), EAGLE (improved drafting via feature reuse), and lookahead decoding (parallel verification of multiple candidate sequences).",
        ],
      },
      {
        heading: "Inference engines and long context",
        paragraphs: [
          "Production serving doesn't run raw PyTorch — it runs specialized inference engines: vLLM (PagedAttention, high-throughput dynamic batching), TensorRT-LLM (NVIDIA's optimized engine), SGLang (flexible structured generation with constraint enforcement), and llama.cpp (quantized models on CPUs and consumer GPUs). Through continuous batching, paged KV cache, fused kernels, and quantization, these typically hit 5–10× the throughput of naive PyTorch.",
          "Stretching context from a few hundred tokens to 200k, 1M, even 10M took innovations across the whole stack. Positional encodings: RoPE plus scaling tricks — NTK-aware scaling, YaRN, position interpolation — let a model trained at 8k handle 128k or more (ALiBi extrapolates natively). KV cache compression: at 1M tokens the cache alone can run to hundreds of GB, so quantization and eviction strategies (drop old or low-attention tokens) become essential. Training data: a model trained only on 4k examples won't use 1M tokens well even if it technically can, so long-context training curates long documents and uses progressive length training. And evaluation: \"needle in a haystack\" checks retrieval, while harder suites like RULER and LongBench probe whether a model actually reasons over long context. The honest caveat is that many models claim 1M but really only use the first 32k (and the last few thousand) well — improving fast, but still a real consideration when you design systems.",
        ],
      },
      {
        heading: "Mixture of Experts",
        paragraphs: [
          "Here's a tempting idea. Most of the parameters live in the FFN — so what if you had many FFNs lying around but only ran a few of them per token? That's Mixture of Experts: replace each FFN with $N$ experts plus a router that sends each token to its top-$k$ (usually just 1 or 2). You end up with the capacity of all $N$ experts but the compute cost of only $k$ — Mixtral 8×7B has roughly 47B total parameters yet activates only ~13B per token. It isn't free, though: every expert has to sit in memory, load balancing needs auxiliary losses to keep the router honest, and routing makes batching genuinely messier.",
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
        paragraphs: [
          "A few variants are worth naming: QLoRA combines LoRA with quantization (a 4-bit frozen base plus trainable adapters) so you can fine-tune large models on a single consumer GPU, and DoRA decomposes each weight into a magnitude and a direction and applies the low-rank update to the direction, recovering a bit more of FullFT's quality. The adapter is permanently bound to its exact base model — a LoRA trained on Llama-3.1-8B works only with Llama-3.1-8B, since $B$ and $A$ take their shapes from that base's matrices — which is precisely what makes multi-tenant serving (many adapters over one frozen base, as in vLLM and SGLang) coherent.",
        ],
      },
      {
        heading: "LoRA Without Regret",
        paragraphs: [
          "Thinking Machines' empirical study (\"LoRA Without Regret\") condenses into two conditions for matching full fine-tuning (FullFT). First, apply LoRA to all layers — especially the MLP/MoE layers that hold most of the parameters. Attention-only LoRA underperforms even at matched parameter counts: on Llama-3.1-8B, attention-only at rank 256 (0.25B params) loses to MLP-only at rank 128 (0.24B params), so the gap isn't about parameter count, and applying LoRA to attention adds nothing beyond applying it to the MLPs. Second, stay out of the capacity-constrained regime — keep trainable parameters above the dataset's information content. LoRA doesn't hit a hard loss floor when starved; instead lower-rank adapters \"fall off\" the optimal loss curve once they run out of capacity.",
          "On the practical knobs: the optimal LoRA learning rate is consistently about 10× higher than FullFT's (their multi-model fit landed on 9.8×), which makes transferring a known FullFT learning rate nearly mechanical — and for very short runs under ~100 steps the multiplier rises toward 15×, converging back to 10× for longer runs. The optimal learning rate is roughly independent of rank (thanks to the $1/r$ scaling in $W' = W + \\frac{\\alpha}{r}BA$, it shifts by less than 2× between rank 4 and 512, though rank 1 wants a touch lower). They used $\\alpha = 32$ with the standard Hugging Face peft initialization (uniform $A$ scaled by $1/\\sqrt{d_{\\text{in}}}$, zero-initialized $B$, same learning rate for both) and couldn't beat it. One caution: LoRA is less tolerant of large batch sizes than FullFT, a penalty that grows with batch size and isn't fixed by raising the rank — it's an optimization-dynamics effect of the $BA$ product, not a capacity one.",
          "The standout result is for reinforcement learning: LoRA fully matches FullFT for policy-gradient RL even at rank 1. The argument is information-theoretic — policy gradients learn from the advantage function, which carries only $O(1)$ bits per episode, roughly 1000× less information per token than supervised learning. In their MATH example, ~10,000 problems at 32 samples each is about 320,000 bits to absorb, while a rank-1 LoRA on Llama-3.1-8B already has 3M parameters — nearly 10× that. RL also gave LoRA a wider band of well-performing learning rates.",
        ],
      },
      {
        heading: "Beyond transformers: GANs and VAEs",
        paragraphs: [
          "Two generative architectures round out the picture. A GAN pits a generator (noise $z$ → fake data) against a discriminator (real vs fake) in a minimax game over a single shared value function — D wants to push it up, G wants to push it down:",
        ],
        equations: [
          "\\min_G \\max_D V(D,G) = \\mathbb{E}_{x \\sim p_{\\text{data}}}\\big[\\log D(x)\\big] + \\mathbb{E}_{z \\sim p_z}\\big[\\log\\big(1 - D(G(z))\\big)\\big]",
        ],
      },
      {
        paragraphs: [
          "Early on, when G is bad, D rejects its fakes with total confidence and $\\log(1 - D(G(z)))$ flattens out, leaving G almost no gradient — the saturation problem. The standard fix is the non-saturating loss: train G to maximize $\\log D(G(z))$ instead, same goal (fool D) but with strong gradients exactly when G is struggling. The reason the game converges to reality is Goodfellow's 2014 proof. Hold G fixed and the optimal discriminator is $D^*(x) = \\frac{p_{\\text{data}}(x)}{p_{\\text{data}}(x) + p_g(x)}$ — the ideal detective's confidence at a point is just the fraction of stuff there that's genuinely real. Substitute $D^*$ back in and G's objective reduces to minimizing the Jensen–Shannon divergence between $p_g$ and $p_{\\text{data}}$, which bottoms out at exactly one place: $p_g = p_{\\text{data}}$, where $D^*(x) = \\tfrac{1}{2}$ everywhere — the coin flip. The perfectly played game recovers the true data distribution. In practice GANs are notoriously unstable (mode collapse, vanishing gradients from a too-strong discriminator), which is what Wasserstein GANs, spectral normalization, and gradient penalties exist to tame.",
        ],
      },
      {
        heading: "Autoencoders",
        paragraphs: [
          "Before VAEs, the plain autoencoder. It's a network trained to copy its input to its output through a bottleneck: an encoder $f$ compresses input $x$ into a latent code $z = f(x)$ much smaller than $x$, and a decoder $g$ reconstructs $\\hat{x} = g(z)$. The bottleneck is the whole point — if $z$ were as big as $x$ the network could copy numbers through and learn nothing, so forcing $z$ small makes it keep only the essential structure. Training just minimizes the reconstruction error, with no label at all — the input is its own target, which is why this is called self-supervised learning:",
        ],
        equations: [
          "\\mathcal{L}(\\theta, \\phi) = \\frac{1}{N} \\sum_{i=1}^{N} \\big\\lVert\\, x_i - g_\\theta\\big(f_\\phi(x_i)\\big) \\big\\rVert^2",
        ],
      },
      {
        paragraphs: [
          "Autoencoders are good for dimensionality reduction (a nonlinear cousin of PCA), denoising (feed in corrupted $x$, train it to output clean $x$), and anomaly detection (things it can't reconstruct well are unusual). But here's the catch that motivates everything next: a plain autoencoder learns a code $z$ yet learns nothing about how $z$ is distributed. The latent space is full of holes — pick a random $z$ and decode it and you usually get garbage, because the decoder only ever saw the specific scattered points the encoder happened to produce. So a vanilla autoencoder cannot generate new data reliably. Fixing exactly this is the job of the VAE.",
          "A VAE keeps the encoder–decoder shape but reframes it probabilistically: instead of mapping $x$ to a single point, the encoder maps $x$ to a distribution over $z$ — a Gaussian with a mean $\\mu$ and a spread $\\sigma$ — and you sample $z = \\mu + \\sigma\\,\\varepsilon$ and decode it. Training balances two pulls: a reconstruction term that wants each image precisely pinned so it rebuilds perfectly (which would recreate the scattered-dots problem), and a KL term that punishes each cloud for drifting off-center or shrinking to a sharp point, constantly nudging everything back toward a standard cloud at the center of the map. The compromise — clouds distinct enough to rebuild their own images but overlapping and centered enough to leave no gaps — fills the latent space in smoothly, so you can throw away the encoder and generate by decoding random points from the center. The one cost of all that softness is slightly blurry samples, which is the main reason sharper methods like GANs and diffusion exist.",
        ],
      },
      {
        paragraphs: [
          "And that's the takeaway worth leaving with. Every modern variant — RoPE, GQA, Flash Attention, MoE, million-token context — is an optimization of one specific piece of the 2017 design, not a replacement for it. Once the original architecture is solid in your head, every new paper starts to read the same way: \"here is the one part we improved.\"",
        ],
      },
    ],
  },
  {
    slug: "chapter-5-vision",
    number: "6",
    title: "Vision",
    summary:
      "From pixels to CNNs to YOLO, segmentation, SAM, and vision transformers — how machines learned to see.",
    sections: [
      {
        paragraphs: [
          "Strip away the abstraction and an image, to a computer, is just a grid of pixels — each one a few numbers describing intensity. A color image is a 3-D tensor of height, width, and channels (3 of them for RGB), and a whole batch of images is 4-D: $(N, C, H, W)$. Here's the part that trips people up, though: after the very first convolutional layer, \"channels\" stop meaning colors entirely. They turn into learned features — one channel might fire on horizontal edges, another on red blobs — and their count climbs from 3 at the input to hundreds deep inside the network.",
          "Raw pixel values in $[0, 255]$ are poor inputs — too large and not zero-centered — so the standard preprocessing divides by 255 and then subtracts the dataset mean and divides by the standard deviation, per channel. Always normalize the same way at inference as in training.",
        ],
        diagram: {
          id: "image-tensor",
          caption:
            "Fig 5.1 — An image as a (C, H, W) tensor. Channels start as colors and become learned feature maps deeper in the network.",
        },
      },
      {
        paragraphs: [
          "A couple of details worth pinning down before we go further. Channel order matters: PyTorch stores tensors channels-first as $(C, H, W)$, while TensorFlow and numpy store them channels-last as $(H, W, C)$. A 1024×768 RGB image is therefore $(3, 768, 1024)$ in PyTorch's convention and $(768, 1024, 3)$ in TensorFlow's — same image, transposed layout — and mixing the two up is one of the most common shape bugs you'll hit.",
          "And when people say \"normalize,\" they usually mean a specific recipe. For ImageNet-trained models the constants are fixed by convention: subtract the per-channel mean $(0.485, 0.456, 0.406)$ and divide by the per-channel standard deviation $(0.229, 0.224, 0.225)$, after first scaling pixels into $[0, 1]$. The exact numbers matter — a model trained with these will quietly degrade if you feed it images normalized any other way.",
        ],
      },
      {
        heading: "Why not just an MLP?",
        paragraphs: [
          "The obvious thing to try is to flatten a 224×224×3 image into a 150,528-element vector and feed it to a fully connected layer — and it fails, for two reasons worth understanding. First, parameter explosion: the first weight matrix alone would carry around 150M parameters. Second, no translation invariance: a dog in the top-left corner and the exact same dog in the bottom-right corner light up completely different neurons, so the network is forced to relearn \"dog\" separately for every position. CNNs are built precisely around the two facts an MLP throws away — locality (nearby pixels are correlated) and translation invariance (a feature means the same thing no matter where it shows up).",
        ],
      },
      {
        heading: "The convolution operation",
        paragraphs: [
          "So here's what a convolution actually does. It slides a small filter — a 3×3 or 5×5 tensor of weights, with the same depth as the input — across the image. At each stop, it multiplies the filter element-wise against the patch it's sitting on, sums everything up, adds a bias, and writes out a single value. Do that across the whole input and you've got a 2-D feature map showing how strongly that filter's pattern shows up at each position:",
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
          "One pedantic but worth-knowing footnote: what's described above is technically cross-correlation, not true convolution. A true mathematical convolution flips the filter before applying it. In deep learning nobody bothers — because the filter weights are learned, flipping or not flipping makes no difference at all; the network simply learns whatever weights work. So everyone calls it \"convolution\" and moves on.",
        ],
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
        paragraphs: [
          "ReLU is the default, but you'll meet a few smoother cousins: Leaky ReLU keeps a small negative slope instead of flatlining at zero, GELU is the smooth version transformers use, and SiLU/Swish shows up in some recent CNNs. For classical CNN work, plain ReLU is still what you reach for first.",
        ],
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
        paragraphs: [
          "It's worth being precise about how fast that region grows. One 3×3 layer gives a 3×3 receptive field. Stack a second 3×3 on top and each output neuron depends on a 3×3 patch of the previous layer, each of which depended on a 3×3 patch of the input — so the receptive field is now 5×5. A third stacked layer takes it to 7×7. In general, after $n$ stacked 3×3 layers the receptive field is $(2n+1) \\times (2n+1)$. Pooling and stride-2 layers accelerate this dramatically — a single stride-2 layer effectively doubles the receptive field of everything after it — which is how deep neurons in a network like ResNet-50 end up seeing the entire image.",
        ],
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
          "Classification tells you what's in an image; detection asks the harder question of where everything is. The pre-deep-learning approach (DPM) and the first deep one (R-CNN) both took the same tack — repurpose a classifier and run it at thousands of locations. Accurate, but painfully slow; R-CNN took 40-plus seconds per image. YOLO's insight was to stop treating it as classification at all and make detection a single regression problem solved in one network pass. Resize the image, run one CNN, threshold the detections — you only look once.",
          "YOLO divides the image into an $S \\times S$ grid (7×7 for VOC). Each cell predicts $B$ bounding boxes plus $C$ class probabilities, and the cell containing an object's center is responsible for detecting it. The output is a single $7 \\times 7 \\times 30$ tensor laid out spatially — for $B=2$ boxes (5 numbers each) plus 20 class probabilities.",
        ],
        diagram: {
          id: "yolo-grid",
          caption:
            "Fig 5.5 — YOLO's grid. Each cell predicts B boxes and class probabilities; the cell holding an object's center is responsible for it.",
        },
      },
      {
        heading: "Before YOLO: DPM and R-CNN",
        paragraphs: [
          "To appreciate why YOLO felt like such a leap, it helps to see what it replaced. Before deep learning, the dominant detector was the Deformable Parts Model (DPM). It worked by sliding a classifier across the image at every location and multiple scales, and at each window it would extract hand-crafted HOG (Histogram of Oriented Gradients) features, score the window against a learned template for the object's overall shape, score it again against templates for the object's parts (legs, head, wheels), and combine everything while allowing some deformation between the parts. The trouble was that every piece — feature extraction, root filter, part filters, deformation cost, post-processing — was designed or trained separately with no joint optimization, the hand-crafted HOG features couldn't capture the diversity of natural images, and even the fastest variant couldn't really hit real-time on general detection.",
          "The first wave of deep-learning detectors — R-CNN (2014), then Fast R-CNN, then Faster R-CNN — swapped HOG for CNN features but kept a two-stage structure. Stage one generates around 2000 candidate boxes per image: the original R-CNN used Selective Search (a classical, non-learned algorithm), while Faster R-CNN replaced it with a small learned Region Proposal Network. Stage two runs a CNN on each candidate to classify it and refine the box. On top of that sat a separate box-refinement model, NMS to remove duplicates, and context rescoring. The numbers tell the story: the original R-CNN took more than 40 seconds per image, and even Fast R-CNN managed only about 0.5 frames per second — nowhere near real-time. Too many parts, each trained separately, each adding its own cost.",
          "Both DPM and R-CNN share the same flaw: they repurpose a classifier to do detection, running it at many locations and post-processing the results. The classifier never sees the whole image, so it can't reason about context, and the pipeline is slow because so many separate operations have to run. YOLO's core insight was to make detection one regression problem, optimized end-to-end on the actual goal — good boxes and class predictions — instead of stacking separately-trained classifiers.",
        ],
      },
      {
        heading: "Inside the YOLO network",
        paragraphs: [
          "The network itself is 24 convolutional layers followed by 2 fully connected layers. It's inspired by GoogLeNet but simpler — instead of inception modules, YOLO alternates 1×1 reduction layers with 3×3 convolutions. A 1×1 convolution mixes channels at a single spatial position without looking at neighbors, which makes it the cheapest possible way to cut a feature map's depth (say 512 channels down to 256) before an expensive 3×3 layer. That 1×1 → 3×3 pattern became standard after this paper.",
          "Reading the shapes off the paper's Figure 3: the 448×448×3 input passes through a 7×7×64 stride-2 conv and maxpool down to 112×112×64, a 3×3×192 conv and maxpool to 56×56×192, a stack of $(1\\times1\\times128, 3\\times3\\times256, 1\\times1\\times256, 3\\times3\\times512)$ and maxpool to 28×28×512, then $(1\\times1\\times256, 3\\times3\\times512) \\times 4$ followed by $1\\times1\\times512, 3\\times3\\times1024$ and maxpool to 14×14×1024, then $(1\\times1\\times512, 3\\times3\\times1024) \\times 2$ plus two more 3×3×1024 convs (one stride-2) down to 7×7×1024, two final 3×3×1024 convs, a fully connected layer to 4096, and a final fully connected layer reshaped to the 7×7×30 output tensor. That last tensor is the entire detection prediction: $S=7$, $B=2$, $C=20$, so each cell carries $2 \\times 5 + 20 = 30$ numbers, and cell $(i, j)$ of the output corresponds directly to grid cell $(i, j)$ of the image.",
          "Every layer except the last uses Leaky ReLU with a 0.1 slope on the negative side — standard ReLU zeros out any negative input, which can leave \"dead neurons\" that output zero and never recover, whereas the small leak lets a little gradient flow even when a neuron isn't firing. The final layer uses a linear activation, because it has to predict coordinates and probabilities that span the real line:",
        ],
        equations: [
          "\\phi(x) = \\begin{cases} x & \\text{if } x > 0 \\\\ 0.1x & \\text{otherwise} \\end{cases}",
        ],
      },
      {
        paragraphs: [
          "Like nearly every detector since, YOLO is pretrained on ImageNet classification before being fine-tuned for detection. The authors took the first 20 conv layers, bolted on an average-pooling layer and a fully connected layer, and trained at 224×224 resolution for about a week — reaching 88% top-5 accuracy, comparable to GoogLeNet. They then converted the network for detection by adding 4 more conv layers and 2 fully connected layers (randomly initialized) and doubling the input resolution from 224×224 to 448×448, since detection needs finer detail than classification. This pretrain-then-fine-tune recipe is now standard practice for essentially every detection model.",
          "The paper also describes Fast YOLO, same training setup but only 9 conv layers (instead of 24) and fewer filters, which runs at 155 FPS on a Titan X. It trades accuracy for speed yet is still more than 2× as accurate as any prior real-time detector.",
        ],
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
        heading: "Responsible predictors and training",
        paragraphs: [
          "There's a subtlety in how that five-term loss is assigned. Each cell predicts $B = 2$ boxes, but at training time we want exactly one of them on the hook for any given object. The rule: whichever of the two predictors currently has the highest IoU with the ground-truth box is declared \"responsible.\" Only that predictor pays the coordinate and box-confidence losses for the object; the other gets a no-object signal. Over training this produces specialization — one predictor in each cell drifts toward tall, narrow boxes (people), the other toward wide, short ones (cars) — and the authors note it improves overall recall, since different shapes get handled by different predictors.",
          "At inference the network hands you confidence and class probabilities separately, and you combine them by multiplying. The conditional class probability times the box confidence cleanly factors into a single class-specific score per box:",
        ],
        equations: [
          "P(\\text{Class}_i \\mid \\text{Object}) \\cdot P(\\text{Object}) \\cdot \\mathrm{IoU}^{\\text{truth}}_{\\text{pred}} = P(\\text{Class}_i) \\cdot \\mathrm{IoU}^{\\text{truth}}_{\\text{pred}}",
        ],
      },
      {
        paragraphs: [
          "For the training run itself, the paper's recipe is: 135 epochs on PASCAL VOC 2007 + 2012, batch size 64, momentum 0.9, weight decay 0.0005. The learning rate warms up from $10^{-3}$ to $10^{-2}$ over the first epochs (jumping straight to the high rate would diverge), holds at $10^{-2}$ for 75 epochs, drops to $10^{-3}$ for 30 epochs, then $10^{-4}$ for the final 30. Dropout of 0.5 sits after the first FC layer, and augmentation adds random scaling and translation up to 20% of image size plus exposure and saturation jitter up to 1.5× in HSV space. Modest by today's standards, but without it the model overfits VOC's small training set.",
        ],
      },
      {
        heading: "Segmentation",
        paragraphs: [
          "Detection draws boxes; segmentation goes all the way down and labels every single pixel. There are flavors: semantic segmentation hands each pixel a class (so all the dogs blur into one mass), instance segmentation separates the individual dogs, and panoptic does both at once — instances for countable \"things,\" classes for uncountable \"stuff\" like sky and road. The hard part is an architectural tug-of-war: a classifier wants to aggressively downsample (great for semantics, terrible for pixel precision), yet segmentation demands both deep semantics and full resolution at the same time. The Fully Convolutional Network took the first crack at this by upsampling a coarse score grid back up to full size — but the masks came out blurry, because the spatial detail had already been thrown away.",
        ],
      },
      {
        heading: "The Fully Convolutional Network",
        paragraphs: [
          "The FCN's trick rests on one observation: a fully connected layer is mathematically a convolution with a kernel the size of its whole input — same weights, same arithmetic. Swap the FC layers of a classifier for convolutions and the output stops being one vector per image and becomes a small grid of class scores. Run a 224×224 image through a converted VGG-16 backbone and you get roughly a 7×7×21 score grid, where each cell holds 21 class scores (Pascal VOC's 21 classes). To turn that coarse grid into a full-resolution mask, FCN upsamples it 32× back to 224×224×21 with a learnable transposed convolution, then takes the argmax along the class dimension at each pixel.",
          "It works — the first end-to-end neural segmenter, and it crushed the hand-engineered approaches — but upsampling straight from 7×7 to 224×224 gives blurry masks. The network knows what is in the image but has lost track of exactly where the boundaries are; you simply can't conjure back spatial detail that was thrown away. FCN patched this with skip connections from earlier, higher-resolution layers (the FCN-16s and FCN-8s variants), which gave small but real improvements — but the fix was bolted on rather than designed in. The architecture that was designed around the idea is U-Net.",
        ],
      },
      {
        heading: "U-Net",
        paragraphs: [
          "U-Net cut through the resolution-versus-semantics problem with a design so clean it's almost obvious in hindsight: an encoder that downsamples (building up semantics), a decoder that upsamples (recovering resolution), and skip connections that splice each encoder feature map straight into the matching decoder stage. The deep \"what\" flows up through the bottleneck; the precise \"where\" flows sideways across the skips; and the decoder's conv layers fuse the two. It's sample-efficient, produces sharp boundaries, works in both 2-D and 3-D, and — a full decade later — is still sitting at the heart of diffusion models.",
        ],
        diagram: {
          id: "unet",
          caption:
            "Fig 5.7 — U-Net. Skip connections carry high-resolution detail from the encoder directly across to the decoder.",
        },
      },
      {
        paragraphs: [
          "Each decoder block upsamples 2×, concatenates the matching encoder skip features, and runs a couple of Conv → BatchNorm → ReLU layers (the original U-Net had no BatchNorm, since it was published the same year; modern versions always include BatchNorm or GroupNorm). There are two ways to do the upsampling itself. A transposed convolution — often called \"deconv\" — is a learned upsample; mathematically it's the gradient operation of a strided convolution, with each input pixel \"spreading out\" into a small patch of the output. It's flexible but can produce checkerboard artifacts when the stride and kernel size interact badly. The alternative is fixed interpolation (nearest-neighbor or bilinear) followed by a regular conv to refine — no checkerboarding, slightly less expressive, and the choice most modern segmentation models actually prefer.",
        ],
      },
      {
        heading: "Training a U-Net",
        paragraphs: [
          "Training a U-Net is a classifier's training loop run per-pixel. The output ends at full resolution, a final 1×1 conv maps the features to $C$ class channels, softmax runs along the channel dimension at every pixel, and the loss is per-pixel cross-entropy summed over every pixel and class:",
        ],
        equations: [
          "\\mathcal{L} = -\\sum_{i,j} \\sum_{c} y_{i,j,c} \\log \\hat{p}_{i,j,c}",
        ],
      },
      {
        paragraphs: [
          "The catch is class imbalance, which bites hardest in medical imaging: a tumor a few hundred pixels wide in a large scan means a model that predicts \"background\" everywhere scores 99% pixel accuracy while being completely useless. The fixes are worth knowing. Weighted cross-entropy multiplies each pixel's loss by a class-dependent weight inversely proportional to class frequency, so rare classes count for more. Dice loss directly optimizes overlap (a close relative of IoU), which sidesteps imbalance entirely because it measures agreement with the rare class rather than overall accuracy:",
        ],
        equations: [
          "\\mathcal{L}_{\\text{dice}} = 1 - \\frac{2 \\sum_i \\hat{p}_i y_i}{\\sum_i \\hat{p}_i + \\sum_i y_i}",
        ],
      },
      {
        paragraphs: [
          "In practice people often add the two — total loss = cross-entropy + Dice — and for very rare classes reach for focal loss, which down-weights the easy, already-confident pixels and up-weights the hard ones. Augmentation matters even more here than usual, because these datasets are tiny: the original U-Net was trained on roughly 30 labeled images for cell segmentation and leaned heavily on elastic deformations (warping the image as if it were on a rubber sheet) to teach robustness to continuously varying cell shapes. That sample-efficiency, plus sharp boundaries from the skip connections and a design that ports cleanly to 3D volumes (the 3D U-Net), is exactly why the architecture is still everywhere a decade on — including as the backbone inside Stable Diffusion.",
        ],
      },
      {
        paragraphs: [
          "For instance segmentation, Mask R-CNN extends a two-stage detector with a third branch that predicts a small binary mask per detected box. Its key contribution is RoIAlign: instead of rounding region coordinates to the feature grid (which misaligns masks by a few pixels), it samples features at exact floating-point positions with bilinear interpolation. The mask head is decoupled from classification — each pixel only answers \"am I part of this object?\", a binary question — which gives cleaner masks and a simpler learning problem.",
        ],
      },
      {
        paragraphs: [
          "It's worth seeing how that mask branch is actually built. Inside each detected region the mask head is a small fully convolutional network: take the RoI-aligned feature map (14×14 or 7×7), run a few conv layers to refine it, a transposed conv to upsample to 28×28, then a 1×1 conv producing $K$ channels — one per class — each a per-pixel sigmoid. Crucially the model outputs $K$ binary masks per region, one for every possible class, and at inference you simply pick the mask for the class the classification head chose. That's the decoupling: the mask head never has to decide \"dog or cat,\" it just draws whatever object is in the box. And because each pixel runs through a sigmoid rather than a softmax, pixels answer the binary question \"am I part of this object?\" independently, with no competition between classes — unlike U-Net, where softmax forces the classes to compete at every pixel.",
          "The other half of Mask R-CNN's contribution is RoIAlign. A region proposal lands at fractional coordinates like $(137.3, 248.7, 282.5, 451.1)$, and to pull out a fixed 7×7 feature map you have to map that real-valued box onto the discrete feature grid. The old RoIPool rounded the coordinates to integers before pooling — fine for classification, where a few pixels of slop doesn't change the class label, but ruinous for masks, where every pixel matters. RoIAlign refuses to round: it samples feature values at the exact floating-point positions using bilinear interpolation, where each sample point reads its four nearest integer feature cells weighted by proximity:",
        ],
        equations: [
          "f(x, y) = \\sum_{i, j \\in \\{\\text{floor}, \\text{ceil}\\}} f(i, j) \\cdot \\max(0,\\, 1 - |x - i|) \\cdot \\max(0,\\, 1 - |y - j|)",
        ],
      },
      {
        paragraphs: [
          "That's just textbook bilinear interpolation; the insight is using it instead of rounding. Sub-pixel-accurate feature extraction lifted mask average precision by roughly 10% from this single change. The full loss sums the three branches — $\\mathcal{L} = \\mathcal{L}_{\\text{cls}} + \\mathcal{L}_{\\text{box}} + \\mathcal{L}_{\\text{mask}}$ — where the mask term is per-pixel binary cross-entropy applied only to the channel for the ground-truth class, averaged over the $28 \\times 28 = 784$ mask pixels.",
        ],
      },
      {
        heading: "SAM: a foundation model for segmentation",
        paragraphs: [
          "In 2023 segmentation got its foundation model. The Segment Anything Model (SAM) shifts from task-specific to promptable: trained on 1.1 billion masks via a model-in-the-loop data engine, it segments whatever you point to — a click, a box, or a rough mask — zero-shot, including objects it never saw in training. The architecture is asymmetric for interactive speed: a heavy ViT image encoder runs once per image (hundreds of milliseconds), a lightweight prompt encoder turns clicks and boxes into embeddings (once per prompt), and a small mask decoder produces masks in milliseconds. The asymmetry is the whole point — encode the image once, then click on it as many times as you like, getting a fresh mask in real time each click without re-encoding.",
        ],
      },
      {
        heading: "SAM's image encoder",
        paragraphs: [
          "The image encoder turns a 1024×1024 RGB image into a 64×64 grid of 256-dimensional features. It's a Vision Transformer — ViT-H, 636 million parameters, in the largest variant — pretrained with Masked Autoencoding (MAE) before being adapted for segmentation. Why a ViT and not a CNN? CNNs grow their receptive field slowly with depth, so two disconnected pieces of an object (a person split by a tree trunk) can't \"talk\" until very deep layers, whereas a ViT's self-attention gives every patch immediate access to every other patch — exactly the global reasoning segmentation needs.",
          "It tokenizes the image with 16×16 non-overlapping patches (a single stride-16 conv), so $(3, 1024, 1024)$ pixels become a $(1280, 64, 64)$ grid of patch vectors for ViT-H — a 256× spatial reduction packed into far richer features. Learnable absolute positional embeddings (one per 64×64 position) tell each patch where it is.",
          "Running full self-attention at every layer would mean a 4096-token sequence and roughly $4096^2 \\approx 16.8$ million attention operations per head per layer, so SAM uses mostly windowed attention with a window size of 14 — attention within each ~14×14 window instead of the whole image — and switches to full global attention only every 8th layer to mix information across the image. This is the same idea as the Swin Transformer: cheap local layers, rare expensive global ones.",
        ],
      },
      {
        paragraphs: [
          "Inside each block SAM adds relative positional biases on top of the absolute ones — absolute positions say \"where I am,\" relative positions say \"how I relate to you,\" and for segmentation the relationship is what really matters (which patches belong to the same object). The biases are added to the attention scores before the softmax:",
        ],
        equations: [
          "\\text{scores}_{ij} = \\frac{Q_i \\cdot K_j^\\top}{\\sqrt{d}} + \\text{rel\\_h}(\\Delta h_{ij}) + \\text{rel\\_w}(\\Delta w_{ij})",
        ],
      },
      {
        paragraphs: [
          "Learning a separate bias for every $(\\Delta h, \\Delta w)$ pair on a 64×64 grid would cost $(2 \\cdot 64 - 1)^2 = 127^2 \\approx 16{,}000$ parameters per head. SAM instead decomposes the bias into independent height and width terms, $\\text{bias}(\\Delta h, \\Delta w) = \\text{rel\\_h}(\\Delta h) + \\text{rel\\_w}(\\Delta w)$, needing only $2 \\cdot (2 \\cdot 64 - 1) = 254$ parameters per head — a 98% reduction. Finally a neck standardizes the output for the decoder: a 1×1 conv drops the channels from 1280 down to 256, then a 3×3 conv with LayerNorm refines spatially, so every SAM variant (ViT-B at 768, ViT-L at 1024, ViT-H at 1280) emerges as the same $(256, 64, 64)$ tensor.",
        ],
      },
      {
        heading: "SAM's prompt encoder",
        paragraphs: [
          "The prompt encoder converts user inputs into vectors the decoder can attend to. Points and boxes are sparse prompts (a few vectors); masks are dense prompts (a feature map). A point is a coordinate plus a label — 1 for foreground, 0 for background. Its coordinate is shifted by 0.5 to hit the pixel center, normalized to $[0, 1]$, then lifted into a high-dimensional vector by Random Fourier Features against a fixed Gaussian matrix $\\mathbf{B} \\in \\mathbb{R}^{2 \\times d}$ (with $d = 128$):",
        ],
        equations: [
          "\\gamma(x, y) = \\left[\\sin\\!\\left(2\\pi \\mathbf{B}^\\top \\begin{bmatrix} x \\\\ y \\end{bmatrix}\\right),\\ \\cos\\!\\left(2\\pi \\mathbf{B}^\\top \\begin{bmatrix} x \\\\ y \\end{bmatrix}\\right)\\right]",
        ],
      },
      {
        paragraphs: [
          "That gives a $2d = 256$-dimensional encoding — the continuous-2D cousin of the transformer's sinusoidal positional encoding, where nearby points get similar codes and distant ones get very different codes. On top of position, SAM adds a learned label embedding: a foreground, background, or (when no point is given) no-point vector. A box is handled by reusing the point machinery — treat it as its two corners, Fourier-encode each, and add learned top-left-corner and bottom-right-corner embeddings, giving four learned point-type embeddings in total and exactly 2 sparse vectors per box. A mask prompt is different: a $(1, 256, 256)$ image downsampled by two stride-2 convs and a 1×1 conv to a $(256, 64, 64)$ tensor that's added directly to the image embedding (a learned no-mask embedding fills in when none is given). So sparse embeddings enter through attention as tokens; the dense embedding modifies the image features themselves.",
        ],
      },
      {
        heading: "SAM's mask decoder",
        paragraphs: [
          "The decoder is where the cleverness concentrates, and it has four moving parts. First, learnable output tokens: one IoU token (which will predict each mask's quality) and four mask tokens (each producing one candidate mask), concatenated with the sparse prompt embeddings into one short sequence. Second, two-way attention — unlike a normal decoder where queries attend to the encoder but not back, each block here updates both the tokens and the image features against each other, in four steps run twice: self-attention among the tokens, cross-attention from tokens to image features, an MLP on the tokens, then cross-attention from image features back to tokens.",
          "Third, a hypernetwork produces the masks. The image features are upsampled by two stride-2 transposed convolutions from $(256, 64, 64)$ to $(32, 256, 256)$, and each mask token is passed through its own MLP to emit a 32-dimensional filter. The mask at each pixel is just the dot product of that pixel's 32-dim feature with the filter, $\\text{mask}_{ij} = \\sum_{c=1}^{32} \\text{features}_{c,i,j} \\cdot \\text{filter}_c$, producing four 256×256 mask logits. Fourth, multi-mask output: the four masks exist to resolve ambiguity (a click on a shirt could mean the shirt, the person, or the whole group), and at training time SAM only backpropagates through whichever of the four best matches the ground truth, letting the mask tokens specialize toward different interpretations.",
        ],
      },
      {
        heading: "Training SAM: the data engine",
        paragraphs: [
          "The architecture is only half the story; the other half is the SA-1B dataset and the engine that built it. SA-1B is 11 million images and 1.1 billion masks — about 100 per image, and 400× the ~2.5 million masks in COCO, the previous biggest. No team could label that by hand, so SAM bootstrapped it in three stages. Assisted-Manual: annotators corrected masks an early SAM proposed, ~34 seconds per mask dropping to ~14 as the model improved, yielding 4.3M masks. Semi-Automatic: SAM auto-segmented the obvious objects so annotators could focus on the ones it missed, adding 5.9M masks and boosting diversity. Fully-Automatic: SAM, now strong enough to run unattended, was prompted at every point of a regular 32×32 grid per image, with the outputs filtered by confidence and a stability check (perturb the prompt slightly, keep only masks that stay consistent) — producing the full 1.1 billion.",
          "The loss combines a mask loss and an IoU-prediction loss. The mask loss is focal loss plus Dice loss weighted 20:1 — $\\mathcal{L}_{\\text{mask}} = 20 \\cdot \\mathcal{L}_{\\text{focal}} + 1 \\cdot \\mathcal{L}_{\\text{dice}}$ — where focal supplies sharp per-pixel boundary signal while Dice ensures good overall overlap, and the IoU token is trained with a plain MSE between its predicted and actual IoU. Training uses AdamW, a cosine learning-rate schedule with a 250-step warmup, no data augmentation (the dataset is large and diverse enough not to need it), batch size 64 for the Huge model, and 270K iterations.",
        ],
      },
      {
        heading: "SAM 2: segmentation in video",
        paragraphs: [
          "In 2024 SAM 2 carried this to video, where objects move, deform, get occluded, and reappear — and running SAM frame-by-frame has no temporal consistency, so a tracked dog might become the bush behind it one frame later. SAM 2 processes video as a stream, one frame at a time, with a few additions: the image encoder is now a faster Hiera transformer instead of ViT-H; memory attention modifies the current frame's features using memories of past frames; a memory encoder turns each predicted mask into a memory feature; and a memory bank holds those past embeddings and mask features for the object being tracked. On a single image the memory bank is empty and SAM 2 behaves exactly like SAM.",
        ],
      },
      {
        heading: "Vision Transformers",
        paragraphs: [
          "For a solid decade, CNNs simply owned vision. Then ViT came along in 2020 and asked a deliberately provocative question: what if we drop all of the CNN's hand-built inductive biases and just feed a transformer raw image patches? The recipe is almost suspiciously simple. Chop the image into fixed 16×16 patches, flatten and linearly project each one into a token, prepend a learnable [CLS] token, add positional embeddings, and run a completely standard transformer encoder over it — the exact same thing as BERT, only on image tokens. The [CLS] token's final state is what feeds the classifier.",
        ],
        diagram: {
          id: "vit-patches",
          caption:
            "Fig 5.8 — A ViT turns 16×16 image patches into tokens (plus a [CLS] token) and runs a standard transformer encoder over them.",
        },
      },
      {
        paragraphs: [
          "The patch arithmetic is worth doing once concretely. Take a 224×224 RGB image and cut it into non-overlapping 16×16 patches: that's a 14×14 grid, 196 patches in all, each holding $16 \\times 16 \\times 3 = 768$ raw pixel values. Flatten each patch to a 768-vector and project it through a learnable linear layer to a $d$-dimensional embedding ($d = 768$ for ViT-Base), and the image is now a sequence of 196 tokens. Prepend the [CLS] token for 197, add the positional embeddings, and you have the transformer's input.",
          "Those positional embeddings are learnable — one trainable $d$-vector per position, added to the patch embeddings — rather than the fixed sinusoids of the original transformer. Without them, \"dog on top, sky on bottom\" would look identical to its flip. Strikingly, even though the scheme is nominally 1D, ViT learns 2D-aware embeddings from data: patches that are neighbors in the image end up with similar positional vectors, the transformer recovering the grid topology on its own. From there every one of the 197 tokens attends to every other, a 197×197 attention matrix per head per layer — a \"receptive field\" of the whole image in a single layer, which is exactly why ViT is strong at global reasoning and weak at small-data sample efficiency.",
          "That all-to-all attention is also the cost ceiling. Self-attention is quadratic in sequence length, so 197 tokens is comfortable, but shrink the patch size from 16 to 8 and you get 784 patches — 4× the tokens and 16× the attention cost; drop to patch size 4 and it's 16× the tokens, 256× the cost. That quadratic blow-up is why ViT defaults to 16×16 patches, and why variants like Swin restrict attention to local windows to claw back efficiency.",
        ],
      },
      {
        paragraphs: [
          "The catch, as always, is data. Give a ViT only a few million images and it actually underperforms CNNs — with such weak inductive biases, it has to learn locality and translation invariance from scratch. Give it 300 million and it overtakes the best CNNs, and the gap only widens as you scale further. It's the same inductive-bias-versus-scale story we saw in language: strong priors win at small scale, weak priors plus a mountain of parameters win at large scale. Follow-ups made ViTs practical without Google-scale data: DeiT (strong augmentation + distillation), Swin (windowed, hierarchical attention for high resolution), and the self-supervised pair MAE (mask 75% of patches and reconstruct) and DINO (self-distillation), which learn rich features with no labels at all.",
        ],
      },
      {
        heading: "ViT sizes and self-supervision",
        paragraphs: [
          "The standard sizes are worth memorizing because they recur everywhere. ViT-Base has 12 layers, hidden dim 768, 12 heads, MLP dim 3072, and 86M parameters. ViT-Large: 24 layers, hidden dim 1024, 16 heads, MLP dim 4096, 307M parameters. ViT-Huge: 32 layers, hidden dim 1280, 16 heads, MLP dim 5120, 632M parameters. Three patterns: the MLP dim is always 4× the hidden dim (the standard transformer expansion ratio, where most of the parameters live); the hidden dim is divisible by the head count (each head works on $d/h$ dimensions — 64 for ViT-Base); and parameters scale roughly quadratically with width, so ViT-Huge has only ~1.5× ViT-Base's width but ~7× its parameters.",
          "On the self-supervised side, the two key recipes are worth a little more detail. MAE masks a full 75% of patches, lets the encoder see only the visible 25%, and trains a small decoder to reconstruct the missing pixels — the aggressive masking is what forces rich representations, after which the decoder is discarded and only the encoder kept. DINO instead runs a student and a teacher network on different augmented views of the same image, training the student to match the teacher, where the teacher is simply an exponential moving average (EMA) of the student's own weights — self-distillation with no labels at all. Its features come out remarkably semantic (attention maps trace object boundaries with nothing supervising them), and the follow-up, DINOv2 from Meta, is now a go-to general-purpose vision feature extractor.",
        ],
      },
      {
        heading: "Vision-language models",
        paragraphs: [
          "A VLM takes images and text in and generates text out. The recipe that won is delightfully reusable: encode the image with a ViT into tokens, project those tokens into the LLM's space, and interleave them with the text tokens — and from there the LLM attends to visual tokens exactly the way it attends to words. This is the unifying idea underneath so much of modern ML: anything you can tokenize can be fed to a transformer.",
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
          "The two losses are worth writing down. CLIP uses a softmax over the batch with a temperature $\\tau$ — for image $i$ with matching caption $t_i$, against all captions $t_j$ in the batch:",
        ],
        equations: [
          "\\mathcal{L} = -\\log \\frac{\\exp(\\text{sim}(i, t_i) / \\tau)}{\\sum_j \\exp(\\text{sim}(i, t_j) / \\tau)}",
          "\\mathcal{L} = -\\sum_{i,j} \\log \\sigma\\!\\left(z_{ij} \\cdot \\text{sim}(i, t_j)\\right)",
        ],
      },
      {
        paragraphs: [
          "The second line is SigLIP: $z_{ij}$ is $+1$ for a matched pair and $-1$ for a mismatch, so every pair is an independent binary \"is this a match?\" question with no batch-wide normalization. That difference is exactly why batch size behaves the way it does. CLIP's softmax couples the whole batch together, so it needs 32K+ examples per batch to be competitive and then plateaus past that point; SigLIP trains well at modest batch sizes and keeps improving beyond 32K. That consistent edge is why SigLIP encoders became the default in modern open VLMs like PaliGemma, Idefics2, and InternVL.",
        ],
      },
      {
        paragraphs: [
          "VLMs are trained in stages — pretrained vision encoder and LLM, then an adapter-alignment phase, then instruction tuning, and optionally preference alignment. The connector can be a simple linear projection (LLaVA-style, each patch becomes one token), a Q-Former (a fixed set of query tokens summarize the image), or cross-attention layers (Flamingo-style). The same design extends to multiple images and video. VLMs are strong at semantic understanding — captioning, VQA, OCR, chart reading — but weaker at precise tasks: exact counts, fine spatial relations, and they can hallucinate details. The pattern echoes their training: captions are semantic, not precise.",
        ],
      },
      {
        paragraphs: [
          "The connector choice is small but consequential because it sets the image's token budget. A simple linear projection (LLaVA-style) turns each ViT patch into one LLM token — cheap and surprisingly effective, but a 256-patch image then spends 256 tokens of context. A Q-Former (BLIP-2 style) uses a fixed set of learned query tokens, typically 32, that cross-attend to the encoder and summarize the image, so the LLM sees only 32 tokens regardless of resolution. Cross-attention layers (Flamingo style) go further and never spend context tokens at all — dedicated attention layers inside the LLM reach out to the visual features directly. LLaVA's success made the simple linear projection the common default.",
          "The same machinery extends to more than one image and to video. For multiple images, encode each independently and concatenate all the patch tokens into the sequence, marking boundaries with special image-start and image-end tokens so the model knows which token came from which image. For video there are two routes: frame sampling — encode each sampled frame independently and concatenate, simple but heavy on context — or a spatiotemporal encoder like ViViT or VideoMAE that attends across space and time at once, which is more efficient and is how frontier models stretch to long clips.",
        ],
      },
      {
        paragraphs: [
          "The arc here is one of the cleanest in all of ML, and it's worth saying out loud. Convolutions and residuals made deep vision work in the first place; detection and segmentation specialized it for harder questions; and then the transformer, once it finally had enough data behind it, swallowed vision too — until everything just became tokens flowing into one model. CNN, detector, segmenter, ViT, VLM: it's all the same conceptual DNA, scaled up.",
        ],
      },
    ],
  },
  {
    slug: "chapter-6-agentic-engineering",
    number: "7",
    title: "Agentic Engineering",
    summary:
      "When an LLM stops answering and starts acting — the agent loop, tools, MCP, and the security that has to come with it.",
    sections: [
      {
        paragraphs: [
          "An AI agent is what you get when an LLM stops merely generating text and starts operating in a loop — deciding what to do next, executing it through a tool call, looking at the result, and going around again until the goal is met. The cleanest way to hold the distinction: a chatbot answers you; an agent decides, acts, observes, and then decides again. And once you've seen this loop, you've basically seen every framework, because the architecture barely changes between them.",
        ],
        diagram: {
          id: "agent-loop",
          caption:
            "Fig 6.1 — The agent loop. The model plans the next step, calls a tool, observes the result, and repeats until it emits a final answer.",
        },
      },
      {
        heading: "The four levels of AI usage",
        paragraphs: [
          "It helps to picture a ladder running from passive to fully autonomous, where each rung buys you more capability and hands you more risk. Level 1 (Chat) — you ask, you copy, you paste; the human is the integration layer. Level 2 (Tools) — the model can act inside the conversation, searching, running code, reading files, so its answers are grounded in something real. Level 3 (Workflows) — a human lays out a fixed chain of steps and the AI fills specific slots; the structure is locked, and the AI is just a smart component inside it. Level 4 (Agents) — the structure disappears entirely: you hand over a goal and some tools, and the model figures out what to do, in what order, and for how long, looping on itself and sometimes acting on a schedule while you're not even watching.",
        ],
        diagram: {
          id: "four-levels",
          caption:
            "Fig 6.2 — The four levels. Each step up trades human control for autonomy — and adds risk you have to manage.",
        },
      },
      {
        heading: "Levels 3 and 4, made concrete",
        paragraphs: [
          "A classic Level-3 setup makes the \"fixed structure\" idea concrete: a Zapier or n8n flow triggers when a new email lands in a support inbox, hands it to Claude to classify (bug report / billing question / feature request), routes it to the right Slack channel, and calls Claude again to draft a first-pass reply. The structure is fixed and human-designed; the AI is a smart component, not the driver.",
          "Level 4 is where the structure goes away. A good example: an agent that researches a topic, builds a landing page, and deploys it — all from a single instruction. That's a genuine Level-4 task because there's no fixed sequence: the agent has to figure out what \"research\" means here, what to put on the page, how to deploy it, and what to do when something fails along the way. A workflow can't do this, because you can't enumerate the steps in advance.",
        ],
      },
      {
        heading: "A Level-4 agent in practice",
        paragraphs: [
          "Take an open-source personal agent that runs on your machine, connects through the messaging apps you already use, and acts on your behalf — shell, browser, email, calendar. Most personal agents converge on the same five subsystems, and it's worth seeing them because the pattern recurs everywhere:",
        ],
        list: [
          "Channel adapters — one per platform, normalizing inbound messages into a common format so you can swap Telegram for Slack without touching the agent.",
          "Session manager — resolves who is talking and which conversation it belongs to, so different people don't clobber each other's context.",
          "Queue — serializes runs per session; a message arriving mid-run is held or injected rather than causing a race.",
          "Agent runtime — assembles context (the Markdown files below, history) and runs the loop: call model → execute tool calls → feed results back → repeat.",
          "Control plane — a single API surface that the CLI, app, and web UI all connect to.",
        ],
      },
      {
        heading: "Everything is a Markdown file",
        paragraphs: [
          "In traditional software, configuration lives in JSON or a database. Agents flipped this: because the agent is a language model, its \"configuration\" is mostly plain English in Markdown files it reads natively. The popular conventions:",
        ],
        list: [
          "AGENTS.md — who the agents are, what each is responsible for, and how messages route between them. The same convention Claude Code and several other tools use; it's becoming a de facto standard.",
          "SOUL.md — personality, defaults, and hard rules. The hard-rules section does real safety work: the model reads it every turn, so a constraint stays in front of it even if a later prompt injection suggests otherwise.",
          "TOOLS.md — the available actions, described not just as \"what does this do\" but \"when to use it and what the constraints are\" — operational policy in language the model attends to. The tools are also registered programmatically with the model's tool-use API, so each one has a structured JSON schema; TOOLS.md is the narrative version of that, explaining the intent and policy the schema can't capture.",
          "MEMORY.md — long-term facts the agent has learned. You can audit, version, and delete a memory by editing one file — far easier than surgically removing an embedding from a vector DB. The cost is scale: past thousands of facts you need real retrieval.",
          "HEARTBEAT.md — a recurring checklist. Every interval the agent reads it and decides whether anything needs action, which is what makes it autonomous — \"it did something while I slept.\"",
          "SKILL.md — reusable, just-in-time expertise: a folder with a SKILL.md (YAML frontmatter plus natural-language instructions) and supporting files, loaded into context only when a task matches its triggers. The format is portable — compatible with Claude Code and Cursor conventions. If a skill doesn't exist, you can describe the task to your agent and have it draft one; the agent can also search ClawHub, the community skill registry, and install new skills at runtime.",
        ],
      },
      {
        heading: "The heartbeat: acting on a clock",
        paragraphs: [
          "A regular tool-using assistant only acts when you message it. A Level-4 personal agent acts on a clock. The gateway runs as a background daemon (systemd on Linux, a LaunchAgent on macOS) with a configurable heartbeat — every 30 minutes by default, or every hour when you're on Anthropic OAuth. On each heartbeat the agent reads the checklist in HEARTBEAT.md, decides whether any item needs action right now, and either messages you or responds with the literal sentinel HEARTBEAT_OK — a string the gateway watches for and silently drops. Anything other than HEARTBEAT_OK gets delivered to you, and that's how the agent surfaces things proactively.",
          "The heartbeat is what produces the agent stories that go viral. AJ Stuyvenberg tasked his agent with buying a 2026 Hyundai Palisade: it scraped local dealer inventories, filled out contact forms with his phone and email, then spent several days playing dealers against each other — forwarding competing PDF quotes and asking each to beat the other's price — and landed about $4,200 below sticker, with Stuyvenberg showing up only to sign the paperwork. That negotiation unfolded across days, while he did other things, because the agent kept waking up and checking whether the next move was ready. The same capability has a dark mirror: another developer's agent filed a legal rebuttal to an insurance denial without being asked — it decided autonomously that the situation called for action.",
        ],
      },
      {
        heading: "How Level-4 agents compare",
        paragraphs: [
          "Not every Level-4 agent makes the same architectural choices. Lining up a file-based personal agent like OpenClaw against Claude Code, ChatGPT Agent, and Manus makes the tradeoffs visible:",
        ],
        definitions: [
          {
            term: "Open source",
            definition: "OpenClaw — Yes (MIT). Claude Code — No. ChatGPT Agent — No. Manus — No.",
          },
          {
            term: "Where it runs",
            definition: "OpenClaw — your machine. Claude Code — your machine. ChatGPT Agent — OpenAI cloud. Manus — Manus cloud.",
          },
          {
            term: "Where you talk to it",
            definition: "OpenClaw — messaging apps. Claude Code — terminal, IDE. ChatGPT Agent — the ChatGPT app. Manus — a web dashboard.",
          },
          {
            term: "Who owns state",
            definition: "OpenClaw — you (files on disk). Claude Code — your Anthropic account. ChatGPT Agent — your OpenAI account. Manus — your Manus account.",
          },
          {
            term: "Autonomy mode",
            definition: "OpenClaw — heartbeat daemon. Claude Code — on-demand only. ChatGPT Agent — per-task. Manus — per-task.",
          },
        ],
      },
      {
        paragraphs: [
          "The architectural axis that matters most is where the agent lives and who owns the memory. Hosted agents (ChatGPT Agent, Manus) are easier to start with, but you're trusting a third party with everything the agent learns about you. Local agents (OpenClaw, Claude Code) put that on your own hardware — the cost being that you become the sysadmin.",
        ],
      },
      {
        heading: "The anatomy of a tool call",
        paragraphs: [
          "Here's a detail people consistently get wrong: when a model \"calls a tool,\" it is not running any code. All it does is output structured JSON describing the call it wants. Your runtime is what actually executes the real function and feeds the result back as a tool result, and the model picks up from there with that new context. The model never touches your APIs directly — it only ever describes what it wants, and your harness sits in the middle as the arbiter. That separation is precisely what makes tool use safe and auditable.",
        ],
        diagram: {
          id: "tool-call",
          caption:
            "Fig 6.3 — A tool call. The model emits a structured request, your code runs the real function, and the result is fed back for the model to continue.",
        },
      },
      {
        heading: "The N×M problem and MCP",
        paragraphs: [
          "Before any standard existed, every AI app had to build its own integration for every system it touched — 5 apps times 10 systems meant 50 bespoke connectors, and the math only gets uglier from there. The Model Context Protocol (MCP), an open standard Anthropic introduced in late 2024, is the \"USB-C for AI\" that fixes this — one connector spec, so any compliant client just works with any compliant server. It's a JSON-RPC 2.0 protocol with three roles: a host the user interacts with (Claude Desktop, an IDE, your custom agent), a client living inside the host that manages a single connection, and a server — a separate process that exposes capabilities over the protocol. One host can run many clients, each connected to a different server. Servers expose three primitives: tools the model can call (create_issue, run_query), resources it can read into context (a file, a database row, a webpage), and prompts the user can invoke (/summarize-pr). Most agent work happens through tools — but resources are the underused power feature. Build a server once and every MCP client gets it for free.",
        ],
        diagram: {
          id: "mcp-nxm",
          caption:
            "Fig 6.4 — MCP collapses N×M custom integrations into N+M: each app and each system speaks one protocol.",
        },
      },
      {
        heading: "MCP transports",
        paragraphs: [
          "There are two transport types you'll run into. stdio is for local servers: the host spawns the server as a subprocess and the two speak JSON-RPC over stdin/stdout — the default for something like a filesystem server running on your laptop. HTTP with Server-Sent Events is for remote servers, useful for SaaS integrations where the server runs somewhere else and the host connects over the network, often with OAuth for authentication. Either way the protocol is what's standardized; the SDK is just a convenience wrapper over JSON-RPC, so a server you write doesn't have to know anything about a specific client — any MCP client can use it identically.",
        ],
      },
      {
        heading: "Beyond a single loop",
        paragraphs: [
          "A single agent loop eventually slams into a wall. Long tasks fill up the context window, the model starts losing the thread, and tool-call accuracy quietly degrades. There's even a rough threshold: once you cross 50–80% context-window utilization, performance degrades noticeably — longer time-to-first-token, worse instruction following, hallucinated tool calls. Production agents fight this on several fronts: compaction (summarize the old turns and replace them with the summary — Claude Code does this automatically around the 95% mark, and the art is deciding what to preserve verbatim, like file paths and exact errors, versus what to compress), sub-agents for isolation (spin up a fresh context for some focused piece of work and return only a summary — far and away the most powerful technique for long horizons), external memory (persist state to disk between turns), and just-in-time retrieval (hand the agent search and read tools instead of dumping everything in up front — which is exactly why MCP resources matter: they're the model's filing cabinet, not its desk).",
        ],
        diagram: {
          id: "agent-patterns",
          caption:
            "Fig 6.5 — Common multi-agent shapes: ReAct, orchestrator + workers, an evaluator loop, and planner + executor.",
        },
      },
      {
        paragraphs: [
          "A few orchestration patterns recur. ReAct interleaves reasoning and acting in one loop — simplest, easiest to debug. Orchestrator + workers fans out parallel sub-agents and merges their results — good for broad research. Evaluator + optimizer loops a generator against a critic until quality passes — good for writing or code review. Planner + executor plans once up front, then executes — good when the structure is known in advance.",
        ],
      },
      {
        heading: "The lethal trifecta",
        paragraphs: [
          "Now for the part that should keep you up at night. Any agent that combines three particular things — access to private data, the ability to communicate externally, and exposure to untrusted content — is holding all the ingredients for data exfiltration. Simon Willison named this the lethal trifecta: a malicious instruction hidden inside a web page the agent happens to read can hijack the whole thing into quietly sending your private data off to an attacker.",
        ],
        diagram: {
          id: "lethal-trifecta",
          caption:
            "Fig 6.6 — The lethal trifecta. Where private data, external communication, and untrusted content overlap, exfiltration becomes possible. Remove any one leg to defuse it.",
        },
      },
      {
        paragraphs: [
          "The defenses here are architectural, not prompt-based — and that distinction matters. You cannot reliably just tell a model to \"ignore any future instructions,\" because people keep finding new ways around exactly that. What genuinely works is removing one leg of the triangle: a read-only network for any task that touches untrusted content, separate agents carrying different permissions, a human in the loop to confirm irreversible actions, and a firm rule that all tool output is data, never instructions. And beyond the trifecta itself, the usual hygiene applies: vet MCP servers like any other dependency (you are running third-party code, after all), give each tool the narrowest permissions it can get away with (scope minimization), and log every tool call so you can reconstruct exactly what an agent did (audit logging).",
        ],
      },
      {
        paragraphs: [
          "And that's the whole shape of agentic engineering. Strip it down and it's a simple loop wrapped in real software — routing, queues, memory, orchestration — with security treated as a first-class concern from the start rather than something you bolt on later. The model is the stochastic core at the center; everything built around it is the engineering that turns it into something reliable.",
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
