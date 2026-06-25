import type { Paper } from "@/lib/literature";

// `String.raw` lets us write LaTeX (and inline `$...$` math) without escaping
// every backslash. Avoid any literal "${" sequence inside these templates.
const r = String.raw;

export const phys2real: Paper = {
  slug: "phys2real",
  title:
    "Phys2Real: Fusing VLM Priors with Interactive Online Adaptation for Uncertainty-Aware Sim-to-Real Manipulation",
  authors:
    "Maggie Wang, Stephen Tian, Aiden Swann, Ola Shorinwa, Jiajun Wu, Mac Schwager",
  year: "2026",
  venue: "ICRA 2026",
  summary:
    "Trains manipulation policies in simulation and adapts them to the real world by fusing a vision-language-model prior on an object's physical properties with interaction-based estimates, weighted by their uncertainty.",
  citation: `@inproceedings{wang2026phys2real,
  title     = {Phys2Real: Fusing VLM Priors with Interactive Online Adaptation for Uncertainty-Aware Sim-to-Real Manipulation},
  author    = {Wang, Maggie and Tian, Stephen and Swann, Aiden and Shorinwa, Ola and Wu, Jiajun and Schwager, Mac},
  booktitle = {IEEE International Conference on Robotics and Automation (ICRA)},
  year      = {2026}
}`,
  sections: [
    {
      paragraphs: [
        r`Phys2Real is a method for training robot manipulation policies in simulation and then adapting them to work better in the real world. It does this by combining a visual prior from a vision-language model (VLM) with physical evidence gathered through robot interaction.`,
        r`In short, the robot makes an educated guess about an object's physical properties from images, and then improves that guess by observing how the object actually moves when pushed. Vision provides a useful starting estimate, while interaction provides physical grounding, and the two are merged according to how uncertain each one is.`,
      ],
    },
    {
      heading: "Why physical properties matter",
      paragraphs: [
        r`For manipulation, small physical differences can have large effects. The properties that matter most include friction, mass, center of mass, stiffness, and mass distribution.`,
        r`For example, two objects can look almost identical yet rotate very differently when pushed, because one is heavier on one side. Knowing the center of mass therefore changes how a robot should push to translate or rotate the object accurately.`,
      ],
    },
    {
      heading: "Architecture overview",
      paragraphs: [
        r`Phys2Real is organized as a three-stage real-to-sim-to-real pipeline: $\text{real object} \rightarrow \text{simulation model and policy training} \rightarrow \text{real-world adaptive control}$. The architecture has three major blocks: real-to-sim reconstruction, robot policy learning in simulation, and sim-to-real transfer with uncertainty-aware adaptation.`,
        r`The key design choice is that the robot policy is conditioned on an *explicit* physical parameter, such as the center of mass, rather than on an uninterpretable learned latent vector. Making the parameter interpretable is what allows a visual estimate and an interaction-based estimate of the *same* quantity to be combined.`,
      ],
    },
    {
      heading: "Stage 1: Real-to-sim reconstruction",
      paragraphs: [
        r`The first stage builds a simulation-ready digital twin of the real object. The pipeline is $\text{video} \rightarrow \text{segmentation} \rightarrow \text{Gaussian Splat} \rightarrow \text{surface mesh} \rightarrow \text{watertight simulation asset}$.`,
        r`**Step 1: Capture images.** The authors record a video of the object from multiple viewpoints and extract individual frames, since a single image does not reveal the full 3D geometry.`,
        r`**Step 2: Segment with SAM-2.** The object is separated from the background using SAM-2, producing a per-pixel mask $M_t(u,v) \in \{0, 1\}$, where $M_t(u,v) = 1$ means the pixel belongs to the object and $M_t(u,v) = 0$ means it belongs to the background. This keeps the reconstruction focused on the object rather than the whole room.`,
        r`**Step 3: Train a 3D Gaussian Splat.** The segmented images reconstruct an object-centric 3D Gaussian Splat (3DGS), a visually accurate, geometrically faithful representation. Each Gaussian primitive is $\mathcal{G}_i = \left( \boldsymbol{\mu}_i, \boldsymbol{\Sigma}_i, \alpha_i, \mathbf{c}_i \right)$, where $\boldsymbol{\mu}_i$ is its 3D center, $\boldsymbol{\Sigma}_i$ its shape and orientation, $\alpha_i$ its opacity, and $\mathbf{c}_i$ its appearance.`,
        r`**Step 4: Extract a surface mesh with SuGaR.** SuGaR (Surface-Aligned Gaussian Splatting) extracts a mesh $\mathcal{M} = (V, F)$ from the Gaussians, where $V$ is the set of vertices and $F$ the set of triangular faces.`,
        r`**Step 5: Make it watertight.** A watertight mesh has no gaps or holes, which the physics simulator needs in order to determine collision geometry, enclosed volume, contact points, and approximate mass properties. The authors mirror the object across a symmetry plane and apply Marching Cubes to obtain a clean closed mesh. This works well for approximately symmetric objects such as the T-block and the hammer, but it can distort strongly asymmetric objects.`,
      ],
    },
    {
      heading: "Stage 2: Physics-conditioned policy learning",
      paragraphs: [
        r`The second stage trains the manipulation policy in simulation. It is based on Rapid Motor Adaptation (RMA) but with one important modification. Standard RMA learns a latent vector $\mathbf{z}$ that summarizes hidden environmental properties, whereas Phys2Real instead predicts an *interpretable* physical parameter $\boldsymbol{\theta}$, such as center of mass or friction. This matters precisely because a VLM can estimate the same physical quantity.`,
        r`The policy can be written as`,
      ],
      equations: [
        r`\mathbf{a}_t = \pi\!\left( \mathbf{o}_t, \hat{\boldsymbol{\theta}}_t \right),`,
      ],
    },
    {
      paragraphs: [
        r`where $\mathbf{o}_t$ is the current observation, $\hat{\boldsymbol{\theta}}_t$ is the estimated physical parameter, and $\mathbf{a}_t$ is the robot action. In the experiments the observation includes the object pose, the end-effector position, and the estimated center of mass, and the actions are changes in the end-effector's planar position. This differs from standard domain randomization, where a single policy is trained to tolerate many possible physical conditions without being told which one currently holds. Phys2Real instead hands the policy its best current estimate of the object's physics, so it can choose behavior suited specifically to that object.`,
      ],
    },
    {
      heading: "The three policy-training phases",
      paragraphs: [
        r`**Phase 1: train with ground-truth physics.** In simulation the true parameter is known, so the policy is trained as $\mathbf{a}_t = \pi\!\left( \mathbf{o}_t, \boldsymbol{\theta}_{\text{gt}} \right)$, where $\boldsymbol{\theta}_{\text{gt}}$ is the ground-truth center of mass (or other property). This teaches the policy distinct behaviors for different physical configurations. For instance, if the center of mass is near the top of a T-block the object rotates more strongly when pushed, and the policy can learn to compensate.`,
        r`**Phase 1.5: fine-tune with noisy parameters.** At deployment the estimate will not be exact, so the authors optionally fine-tune the policy with noisy parameters $\tilde{\boldsymbol{\theta}} = \boldsymbol{\theta}_{\text{gt}} + \boldsymbol{\epsilon}$, where $\boldsymbol{\epsilon} \sim \mathcal{N}\!\left( \mathbf{0}, \sigma^2 \mathbf{I} \right)$. They use Gaussian noise of roughly $\sigma = 1.5\text{ cm}$ for the main policy fine-tuning, which makes the policy less brittle when the estimated center of mass is slightly wrong.`,
        r`**Phase 2: train the adaptation models.** The policy weights are frozen, and an adaptation model learns to infer the physical parameter from a recent window of observations and actions, $\mathcal{H}_t = \{ \mathbf{o}_{t-H+1}, \mathbf{a}_{t-H+1}, \dots, \mathbf{o}_t, \mathbf{a}_{t-1} \}$, with a sliding window of $H = 10$. It predicts $\hat{\boldsymbol{\theta}}_{\text{rma}} = f_{\text{adapt}}(\mathcal{H}_t)$. Rather than a single model, Phys2Real trains an ensemble of $M = 10$ adaptation models, which is what later enables an uncertainty estimate.`,
      ],
    },
    {
      heading: "Reinforcement learning method",
      paragraphs: [
        r`The policy is trained with Proximal Policy Optimization (PPO), which updates the policy while preventing excessively large changes between iterations. A common form of the PPO objective is`,
      ],
      equations: [
        r`L^{\text{PPO}}(\phi) = \mathbb{E}_t\!\left[ \min\!\left( r_t(\phi)\,\hat{A}_t,\; \operatorname{clip}\!\left( r_t(\phi),\, 1-\epsilon,\, 1+\epsilon \right) \hat{A}_t \right) \right],`,
      ],
    },
    {
      paragraphs: [
        r`where $\phi$ are the policy parameters, $r_t(\phi)$ is the ratio between the new and old action probabilities, $\hat{A}_t$ is the estimated advantage, and $\epsilon$ limits the size of the update. Training uses 4096 parallel simulation environments in IsaacLab with an asymmetric actor-critic architecture.`,
        r`In an asymmetric actor-critic, the actor chooses actions from only the information available at deployment, $\mathbf{a}_t = \pi_{\text{actor}}\!\left( \mathbf{o}_t^{\text{deploy}} \right)$, while the critic may use privileged simulation information such as exact object velocity or full state, $V_t = V_{\text{critic}}\!\left( \mathbf{o}_t^{\text{privileged}} \right)$, to improve value estimation during training. The critic is discarded at deployment.`,
      ],
    },
    {
      heading: "The VLM physical prior",
      paragraphs: [
        r`Before any interaction, a vision-language model estimates the physical parameter from images. In the experiments this parameter is the center of mass along one axis, with the object coordinate normalized so that $-1$ is the bottom edge, $0$ is the midpoint, and $+1$ is the top edge.`,
        r`The VLM is asked to provide both an estimate $\theta_{\text{vlm}}$ and an uncertainty $\sigma_{\text{vlm}}$. This estimate is called a *prior* because it is available before the robot physically interacts with the object. The system queries $V$ images from different viewpoints with $Q$ repeated queries per image, and aggregates them as`,
      ],
      equations: [
        r`\theta_{\text{vlm}} = \frac{1}{VQ} \sum_{i=1}^{V} \sum_{j=1}^{Q} \theta_{i,j}.`,
      ],
    },
    {
      paragraphs: [
        r`The uncertainty is taken as the average of the VLM's *reported* uncertainty values. The authors found that simply measuring the spread of repeated answers can be misleading, because a VLM can be consistently wrong, so a low spread does not guarantee a correct estimate.`,
      ],
    },
    {
      heading: "Interaction-based estimation",
      paragraphs: [
        r`During real-world execution the robot uses its action-observation history to estimate the same physical parameter. Each adaptation model $i$ predicts a mean $\theta_i$, and the ensemble estimate is their average, $\theta_{\text{rma}} = \tfrac{1}{M} \sum_{i=1}^{M} \theta_i$. The method also produces two kinds of uncertainty.`,
        r`**Epistemic uncertainty** captures uncertainty in the learned model and is measured by disagreement among the ensemble members:`,
      ],
      equations: [
        r`\sigma_{\text{epistemic}}^2 = \frac{1}{M} \sum_{i=1}^{M} \left( \theta_i - \theta_{\text{rma}} \right)^2. \tag{1}`,
      ],
    },
    {
      paragraphs: [
        r`If the models disagree strongly, the interaction history is unfamiliar or uninformative. Epistemic uncertainty can, in principle, fall with more informative interaction or training data.`,
        r`**Aleatoric uncertainty** captures noise or ambiguity inherent in the observation process. Each ensemble model outputs its own predicted variance $\sigma_i^2$, and the average is`,
      ],
      equations: [
        r`\sigma_{\text{aleatoric}}^2 = \frac{1}{M} \sum_{i=1}^{M} \sigma_i^2. \tag{2}`,
      ],
    },
    {
      paragraphs: [
        r`The models are trained with a Gaussian negative log-likelihood loss; for a predicted mean $\mu$, variance $\sigma^2$, and target $\theta$, it has the form`,
      ],
      equations: [
        r`\mathcal{L}_{\text{NLL}} = \frac{1}{2} \log \sigma^2 + \frac{(\theta - \mu)^2}{2 \sigma^2},`,
      ],
    },
    {
      paragraphs: [
        r`which rewards accurate predictions while penalizing unjustified confidence. The total interaction uncertainty is the sum of the two components:`,
      ],
      equations: [
        r`\sigma_{\text{rma}}^2 = \sigma_{\text{epistemic}}^2 + \sigma_{\text{aleatoric}}^2. \tag{3}`,
      ],
    },
    {
      paragraphs: [
        r`The main weakness of the interaction estimate is that early interaction data may be limited or uninformative: before meaningful contact, $\theta_{\text{rma}}$ can be highly uncertain.`,
      ],
    },
    {
      heading: "Uncertainty-aware fusion",
      paragraphs: [
        r`Phys2Real combines the two estimates according to their uncertainty. The intuition is simple: trust vision more when interaction evidence is weak, and trust interaction more once the robot has gathered useful physical evidence. The fused estimate uses inverse-variance weighting:`,
      ],
      equations: [
        r`\hat{\theta} = \frac{ \theta_{\text{vlm}}/\sigma_{\text{vlm}}^2 + \theta_{\text{rma}}/\sigma_{\text{rma}}^2 }{ 1/\sigma_{\text{vlm}}^2 + 1/\sigma_{\text{rma}}^2 }. \tag{4}`,
      ],
    },
    {
      paragraphs: [
        r`A smaller variance means greater confidence, so that estimate receives more weight. Equivalently, $\hat{\theta} = w_{\text{vlm}}\,\theta_{\text{vlm}} + w_{\text{rma}}\,\theta_{\text{rma}}$, with`,
      ],
      equations: [
        r`w_{\text{vlm}} = \frac{ 1/\sigma_{\text{vlm}}^2 }{ 1/\sigma_{\text{vlm}}^2 + 1/\sigma_{\text{rma}}^2 }, \qquad w_{\text{rma}} = \frac{ 1/\sigma_{\text{rma}}^2 }{ 1/\sigma_{\text{vlm}}^2 + 1/\sigma_{\text{rma}}^2 }, \qquad w_{\text{vlm}} + w_{\text{rma}} = 1.`,
      ],
    },
    {
      paragraphs: [
        r`When interaction uncertainty is large, $\sigma_{\text{rma}}^2 \gg \sigma_{\text{vlm}}^2$, so $w_{\text{vlm}} \approx 1$ and the system trusts vision. When interaction becomes reliable, $\sigma_{\text{rma}}^2 \ll \sigma_{\text{vlm}}^2$, so $w_{\text{rma}} \approx 1$ and the system trusts physical interaction.`,
        r`As a worked example, suppose $\theta_{\text{vlm}} = 4$ with $\sigma_{\text{vlm}} = 1$, and $\theta_{\text{rma}} = 6$ with $\sigma_{\text{rma}} = 3$. The VLM is more confident because its uncertainty is smaller, so the fused estimate stays closer to $4$. Later, after useful interaction lowers $\sigma_{\text{rma}}$, the fused estimate moves toward the interaction-based value.`,
      ],
    },
    {
      heading: "Closed-loop deployment",
      paragraphs: [
        r`At each real-world time step Phys2Real runs the loop $\text{observe} \rightarrow \text{update interaction history} \rightarrow \text{estimate physics} \rightarrow \text{fuse with VLM prior} \rightarrow \text{condition policy} \rightarrow \text{act}$.`,
      ],
      list: [
        r`The robot observes the object and its own state.`,
        r`The adaptation ensemble estimates $\theta_{\text{rma}}$ and $\sigma_{\text{rma}}$.`,
        r`These are fused with the VLM's $\theta_{\text{vlm}}$ and $\sigma_{\text{vlm}}$.`,
        r`The fused value $\hat{\theta}$ is passed to the policy.`,
        r`The policy produces the next robot action.`,
        r`The new interaction provides additional evidence for the next step.`,
      ],
    },
    {
      paragraphs: [
        r`This is closed-loop control: the actions change the environment, and the resulting observations influence future actions.`,
      ],
    },
    {
      heading: "Why the architecture is effective",
      paragraphs: [
        r`Each component covers a different weakness. The VLM is useful before contact but can be visually biased. The adaptation model is physically grounded but unreliable early in a task or during periods without contact. The policy knows how to behave for different physical parameters but needs a good estimate of which one applies. The fusion mechanism ties them together: $\text{visual guess} + \text{interaction evidence} + \text{uncertainty} \rightarrow \text{adaptive control}$.`,
        r`Empirically, early in an episode the interaction estimate has high uncertainty; as contact continues, its uncertainty falls and the fused center-of-mass estimate moves toward the ground truth; and when contact stops, the uncertainty rises again.`,
      ],
    },
    {
      heading: "Experiments and results",
      paragraphs: [
        r`The authors evaluate planar pushing on a T-shaped block with weights placed in different positions, and a hammer with an off-center mass distribution. Changing the weight position changes the center of mass and therefore how the object rotates and translates when pushed. They compare Phys2Real against domain randomization.`,
      ],
      list: [
        r`T-block, weight near the bottom: Phys2Real succeeds 100% of the time, versus 79% for domain randomization.`,
        r`T-block, weight near the top (the harder configuration): Phys2Real 57%, versus 23% for domain randomization.`,
        r`Hammer pushing: both methods reach 100% success, but Phys2Real completes the task roughly 15% faster.`,
      ],
    },
    {
      paragraphs: [
        r`These results suggest that knowing the object's physical properties helps the robot push more accurately and efficiently.`,
        r`The ablation study, which removes one component at a time, shows that fusing vision and interaction is essential. In the difficult T-block case, the VLM-only variant did poorly because its visual estimate was biased, the interaction-only variant did poorly because early interaction data was uncertain, and the fused system did much better because each source compensated for the other's failure mode.`,
      ],
    },
    {
      heading: "The method in compact form",
      paragraphs: [
        r`The central contribution is not a single network but a structured combination of reconstruction, reinforcement learning, explicit physical estimation, ensemble uncertainty, and online sensor fusion. Reconstruction produces a simulation asset, $\text{images} \rightarrow \text{segmentation} \rightarrow \text{GSplat} \rightarrow \text{mesh}$; the policy is trained on ground-truth physics, $\mathbf{a}_t = \pi(\mathbf{o}_t, \boldsymbol{\theta}_{\text{gt}})$; interaction yields an estimate $\theta_{\text{rma}} = \tfrac{1}{M}\sum_{i=1}^{M} \theta_i$ with uncertainty $\sigma_{\text{rma}}^2 = \sigma_{\text{epistemic}}^2 + \sigma_{\text{aleatoric}}^2$; this is fused with the VLM prior via inverse-variance weighting to give $\hat{\theta}$; and the deployed action is $\mathbf{a}_t = \pi(\mathbf{o}_t, \hat{\theta}_t)$. The overall message is that a robot should reason about physics in two stages, $\text{look first} \rightarrow \text{interact and correct}$.`,
      ],
    },
    {
      heading: "Key vocabulary",
      definitions: [
        { term: "Sim-to-real", definition: r`Training in simulation and transferring the learned behavior to a physical robot.` },
        { term: "VLM prior", definition: r`An initial physical estimate produced by a vision-language model before interaction.` },
        { term: "Online adaptation", definition: r`Updating the system during real-world operation using newly collected data.` },
        { term: "Center of mass", definition: r`The effective point where an object's mass is concentrated; it strongly affects how the object rotates when pushed.` },
        { term: "Domain randomization", definition: r`Training across many randomized simulation settings so the policy becomes broadly robust.` },
        { term: "Uncertainty quantification", definition: r`Estimating not just a prediction but also how reliable that prediction is.` },
        { term: "Epistemic vs. aleatoric uncertainty", definition: r`Uncertainty due to the model (reducible with more data) versus uncertainty inherent in the observations (irreducible noise).` },
        { term: "Digital twin", definition: r`A simulated representation of a real object or environment.` },
        { term: "Reinforcement learning", definition: r`A learning method in which a policy improves by receiving rewards for successful actions.` },
        { term: "Inverse-variance weighting", definition: r`Combining estimates so that each is weighted by its precision (one over its variance), giving more confident estimates more influence.` },
      ],
    },
  ],
};
