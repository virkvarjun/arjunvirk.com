import type { Paper } from "@/lib/literature";

// `String.raw` lets us write LaTeX (and inline `$...$` math) without escaping
// every backslash. Avoid any literal "${" sequence inside these templates.
const r = String.raw;

export const singer: Paper = {
  slug: "singer",
  title: "SINGER: An Onboard Generalist Vision-Language Navigation Policy for Drones",
  authors: "Maximilian Adang, JunEn Low, Ola Shorinwa, Mac Schwager",
  year: "2025",
  venue: "arXiv:2509.18610",
  summary:
    "Language-guided autonomous drone navigation in the open world using only onboard sensing and compute, trained on synthetic data from a semantics-rich Gaussian Splatting simulator and a time-inverted RRT* expert.",
  citation: `@misc{adang2025singeronboardgeneralistvisionlanguage,
  title={SINGER: An Onboard Generalist Vision-Language Navigation Policy for Drones},
  author={Maximilian Adang and JunEn Low and Ola Shorinwa and Mac Schwager},
  year={2025},
  eprint={2509.18610},
  archivePrefix={arXiv},
  primaryClass={cs.RO},
  url={https://arxiv.org/abs/2509.18610},
}`,
  sections: [
    {
      paragraphs: [
        r`SINGER performs language-guided autonomous drone navigation in the open world using only onboard sensing and compute. A user gives a natural-language semantic query, and a lightweight visuomotor policy flies the quadrotor toward the described target in an unknown environment, without external pose estimation or pre-built maps. (The name is a backronym for *Semantic In-situ Navigation and Guidance for Embodied Robots*.)`,
      ],
    },
    {
      heading: "The three ingredients",
      paragraphs: [
        r`To train policies that actually transfer to real flight, SINGER combines three pieces:`,
      ],
      list: [
        r`A semantics-rich Gaussian Splatting simulator that provides a photorealistic, language-embedded flight environment with a minimal sim-to-real gap.`,
        r`An RRT-inspired (Rapidly-exploring Random Tree) expert that generates spatially spanning, collision-free navigation demonstrations across multiple Gaussian scenes.`,
        r`A lightweight visuomotor policy, trained on those demonstrations, that runs closed-loop onboard the drone.`,
      ],
    },
    {
      heading: "Background: RRT and RRT*",
      paragraphs: [
        r`RRT is a popular sampling-based algorithm for finding paths through complex, high-dimensional spaces. It grows a tree by randomly sampling points in the environment and connecting them to the existing structure. Concretely, one iteration does the following:`,
      ],
      list: [
        r`Sample a random point $q$ in the free space.`,
        r`Find the existing tree node $v_{\text{near}}$ closest to $q$.`,
        r`Move a small distance from $v_{\text{near}}$ toward $q$ to create a candidate node $q_{\text{new}}$.`,
        r`Collision-check the segment; if it is clear of obstacles, add $q_{\text{new}}$ to the tree.`,
        r`Repeat until a branch reaches the goal.`,
      ],
    },
    {
      paragraphs: [
        r`RRT* is the asymptotically optimal variant, which additionally *rewires* the tree so branches do not pass through redundant nodes, yielding shorter, cleaner paths. SINGER builds these trees across many Gaussian scenes.`,
      ],
    },
    {
      heading: "The key idea: a time-inverted RRT* planner",
      paragraphs: [
        r`SINGER's planner efficiently computes spatially spanning, collision-free paths to a language-specified goal by *time-inverting* an expanded tree. The tree explores collision-free paths from the goal *outward* to the boundaries of the environment. At expert-data-generation time, the trajectories are then flown in reverse, from the leaf nodes back to the root of the tree. In other words, planning starts at the goal location, and the reversed paths become training data that approach the goal from many directions.`,
      ],
    },
    {
      heading: "Zero-shot generalization",
      paragraphs: [
        r`SINGER aims to navigate environments and respond to semantic queries it has never seen during training, with no additional fine-tuning or retraining. It achieves this by abstracting goal specification into a vision-language space (CLIP) and training on a small dataset of synthetic expert trajectories augmented with domain randomization. Because goals live in CLIP space rather than a fixed label set, the policy can handle new objects and instructions at inference time instead of requiring exposure during training. At deployment, CLIPSeg produces open-vocabulary semantic images of the environment as conditioning inputs, which an end-to-end visuomotor policy turns into low-level drone commands.`,
      ],
    },

    {
      heading: "Language-conditioned data synthesis",
      paragraphs: [
        r`The goal of data synthesis is to create synthetic imitation-learning data that lets the navigation policy generalize to open-world UAV flight guided by natural-language instructions. The simulator pairs a lightweight drone dynamics model with a 3D Gaussian Splatting (3DGS) scene generated using Nerfstudio, and it embeds both spatial and semantic information in the rendering engine so that simulated flight trajectories are anchored to the semantics of the scene.`,
      ],
    },
    {
      heading: "The semantic 3DGS environment",
      paragraphs: [
        r`A 2D vision-language model (CLIP) is used to distill CLIP image embeddings into the 3DGS, producing a representation that maps any 3D point to a semantic embedding. This trains a scene-specific semantic field $f : \mathbb{R}^3 \rightarrow \mathbb{R}^l$, parameterized as a multi-resolution hash grid, then an MLP, then the 3DGS.`,
        r`The semantic field is queried at the mean of each point in the sparse point-cloud representation of the 3DGS to identify the semantics of that cluster of points. This yields a point-cloud representation of an object in the frame of the 3DGS, from which its 3D location can be computed, giving semantic object centroids $\mathbf{q}_o \in \mathbb{R}^3$. These centroids anchor language-conditioned trajectory generation and collision detection: semantics guide both the navigation targets and the obstacles to avoid.`,
      ],
    },
    {
      heading: "Spatially spanning trajectories",
      paragraphs: [
        r`RRT* is run offline to explore the 3DGS environment spatially, randomly sampling free space and building branches between sampled nodes $v$. Each semantically significant object centroid $\mathbf{q}_o \in \mathbb{R}^3$ sits at the *root* of its own RRT*.`,
      ],
      list: [
        r`Bounding bubbles are placed around the points in the sparse point cloud, and the RRT* is forbidden from routing branches into these regions, which guarantees collision-free trajectories.`,
        r`A goal region is extended around the semantic query to shape the approach direction toward the center of the environment, and to avoid generating trajectories that fly the drone over furniture.`,
        r`Rewiring ensures each branch does not pass through redundant nodes.`,
        r`Each sparse RRT* branch is segmented into trajectories in 3D position space and smoothed with a cubic-spline pipeline, and an upper bound on drone velocity is used to generate velocity data for each branch.`,
        r`The otherwise-unconstrained yaw is set to point the camera normal toward the semantically significant object, and the result is handed to a robust optimal controller during data synthesis.`,
      ],
    },
    {
      heading: "Synthetic expert data generation",
      paragraphs: [
        r`A robust Model Predictive Control (MPC) expert flies the RRT* trajectories in simulation, tracking them from leaf to root (that is, the time-inverted direction) using the ACADOS solver. At each time step $k$ the simulator records the drone state $\mathbf{x}_k$, the control input $\mathbf{u}_k$, and a first-person RGB image $I_k$. Each image is segmented on the fly with CLIPSeg into a processed image $I_k^{\text{proc}}$, so the dataset consists of triples $\{ I_k^{\text{proc}}, \mathbf{x}_k, \mathbf{u}_k \}$.`,
        r`To improve robustness and simulate real-world variability, domain randomization perturbs drone parameters by about $\pm 30\%$ (mass, thrust coefficients) and perturbs the drone's pose and velocity every 2 seconds. Two-second data segments are extracted and shuffled to form a large dataset of observation-action pairs for imitation learning.`,
      ],
    },

    {
      heading: "Policy architecture and training",
      paragraphs: [
        r`The objective is to train a language-conditioned policy $\pi$ that maps onboard observations and a natural-language semantic query into control commands for the quadrotor, letting it navigate open-world, unknown environments toward semantically defined goals.`,
        r`**Inputs.** A natural-language instruction or semantic query (open-vocabulary), plus onboard sensors: a monocular RGB camera, an IMU, a magnetometer, and a downward optical-flow sensor. **Outputs.** Low-level control commands: collective thrust $f_{\text{th}}$ and body-frame angular velocity $\boldsymbol{\omega}_B$.`,
      ],
    },
    {
      heading: "State and control",
      paragraphs: [
        r`The drone state is the 10-dimensional vector`,
      ],
      equations: [
        r`\mathbf{x} = (\mathbf{p}_W,\, \mathbf{v}_W,\, \mathbf{q}_{BW}),`,
      ],
    },
    {
      paragraphs: [
        r`where $\mathbf{p}_W = (p_x, p_y, p_z)$ is the position in the world frame $W$, $\mathbf{v}_W = (v_x, v_y, v_z)$ is the velocity in $W$, and $\mathbf{q}_{BW} = (q_x, q_y, q_z, q_w)$ is the orientation as a quaternion representing the rotation from the body frame $B$ to the world frame $W$. The control input is $\mathbf{u} = (f_{\text{th}}, \boldsymbol{\omega}_B)$, where $f_{\text{th}}$ is the normalized thrust and $\boldsymbol{\omega}_B = (\omega_x, \omega_y, \omega_z)$ is the body-frame angular velocity.`,
      ],
    },
    {
      heading: "Drone dynamics model",
      paragraphs: [
        r`The dynamics describe how the state evolves under the control inputs (Equation 1):`,
      ],
      equations: [
        r`\begin{cases} \dot{\mathbf{p}}_W = \mathbf{v}_W \\[4pt] \dot{\mathbf{v}}_W = g\,\mathbf{z}_W - \dfrac{k_{\text{th}}}{m_{\text{dr}}}\, f_{\text{th}}\, \mathbf{z}_B \\[4pt] \dot{\mathbf{q}}_{BW} = \tfrac{1}{2}\, W(\boldsymbol{\omega}_B)\, \mathbf{q}_{BW} \end{cases} \tag{1}`,
      ],
    },
    {
      paragraphs: [
        r`Here $g$ is gravity, $\mathbf{z}_W$ and $\mathbf{z}_B$ are the z-axis unit vectors in the world and body frames, $k_{\text{th}}$ is the thrust coefficient, $m_{\text{dr}}$ is the drone mass, and $W(\boldsymbol{\omega}_B)$ is the quaternion-multiplication matrix for $\boldsymbol{\omega}_B$. ACADOS integrates these dynamics forward during data synthesis to simulate the expert trajectories.`,
      ],
    },
    {
      heading: "Training the visuomotor policy",
      paragraphs: [
        r`The policy $\pi$ is trained end-to-end with imitation learning on the synthetic dataset. Its inputs are the processed semantic-segmentation images $I_k^{\text{proc}}$, the language-query embeddings, and inertial and other sensor data; its outputs are the control commands $\mathbf{u}_k = (f_{\text{th}}, \boldsymbol{\omega}_B)$. Training minimizes the error between the predicted commands and the expert MPC commands:`,
      ],
      equations: [
        r`\min_{\theta} \sum_{(I, \mathbf{x}, \mathbf{u}) \in \mathcal{D}} \left\lVert \pi_\theta(I, \mathbf{x}) - \mathbf{u} \right\rVert^2,`,
      ],
    },
    {
      paragraphs: [
        r`where $\theta$ are the policy parameters and $\mathcal{D} = \{ (I_k^{\text{proc}}, \mathbf{x}_k, \mathbf{u}_k) \}_{k=1}^{K}$ is the expert dataset.`,
      ],
    },
    {
      heading: "Runtime onboard deployment",
      paragraphs: [
        r`At runtime the drone uses onboard sensors only. The monocular camera captures an image $I_t$, which CLIPSeg segments using the natural-language query to produce $I_t^{\text{proc}}$. The policy $\pi$ takes $I_t^{\text{proc}}$ together with the sensor data and outputs control commands that drive the drone toward the semantic target. The whole method runs in real time onboard, without external pose estimation or maps.`,
      ],
    },
    {
      heading: "Algorithm outline",
      paragraphs: [
        r`**Offline stage (training-data generation):**`,
      ],
      list: [
        r`Build the semantic 3DGS environment.`,
        r`Identify the semantic object centroids $\mathbf{q}_o$.`,
        r`Generate RRT* trajectories $\mathcal{T} = (V, E)$ from each semantic goal outward to the environment boundaries.`,
        r`Simulate the drone flying the inverted trajectories with the MPC expert (using ACADOS).`,
        r`Collect the expert data $\{ I_k^{\text{proc}}, \mathbf{x}_k, \mathbf{u}_k \}$.`,
        r`Train the visuomotor policy $\pi$ with imitation learning.`,
      ],
    },
    {
      paragraphs: [
        r`**Online stage (deployment):** take a natural-language query, capture an onboard image $I_t$ and segment it with CLIPSeg, feed the segmentation and sensor data to $\pi$, obtain the control $\mathbf{u}_t$, and apply it to fly toward the semantic target.`,
      ],
    },
    {
      heading: "Mathematical summary",
      paragraphs: [
        r`State and control: $\mathbf{x} = (\mathbf{p}_W, \mathbf{v}_W, \mathbf{q}_{BW})$ and $\mathbf{u} = (f_{\text{th}}, \boldsymbol{\omega}_B)$. The dynamics are given by Equation 1 above. Semantic queries map to space through the field $f : \mathbb{R}^3 \rightarrow \mathbb{R}^l$, which sends 3D points to semantic embeddings. The expert dataset is $\mathcal{D} = \{ (I_k^{\text{proc}}, \mathbf{x}_k, \mathbf{u}_k) \}_{k=1}^{K}$, the policy is $\pi : (I^{\text{proc}}, \text{sensors}) \rightarrow \mathbf{u}$, and it is trained by minimizing $\sum_{(I, \mathbf{x}, \mathbf{u}) \in \mathcal{D}} \lVert \pi_\theta(I, \mathbf{x}) - \mathbf{u} \rVert^2$.`,
      ],
    },
    {
      heading: "Key vocabulary",
      definitions: [
        { term: "Vision-language navigation", definition: r`Navigating to a goal specified in natural language by grounding the instruction in visual observations.` },
        { term: "Zero-shot generalization", definition: r`Performing tasks in environments and on queries never seen during training, with no additional fine-tuning.` },
        { term: "Gaussian Splatting (3DGS)", definition: r`A photorealistic volumetric rendering technique that represents a scene as a sparse set of 3D Gaussian primitives.` },
        { term: "Semantic field", definition: r`A learned function mapping each 3D point to a language-compatible embedding, here distilled from CLIP.` },
        { term: "CLIPSeg", definition: r`An open-vocabulary segmentation model that produces a semantic mask of an image from a text query.` },
        { term: "RRT / RRT*", definition: r`Sampling-based path planners; RRT* additionally rewires the tree to produce asymptotically optimal, shorter paths.` },
        { term: "Time-inverted planning", definition: r`Growing the tree outward from the goal, then flying the branches in reverse so trajectories approach the goal from many directions.` },
        { term: "Model Predictive Control (MPC)", definition: r`A controller that repeatedly optimizes control inputs over a finite horizon; here the expert that tracks the planned trajectories.` },
        { term: "Imitation learning", definition: r`Training a policy to reproduce an expert's actions from recorded observation-action pairs.` },
        { term: "Domain randomization", definition: r`Varying simulation parameters and conditions during data generation so the learned policy transfers robustly to reality.` },
      ],
    },
  ],
};
