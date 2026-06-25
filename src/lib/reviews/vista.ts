import type { Paper } from "@/lib/literature";

// `String.raw` lets us write LaTeX (and inline `$...$` math) without escaping
// every backslash. Avoid any literal "${" sequence inside these templates.
const r = String.raw;

export const vista: Paper = {
  slug: "vista",
  title:
    "VISTA: Open-Vocabulary, Task-Relevant Robot Exploration with Online Semantic Gaussian Splatting",
  authors:
    "Keiko Nagami, Timothy Chen, Javier Yu, Ola Shorinwa, Maximilian Adang, Carlyn Dougherty, Eric Cristofalo, Mac Schwager",
  year: "2025",
  venue: "arXiv:2507.01125",
  summary:
    "An exploration method that plans informative trajectories to improve 3D map quality in the regions most relevant to a task, while searching for a natural-language object in real time with online semantic 3D Gaussian Splatting.",
  citation: `@article{nagami2025vista,
  title={VISTA: Open-Vocabulary, Task-Relevant Robot Exploration with Online Semantic Gaussian Splatting},
  author={Keiko Nagami and Timothy Chen and Javier Yu and Ola Shorinwa and Maximilian Adang and Carlyn Dougherty and Eric Cristofalo and Mac Schwager},
  journal={arXiv preprint arXiv:2507.01125},
  year={2025},
}`,
  sections: [
    {
      paragraphs: [
        r`VISTA is an exploration method that lets a robot plan informative trajectories which improve the quality of its 3D map in the areas most relevant to completing a task. Given an open-vocabulary search instruction, the robot explores its environment to find an object of interest while simultaneously building a real-time semantic 3D Gaussian Splatting (3DGS) reconstruction of the scene.`,
        r`It navigates by planning receding-horizon trajectories that prioritize two things at once: semantic similarity to the query, and exploration of unseen regions of the environment. To do this it introduces a viewpoint-semantic coverage metric that quantifies both the geometric view density and the task relevance of points in the 3D scene.`,
      ],
    },
    {
      heading: "The core idea",
      paragraphs: [
        r`VISTA does two things simultaneously: it builds a detailed 3D map of an unfamiliar environment, and it searches for an object described in natural language, such as *find a wagon*, *find a sofa*, or *find a cone*.`,
        r`Its central claim is that a robot should not explore only to improve its map. It should preferentially explore places that are both **geometrically uncertain** (poorly observed, or viewed from too few angles) and **semantically relevant** (visually related to the user's language query).`,
        r`The authors implement the system on two platforms: a quadrotor drone and a Boston Dynamics Spot robot.`,
      ],
    },
    {
      heading: "What is new",
      list: [
        r`A semantics-aware mapping and information-gain pipeline that uses open-vocabulary semantics for task-relevant exploration.`,
        r`A scalable information-gain metric based on view-angle diversity, computed in real time.`,
      ],
      paragraphs: [
        r`The guiding insight for vision-based mapping is that the variety and multiplicity of viewing directions from which an environment point has appeared in the image history is a good proxy for how well that point can be geometrically reconstructed.`,
      ],
    },
    {
      heading: "Pipeline at a glance",
      list: [
        r`Build a high-fidelity, photorealistic map of the environment online using a Gaussian Splatting representation.`,
        r`Distill semantic features into the 3DGS map incrementally as new observations arrive. These features encode the relevance between each point in the environment and the task, producing a relevancy heatmap.`,
        r`Construct a voxel grid that records which regions have been viewed and how semantically relevant they are. View diversity is measured with a coverage metric that updates recursively. Geometric uncertainty at a voxel is the minimum angular separation between a candidate viewpoint and all directions from which that voxel has already appeared in the image history, accounting for occlusions.`,
        r`Sample candidate trajectories and select those whose viewpoints maximize a weighted combination of geometric uncertainty and semantic relevance, steering the robot toward the queried object.`,
      ],
    },
    {
      heading: "Contributions",
      list: [
        r`An efficient information metric that combines view-angle diversity and semantic task relevance, stored on a voxel grid that can be updated recursively.`,
        r`A real-time informative trajectory-planning algorithm that drives exploration using this metric.`,
        r`A full-stack ROS implementation of VISTA with online 3DGS training, demonstrated on real robot hardware.`,
      ],
    },

    {
      heading: "Problem formulation: the exploration task",
      paragraphs: [
        r`The robot has a forward-facing RGB-D camera. RGB means it records ordinary color through red, green, and blue channels. D means depth: each pixel also estimates how far the visible surface is from the camera. An RGB-D image therefore contains both appearance and geometry.`,
        r`The robot starts in a previously unseen environment, meaning it begins without a complete map, and it receives an open-vocabulary query such as *find a sofa*, *find a ladder*, or *find a wagon*.`,
        r`"Open vocabulary" means the system is not restricted to a small fixed list of object classes chosen at training time. A conventional detector might only recognize a closed label set such as $\{\text{chair}, \text{table}, \text{person}\}$, whereas an open-vocabulary system accepts general text queries and compares them against visual-semantic features.`,
        r`The robot must perform $\text{mapping} + \text{object search}$ at the same time, and these goals can conflict: a move that improves the map may not advance toward the likely target, and a move toward a possible target may neglect unknown areas that still need to be explored. This is an *informative planning* problem, because the planner chooses actions according to the information that future observations are expected to provide.`,
      ],
    },
    {
      heading: "State estimation and the camera pose",
      paragraphs: [
        r`The paper assumes reliable state estimation: the system can accurately determine where the robot and its camera are in a global coordinate frame. This matters because every RGB-D observation must be inserted at the correct location in the 3D map. If the estimated camera pose is wrong, observations taken at different times will not align.`,
        r`The full camera pose is a six-dimensional vector of position and orientation:`,
      ],
      equations: [
        r`\mathbf{x} = \begin{bmatrix} x & y & z & \phi & \theta & \psi \end{bmatrix}^{T} \in \mathbb{R}^{6}.`,
      ],
    },
    {
      paragraphs: [
        r`The first three components are the position $\mathbf{p} = \begin{bmatrix} x & y & z \end{bmatrix}^{T} \in \mathbb{R}^{3}$, a point in 3D space, where $z$ is height. The last three are Euler angles: roll $\phi$ (rotation about the forward axis), pitch $\theta$ (tilting the camera up or down), and yaw $\psi$ (rotation in the horizontal plane, changing the direction the robot faces). A ground robot turning left mainly changes $\psi$, while $z$, $\phi$, and $\theta$ stay roughly constant.`,
        r`The pose is expressed in the global frame, a reference system fixed to the environment rather than moving with the robot. So $\mathbf{x}$ tells the system where the camera is and which way it is facing relative to the map.`,
      ],
    },
    {
      heading: "Odometry and observations",
      paragraphs: [
        r`As it moves, the robot collects pose odometry, an estimate of how its position and orientation change over time. This can come from wheel encoders, inertial sensors, visual tracking, motion capture, or simultaneous localization and mapping (SLAM). At each time $t$ the robot records a data tuple`,
      ],
      equations: [
        r`\mathcal{D}_{t} = \left( I_{t}^{\text{RGB}}, I_{t}^{\text{depth}}, \mathbf{x}_{t} \right),`,
      ],
    },
    {
      paragraphs: [
        r`where $I_{t}^{\text{RGB}}$ is the color image, $I_{t}^{\text{depth}}$ is the depth image, and $\mathbf{x}_{t}$ is the camera pose. A sequence of these observations is used to train the 3D Gaussian Splatting map.`,
      ],
    },
    {
      heading: "What 3D Gaussian Splatting represents",
      paragraphs: [
        r`VISTA uses 3D Gaussian Splatting (3DGS) as its high-quality scene representation. Instead of a dense grid of tiny cubes, 3DGS represents the visible, non-empty parts of the environment with many Gaussian primitives. A single primitive is`,
      ],
      equations: [
        r`\mathcal{G}_{i} = \left( \boldsymbol{\mu}_{i}, \boldsymbol{\Sigma}_{i}, \alpha_{i}, \mathbf{c}_{i} \right),`,
      ],
    },
    {
      paragraphs: [
        r`where $\boldsymbol{\mu}_{i}$ is its center, $\boldsymbol{\Sigma}_{i}$ describes its 3D shape, $\alpha_{i}$ is its opacity, and $\mathbf{c}_{i}$ holds its appearance (color) parameters. These Gaussians are projected onto the image plane and blended to render an image.`,
        r`Each Gaussian has a mean $\boldsymbol{\mu} \in \mathbb{R}^{3}$, its center in 3D space. The word "mean" comes from probability, but here it is simply the center of the ellipsoidal primitive; for example $\boldsymbol{\mu} = \begin{bmatrix} 2.1 & -0.8 & 1.4 \end{bmatrix}^{T}$ places the Gaussian at a particular point in the global map.`,
      ],
    },
    {
      heading: "Gaussian covariance",
      paragraphs: [
        r`The shape of each Gaussian is encoded by its covariance matrix, factored into a rotation and a scale:`,
      ],
      equations: [
        r`\boldsymbol{\Sigma} = \mathbf{R}\,\mathbf{S}\,\mathbf{S}^{T}\,\mathbf{R}^{T}, \qquad \mathbf{S} = \begin{bmatrix} s_x & 0 & 0 \\ 0 & s_y & 0 \\ 0 & 0 & s_z \end{bmatrix}.`,
      ],
    },
    {
      paragraphs: [
        r`The diagonal scale matrix $\mathbf{S}$ sets the Gaussian's size along three perpendicular directions: if $s_x = s_y = s_z$ it is roughly spherical, if one scale dominates it is elongated, and if one scale is very small it becomes thin and surface-like. Because $\mathbf{S}$ is diagonal, $\mathbf{S}\mathbf{S}^{T} = \operatorname{diag}(s_x^2, s_y^2, s_z^2)$ holds the squared scales along the principal axes.`,
        r`The rotation $\mathbf{R} \in \mathbb{R}^{3 \times 3}$ orients those axes in the world and satisfies $\mathbf{R}^{T}\mathbf{R} = \mathbf{I}$, where $\mathbf{I}$ is the identity. So $\boldsymbol{\Sigma} = \mathbf{R}\mathbf{S}\mathbf{S}^{T}\mathbf{R}^{T}$ means: define the lengths along the local axes with $\mathbf{S}$, then rotate those axes into the world with $\mathbf{R}$.`,
        r`The covariance controls how the Gaussian falls off in space. For a point $\mathbf{q}$, the relevant quantity is the Mahalanobis-style quadratic $(\mathbf{q} - \boldsymbol{\mu})^{T} \boldsymbol{\Sigma}^{-1} (\mathbf{q} - \boldsymbol{\mu})$, which is small near the center and large far from it (measured according to the Gaussian's scale and orientation). The corresponding density is`,
      ],
      equations: [
        r`G(\mathbf{q}) = \exp\!\left( -\tfrac{1}{2} (\mathbf{q} - \boldsymbol{\mu})^{T} \boldsymbol{\Sigma}^{-1} (\mathbf{q} - \boldsymbol{\mu}) \right).`,
      ],
    },
    {
      paragraphs: [
        r`The covariance is required to be symmetric positive-definite, written $\boldsymbol{\Sigma} \in \mathbb{S}_{++}^{3}$, where $\mathbb{S}_{++}^{n}$ is the set of $n \times n$ symmetric positive-definite matrices. Symmetric means $\boldsymbol{\Sigma}^{T} = \boldsymbol{\Sigma}$; positive-definite means $\mathbf{v}^{T} \boldsymbol{\Sigma} \mathbf{v} > 0$ for every nonzero vector $\mathbf{v} \neq \mathbf{0}$. This guarantees the Gaussian has valid, nonzero spread in every direction, and the factorization $\boldsymbol{\Sigma} = \mathbf{R}\mathbf{S}\mathbf{S}^{T}\mathbf{R}^{T}$ enforces it whenever the scales are positive.`,
      ],
    },
    {
      heading: "Opacity and view-dependent color",
      paragraphs: [
        r`Each Gaussian carries an opacity $\alpha \in \mathbb{R}_{+}$, transformed so its effective value lies in $0 \le \alpha \le 1$: $\alpha = 0$ is fully transparent, $\alpha = 1$ is fully opaque, and intermediate values are partially transparent. A higher opacity makes the Gaussian contribute more strongly to a rendered pixel.`,
        r`The Gaussian also stores spherical-harmonics (SH) parameters. Spherical harmonics are basis functions defined over viewing directions, which let a Gaussian's color depend on the direction it is observed from, capturing reflections, highlights, and other glossy, view-dependent effects. Without view dependence the color is simply $\mathbf{c} = \begin{bmatrix} r & g & b \end{bmatrix}^{T}$; with SH it becomes a function of the viewing direction $\mathbf{d}$,`,
      ],
      equations: [
        r`\mathbf{c}(\mathbf{d}) = \sum_{\ell, m} \mathbf{a}_{\ell m}\, Y_{\ell m}(\mathbf{d}),`,
      ],
    },
    {
      paragraphs: [
        r`where $Y_{\ell m}$ are the spherical-harmonic basis functions and $\mathbf{a}_{\ell m}$ are learned coefficients.`,
      ],
    },
    {
      heading: "Explicit representation and efficiency",
      paragraphs: [
        r`3DGS is an *explicit* representation: the scene is stored directly as a set of primitives with identifiable parameters, $\{\boldsymbol{\mu}_{i}, \boldsymbol{\Sigma}_{i}, \alpha_{i}, \text{SH}_{i}\}_{i=1}^{N}$, each with an actual position, shape, and appearance. This differs from a fully *implicit* neural representation, where scene properties are encoded inside the weights of a network. The explicit form lets the renderer work only with the Gaussians that could affect the current image.`,
        r`Because the Gaussians cover non-empty space, the method does not place dense map elements throughout empty volume, which avoids wasted computation. A dense grid of size $N_x \times N_y \times N_z$ would need storage proportional to $N_x N_y N_z$ even when most cells are empty; 3DGS instead stores primitives mainly where visible surfaces exist.`,
      ],
    },
    {
      heading: "Rendering: rasterization and alpha blending",
      paragraphs: [
        r`Rasterization converts 3D primitives into a 2D image. For each camera pose the renderer projects the relevant Gaussians into the image, determines which pixels they influence, blends their contributions, and produces the pixel colors. A 3D Gaussian projects to an elliptical footprint on the image plane, and the renderer "splats" that footprint across nearby pixels, which is where the name comes from.`,
        r`To stay fast, the image is split into rectangular *tiles*. Rather than testing every Gaussian against every pixel, the system first finds which Gaussians overlap each tile and processes only those. Compared with a naive $W \times H$ comparison over all pixels, this spatial grouping greatly reduces the work and is one reason 3DGS can render quickly enough for online robotics.`,
        r`Overlapping Gaussians at a pixel are combined by alpha blending, ordered front to back:`,
      ],
      equations: [
        r`\mathbf{C} = \sum_{i=1}^{N} T_i\, \alpha_i\, \mathbf{c}_i, \qquad T_i = \prod_{j=1}^{i-1}(1 - \alpha_j).`,
      ],
    },
    {
      paragraphs: [
        r`Here $\mathbf{C}$ is the final pixel color, $\mathbf{c}_i$ and $\alpha_i$ are the color and effective opacity of Gaussian $i$, and the transmittance $T_i$ is the fraction of light not already blocked by nearer Gaussians. Substituting gives $\mathbf{C} = \sum_{i=1}^{N} \alpha_i \prod_{j=1}^{i-1}(1 - \alpha_j)\, \mathbf{c}_i$; for two layers this reduces to $\mathbf{C} = \alpha_1 \mathbf{c}_1 + (1 - \alpha_1)\alpha_2 \mathbf{c}_2$. The nearer Gaussian contributes first, and the farther one contributes only through the transparency the nearer one leaves behind.`,
      ],
    },
    {
      heading: "Planning state and motion model",
      paragraphs: [
        r`The paper uses two different vectors. The full six-dimensional pose $\mathbf{x} = \begin{bmatrix} x & y & z & \phi & \theta & \psi \end{bmatrix}^{T}$ is used for placing observations, training the 3DGS map, and rendering images. For high-level planning, however, the robot's motion is restricted in the $z$, $\phi$, and $\theta$ axes, so they are treated as fixed: $\dot z = 0$, $\dot\phi = 0$, $\dot\theta = 0$. Only $x$, $y$, and $\psi$ are planned, so the robot effectively moves on a horizontal plane and changes its heading. For a drone this is a simplified high-level model, while a lower-level flight controller maintains altitude and attitude.`,
        r`The reduced planning state and its velocity control are`,
      ],
      equations: [
        r`\mathbf{s} = \begin{bmatrix} x & y & \psi \end{bmatrix}^{T} \in \mathbb{R}^{3}, \qquad \mathbf{u} = \begin{bmatrix} \dot{x} & \dot{y} & \dot{\psi} \end{bmatrix}^{T} \in \mathbb{R}^{3}. \tag{1}`,
      ],
    },
    {
      paragraphs: [
        r`The dot denotes a time derivative, so $\dot{x} = \tfrac{dx}{dt}$ and $\dot{y} = \tfrac{dy}{dt}$ are velocities along the global axes and $\dot{\psi} = \tfrac{d\psi}{dt}$ is the yaw (turning) rate. The dynamics are a *planar single integrator with heading*, meaning the velocity directly sets the rate of change of the state, $\dot{\mathbf{s}} = \mathbf{u}$. Over a small step $\Delta t$ this integrates to`,
      ],
      equations: [
        r`\mathbf{s}_{k+1} = \mathbf{s}_{k} + \Delta t\, \mathbf{u}_{k}, \qquad x(t) = x(0) + \int_{0}^{t} \dot{x}(\tau)\, d\tau.`,
      ],
    },
    {
      paragraphs: [
        r`It is called a single integrator because integrating velocity once yields position; the model deliberately omits acceleration, mass, thrust, and detailed vehicle dynamics. A real quadrotor is far more complex (3D position and velocity, full attitude, angular rates, motor forces), but VISTA plans at a higher level, choosing where to move and where to look, and delegates the detailed dynamics to a separate low-level controller. This keeps trajectory generation and scoring computationally manageable.`,
        r`The control is also subject to limits, $\mathbf{u}_{\min} \le \mathbf{u} \le \mathbf{u}_{\max}$, so candidate trajectories stay physically feasible. The robot cannot, for instance, rotate instantaneously from $\psi = 0$ to $\psi = \pi$; with a maximum yaw rate $\omega_{\max}$, turning through an angle $\Delta\psi$ takes at least $t_{\min} = |\Delta\psi| / \omega_{\max}$.`,
      ],
    },
    {
      heading: "Putting the loop together",
      paragraphs: [
        r`At each step the robot has a full pose $\mathbf{x}_{t} = \begin{bmatrix} x_t & y_t & z_t & \phi_t & \theta_t & \psi_t \end{bmatrix}^{T}$, collects images $I_t^{\text{RGB}}$ and $I_t^{\text{depth}}$, and updates a 3DGS map $\mathcal{M} = \{ \boldsymbol{\mu}_i, \boldsymbol{\Sigma}_i, \alpha_i, \text{SH}_i \}_{i=1}^{N}$ whose covariances are parameterized as $\boldsymbol{\Sigma}_{i} = \mathbf{R}_{i} \mathbf{S}_{i} \mathbf{S}_{i}^{T} \mathbf{R}_{i}^{T}$ and which is rendered by Gaussian projection and alpha blending. For planning, the pose is reduced to $\mathbf{s}_{t} = \begin{bmatrix} x_t & y_t & \psi_t \end{bmatrix}^{T}$ and the planner picks a feasible velocity $\mathbf{u}_{t}$ subject to the control limits. The robot then moves, gathers new observations, updates the map, and repeats:`,
      ],
      equations: [
        r`\text{observe} \rightarrow \text{update 3DGS} \rightarrow \text{plan} \rightarrow \text{move} \rightarrow \text{observe again}.`,
      ],
    },

    {
      heading: "The VISTA algorithm",
      paragraphs: [
        r`Section IV of the paper describes the full method, which repeatedly performs four connected operations: map the environment, measure useful information, plan candidate trajectories, and execute the best one. It combines $\text{geometric exploration} + \text{semantic object search}$, so the robot favors viewpoints that either reveal poorly observed parts of the environment or show regions semantically related to the query. The pipeline has four components: real-time semantic radiance-field training, the VISTA-Map voxel grid, the VISTA-Score information gain, and the VISTA-Plan trajectory planner.`,
      ],
    },
    {
      heading: "IV-A. Real-time semantic radiance-field training",
      paragraphs: [
        r`This component maintains a continuously updated 3D representation of the environment from the streaming tuples $\left( I_t^{\text{RGB}}, I_t^{\text{depth}}, \mathbf{x}_t \right)$. "Online" means the map is trained while the robot operates, not afterward from a finished dataset. The authors build on NerfBridge (for neural radiance fields) and SplatBridge (for 3DGS), and use 3DGS as the base because it trains and renders fast. The base 3DGS map captures appearance; VISTA extends it with semantics.`,
        r`Semantics come from CLIP, which maps an image to an embedding $\mathbf{e}_{\text{image}} \in \mathbb{R}^{l}$ and a text query such as "sofa" to an embedding $\mathbf{e}_{\text{text}} \in \mathbb{R}^{l}$ in the *same* feature space. Their similarity can then be measured by cosine similarity,`,
      ],
      equations: [
        r`\operatorname{sim}\!\left( \mathbf{e}_{\text{image}}, \mathbf{e}_{\text{text}} \right) = \frac{\mathbf{e}_{\text{image}}^{T}\, \mathbf{e}_{\text{text}}}{\lVert \mathbf{e}_{\text{image}} \rVert\, \lVert \mathbf{e}_{\text{text}} \rVert},`,
      ],
    },
    {
      paragraphs: [
        r`where a high value means the image region is semantically related to the query.`,
        r`VISTA defines a semantic field $f : \mathbb{R}^{3} \rightarrow \mathbb{R}^{l}$ that maps a 3D point $\mathbf{p}$ to a semantic embedding $f(\mathbf{p}) = \mathbf{e}_{\mathbf{p}}$. It is parameterized by a multi-resolution hash grid followed by a multilayer perceptron (MLP). The hash grid stores learnable features at several spatial scales (coarse levels for broad structure, fine levels for local detail), and the MLP turns the encoded spatial features into the semantic embedding.`,
        r`To get training points, image pixels are back-projected into 3D using depth. For a pixel $(u, v)$ with depth $d$ and camera intrinsics $\mathbf{K}$, the point in the camera frame is`,
      ],
      equations: [
        r`\mathbf{p}_{c} = d\, \mathbf{K}^{-1} \begin{bmatrix} u \\ v \\ 1 \end{bmatrix},`,
      ],
    },
    {
      paragraphs: [
        r`which is then transformed into the global frame using the camera pose. These 3D points become training inputs for the semantic field.`,
        r`The predicted embedding at a point is compared against the CLIP target with a mean-squared-error loss, and the 3DGS version adds a cosine term:`,
      ],
      equations: [
        r`\mathcal{L}_{\text{MSE}} = \frac{1}{l} \sum_{j=1}^{l} \left( f_j(\mathbf{p}) - e_j \right)^2, \qquad \mathcal{L}_{\cos} = 1 - \frac{f(\mathbf{p})^{T} \mathbf{e}}{\lVert f(\mathbf{p}) \rVert\, \lVert \mathbf{e} \rVert}.`,
      ],
    },
    {
      paragraphs: [
        r`Here $f_j(\mathbf{p})$ is the $j$-th component of the predicted vector and $e_j$ the corresponding CLIP target. The total semantic loss is a weighted combination $\mathcal{L}_{\text{semantic}} = \lambda_{\text{MSE}} \mathcal{L}_{\text{MSE}} + \lambda_{\cos} \mathcal{L}_{\cos}$, with weighting coefficients not specified in the section shown.`,
        r`While the semantic 3DGS trains, the system publishes a point cloud, RGB colors, semantic embeddings, and a subset of the training camera poses. If there are fewer than $N$ poses all are returned; otherwise $N$ are sampled, which keeps later computations from growing without bound as the dataset grows.`,
      ],
    },
    {
      heading: "IV-B. VISTA-Map: the 3D voxel grid",
      paragraphs: [
        r`The 3DGS map is visually detailed, but planning directly over all of its Gaussian primitives would be expensive. VISTA therefore builds a voxel grid. A voxel is a small 3D cube, the volumetric analogue of a 2D pixel. The grid has a fixed physical size and resolution and is centered on the robot, so its computational cost does not grow with the number of Gaussians.`,
        r`Each voxel is **occupied** (it contains reconstructed geometry such as a wall, table, or object, and stores RGB color, a semantic embedding, and location), **free** (observed and believed to contain no obstacle), or **unobserved** (not yet seen sufficiently, so its contents are unknown).`,
        r`Free and unobserved space are determined by ray traversal. For each training camera, rays are cast through image pixels,`,
      ],
      equations: [
        r`\mathbf{r}(t) = \mathbf{o} + t\, \mathbf{d}, \qquad t \ge 0,`,
      ],
    },
    {
      paragraphs: [
        r`where $\mathbf{o}$ is the camera origin and $\mathbf{d}$ the ray direction. As a ray advances through the grid, if it reaches an occupied voxel all preceding voxels are labeled free; voxels never crossed by an observed ray stay unobserved. Conceptually, a ray goes from the camera, through free voxels it passes through, to the occupied voxel where it hits a surface.`,
        r`The same traversal can render several image types from an arbitrary candidate camera pose: RGB, depth, semantic, and geometric-gain images. For each candidate pixel a ray is cast into the grid and terminates when it reaches an occupied or unobserved voxel, exits the grid, or hits the maximum draw distance, and the voxel's stored attribute becomes the pixel value. This lets the planner predict what a future viewpoint would observe without physically moving there.`,
      ],
    },
    {
      heading: "IV-C. VISTA-Score: quantifying information gain",
      paragraphs: [
        r`VISTA scores a viewpoint with a geometric term and a semantic term. For the geometric term, each occupied voxel stores the directions $\mathbf{d}_{v,1}, \mathbf{d}_{v,2}, \ldots, \mathbf{d}_{v,m}$ from which it has already been observed. A candidate camera produces a new ray direction $\mathbf{d}_{x}^{n}$ (for candidate pose $x$ and ray/pixel $n$), and the question is whether this direction is similar to an earlier view or provides a substantially different angle.`,
        r`For two unit vectors, $\mathbf{a}^{T}\mathbf{b} = \cos\vartheta$, where $\vartheta$ is the angle between them: identical directions give $1$, perpendicular directions give $0$, and opposite directions give $-1$. A new direction close to a previous one therefore adds little new geometric information. The pixel-wise geometric gain is`,
      ],
      equations: [
        r`g_I\!\left( \mathbf{d}_{x}^{n} \right) = \frac{\min\!\left( -\mathbf{d}_{v}^{T} \mathbf{d}_{x}^{n} \right) + 1}{2}, \tag{2}`,
      ],
    },
    {
      paragraphs: [
        r`where the minimum is over all stored directions of that voxel. Since $\min(-a_i) = -\max(a_i)$, this is equivalently $g_I(\mathbf{d}_{x}^{n}) = \tfrac{1}{2}\left( 1 - \max_j (\mathbf{d}_{v,j}^{T} \mathbf{d}_{x}^{n}) \right)$, i.e. VISTA compares the proposed direction with the *most similar* previous one. If the new ray nearly matches an earlier one, $\max_j (\mathbf{d}_{v,j}^{T} \mathbf{d}_{x}^{n}) \approx 1$ and $g_I \approx 0$; if it is very different, the maximum similarity is smaller and the gain rises, reaching $g_I \approx 1$ for a roughly opposite direction. For example, a closest previous view $60^\circ$ away gives $\cos 60^\circ = 0.5$ and $g_I = \tfrac{1 - 0.5}{2} = 0.25$, whereas $120^\circ$ gives $\cos 120^\circ = -0.5$ and $g_I = \tfrac{1 - (-0.5)}{2} = 0.75$. Rays that reach unobserved space receive the maximum geometric gain, so VISTA first reveals unknown regions and afterward keeps rewarding new viewing angles on known surfaces.`,
        r`The image-level geometric gain for a candidate pose $x$ averages the pixel gains over all rendered rays:`,
      ],
      equations: [
        r`G_I(x) = \frac{1}{N_r} \sum_{n=1}^{N_r} g_I\!\left( \mathbf{d}_{x}^{n} \right), \tag{3}`,
      ],
    },
    {
      paragraphs: [
        r`where $N_r$ is the number of rays (pixels). A viewpoint scores highly when many of its rays reveal unknown space or see surfaces from new directions.`,
        r`The semantic term renders a semantic image from the candidate pose: each visible voxel's stored embedding is compared with the text query, giving per-pixel similarities $s_1, \ldots, s_{N_r}$. The viewpoint's semantic gain is their average, $G_S(x) = \tfrac{1}{N_r} \sum_{n=1}^{N_r} s_n$, which is large when the viewpoint is expected to see regions strongly related to the requested object.`,
        r`A trajectory is a sequence of poses $\bar{\mathbf{x}} = \{ \mathbf{x}_1, \mathbf{x}_2, \ldots, \mathbf{x}_K \}$, and its overall score is`,
      ],
      equations: [
        r`G(\bar{\mathbf{x}}) = \sum_{\mathbf{x} \in \bar{\mathbf{x}}} \gamma^{\,K-k} \left( c\, G_I(\mathbf{x}) + G_S(\mathbf{x}) \right), \tag{4}`,
      ],
    },
    {
      paragraphs: [
        r`where $K$ is the number of waypoints, $k$ the waypoint index, $c$ a weight on geometric exploration, and $\gamma$ a discount factor. The weight $c$ balances the two terms: a large $c$ emphasizes mapping and exploration ($c\, G_I(x) \gg G_S(x)$), while a small $c$ emphasizes semantic relevance ($G_S(x) \gg c\, G_I(x)$). The factor $\gamma^{K-k}$, with $0 < \gamma \le 1$, weights gains by where they occur along the path; as written the exponent shrinks as $k$ approaches $K$, so later waypoints receive larger weight, and more generally the discount distinguishes information obtained at different points along the trajectory.`,
      ],
    },
    {
      heading: "IV-D. VISTA-Plan: informative planning",
      paragraphs: [
        r`This component generates candidate paths, scores them, and picks the best. First it flattens the 3D voxel grid $V$ into a top-down 2D grid $V'$, keeping only the vertical band the robot operates in and dropping floor and ceiling. Along each column it combines voxels by the priority $\text{occupied} \succ \text{unobserved} \succ \text{free}$: a 2D cell is occupied if any voxel in its column is occupied, otherwise unobserved if any is unobserved, otherwise free. Semantic values are combined by summing along height, $S'(i, j) = \sum_h S(i, j, h)$.`,
        r`Next it finds *frontier* cells: a free cell is a frontier if at least one neighboring cell is unobserved. The frontier set $D_f$ is valuable because moving toward it is likely to reveal new parts of the environment.`,
        r`It then selects the top $m$ cells with the highest semantic similarity. Their scores $q_1, \ldots, q_m$ are normalized into a categorical distribution,`,
      ],
      equations: [
        r`p_i = \frac{q_i}{\sum_{j=1}^{m} q_j}, \qquad \sum_{i=1}^{m} p_i = 1,`,
      ],
    },
    {
      paragraphs: [
        r`so more semantically relevant cells are sampled more often, forming the semantic-sample set $D_s$. The frontier samples $D_f$ and semantic samples $D_s$ are used to fit a Gaussian Mixture Model (GMM),`,
      ],
      equations: [
        r`p(\mathbf{q}) = \sum_{j=1}^{M} \pi_j\, \mathcal{N}\!\left( \mathbf{q}; \boldsymbol{\mu}_j, \boldsymbol{\Sigma}_j \right), \qquad \pi_j \ge 0, \quad \sum_{j=1}^{M} \pi_j = 1,`,
      ],
    },
    {
      paragraphs: [
        r`where $\mathbf{q} \in \mathbb{R}^{2}$ is a map location, $M$ the number of components, $\pi_j$ the weights, and $\boldsymbol{\mu}_j$, $\boldsymbol{\Sigma}_j$ the component centers and covariances. The GMM concentrates probability around exploration frontiers and semantically promising regions, so candidate destinations are biased toward useful parts of the map rather than sampled uniformly.`,
        r`From the current planning state $\mathbf{s}_i = \begin{bmatrix} x_i & y_i & \psi_i \end{bmatrix}^{T}$ (with $i$ the replanning iteration), VISTA runs Dijkstra's algorithm to compute shortest collision-free paths through known free space, giving a path set $\mathcal{P}$. Sampling the GMM selects promising targets and yields a reduced candidate set $\hat{\mathcal{P}}$.`,
        r`A path fixes positions but not where the camera looks, so for each path VISTA assigns a sequence of headings $\bar{\boldsymbol{\psi}} = \{ \psi_1, \ldots, \psi_K \}$ that point the robot toward the nearest frontier or GMM center. For a waypoint $(x_k, y_k)$ and target $(x_t, y_t)$ the desired heading is $\psi_k^{\text{des}} = \operatorname{atan2}(y_t - y_k,\, x_t - x_k)$, subject to the yaw-rate limit $|\dot{\psi}| \le \dot{\psi}_{\max}$, so the orientations are dynamically feasible rather than instantaneous. Each planar waypoint $\mathbf{s}_k = \begin{bmatrix} x_k & y_k & \psi_k \end{bmatrix}^{T}$ is then expanded back into a full pose $\mathbf{x}_k = \begin{bmatrix} x_k & y_k & z & \phi & \theta & \psi_k \end{bmatrix}^{T}$ (with $z$, $\phi$, $\theta$ held fixed) so candidate views can be rendered and scored.`,
      ],
    },
    {
      paragraphs: [
        r`In outline, each replanning iteration computes the frontiers $D_f = \operatorname{GetFrontiers}(V')$ and semantic samples $D_s = \operatorname{GetSemanticSamples}(V')$, the path set $\mathcal{P} = \operatorname{Dijkstra}(\mathbf{s}_i, V')$, and a sampled subset $\hat{\mathcal{P}} \sim \operatorname{SampleTrajectories}(\mathcal{P}, \operatorname{GMM}(D_f, D_s))$. For each candidate path it computes feasible headings, builds the full 6D poses, evaluates the VISTA score, and finally selects $\bar{\mathbf{s}}^{*} = \operatorname{GetBestTrajectory}(G, \hat{\mathcal{P}})$.`,
        r`Crucially, the geometric weight decays across replanning iterations, $c \leftarrow \beta^{\,i} c$ with $0 < \beta < 1$, so $\beta^{i} \rightarrow 0$ and the geometric contribution $c\, G_I(x)$ shrinks over time. The robot therefore starts by exploring broadly and building the map, then increasingly prioritizes semantic evidence. For instance, with $c_0 = 1$ and $\beta = 0.8$, the weight follows $c_1 = 0.8$, $c_2 = 0.64$, $c_3 = 0.512$, and so on.`,
      ],
    },
    {
      heading: "Receding-horizon (MPC-style) operation",
      paragraphs: [
        r`VISTA runs in a model-predictive-control-style loop and never commits permanently to a full long path. It builds the current map, generates candidate paths, selects the best, executes part of it, receives new sensor data, updates the map, and replans: $\mathbf{s}_i \rightarrow \bar{\mathbf{s}}_i^{*} \rightarrow \text{partial execution} \rightarrow \mathbf{s}_{i+1} \rightarrow \bar{\mathbf{s}}_{i+1}^{*}$. The advantage is adaptability: a newly revealed object or obstacle can immediately reshape the next plan.`,
      ],
    },
    {
      heading: "Intuition behind the full method",
      paragraphs: [
        r`Consider a robot searching for a sofa. A semantic-only method might lock onto a weak sofa-like feature and drive toward it even if it is wrong. A geometry-only method might explore unknown space efficiently but ignore a strong sofa-related region. VISTA evaluates both: $\text{score} = \text{new geometric information} + \text{query relevance}$. Early on, when the environment is largely unknown, it tends to pick a frontier; later, after finding sofa-like features, it favors viewpoints that better inspect those regions. The behavior thus shifts from *explore broadly* to *inspect likely targets*.`,
      ],
    },
    {
      heading: "Key vocabulary",
      definitions: [
        { term: "Radiance field", definition: r`A representation that models how the scene appears from different positions and viewing directions.` },
        { term: "Semantic field", definition: r`A 3D function that assigns a language-compatible feature vector to each spatial point.` },
        { term: "Embedding", definition: r`A numerical vector that represents semantic meaning.` },
        { term: "Voxel", definition: r`A small cubic element of a 3D grid, the volumetric analogue of a pixel.` },
        { term: "Voxel traversal", definition: r`Following a ray through the sequence of voxels it intersects.` },
        { term: "Occupied / free / unobserved space", definition: r`Space that contains a reconstructed surface; observed space believed empty; and space not yet measured sufficiently, respectively.` },
        { term: "Frontier", definition: r`A boundary between known free space and unknown space.` },
        { term: "Information gain", definition: r`A numerical estimate of how useful a future observation will be.` },
        { term: "View diversity", definition: r`The degree to which a new observation comes from a different angle than previous ones.` },
        { term: "Gaussian Mixture Model", definition: r`A probability distribution built from several weighted Gaussian components.` },
        { term: "Dijkstra's algorithm", definition: r`A shortest-path algorithm for graphs with nonnegative edge costs.` },
        { term: "Receding horizon", definition: r`Repeatedly planning into the future but executing only part of each plan before replanning.` },
        { term: "Semantic relevance", definition: r`Similarity between the visual content of a region and the text query.` },
      ],
    },
    {
      heading: "Main contribution",
      paragraphs: [
        r`The central innovation is an efficient voxel-based viewpoint metric that combines a geometric gain $G_I(x)$, which rewards unknown regions and new viewing angles, with a semantic gain $G_S(x)$, which rewards views likely to contain the requested object. The planner then selects a feasible trajectory that maximizes their weighted sum. In compact form, VISTA solves`,
      ],
      equations: [
        r`\bar{\mathbf{x}}^{*} = \arg\max_{\bar{\mathbf{x}}} \sum_{\mathbf{x} \in \bar{\mathbf{x}}} \gamma^{\,K-k} \left( c\, G_I(\mathbf{x}) + G_S(\mathbf{x}) \right),`,
      ],
    },
    {
      paragraphs: [
        r`subject to collision-free motion, velocity limits, heading-rate limits, and the robot's planar motion model.`,
      ],
    },
  ],
};
