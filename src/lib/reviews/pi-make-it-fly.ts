import type { Paper } from "@/lib/literature";

// `String.raw` lets us write LaTeX (and inline `$...$` math) without escaping
// every backslash. Avoid any literal "${" sequence inside these templates.
const r = String.raw;

export const piMakeItFly: Paper = {
  slug: "pi-make-it-fly",
  title: "π, But Make It Fly: Physics-Guided Transfer of VLA Models to Aerial Manipulation",
  authors:
    "Johnathan Tucker, Denis Liu, Aiden Swann, Allen Ren, Javier Yu, Jiankai Sun, Brandon Kim, Lachlain McGranahan, Quan Vuong, Mac Schwager",
  year: "2026",
  venue: "arXiv:2603.25038",
  summary:
    "AirVLA adapts the pretrained π0 vision-language-action model to control a flying gripper, showing that visual and manipulation knowledge transfers but flight dynamics do not, and closing the gap with physics-guided inference, real-time action smoothing, and synthetic Gaussian-Splatting navigation data.",
  citation: r`@misc{tucker2026pimakeflyphysicsguided,
  title={$\pi$, But Make It Fly: Physics-Guided Transfer of VLA Models to Aerial Manipulation},
  author={Johnathan Tucker and Denis Liu and Aiden Swann and Allen Ren and Javier Yu and Jiankai Sun and Brandon Kim and Lachlain McGranahan and Quan Vuong and Mac Schwager},
  year={2026},
  eprint={2603.25038},
  archivePrefix={arXiv},
  primaryClass={cs.RO},
  url={https://arxiv.org/abs/2603.25038}
}`,
  sections: [
    {
      paragraphs: [
        r`This paper introduces AirVLA, a system that adapts a pretrained vision-language-action model called π0 to control a flying robot with a gripper. The central question is whether a policy trained mostly on fixed-base robot arms can be transferred to a drone that must fly, navigate, grasp, carry, and respond to natural-language instructions.`,
        r`The answer is: partly. The visual and manipulation knowledge transfers, but the flight dynamics do not transfer automatically. To make the system work, the authors add physics-aware guidance, real-time action smoothing, and synthetic navigation data generated with Gaussian Splatting.`,
      ],
    },
    {
      heading: "The main problem",
      paragraphs: [
        r`A vision-language-action model (VLA) takes camera images, a natural-language instruction, and robot-state information, and produces robot actions. For example, given "pick up the toy and place it in the blue bin," a fixed-base arm can execute the task while its base stays still.`,
        r`A drone is much harder, because it must simultaneously stay airborne, stabilize itself, move through space, avoid obstacles, operate a gripper, respond to payload changes, and complete the manipulation task. A small action error on a fixed arm causes a minor position error; the same error in flight can cause altitude loss, oscillation, a collision, a dropped object, or a crash. The paper calls this mismatch the *dynamics gap*.`,
      ],
    },
    {
      heading: "What transfers and what does not",
      paragraphs: [
        r`Fine-tuning π0 on drone demonstrations shows that some capabilities transfer surprisingly well: the model reuses visual features, object recognition, language understanding, coarse grasping behavior, and some manipulation structure. What does not transfer automatically is underactuated flight, payload-induced altitude loss, stable hovering, and precise obstacle navigation.`,
        r`In other words, the model understands "move toward the object and grasp it," but it does not reliably understand "while grasping it, compensate for the added mass so the drone does not sink." That second requirement needs explicit physics-aware intervention. This is itself an interesting result: large VLA models learn reusable manipulation knowledge even when the robot embodiment is very different, yet their action generation does not respect aerial physics. π0 was pretrained on conventional, mostly *quasi-static* platforms, where motion is slow enough that inertia and instability are limited; a drone instead has thrust coupled to orientation, is underactuated, constantly fights gravity, and changes its dynamics whenever it carries an object. Direct fine-tuning alone is therefore insufficient.`,
      ],
    },
    {
      heading: "End-to-end architecture",
      paragraphs: [
        r`AirVLA is five connected parts: $\text{multimodal observations} \rightarrow \pi_0 \rightarrow \text{action chunk} \rightarrow \text{physics-guided correction} \rightarrow \text{flight controller}$. A parallel data-generation pipeline supplies synthetic navigation data during training.`,
      ],
    },
    {
      heading: "Hardware",
      paragraphs: [
        r`The aerial robot is a ModalAI Starling 2 Max quadrotor with a custom lightweight gripper, one external camera, one forward-facing and one downward-facing onboard camera, a PX4 flight controller, and a motion-capture system for pose estimation. The drone is treated as a *flying end-effector*: rather than moving a stationary arm's end-effector, the whole drone body carries the gripper through space.`,
        r`The gripper hangs below the drone and is lightweight, inexpensive, and 3D printed, with an appearance similar to the UMI gripper used in some manipulation datasets. That visual similarity may aid transfer, since the pretrained model has seen related gripper geometries.`,
      ],
    },
    {
      heading: "Inputs to the policy",
      paragraphs: [
        r`The VLA receives three kinds of input. **Visual:** three RGB views (external, forward, downward), each resized to $256 \times 256$. The external camera shows the drone and scene globally, the forward camera helps navigation, and the downward camera helps grasping and placing. **Language:** a natural-language instruction such as "pick up the stuffed animal and put it in the blue bin," which tells the model what to do. **Proprioception:** the robot's internal state, including estimated drone pose, gripper aperture, and possibly recent state. Together the full observation is written $o$.`,
      ],
    },
    {
      heading: "Output action representation",
      paragraphs: [
        r`The model produces an action chunk $A \in \mathbb{R}^{H \times D}$, where $H$ is the number of future time steps and $D$ the number of action dimensions. The dimensions are relative $x$, $y$, and $z$ motion, yaw change, and a gripper command. Actions execute at $10\text{ Hz}$, so the policy predicts several future control commands at once rather than one isolated action.`,
      ],
    },
    {
      heading: "The π0 flow-matching policy",
      paragraphs: [
        r`π0 is a flow-matching generative policy: instead of directly predicting one deterministic chunk, it starts from random noise and gradually transforms it into a meaningful action sequence. The latent action chunk is $x_\tau \in \mathbb{R}^{H \times D}$, where $\tau \in [0,1]$ is an artificial flow time. Sampling begins from Gaussian noise $x_0 \sim \mathcal{N}(0, I)$, and the model defines a velocity field $v_\theta(x_\tau, o, \tau)$ along which the latent evolves:`,
      ],
      equations: [
        r`\frac{dx_\tau}{d\tau} = v_\theta(x_\tau, o, \tau). \tag{1}`,
      ],
    },
    {
      paragraphs: [
        r`Integrating from $\tau = 0$ to $\tau = 1$ gives the final action chunk $A = x_1$. Intuitively, the model begins with a meaningless sequence of random actions and repeatedly reshapes it into a plausible trajectory conditioned on the images, the language instruction, and the robot state.`,
      ],
    },
    {
      heading: "Why action chunking causes a problem",
      paragraphs: [
        r`Generating chunks is efficient but can create discontinuities. If the robot executes chunk $A^{(1)}$ and then receives a new chunk $A^{(2)}$, the first action of $A^{(2)}$ may not smoothly continue from the last action of $A^{(1)}$. For an arm this causes a jerk; for a drone it can cause abrupt acceleration, altitude instability, oscillation, or a collision.`,
      ],
    },
    {
      heading: "Real-Time Chunking (RTC)",
      paragraphs: [
        r`The authors use Real-Time Chunking (RTC) to avoid hard boundaries between chunks. When a new chunk is generated, the near-term actions already committed are preserved and only the later part is regenerated, conceptually $\text{old committed prefix} + \text{newly generated suffix}$. A soft temporal mask sets how strongly each part is preserved: near-term actions get strong continuity constraints while later actions stay flexible. RTC also lets inference and execution overlap, reducing pauses while the next sequence is generated.`,
      ],
    },
    {
      heading: "Physics-aware guidance",
      paragraphs: [
        r`This is the main technical contribution. The authors modify the sampling dynamics with a guidance loss $\Phi(A; o)$, seeking an action chunk that is both likely under the VLA policy and physically appropriate for flight. The guided action distribution is`,
      ],
      equations: [
        r`p_{\text{guid}}(A \mid o) \propto p_\theta(A \mid o)\, \exp\!\left( -\Phi(A; o) \right), \tag{2}`,
      ],
    },
    {
      paragraphs: [
        r`where $p_\theta(A \mid o)$ is the original policy distribution and $\Phi$ penalizes physically undesirable actions, so a low loss means a more physically suitable action.`,
      ],
    },
    {
      heading: "The guided velocity field",
      paragraphs: [
        r`During flow sampling the model predicts a final action chunk $\hat{A}_\theta(x_\tau, o, \tau)$. The system computes the guidance-loss gradient $\nabla_A \Phi(\hat{A}_\theta; o)$, which tells the sampler how the action should change to reduce the loss, and maps it back into latent space with a vector-Jacobian product, $\xi = \left( \nabla_{x_\tau} \hat{A}_\theta \right)^{\!T} \nabla_A \Phi$. The guided flow becomes`,
      ],
      equations: [
        r`v_{\text{guid}} = v_\theta + s(\tau)\, \xi, \tag{3}`,
      ],
    },
    {
      paragraphs: [
        r`where $v_\theta$ is the original flow, $\xi$ the correction direction, and $s(\tau)$ controls guidance strength. The pretrained model proposes a likely action, and the physics guidance gently steers that proposal toward a safer, more feasible one. The model is not replaced; it is steered.`,
      ],
    },
    {
      heading: "General tracking guidance",
      paragraphs: [
        r`The authors first define a general trajectory-tracking loss:`,
      ],
      equations: [
        r`\Phi_{\text{track}}(A; o) = \frac{1}{2} \sum_{t=0}^{H-1} \sum_{d=1}^{D} \lambda_d\, w_t \left( A_{t,d} - A^{\text{des}}_{t,d}(o) \right)^2, \tag{4}`,
      ],
    },
    {
      paragraphs: [
        r`where $A_{t,d}$ is the proposed action, $A^{\text{des}}_{t,d}$ the desired reference, $\lambda_d$ the per-dimension strength, and $w_t$ a per-time weight. Its gradient,`,
      ],
      equations: [
        r`\frac{\partial \Phi_{\text{track}}}{\partial A_{t,d}} = \lambda_d\, w_t \left( A_{t,d} - A^{\text{des}}_{t,d}(o) \right), \tag{5}`,
      ],
    },
    {
      paragraphs: [
        r`pulls the proposed action toward the reference. RTC uses exactly this idea to preserve continuity.`,
      ],
    },
    {
      heading: "Payload-aware vertical guidance",
      paragraphs: [
        r`The main disturbance during grasping is vertical sag. Picking up an object changes the effective mass to $m_{\text{effective}} = m_{\text{drone}} + m_{\text{payload}}$, so the same thrust produces less upward acceleration and the drone may descend unexpectedly. The authors define a payload guidance loss:`,
      ],
      equations: [
        r`\Phi_{\text{payload}} = \frac{\lambda_z}{2}\, \alpha(o, A_{t-1}) \sum_{t=0}^{H-1} w_t \left( z_t(A) - z_{\text{des}}(o) \right)^2, \tag{6}`,
      ],
    },
    {
      paragraphs: [
        r`where $\lambda_z$ is the guidance strength, $\alpha$ is the confidence that a payload is held, $z_t(A)$ is the predicted vertical action, and $z_{\text{des}}$ is the preferred altitude. That altitude is set slightly above the current one to pre-compensate for sag:`,
      ],
      equations: [
        r`z_{\text{des}}(o) = z_{\text{curr}}(o) + \Delta z, \tag{7}`,
      ],
    },
    {
      paragraphs: [
        r`with $\Delta z = 0.15\text{ m}$ in the experiments. This correction improves pick-and-place success from roughly 23% to 50%, and crucially the model weights are not retrained: the adjustment happens during action sampling.`,
      ],
    },
    {
      heading: "How the system detects a payload",
      paragraphs: [
        r`The drone does not weigh the object; it estimates payload presence from recent gripper commands and the current gripper aperture. Let $u_t \in [-1, 1]$ be the gripper command, where $+1$ means close. The system averages recent commands to estimate closing or opening intent and also measures how open or closed the gripper actually is. These combine into a confidence $\alpha(o, A_{t-1}) \in [0, 1]$. When $\alpha \approx 0$ the system assumes nothing is carried and disables payload guidance; when $\alpha \approx 1$ it strongly applies upward compensation. This is a heuristic, but it works as a simple payload detector.`,
        r`Inserting the guidance *inside* the sampler, rather than adding an altitude correction after the fact, keeps the correction integrated with the structure of the VLA-generated trajectory, so the final action still resembles a plausible policy action while being biased toward physical feasibility.`,
      ],
    },
    {
      heading: "The Gaussian-Splat synthetic-data pipeline",
      paragraphs: [
        r`The second major contribution is synthetic navigation data. Collecting real drone demonstrations is expensive, so the authors reconstruct the environment as a 3D Gaussian Splat, written $GS_\phi$, which can render photorealistic images from camera poses that were never explicitly captured. Given a position $p$ and orientation $q$, it renders $I = GS_\phi(p, q)$, letting the authors simulate what the drone cameras would see along new trajectories.`,
        r`Short walkthroughs recorded with the drone camera, together with their poses, are used to train the splat. It represents the static scene (gates, walls, tables, bins, and other structure), giving a visual simulator without manually building a 3D CAD model.`,
      ],
    },
    {
      heading: "Gripper segmentation and compositing",
      paragraphs: [
        r`The downward camera always sees the gripper. If the splat were trained with the gripper included, it might bake the gripper into the static environment. The authors therefore separate the $\text{background scene}$ from the $\text{gripper foreground}$, using SAM to create a gripper mask $M_{\text{grip}}$. The real gripper patch is`,
      ],
      equations: [
        r`G = I_{\text{down}} \odot M_{\text{grip}}, \tag{10}`,
      ],
    },
    {
      paragraphs: [
        r`and the synthetic downward image composites the splat background with the real gripper patch:`,
      ],
      equations: [
        r`I^{\text{synth}}_{\text{down}} = (1 - M_{\text{grip}}) \odot GS_\phi(p, q) + M_{\text{grip}} \odot G_{a(t)}, \tag{11}`,
      ],
    },
    {
      paragraphs: [
        r`so the background comes from the splat, the gripper comes from a real image patch, and the gripper appearance $G_{a(t)}$ is selected by aperture. This reduces the visual mismatch between synthetic and real images.`,
      ],
    },
    {
      heading: "Drone dynamics model",
      paragraphs: [
        r`The synthetic trajectories are not arbitrary camera paths; they come from a simplified flight model with state $x = (p^W, v^W, q^W_B)$, where $p^W$ is world position, $v^W$ world velocity, and $q^W_B$ the orientation quaternion. The dynamics are`,
      ],
      equations: [
        r`\dot{p}^W = v^W, \tag{12}`,
        r`\dot{v}^W = g\, e^W_3 + \frac{k_{\text{th}}}{m}\, f_{\text{th}}\, R(q^W_B)\, e^B_3, \tag{13}`,
        r`\dot{q}^W_B = \tfrac{1}{2}\, \Omega(\omega^B)\, q^W_B. \tag{14}`,
      ],
    },
    {
      paragraphs: [
        r`Position changes with velocity, velocity changes with gravity and thrust ($k_{\text{th}}$ the thrust coefficient, $m$ the mass, $R(q^W_B)$ the body-to-world rotation, $e^W_3$ and $e^B_3$ the z-axis unit vectors), and orientation changes with angular velocity through the quaternion operator $\Omega(\omega^B)$. The trajectories are therefore physically plausible rather than purely geometric.`,
      ],
    },
    {
      heading: "Domain randomization and recovery behavior",
      paragraphs: [
        r`The pipeline generates varied trajectories by perturbing the initial drone state, goal height, post-gate waypoint, intermediate waypoint, and approach side. For example, the hover goal is $p_{\text{goal}} = p_{\text{obj}} + [0, 0, h]^T$ with`,
      ],
      equations: [
        r`h \sim U(1.0, 1.5), \tag{15}`,
      ],
    },
    {
      paragraphs: [
        r`and the waypoint after the gate is randomized as`,
      ],
      equations: [
        r`p_{\text{after}} = p_{\text{after}}^{d} + \delta, \tag{16}`,
      ],
    },
    {
      paragraphs: [
        r`where $\delta$ lies within a small 3D ball. The system also generates trajectories near the top, bottom, left, and right of the gate, teaching the policy not only the ideal path but also how to recover from imperfect approaches.`,
      ],
    },
    {
      heading: "Training data",
      paragraphs: [
        r`The authors collect roughly 270 teleoperated demonstrations (about 120 to 150 per task grouping), totaling about 10 hours of real data, plus 50 synthetic Gaussian-Splat navigation trajectories expanded to roughly 200. The π0 model is fine-tuned for $30{,}000$ gradient steps.`,
      ],
    },
    {
      heading: "Tasks evaluated",
      list: [
        r`**Penguin grasp** ("pick up the stuffed animal and put it in the blue bin"), with pick and place stages, testing aerial manipulation.`,
        r`**Gate navigation** ("fly through the gate and hover over the stuffed animal"), with gate-pass and hover stages, testing obstacle-aware navigation.`,
        r`**Compositional task** ("fly through the gate, hover over the stuffed animal, pick it up, and put it in the blue bin"), with gate, hover, pick, and place stages. This full sequence is never directly demonstrated during training, so it tests whether the model can compose known skills.`,
      ],
    },
    {
      heading: "Main results",
      list: [
        r`**Pick-and-place (strongest method):** 100% pick success and 50% place success. Without payload guidance, RTC gets about 85% pick and 23.5% place. Naive π0 gets 50% pick and 0% place. So fine-tuning gives some grasping ability, RTC improves stability, and payload-aware guidance is essential after grasping.`,
        r`**Navigation (synthetic augmentation + RTC):** 95% gate success and 100% hover success. The synthetic data helps the policy recognize and execute gate-crossing, while RTC remains important because synthetic data alone does not fix action discontinuities.`,
        r`**Compositional task (synthetic data + payload guidance):** 85% gate, 100% hover, 94.1% pick, 62.5% place. These are conditional stage-by-stage rates, so place success is measured among trials that reached the pick stage.`,
      ],
    },
    {
      heading: "Comparison with other architectures",
      paragraphs: [
        r`Compared against ACT and Diffusion Policy, both baselines perform poorly here, scoring essentially 0% on most tasks. The authors read this as evidence that foundation-model pretraining matters, that small aerial datasets are not enough to train strong policies from scratch, and that embodiment-specific control intervention is still necessary.`,
      ],
    },
    {
      heading: "What the paper shows",
      paragraphs: [
        r`Three conclusions stand out. First, VLA representations partially transfer across extreme embodiments: a model pretrained on fixed-base manipulation still supplies useful visual features, object understanding, language grounding, and manipulation priors, which is a meaningful form of cross-embodiment transfer. Second, learned representations are not enough to solve dynamics: semantic understanding does not imply correct physical behavior, and the drone still needs explicit support for chunk continuity, payload changes, altitude compensation, and navigation recovery. Third, hybrid systems beat purely learned ones: AirVLA succeeds by combining pretrained foundation-model knowledge, supervised fine-tuning, generative action modeling, real-time chunking, physics-guided inference, classical flight control, synthetic data, Gaussian-Splat rendering, segmentation, and simplified dynamics.`,
      ],
    },
    {
      heading: "Limitations",
      list: [
        r`**Motion-capture dependence.** Localization relies on external motion capture, limiting operation to controlled environments; a more practical system would use onboard visual-inertial odometry, SLAM, or GPS.`,
        r`**Limited dataset.** With only about 270 teleoperated demonstrations, the policy can overfit to familiar object locations, gate positions, and workspace layouts.`,
        r`**Weak out-of-distribution navigation.** When the gate is moved to unfamiliar regions, performance drops sharply, with some configurations giving 0% success, so navigation is not yet broadly general.`,
        r`**Limited novel-object manipulation.** Performance varies across unseen objects (for example, relatively strong on a sandwich but very weak on a chips bag); the policy struggles when an object's geometry needs a grasp pose unlike the training object.`,
        r`**Simplified payload reasoning.** Payload detection uses gripper state and command history rather than a true mass estimate, and the vertical compensation is a tuned offset rather than a full learned physical model.`,
      ],
    },
    {
      heading: "The system in one walkthrough",
      paragraphs: [
        r`A user gives the drone a natural-language instruction. The drone observes the world through three cameras and reads its pose and gripper state, and these observations go into the fine-tuned π0 VLA. π0 starts from random action noise and uses flow matching to generate a future sequence of drone and gripper commands. RTC ensures the new sequence smoothly continues the actions already executing. If the gripper appears to hold an object, the payload module activates and adds a physics-based loss favoring slightly higher vertical commands; the gradient of this loss modifies the flow-sampling trajectory, steering the predicted chunk toward one that compensates for sag. The resulting chunk is sent as position and yaw setpoints to the PX4 flight controller, which stabilizes the drone and executes the commands. The policy then re-observes, regenerates future actions, and updates its trajectory. For navigation training, the real demonstrations are supplemented with synthetic trajectories rendered from a Gaussian-Splat reconstruction, including both nominal and corrective gate-crossing behaviors. The final system can understand the instruction, identify the target, fly through a gate, approach the object, grasp it, compensate for payload, and place it in a bin.`,
      ],
    },
    {
      heading: "Final interpretation",
      paragraphs: [
        r`The deeper message is not merely that π0 can fly a drone, but that foundation models may transfer semantic and visual knowledge across very different robots while physical dynamics still require embodiment-specific adaptation. AirVLA works because it does not ask the pretrained model to solve everything; instead it divides responsibilities:`,
      ],
      list: [
        r`$\text{VLA} \rightarrow \text{vision, language, task structure, manipulation priors}$.`,
        r`$\text{RTC} \rightarrow \text{continuous action execution}$.`,
        r`$\text{payload guidance} \rightarrow \text{flight-specific physical correction}$.`,
        r`$\text{Gaussian-Splat data} \rightarrow \text{navigation coverage and recovery examples}$.`,
        r`$\text{PX4 controller} \rightarrow \text{low-level flight stabilization}$.`,
      ],
    },
    {
      heading: "Key vocabulary",
      definitions: [
        { term: "Vision-language-action model", definition: r`A policy mapping $\text{images} + \text{text} + \text{robot state} \rightarrow \text{actions}$.` },
        { term: "Cross-embodiment transfer", definition: r`Using knowledge learned on one robot body for another.` },
        { term: "Underactuated", definition: r`Having fewer independent control inputs than degrees of freedom; a quadrotor cannot independently command every position and orientation variable at once.` },
        { term: "Quasi-static", definition: r`A regime where motion is slow enough that dynamic effects are relatively small.` },
        { term: "Action chunk", definition: r`A sequence of future actions predicted together.` },
        { term: "Flow matching", definition: r`A generative method that turns noise into a structured sample by integrating a learned velocity field.` },
        { term: "Inference-time guidance", definition: r`Changing the sampling process at deployment without retraining the model weights.` },
        { term: "Payload", definition: r`The object carried by the drone.` },
        { term: "Gaussian Splatting", definition: r`A 3D scene representation of many Gaussian primitives that enables fast photorealistic rendering.` },
        { term: "Compositional task", definition: r`A task formed by combining previously learned subtasks.` },
      ],
    },
  ],
};
