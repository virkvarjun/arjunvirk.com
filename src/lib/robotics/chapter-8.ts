import type { Chapter } from "../chapters";

// Chapter 8 of the Robotics Bible. Prose is authored in
// content/robotics-bible/chapter-8-vlms.md and transcribed here into the same
// Chapter/section schema; figures are mounted by id from the diagram registry.

export const chapter8: Chapter = {
  slug: "chapter-8-vlms",
  number: "8",
  title: "Perception: Vision & Vision-Language Models",
  summary:
    "The eyes of a modern robot: attention and Q/K/V, ViT, CLIP, SigLIP, and the diffusion/flow-matching machinery that generates behavior.",
  published: "Aug 24, 2026",
  updated: "Aug 24, 2026",
  futureRef:
    "The *ideas* here are the stable core and won't age fast: attention, patchified vision, contrastive shared spaces, the encoder→projector→LLM pattern, and the diffusion/flow-matching split are load-bearing across the whole modern stack. The *specific models* are a moving snapshot: SigLIP, PaliGemma, DINOv2, and the exact encoder used by π0 or OpenVLA will be superseded, so read those as \"the state of the art the year this was written,\" and expect the names to churn while the pattern holds. Come back to Fig 8.1 (Q/K/V attention) whenever a later architecture stops making sense. Nearly every model in Chapters 9 through 11 is that one mechanism, rearranged. And keep Fig 8.6 (flow matching) close; the moment Chapter 9 starts generating actions, it's this figure with joint angles on the target side.",
  sections: [
    {
      paragraphs: [
        "*How a robot turns raw pixels and a spoken instruction into a single shared representation it can actually act on: the perception backbone everything in Chapter 9 stands on.*",
      ],
    },
    {
      heading: "Where we're going",
      paragraphs: [
        "Say the words out loud: **\"pick up the red mug.\"** Simple for you. But think about what your robot is holding when you say it. On one hand, a grid of numbers: a camera frame, a few million integers between 0 and 255, no more inherently meaningful than static. On the other hand, a string of tokens (*pick*, *up*, *the*, *red*, *mug*), symbols with no pixels attached. These two things live in completely different worlds. The image doesn't know what \"red\" means. The word \"mug\" has never seen a mug. And yet the robot has to connect them, right now, to move its hand to the correct object on a cluttered table.",
        "**That's the villain of this chapter: pixels and words don't share a language, and a robot has to make them.** Everything here is a fix for that one problem: how do you force vision and language into a *shared space*, where a picture of a red mug and the phrase \"red mug\" land in nearly the same place, close enough that the robot can match one against the other?",
        "Prerequisites: you've read Chapter 1, so you know a camera is just an exteroceptive sensor handing you a flattened 2D grid (that \"cameras throw away depth\" line comes back to bite us). You should be comfortable with the idea of a neural network and a vector. Beyond that we build up. **One honest note:** I have a separate ML guide that covers CNNs and transformers in real depth: the convolutions, the backprop, the training tricks. This chapter is not that. Here I move *fast* through the general-ML machinery and spend the time on what actually matters for robots: turning pixels plus language into a representation you can act on. When I wave at something, it's because the ML guide has the details.",
        "Here's the road, and every step fixes the last. We recap what an image is and why CNNs give way to transformers. We build **attention** properly, because it's the engine under everything. We stack attention into a **Vision Transformer**, which lets an image be a sequence. We train two encoders together with **CLIP** to get a shared image-text space, the direct answer to our villain. We fix CLIP's scaling pain with **SigLIP**. We bolt a vision encoder onto a language model to get a **VLM** that can caption, answer, and point. And we close with a primer on **generative modeling** (diffusion and flow matching) because a robot doesn't just recognize the mug, it has to *generate* the motion to grab it, and Chapter 9 needs that tool sharp.",
        "Let's go.",
      ],
    },
    {
      heading: "Quick recap: an image is a grid of numbers",
      paragraphs: [
        "Back in Chapter 1 we called the camera an exteroceptive sensor (cheap, dense, semantically rich) that hands you the world already flattened to 2D. Let's be concrete about what \"an image\" actually is, because everything downstream is arithmetic on it. A **pixel** is a spot of color, stored as three numbers: how much red, green, and blue, each from 0 (none) to 255 (full). Stack pixels into a grid and an image is just a block of numbers, shape height × width × 3. A modest 224×224 color image is 224 · 224 · 3 ≈ 150,000 numbers. To the computer there is no \"cup,\" no \"red,\" no \"edge\"; there is a tensor. Perception is the whole project of finding structure in that tensor.",
        "The workhorse that found that structure for a decade is the **convolutional neural network (CNN)**. The one idea worth carrying forward: a CNN slides small learnable filters across the image and builds a **hierarchy of features**. Early layers fire on tiny local patterns: edges, corners, blobs of color. Middle layers combine those into textures and parts: a curve, a handle, an eye. Late layers assemble parts into objects: \"this arrangement of edges and curves is a mug.\" The magic is that nobody hand-designs those filters; they're learned from data, and the hierarchy emerges because each layer only looks at a small neighborhood and stacking gives it reach. That locality is a built-in assumption, an **inductive bias**, that pixels near each other matter more than pixels far apart, and it's usually *right* for images, which is exactly why CNNs were so sample-efficient. (For the actual convolution math, stride, padding, and how the receptive field grows, see the ML guide; I promised I'd move fast, and I will.)",
        "So why leave CNNs? Because that same locality that makes them efficient makes them *myopic*. A CNN struggles to relate two things on opposite sides of an image without stacking many layers to slowly grow its window. \"Is the object the hand is reaching for the same color as the one mentioned in the instruction?\" is a question about long-range relationships, and CNNs answer it grudgingly. There's a mechanism that treats *every* pair of locations as potentially related in a single step, weights those relationships by relevance, and (this is the punchline) turns out to be the same mechanism that revolutionized language. If we want vision and language to eventually share a brain, it helps enormously if they share a mechanism first. That mechanism is attention, and it's next.",
      ],
    },
    {
      quiz: {
        question:
          "A CNN's early filters fire on edges and its late layers fire on whole objects, yet no one ever told it what an edge or an object is. Where does that hierarchy come from, and what built-in assumption makes it efficient?",
        answer:
          "It comes entirely from training: the filters are learned parameters, tuned by gradient descent to minimize error on the task, and the edge-then-part-then-object hierarchy *emerges* because that's the most useful way to structure limited local computation. The built-in assumption is **locality**: each convolution only looks at a small neighborhood, encoding the prior that nearby pixels are more related than distant ones. That inductive bias is why CNNs learn from relatively little data: they don't waste capacity considering that the top-left and bottom-right pixels might be directly related. It's also their limit: genuinely long-range relationships require many stacked layers, which is what motivates attention.",
      },
    },
    {
      heading: "Attention: the engine under everything",
      paragraphs: [
        "This is the most important section in the chapter, so we slow down. Everything after it (Vision Transformers, CLIP, VLMs, the models steering real robots) is attention wearing different clothes. Get this and the rest is assembly.",
        "**The intuition first.** Imagine a room full of people, each holding a card. You walk in with a question written on a slip of paper: *\"who here knows about mugs?\"* You hold your slip up against everyone's card, and the cards that match your question light up. Then you don't just talk to the single best match; you gather a *little* from everyone, weighted by how well their card matched, and blend it into your answer. That blend is what you walk away with. Do this for every person in the room simultaneously (everyone asking, everyone answering, everyone updating) and you've just run **self-attention**. Information mixes across the whole room in one shot, and who-talks-to-whom is decided by content, not by position.",
        "Now the three roles, because they're the whole trick. Every token (think of a token as one element: a word, a patch of image, a person in the room) produces three vectors by multiplying its representation with three learned weight matrices:",
      ],
    },
    {
      list: [
        "The **Query (Q)** is what this token is *looking for*. \"I'm about a color; who's relevant to me?\"",
        "The **Key (K)** is what a token *advertises about itself*. \"I'm about the mug's handle.\" It's the card each token holds up.",
        "The **Value (V)** is the *actual content* the token will hand over if attended to: the information you read out.",
      ],
    },
    {
      paragraphs: ["The mechanism, written once and then unpacked entirely in words:"],
      equations: [String.raw`\mathrm{Attention}(Q, K, V) = \mathrm{softmax}\!\left(\frac{QK^{\top}}{\sqrt{d}}\right) V`],
    },
    {
      paragraphs: [
        "Reading the symbols left to right. **Q** is the stack of all query vectors (one row per token). **K** is the stack of all key vectors. **QKᵀ**, Q times the transpose of K, is a big table of dot products: every query dotted with every key. A dot product is a similarity score, so this table says, for each token, *how well does my question match every other token's advertisement?* Big number = strong match. **√d** (the square root of the key dimension, the length of each key vector) is just a scaling factor; without it the dot products grow large as d grows, and that pushes the next step into a saturated regime where gradients die, so dividing by √d keeps the scores tame. **softmax** takes each row of scores and squashes it into a set of weights that are all positive and sum to 1: the attention weights, literally \"what fraction of my attention goes to each token.\" Finally we multiply those weights by **V**: each token's answer is a **weighted sum of everyone's Values**, weighted by how much attention it decided to pay. That's it. That's attention.",
        "**A tiny worked intuition.** Say token A (\"red\") has a query, and there are three other tokens whose keys give scaled match scores of 4, 1, and 1 after the $QK^{\\top}/\\sqrt{d}$ step. Softmax exponentiates first ($e^4 \\approx 54.6$, $e^1 \\approx 2.7$) and then normalizes, so 4, 1, 1 becomes roughly 0.91, 0.05, 0.05; the big score dominates because the exponential stretches gaps before the normalization. So token A's output is 0.91 of the first token's Value plus a whisper of the other two. If instead the scores were 4, 4, 4, a tie, softmax gives 0.33, 0.33, 0.33 and A reads out a flat average of all three. The scores decide the blend; the Values decide the content. Change the question (the Query) and the whole blend re-weights.",
        "**Self-attention** is the special case where Q, K, and V all come from the same set of tokens: the room talking to itself, every token both asking and answering. One pass and information has flowed between *every* pair of tokens, near or far, gated by content. That's the thing CNNs couldn't do cheaply: a global, content-addressed mixing in a single step. Stack a few of these layers with some ordinary feed-forward networks between them and you have a **transformer**. (Two footnotes for honesty: real transformers run several attention operations in parallel, **multi-head attention**, so different heads can specialize, one tracking color, another tracking spatial position; and cost grows with the *square* of the number of tokens, since every token attends to every token, which is why long sequences get expensive. Both details live in the ML guide.)",
      ],
    },
    {
      diagram: {
        id: "rb-8-1",
        caption:
          "Each token asks a Query, every token answers with a Key, and the matches, after softmax, decide how much of each token's Value you read out. Attention is content-addressed blending.",
      },
    },
    {
      quiz: {
        question:
          "In the attention formula, what breaks if you delete the softmax and just use QKᵀ · V directly, and separately, why divide by √d?",
        answer:
          "Without softmax, the \"weights\" are raw dot products: they can be negative, they don't sum to 1, and a single huge score can blow up the output arbitrarily. Softmax fixes all three: it makes every weight positive, forces them to sum to 1 (so the output is a true weighted average, a convex blend of Values), and gives a smooth, differentiable notion of \"paying more attention to the best match.\" The √d division is a numerical-stability trick: dot products of d-dimensional vectors grow in magnitude roughly like √d, and feeding large numbers into softmax makes it near one-hot, which flattens gradients and stalls learning. Scaling by √d keeps the scores in a sane range so gradients stay healthy: small fix, big difference at scale.",
      },
    },
    {
      heading: "Vision Transformers: an image is a sequence of patches",
      paragraphs: [
        "We have an engine that mixes a *sequence of tokens*. Language already arrives as a sequence of word tokens, so transformers took over language first. But an image is a 2D grid, not a sequence, so how do you feed a picture to a machine built for sequences? The naive answer, \"make each pixel a token,\" dies instantly: a 224×224 image has ~50,000 pixels, attention costs grow with the square of the token count, and 50,000² is a non-starter. You'd melt the GPU before the first layer finished.",
        "The fix, from the **Vision Transformer (ViT)** paper (Dosovitskiy et al., 2020), is almost insultingly simple, and the title of the paper says it best: *an image is worth 16×16 words.* Chop the image into a grid of fixed square **patches**, say 16×16 pixels each. A 224×224 image becomes a tidy 14×14 grid of patches, which is 196 patches. Flatten each patch's pixels into a vector, run it through one **linear projection** (a single learned matrix that maps the raw patch to a token of the transformer's working dimension), and you now have 196 tokens instead of 50,000. Suddenly attention is affordable. **An image is a sequence of patches**, and a patch is a \"visual word.\"",
        "There's one thing we broke and have to fix. When you chop the image into patches and hand them to attention, attention is **permutation-invariant**: it treats its inputs as an unordered set. It has no idea patch #37 sat in the top-right and patch #150 sat in the bottom-left. That's fatal for vision; where things are matters enormously. So we add a **positional embedding** to each patch token: a learned vector, one per grid slot, that stamps each token with \"you were *here*.\" Now attention can reason about layout. (Side note: this is the same fix language transformers use for word order, same villain, same hero, which is exactly the cross-domain unification we're building toward.)",
        "The full recipe, then: **patchify → linearly project each patch to a token → add positional embeddings → run a stack of transformer layers → read out.** Usually you also prepend one extra learnable token, the \"[CLS]\" or class token, whose job is to gather a summary of the whole image through attention, and you read the final answer off of it.",
        "Let's make the token math concrete. Image 224×224×3. Patch size 16, so patches per side = 224 / 16 = 14, and total patches = 14 · 14 = 196. Each patch is 16 · 16 · 3 = 768 raw numbers, projected to a token of dimension, say, 768. Add one CLS token → 197 tokens, each a 768-vector, plus 197 positional embeddings. That 197×768 block is what flows through the transformer. Halve the patch size to 8 and you get 28·28 = 784 patches, four times as many tokens, sharper detail, but the quadratic attention cost jumps ~16×. That patch-size knob is a direct resolution-versus-compute dial, and you'll see it everywhere.",
        "One honest caveat, straight from the ViT paper being honest about itself. A CNN comes with locality and translation-equivariance baked in, strong inductive biases that let it learn from modest data. **ViT throws most of that away.** It doesn't assume nearby patches are related; it has to *learn* that from scratch through attention. The consequence: on small datasets a ViT underperforms a comparable CNN, because it's spending capacity rediscovering structure the CNN got for free. But feed it enough data (hundreds of millions of images) and the lack of baked-in bias becomes a *strength*: with nothing forcing it into local thinking, it learns whatever relationships the data actually contain, and it overtakes the CNN. **Fewer inductive biases, more data hunger, higher ceiling.** That trade is the whole story of ViT, and it's why the big vision-language systems the robots use are transformer-based: they're trained on oceans of data, exactly the regime where ViT wins.",
      ],
    },
    {
      diagram: {
        id: "rb-8-2",
        caption:
          "A ViT makes an image a sequence: chop into fixed patches, project each to a token, stamp it with a position, and let attention do the rest. Smaller patches see finer detail but cost quadratically more.",
      },
    },
    {
      quiz: {
        question:
          "You feed a ViT the same photo twice, but the second time you shuffle the patch order before adding positional embeddings, then add the *correct* positional embeddings back. Does the ViT's output change? What does that tell you about where \"where things are\" lives in a ViT?",
        answer:
          "No, the output is unchanged (up to numerical noise). Because attention is permutation-invariant, the transformer treats its tokens as a set: the *order* you list them in doesn't matter, only which position each token is *told* it occupies via its positional embedding. If patch #37 carries the positional embedding for the top-right slot, attention places it in the top-right regardless of where it sits in the input list. This tells you spatial information in a ViT lives *entirely* in the positional embeddings, not in the sequence order. Strip the positional embeddings and the ViT genuinely can't tell a face from a scrambled one, which is exactly why we add them, and why they're the fix that makes patchification work.",
      },
    },
    {
      heading: "CLIP: forcing vision and language into one shared space",
      paragraphs: [
        "Now we can finally hit the villain head-on. We have a transformer that encodes images (ViT) and, from the ML guide, a transformer that encodes text. Each spits out a vector. But an image-vector and a text-vector, trained separately, live in unrelated coordinate systems: the image encoder's \"red mug\" region has nothing to do with the text encoder's \"red mug\" region. They're two people speaking different languages into two different notebooks. We need them writing in the *same* notebook.",
        "**CLIP**, Contrastive Language-Image Pre-training (Radford et al., 2021), is the idea that solves it, and it's beautiful in how little it assumes. Take an image encoder and a text encoder. Train them **together** on a giant pile of (image, caption) pairs scraped from the web, hundreds of millions of them. For each pair, push both through their encoders to get an image vector and a text vector, and project both into a **shared embedding space** of the same dimension. Now the training objective, the whole trick: **make the matching image-caption pair land close together, and push every mismatched pair apart.**",
        "Think of a training batch of, say, 32,768 image-caption pairs. Lay them out as a grid: images down the side, captions across the top. The 32,768 cells on the diagonal are the *true* pairs: this image really did come with this caption. Every off-diagonal cell is a *mismatch*: this image with someone else's caption. CLIP computes the similarity (a dot product in the shared space) of every image with every caption in the batch (the full grid) and trains so that each row's and each column's diagonal cell scores highest. Pull the diagonal up, push everything off-diagonal down. This is the **contrastive** objective, and the specific loss is called **InfoNCE**: for each image, treat its true caption as the one correct answer and all the other captions in the batch as wrong answers, then run a softmax-classification loss over \"which caption matches me?\", and symmetrically for each caption picking its image. Do this on the whole web, and the two encoders are dragged, pair by pair, into agreement.",
        "What do you get for it? Two payoffs, and the second is the one we came for.",
        "First, **zero-shot recognition.** Want to classify an image into \"cat, dog, mug\"? Don't train a classifier. Just embed the three text prompts \"a photo of a cat / dog / mug,\" embed the image, and pick whichever text vector is closest. CLIP recognizes categories it was never explicitly trained to classify, because it learned the *general* relationship between pictures and words. That flexibility is why CLIP felt like a jump, not a step.",
        "Second, and this is the answer to our villain, **\"red mug\" (the text) and a picture of a red mug (the image) now land near each other in one shared space.** That co-located space is the bridge. A robot can take the instruction \"pick up the red mug,\" embed it, embed what its camera sees, and *compare them with a dot product* to find the region of the scene that matches the words. Pixels and language finally speak a common tongue, and it's a tongue you can do arithmetic in. Every vision-language system in Chapter 9 stands on top of exactly this idea.",
      ],
    },
    {
      diagram: {
        id: "rb-8-3",
        caption:
          "CLIP trains two encoders to agree: matching image-caption pairs are pulled together and mismatches shoved apart, until a photo of a red mug and the words 'red mug' share the same neighborhood.",
      },
    },
    {
      quiz: {
        question:
          "CLIP is trained only to match whole images to whole captions, never told what a \"cat\" is, never given labeled cat boxes. Yet you can hand it a photo and the prompts \"a cat / a dog / a mug\" and it picks the right one. How, mechanically, does whole-image-to-whole-caption training give you category recognition it was never taught?",
        answer:
          "Because CLIP doesn't learn a fixed list of categories; it learns a *general geometry* relating pictures to language, embedded in a shared space. Across hundreds of millions of web pairs, images containing cats tended to co-occur with captions mentioning cats, so \"cat-ness\" in pixels and \"cat\" in text got dragged into the same neighborhood, and likewise for essentially every concept the web talks about. At test time, \"classify\" is just: embed the image, embed each candidate text prompt, and measure which text vector the image is closest to via dot product. Nothing about the three prompts was seen in training as a labeled class; you're exploiting the learned image-text geometry directly. That's why it's called *zero-shot*: the recognition falls out of the shared space for free, no task-specific training head required.",
      },
    },
    {
      heading: "SigLIP: the same idea, but it scales",
      paragraphs: [
        "CLIP works, but it has a scaling headache hiding in that similarity grid. Remember the contrastive InfoNCE loss: for each image, softmax over *all the captions in the batch*. That softmax is normalized across the whole batch, which means every example's loss depends on every other example in the batch at once. To learn fine distinctions you need lots of hard negatives in view, so you need **enormous batches**: CLIP used batches in the tens of thousands. That's expensive in memory, it demands coordinating the full similarity matrix across many GPUs, and it makes training finicky: the whole batch has to be materialized and normalized together.",
        "**SigLIP** (Zhai et al., 2023) fixes this with a change that sounds trivial and isn't: **swap the softmax for a sigmoid.** Instead of asking \"of all the captions in the batch, which one matches this image?\", a competition that couples the whole batch, SigLIP asks, for *each* image-text pair independently, a simple yes/no: \"do these two match?\" Every pair on the grid, diagonal and off-diagonal alike, becomes its own binary classification: the true pairs should score \"yes,\" the mismatched pairs \"no.\" The sigmoid loss treats each pair on its own, with no batch-wide normalization coupling them.",
        "Why does that help so much? Because the loss no longer needs the entire batch to be normalized together, the pairs are **independent**, so training is more stable and works well at far smaller batch sizes: you're not forced to hold tens of thousands of examples in lockstep to get a good gradient. It scales more gracefully, both up (bigger models) and down (smaller, cheaper training runs). The learned space is the same idea as CLIP's, a shared image-text embedding, just reached by a cheaper, sturdier road.",
        "Here's why you should care as a roboticist, and it's the reason SigLIP earns its own section: **SigLIP is the vision encoder of choice in many modern vision-language-action models.** It's the eyes inside **PaliGemma**, which is the eyes inside **π0** (Physical Intelligence, 2024), the flow-matching robot policy we build up to in Chapter 9. When you see \"the vision backbone\" in a robot paper from the last couple of years, it is very often SigLIP. This isn't trivia; it's the concrete encoder whose embeddings a real robot's action head reads from. Remember the name.",
      ],
    },
    {
      diagram: {
        id: "rb-8-4",
        caption:
          "CLIP normalizes each image over the whole batch of captions (a softmax that couples everything, so it needs huge batches); SigLIP scores each pair as an independent yes/no sigmoid, so it stays stable and trains well at smaller batch sizes.",
      },
    },
    {
      quiz: {
        question:
          "CLIP and SigLIP are both trying to build the same thing: a shared image-text space where matches are close. What specifically about CLIP's *loss* forces the giant batches, and how does SigLIP's swap remove that pressure?",
        answer:
          "CLIP's loss is a softmax over the batch: for each image, the probability assigned to its true caption is normalized against every other caption *present in that batch*. The negatives that teach the model are exactly the other in-batch captions, so the quality of the learning signal scales with how many (and how hard) those in-batch negatives are, hence tens of thousands per batch. The softmax also couples the whole batch into one normalized quantity, which is memory-heavy and fussy to coordinate. SigLIP replaces the softmax with a per-pair sigmoid: each (image, text) pair is judged independently as match / no-match, so there's no batch-wide normalization and no dependence on holding a huge pool of negatives in view at once. That independence is what makes it more stable and viable at smaller batch sizes: same shared-space goal, cheaper and sturdier optimization.",
      },
    },
    {
      heading: "Vision-Language Models: giving the language model eyes",
      paragraphs: [
        "We can now *recognize* and *match* pixels to words. But a robot's instructions aren't a fixed menu of labels; they're open-ended language. \"Pick up the mug to the left of the laptop, the one that isn't chipped.\" Answering that needs a system that can look at a scene *and reason about it in words*: caption it, answer questions about it, point at things, follow multi-step instructions. That's a **Vision-Language Model (VLM)**, and it's the last perception piece before actions.",
        "The naive move would be to train one giant multimodal model from scratch. Wasteful: we already have superb pieces. A vision encoder (a ViT trained by CLIP or SigLIP) already turns images into meaning-rich tokens. A large language model already reasons, follows instructions, and generates fluent text. The insight is to **connect them rather than rebuild them.** The pattern, and this is the one to memorize, because it reappears intact in Chapter 9, is three boxes:",
      ],
    },
    {
      paragraphs: ["**vision encoder → projector → LLM.**"],
    },
    {
      paragraphs: [
        "Read it left to right. The **vision encoder** (SigLIP, say) takes the image and produces a set of visual tokens: the patch tokens from the ViT section, now carrying semantic meaning. The **projector** is a small learned network (often just a couple of linear layers, sometimes an MLP) whose only job is to *translate* those visual tokens into the LLM's token space, to reshape them so they look, to the language model, like tokens it can read alongside words. It's the adapter that plugs the eyes into the brain. Then the **LLM** receives a mixed sequence (projected visual tokens *followed by* text tokens, your question or instruction) and does what it always does: attends over the whole sequence and generates text. Because the visual tokens now sit in the same sequence as words, the LLM's attention (yes, the very same attention from Fig 8.1) can freely relate \"the red one\" in the prompt to the actual red patch in the image. The shared space we fought for lets the two modalities be attended over as one.",
        "Training usually keeps the strong encoder mostly intact and focuses on teaching the projector (and often fine-tuning the LLM) to align the two, on image-text tasks like captioning and visual question answering. The result is a model you can hand a picture and a question and get a sentence back, or a pointing coordinate, or a \"yes, the left one is chipped.\"",
        "Two concrete examples, named because they walk straight into the next chapter:",
      ],
    },
    {
      list: [
        "**PaliGemma** (Google, ~3B parameters) is exactly this pattern: a SigLIP vision encoder feeding a Gemma language model through a projector. It's compact, it captions and answers and points, and (this is why it matters here) **π0 uses PaliGemma as its backbone.** The robot policy in Chapter 9 is, underneath, a VLM you now understand the anatomy of.",
        "**Prismatic-style VLMs** popularized combining *two* vision encoders (**DINOv2 + SigLIP**) feeding one LLM, on the logic that DINOv2 (a self-supervised ViT strong on spatial and geometric structure) and SigLIP (strong on semantic language alignment) are blind to different things, so fusing them covers more. If that \"fuse encoders so each covers another's blindness\" logic sounds familiar, it's the sensor-fusion principle from Chapter 1, wearing a vision hat. **OpenVLA uses DINOv2 + SigLIP** as its vision stack, another Chapter 9 system whose eyes you now know.",
      ],
    },
    {
      paragraphs: [
        "So the throughline is clean. Attention gives us mixing. ViT makes an image a sequence. CLIP/SigLIP give a shared image-text space. A VLM bolts that visual understanding onto a reasoning LLM. What's still missing, the one thing a VLM can't do, is *generate an action*. A VLM outputs words. A robot needs a trajectory: a stream of continuous joint commands over time. Producing rich, continuous, multi-dimensional output is a different kind of problem, and it needs a different tool. That tool is generative modeling, and it's the last thing we build.",
      ],
    },
    {
      diagram: {
        id: "rb-8-5",
        caption:
          "A VLM plugs eyes into a language model: a vision encoder makes visual tokens, a projector translates them into the LLM's space, and the LLM attends over image and words together to answer. This exact pattern is the backbone of the robot policies in Chapter 9.",
      },
    },
    {
      quiz: {
        question:
          "In the vision-encoder → projector → LLM pattern, the projector is often just a couple of small linear layers, tiny compared to the encoder and the LLM. Why is such a small piece the thing that makes the whole system work, and what would go wrong if you deleted it and fed the raw vision tokens straight to the LLM?",
        answer:
          "The projector's job is *alignment*, not heavy computation: the vision encoder and the LLM were trained separately and live in different representation spaces. The encoder's visual tokens are shaped and scaled for image features, while the LLM only knows how to read its own text-token space. The projector is the small learned adapter that maps one into the other, so the LLM sees visual tokens as things it can actually attend over alongside words. Delete it and feed raw vision tokens in, and the LLM receives vectors in a foreign coordinate system (wrong dimension, wrong scale, wrong distribution) that its attention can't meaningfully relate to text tokens; the image effectively becomes noise. It's small because the encoder and LLM already did the hard work; the projector just has to *translate between* them, which is exactly why it's the cheap piece that unlocks everything.",
      },
    },
    {
      heading: "Generative modeling primer: diffusion and flow matching",
      paragraphs: [
        "Everything so far has been about *understanding*, turning pixels and words into a representation. But a robot has to *produce*. It doesn't classify a trajectory; it generates one, a continuous stream of \"move this joint to here, then here, then here\" over the next second, hundreds of correlated numbers with real structure. It might also generate a future image (\"what will the scene look like after I move?\"). Generation is a genuinely different beast from recognition, and the modern answer to it is the last idea we need. This primer is deliberately here so Chapter 9 can generate *actions* with the very tool we build now.",
        "**Start with why generation is hard.** You can't just have a network output the trajectory directly and train it to match demonstrations with a squared-error loss, because for the same situation there are often *many* valid trajectories (reach around the left of the obstacle, or the right), and averaging them gives you a nonsense path straight through the middle. You need a model that can represent a whole *distribution* of good outputs and sample from it. That's what generative models do.",
        "**Diffusion** is the first clean answer. The idea is almost perverse: to learn to *create* data, first learn to *destroy* it. Take a real example (an image, or a trajectory) and add a little Gaussian noise. Then more. Then more, over many steps, until it's pure static, all structure gone. That's the easy, fixed **forward (noising) process**. Now train a network to run it **backwards**: given a noisy example, predict the noise that was added so you can subtract a bit of it and get a slightly cleaner example. Learn that one denoising step well, and generation is just: start from pure random noise and apply the learned denoiser over and over, many times, each step removing a little noise, until structure crystallizes out of static into a coherent sample. **Diffusion learns to reverse a noising process, denoising pure noise into data over many steps.** It's powerful and it captures multi-modal distributions beautifully, but note *many steps*. Classic diffusion needs tens to hundreds of denoising passes to produce one sample, because each backward step is small and the denoising path wanders. For an image generator that's fine. For a robot that has to output actions at 50 Hz, hundreds of network passes per action is a latency problem, and Villain #1 from Chapter 1, the world that won't hold still, is watching.",
        "**Flow matching** (Lipman et al., 2022) is the fix, and it's the tool Chapter 9's action generator actually uses, so let's be precise. Picture the same job (get from a cloud of pure noise to the data distribution) but instead of a long, wiggly, stochastic denoising walk, learn a **velocity field**: a function that, at every point in space and every moment in time between \"noise\" (time 0) and \"data\" (time 1), tells you which direction to move and how fast. Generation becomes: drop a sample of noise into that field and *flow* it forward, integrating the velocity, following the arrows, until you arrive at data. Because it's a velocity field you integrate, it's a deterministic **ODE** (ordinary differential equation), not the stochastic step-by-step denoising of diffusion.",
        "Let's pin down what \"learn a velocity field\" actually means, because the objective is almost embarrassingly simple. Pair a noise sample $x_0$ with a data sample $x_1$ and draw the straight line between them:",
      ],
      equations: [String.raw`x_t = (1 - t)\,x_0 + t\,x_1, \qquad \frac{dx_t}{dt} = x_1 - x_0`],
    },
    {
      paragraphs: [
        "Reading the symbols: $x_t$ is the point a fraction $t$ of the way from noise to data, and its velocity along the straight path is just $x_1 - x_0$ — a constant, because straight lines don't accelerate. The network $v_\\theta(x_t, t)$ (theta for its learnable knobs, as always) is trained to predict that velocity wherever you drop it:",
      ],
      equations: [
        String.raw`\mathcal{L}_{\mathrm{FM}} = \mathbb{E}_{t,\, x_0,\, x_1}\, \big\| v_\theta(x_t, t) - (x_1 - x_0) \big\|^2`,
      ],
    },
    {
      paragraphs: [
        "Work one dimension by hand. Noise $x_0 = -2$, data $x_1 = 4$. Halfway along, at $t = 0.5$, the sample sits at $x_{0.5} = 0.5 \\cdot (-2) + 0.5 \\cdot 4 = 1$, and the target velocity is $4 - (-2) = 6$. So one training example is: input (position $1$, time $0.5$), regression target $6$. That's the entire loss — no sampling loop, no simulation, just \"predict the arrow.\" And at generation time, if the learned field really were the constant $6$, a single Euler step of size $1$ from $x_0 = -2$ lands at $-2 + 6 = 4$: the data, in one step. The real field (averaged over many noise-data pairs) isn't perfectly straight, so you take a few steps instead of one, but that near-straightness is exactly why few-step generation works.",
        "The three things that make it win, stated honestly:",
      ],
    },
    {
      list: [
        "**It's trained simulation-free.** You never have to run the generation process during training to get a learning signal. Flow matching sets up straight-ish reference paths from noise to data (often based on **optimal transport**, which connects each noise point to a data point along a near-straight line) and simply trains the network to **regress the velocity** along those paths: at a point partway along, predict the arrow that points toward the destination. It's a plain regression on a time-dependent velocity field. Formally, that's training a **continuous normalizing flow** without ever simulating the flow, which is exactly why it's cheap to train.",
        "**The paths are near-straight, so inference takes far fewer steps.** A straight path can be traversed in a handful of integration steps (sometimes a few, sometimes even one) because there's little curvature to resolve. Diffusion's meandering path needs many small steps to stay accurate; flow matching's near-straight optimal-transport paths need only a few. For a robot that has to emit actions fast, *far fewer steps* is the whole ballgame.",
        "**It generalizes diffusion.** Flow matching isn't a rival that throws diffusion away; it's a more general framework: diffusion corresponds to a particular (curvier, stochastic) choice of path, and flow matching lets you pick straighter deterministic ones. It subsumes diffusion-style paths and is faster at inference. Same expressive power over rich, multi-modal distributions; a much shorter road to a sample.",
      ],
    },
    {
      paragraphs: [
        "So the payoff for Chapter 9: a robot policy can take the VLM's understanding of the scene-plus-instruction and, instead of emitting *words*, emit a **flow-matching velocity field over actions**, then integrate it in a few steps to produce a smooth, continuous trajectory, fast enough to run in the loop. That's the bridge from perception to action, and it's precisely how π0 works. We built the generator here so that chapter can just *use* it.",
      ],
    },
    {
      diagram: {
        id: "rb-8-6",
        caption:
          "Both turn noise into data, but diffusion crawls there over many small stochastic denoising steps while flow matching rides a near-straight learned velocity field in a few, which is why robots that must act fast generate their motions with flow matching.",
      },
    },
    {
      quiz: {
        question:
          "Both diffusion and flow matching turn noise into data and both can capture the same rich, multi-modal distributions. Why, then, does a real-time robot policy overwhelmingly prefer flow matching, and what property of the *paths* is doing the work?",
        answer:
          "Because inference speed is the binding constraint on a robot, and flow matching gets there in far fewer steps. Diffusion generates by many small stochastic denoising steps along a meandering path, so it needs tens to hundreds of network evaluations per sample: fine for offline image generation, fatal for a policy that must emit actions at high rate. Flow matching learns a deterministic velocity field whose reference paths (often optimal-transport) are *near-straight*, and a straight path can be integrated accurately in a handful of steps (sometimes essentially one) because there's almost no curvature to resolve. That path-straightness is the property doing the work: same expressive power over multi-modal action distributions, but a short, deterministic ODE to traverse instead of a long, wiggly, stochastic one. For a robot fighting Chapter 1's \"world won't hold still\" villain, few-step generation is the difference between a usable policy and a laggy one.",
      },
    },
    {
      heading: "Where this leaves us",
      paragraphs: [
        "We started with a robot holding two incompatible things (a grid of pixels and a string of words) and no way to relate them. We end with a full pipeline that fuses them and can generate from them. **Attention** gave us content-addressed mixing, the engine under all of it. **ViT** made an image a sequence of patches so that engine could run on vision. **CLIP** trained two encoders into one shared space where \"red mug\" the phrase and a red mug the photo finally sit close. **SigLIP** made that space cheap and stable enough to scale, which is why it's the eyes inside today's robot models. **VLMs** bolted those eyes onto a reasoning LLM through a projector, giving open-ended captioning, question-answering, and pointing. And the **generative primer** (diffusion, then flow matching) handed us a way to *produce* rich continuous output, not just recognize it.",
        "Notice the same two heroes from Chapter 1 running underneath. **Fusion**, arranging encoders (DINOv2 + SigLIP) so each covers another's blindness, is the sensor-fusion principle wearing a vision hat. And **speed**, flow matching's few-step generation, is the direct descendant of Villain #1, the world that won't hold still, forcing us to act before the scene moves on.",
        "Everything here is perception and generation in the abstract. It doesn't yet touch a joint. Chapter 9 closes that gap: it takes exactly this stack (a SigLIP/PaliGemma or DINOv2+SigLIP vision encoder, a projected token stream into an LLM, and a flow-matching head) and points the output not at words but at **actions**. The Vision-Language-Action model is this chapter with a motor bolted on. You've built the backbone; next we make it move.",
      ],
    },
    {
      paragraphs: [
        "*Prev: Chapter 7, Reinforcement Learning for Robots · Next: Chapter 9, Vision-Language-Action Models*",
      ],
    },
  ],
};
