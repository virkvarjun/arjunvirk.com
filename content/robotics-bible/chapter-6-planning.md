# Chapter 6 · Motion Planning & Navigation

*The robot finally knows where it is. Now it has to figure out how to get somewhere else — a path that dodges the furniture and obeys the way its own body is allowed to move.*

**Published:** Aug 10, 2026 · **Updated:** Aug 10, 2026

---

## Where we're going

For five chapters the robot has been answering *where am I*. Chapter 5 was the hard-won victory: fuse the sensors, fight the drift, and end up with a decent estimate of the robot's pose on a map. Fine. But knowing where you are is worthless if you can't decide where to go and how to get there without driving through a wall. That's this chapter. **Planning is the "Plan" beat of the loop, and its whole job is to turn a start and a goal into a path** — one your robot can actually follow, that doesn't clip an obstacle on the way.

The villain here is new and it's brutal: **the curse of dimensionality.** A wheeled robot lives in a 3-number world — x, y, heading — and you can almost picture the whole space of its poses. A 6-joint arm lives in a 6-number world, and a humanoid in dozens. As that number climbs, the space of possible configurations explodes so fast that the obvious approach — chop it into a grid and search — dies on contact. Every method in this chapter is a fight against that explosion. The hero, when the grid finally breaks, is **randomization**: stop trying to cover the space and start sampling it.

I'm assuming you've read Chapter 1 — specifically that a robot's entire pose is a single point in its **configuration space** (Fig 1.3), and the **holonomic vs nonholonomic** split that decides which paths a robot's wheels can even follow. I'm assuming Chapter 5 gave you a map and a pose on it. Everything else we build from zero.

Here's the road, and every stop is a fix for the one before it. First we make configuration space precise, because planning lives there and nowhere else. Then we grid it and search — BFS, then Dijkstra to handle costs, then A* to stop wasting effort. Then we watch the grid explode in high dimensions and switch to sampling — PRM, RRT, and RRT* that smooths the path. Then we admit a geometric path isn't executable and add timing and smoothness. And we end with the two-layer architecture every real robot ships: a global planner that finds a route and a local planner that dodges the person who just walked in front of it.

Let's go.

---

## Configuration space, for real this time

Back in Chapter 1 you met configuration space as a slogan: *a robot's whole pose is a single point, one axis per degree of freedom.* Now we need it as a working tool, because it's the arena the entire chapter plays in.

Here's the problem it solves. In the real world, the robot has *shape* — it's a two-foot-wide base, or an arm sweeping through a room. Checking whether a *shaped* robot collides with a *shaped* obstacle, at every possible position and orientation, is a geometric nightmare. You'd be intersecting polygons forever.

So we play a trick, and it's one of the most elegant moves in all of robotics. **We shrink the robot to a single point, and we pay for it by fattening the obstacles.** Imagine sliding your robot around the boundary of an obstacle, as close as it can get without touching, and tracing where the robot's *center* goes. That traced boundary is a new, larger obstacle — the original grown outward by the robot's shape. Do this to every obstacle and you've inflated all of them. Now the robot is a dimensionless dot, and the question "does the robot collide" becomes "is the dot inside a fattened obstacle." Point-vs-region. Trivial.

That fattening has a name — the **Minkowski sum** of the obstacle and the robot's shape — and we're going to use it purely as intuition, no formula. The picture is enough: **the obstacle grows by exactly the robot's footprint, so a point at the robot's center is safe if and only if the whole robot was safe.** (Side note: this is why you inflate obstacles by *half* the robot's width plus a safety margin in practice — you want the center to stay that far from every wall.)

Now the payoff. Once obstacles are inflated, planning happens entirely in **configuration space** — C-space for short — where:

- **The robot is a point.** No shape, no orientation to reason about. Just a dot.
- **Obstacles are forbidden regions** — the fattened blobs, called **C-obstacles**. The dot must never enter them.
- **A plan is a path** — a continuous curve — from the start point to the goal point that stays in the free space, the part of C-space outside every C-obstacle.

That's the whole reframing, and it's worth saying slowly: **planning is drawing a line through configuration space that avoids the forbidden regions.** Nothing more. Everything else in this chapter is a different way to draw that line.

What is C-space, concretely? It depends on the body — this is the Chapter 1 embodiment split coming back:

- For a **mobile base** on the floor, a configuration is (x, y, heading θ) — where it is and which way it faces. C-space is 3-dimensional. For a base that's just a dot rolling around and you ignore heading, it's the plain 2D floor.
- For a **robot arm**, a configuration is the tuple of joint angles — (θ₁, θ₂, …, θₙ) for an n-joint arm. **C-space is joint space**, one axis per joint. A 6-joint arm has a 6-dimensional C-space, and a point in it is one complete arm posture. This is exactly Fig 1.3, just with more axes.

Hold onto that last one, because it's where the villain lives. A path through joint space is a coordinated sweep of all the joints at once — and picturing it, let alone gridding it, is about to get very hard.

[FIG 6.1] title: "Shrink the robot, grow the obstacles"
type: draggable-field with size slider
shows: on the left, a workspace with a disk-shaped robot the reader can drag near a couple of polygonal obstacles; on the right, the same workspace in C-space where the robot has collapsed to a single point and the obstacles have grown by the robot's radius (the Minkowski-inflated C-obstacles)
controls: a "robot size" slider that grows or shrinks the robot's radius, drag the robot, a toggle to show/hide the inflation halo, reset
interaction: dragging the robot moves the point in C-space; enlarging the robot with the slider visibly fattens every C-obstacle in the right panel while the robot on the left grows — driving home that a bigger robot means a smaller free space
animation: the C-obstacle boundaries ease outward as the size slider increases; the robot-point and the real robot stay synced as you drag
color: blue = the robot (and its point in C-space), grey = original obstacles, red = the inflated C-obstacles / forbidden region, green = free space the point may travel
caption: "Inflate every obstacle by the robot's shape and the robot becomes a single point. Planning is now just steering that point through the green free space — and a bigger robot shrinks the green."

**Check your understanding.** You have a round robot 40 cm across and a doorway 50 cm wide, and you're planning in C-space with inflated obstacles. After inflation, how wide is the free gap in the doorway, and what does that tell you about whether the robot fits?

> Show answer ▸
>
> You inflate each wall of the doorway inward by the robot's *radius*, 20 cm, so each side eats 20 cm of the opening. That leaves a free gap of 50 − 20 − 20 = 10 cm in C-space. Because the robot is now a point and the gap is positive, a path exists — the point can thread through that 10 cm channel — but only barely, and any localization error larger than 5 cm on either side would put the center into a C-obstacle. The beauty of the reframing is that a hard "does my round body fit through the door" question became a simple "is there positive free space between the inflated walls" question. If the robot were 50 cm across, inflation would close the gap entirely (50 − 25 − 25 = 0), and C-space would correctly report: no path, don't even try.

---

## Gridding it: BFS, then Dijkstra, then A*

We have a clean problem now: steer a point from start to goal through free C-space. The most obvious thing in the world is to chop that space into a grid of cells, mark each cell free or blocked, and search for a chain of free cells connecting start to goal. Let's build that up the way we build everything — the naive version first, then watch each fix hand us the next one.

### BFS: correct, but blind

Overlay a grid. Each free cell is a node; adjacent free cells are connected. Now it's a graph-search problem, and the simplest correct answer is **breadth-first search (BFS)**: start at the start cell, explore all its neighbors, then all *their* neighbors, expanding outward in rings. The moment you touch the goal, the ring you touched it on is the fewest *steps* away, so you've found the shortest path in number of moves.

BFS works and it's optimal — *if every step costs the same.* But look at what it's doing: it expands in perfect rings in every direction, including directly *away* from the goal. It has no idea where the goal is until it stumbles into it. On a big open map it'll explore a huge disk of cells before reaching a goal that was straight ahead. Blind. And it can't tell that crossing gravel should cost more than crossing pavement — every step is worth exactly one.

### Dijkstra: now costs matter

The first crack in BFS is that "shortest in steps" isn't "shortest in cost." Real terrain has costs: diagonal moves are longer than straight ones (√2 vs 1), mud is slower than road, going near a wall is riskier. **Dijkstra's algorithm (1959)** fixes this. Instead of expanding in step-count rings, it keeps a running tally `g(n)` — the cheapest known cost to reach each cell from the start — and always expands the *unexpanded cell with the smallest g so far*. When it finally pops the goal off that priority queue, `g(goal)` is provably the true cheapest cost, and you recover the path by following the "who got me here cheapest" pointers backward.

Dijkstra is BFS with a cost meter. It's optimal for any non-negative edge costs. But it inherits BFS's real sin: **it still expands in all directions equally.** It grows a cost-weighted blob outward from the start, pouring effort into cells behind and beside the goal, because it has no notion of *which way the goal is.* On a big map that's a mountain of wasted expansions.

### A*: point the search at the goal

Here's the fix, and it's the whole ballgame. Dijkstra picks the next cell to expand by `g(n)` alone — cost so far. What if we also gave it a *guess* of the cost still remaining, and told it to prefer cells that look closer to the goal? That guess is a **heuristic**, `h(n)`, and the algorithm that adds it is **A*** (Hart, Nilsson & Raphael, 1968).

A* expands the cell with the smallest

$$f(n) = g(n) + h(n)$$

Reading the symbols: `g(n)` is the cost already spent getting *to* cell n from the start (the part you know for sure, same as Dijkstra). `h(n)` is the *estimated* cost still to go from n to the goal (the guess). Their sum `f(n)` is A*'s best estimate of the total cost of a path through n. By always expanding the smallest-`f` cell, the search leans toward cells that are both cheap to reach *and* look close to the goal — so it drives *at* the goal instead of ballooning in every direction.

What do you use for `h`? Something cheap that estimates remaining distance. On a grid where you can move in 8 directions, straight-line (Euclidean) distance is a classic choice; if you can only move in 4, the Manhattan distance (|Δx| + |Δy|) fits. The one property that matters is:

**Admissibility: the heuristic must never *overestimate* the true remaining cost.** As long as `h(n)` ≤ the real cost-to-go for every cell, A* is guaranteed to return the optimal path. The intuition: an admissible `h` is optimistic — it might undersell how far the goal is, but it never oversells. Because it never claims the goal is farther than it truly is, A* can never be tricked into finalizing a suboptimal path and skipping a better one. Straight-line distance is always admissible in the plane, because no path through obstacles is ever *shorter* than the straight line.

And now the punchline that ties the three together:

- Set `h(n) = 0` everywhere and A* stops guessing — it's exactly **Dijkstra**.
- Add positive terrain costs on top of BFS's uniform steps and you *get* **Dijkstra**.
- So **A* = Dijkstra + an admissible heuristic that pulls the search toward the goal.** Same optimality guarantee, a fraction of the expansions.

### A tiny trace

Let's watch A* actually run. Tiny grid, 4-connected (up/down/left/right, each step costs 1). Start `S` at column 0, goal `G` at column 3, same row. One obstacle `#` blocks the direct middle. Coordinates are (col, row), and the heuristic is Manhattan distance to G at (3,1).

```
row 0:  .   .   .   .
row 1:  S   #   .   G
row 2:  .   .   .   .
```

Start `S`=(0,1), goal `G`=(3,1). We expand smallest `f = g + h`:

- **Expand S**=(0,1): g=0. Neighbors: (0,0) and (0,2) and (1,1). (1,1) is the obstacle — skip. (0,0): g=1, h=|3−0|+|1−0|=4, **f=5**. (0,2): g=1, h=4, **f=5**.
- Tie at f=5; say we take **(0,0)**: g=1. Its useful neighbor is (1,0): g=2, h=|3−1|+|1−0|=3, **f=5**.
- **Expand (1,0)**: g=2. Neighbor (2,0): g=3, h=|3−2|+|1−0|=2, **f=5**. (Notice: every cell on the good detour keeps f=5 — that's the heuristic telling A* it's still on an optimal path.)
- **Expand (2,0)**: g=3. Neighbor (2,1): g=4, h=|3−2|+0=1, **f=5**.
- **Expand (2,1)**: g=4. Neighbor **(3,1)=G**: g=5, h=0, **f=5**. Goal reached.

Path: S → (0,0) → (1,0) → (2,0) → (2,1) → G, cost 5, going up and over the obstacle. Here's the thing to notice: A* barely touched the cells *below* the start row. Dijkstra, with `h=0`, would have expanded (0,2), (1,2), (2,2) — the whole bottom row — with equal enthusiasm, because it can't tell the goal is up-and-right. The heuristic kept A*'s f-values honest and steered it over the top, expanding a handful of cells instead of flooding the grid. That's the entire reason A* is the default planner in games, GPS routing, and a thousand robots.

[FIG 6.2] title: "Dijkstra vs A*: watch A* aim"
type: toggle-compare stepper, side by side
shows: two identical grid mazes with the same start, goal, and obstacles — Dijkstra on the left, A* on the right — each with a live count of "cells expanded"; expanded cells shade in as you step
controls: play/pause, step forward, reset, a slider for animation speed, and a toggle to move the goal
interaction: stepping advances both searches one expansion at a time; Dijkstra fans out in a symmetric cost-blob while A* streaks toward the goal; the expanded-cell counters diverge, ending with A* far lower
animation: cells fill in expansion order with an eased shade; the final path highlights once the goal is popped
color: blue = frontier being expanded, grey = expanded/closed cells, green = goal and final path, amber = the start, red = obstacles
caption: "Same optimal path, wildly different effort. Dijkstra expands a blind blob in every direction; A*'s heuristic aims the search at the goal, so it finalizes the same path after a fraction of the expansions."

**Check your understanding.** A colleague sets A*'s heuristic to `h(n) = 3 × straight-line distance to goal`, reasoning that a stronger pull will reach the goal even faster. The search does run faster, but sometimes returns a slightly longer path. What broke?

> Show answer ▸
>
> They broke admissibility. Multiplying the straight-line distance by 3 makes `h` *overestimate* the true cost-to-go for most cells — it now claims the goal is much farther than it really is. That over-optimism about distance makes the search greedy: it rushes toward whatever looks closest and can commit to a path before discovering a cheaper one it dismissed as "too far." So yes, it expands fewer cells and finishes faster, but it loses A*'s optimality guarantee and can return a suboptimal path. This is a real and useful knob — *weighted A*/* deliberately inflates the heuristic to trade a bounded amount of optimality for speed — but it is no longer guaranteed optimal. Optimality lives and dies on `h(n)` never overestimating.

---

## The curse of dimensionality: why the grid dies

Grid search is wonderful and you should reach for it first — on a mobile robot navigating a 2D floor, A* on an occupancy grid is often the entire answer. But now point it at a 6-joint arm, and watch it detonate.

The problem is counting. Suppose you grid each axis into just 100 cells — coarse, barely enough to squeeze through a doorway. In 2D (a mobile base ignoring heading) that's 100 × 100 = 10⁴ cells. Totally fine; your laptop laughs. In 3D (add heading) it's 10⁶. Still fine. Now the 6-joint arm: 100⁶ = **10¹² cells.** A trillion. Even if you could store one bit per cell that's 125 gigabytes just to hold the grid, and A* would have to expand a meaningful fraction of it. A 7-DoF arm is 10¹⁴. A two-armed humanoid with a floating base is astronomically worse.

This is the **curse of dimensionality**, and it's the villain the whole rest of the chapter fights: **the number of grid cells grows as (cells-per-axis) raised to the number of dimensions.** Add one degree of freedom and you *multiply* the total by 100. The grid isn't a little too big in high dimensions; it's too big by factors that dwarf the number of atoms you have storage for. There is no clever indexing that saves you — the space itself is that vast.

And here's the cruel part: almost all of that trillion cells is empty free space you'll never care about. You don't need to *represent* the whole space. You need one thin path through it. Gridding pays to enumerate everything so it can find the one thread. In high dimensions that's a catastrophically bad trade. The fix is to stop enumerating and start *sampling* — throw down random configurations, keep the valid ones, and stitch a path through those. Which is exactly where we're going.

**Check your understanding.** Gridding a 2-DoF planar arm at 100 cells per joint gives 10⁴ cells — instant. Why does the *same* 100-cell resolution become hopeless for a 6-DoF arm, and why doesn't buying a faster computer fix it?

> Show answer ▸
>
> Because the cell count is 100 raised to the number of joints, so going from 2 to 6 DoF takes you from 100² = 10⁴ to 100⁶ = 10¹² — a factor of a hundred million, from every extra joint each multiplying the total by 100. It's *exponential* in dimension, and exponentials outrun hardware: a computer a thousand times faster only buys you a couple more joints before you're back in the same hole, and each added joint erases that gain. You cannot out-engineer an exponential with linear speedups. The escape isn't a bigger grid or a faster machine — it's refusing to enumerate the whole space at all, and instead sampling only the configurations you might actually use. That realization is the entire motivation for sampling-based planning.

---

## Sampling-based planning: PRM and RRT

The insight that saves us is almost cheeky: **don't build the space, poke it.** Throw a random configuration into C-space. Check if it's collision-free (a fast point-vs-region test, thanks to the inflation trick). If it is, keep it as a node. Do this a few thousand times and you've got a scatter of valid configurations — a sketch of the free space — that you never had to enumerate cell by cell. Randomness beats grids in high dimensions because a random sample doesn't care how many dimensions it's in; a thousand samples is a thousand samples whether the space is 2D or 20D. The grid's cost exploded with dimension; sampling's cost doesn't. That's the whole trick, and it's the hero of high-DoF planning.

There are two great ways to use those samples, and they answer two different questions.

### PRM: build a roadmap once, reuse it forever

The **Probabilistic Roadmap (PRM)** — Kavraki, Švestka, Latombe & Overmars, 1996 — is the multi-query workhorse. It has two phases:

1. **Learning (build the roadmap).** Sample many random configurations. Throw away the ones in collision. For each surviving node, try to connect it to its nearest neighbors with a straight line in C-space, and keep the connection only if the whole line is collision-free (checked by sampling points along it — the **local planner**). What you're left with is a **roadmap**: a graph woven through the free space, like a subway map of valid routes.
2. **Query.** Given a start and a goal, connect each to the nearest roadmap node, then run plain old A* on the roadmap graph to find a path. Done.

The beauty is the split: you pay the expensive sampling-and-connecting cost **once**, and then answer *many* start–goal queries cheaply on the same graph. If your robot works in a fixed environment — a warehouse, a factory cell — and plans hundreds of paths through it, PRM amortizes gorgeously. Its weakness is the flip side: if the environment changes, the roadmap is stale, and building it in the first place is wasted effort if you only need one path.

### RRT: grow a tree toward the goal, once

For a *single* query — one start, one goal, get me there now — building a whole roadmap is overkill. The **Rapidly-exploring Random Tree (RRT)** — LaValle, 1998 — grows a single tree outward from the start and stops when it reaches the goal. The loop is beautiful in its simplicity:

1. **Sample** a random configuration `q_rand` in C-space.
2. **Find** the node already in the tree that's nearest to `q_rand` — call it `q_near`.
3. **Steer** a small step from `q_near` toward `q_rand`, landing at a new point `q_new`.
4. **Check** the little segment `q_near → q_new` for collision. If it's clear, add `q_new` to the tree with `q_near` as its parent.
5. Repeat until a `q_new` lands close enough to the goal.

Why does this explode outward so efficiently? The magic is step 2. Because you always extend from the *nearest* existing node toward a *random* target, the tree is biased toward the large unexplored voids — a random sample is most likely to fall in a big empty region, and the nearest node to it is on the frontier facing that region. So the tree reaches into open space fast, "rapidly exploring," instead of thrashing around where it already is. (Common trick: every so often, make `q_rand` *be* the goal instead of a random point. That "goal bias" tugs the tree toward the target without giving up the exploration.)

RRT's real superpower, and the reason it dominates in practice, is that **the "steer" step can respect the robot's motion constraints.** Remember Chapter 1's nonholonomic car — it can't slide sideways, only drive-and-steer along feasible curves. In a grid or PRM you'd connect nodes with straight lines the car can't follow. But RRT's steer step can be *the car's actual dynamics*: extend `q_near` toward `q_rand` by simulating a legal drive-and-steer motion. Every edge in the tree is then a motion the robot can genuinely execute. This is why RRT and its kin are the go-to for nonholonomic and **kinodynamic** planning (planning that respects velocity and acceleration limits, not just geometry) — from self-parking cars to quadrotors.

### The problem with RRT: the path is ugly

Run RRT and it *will* find a path, usually fast. But look at it: it's jagged, wandering, full of needless zigzags, because it's stitched together from random extensions that never asked "is this the shortest way?" RRT is **probabilistically complete** — give it enough samples and it'll find a path *if one exists* — but it makes **no promise about the path's quality.** The first path it stumbles onto is the path you get, warts and all.

### RRT*: the same tree, but it keeps improving

The fix is **RRT*** — Karaman & Frazzoli, 2011 — and it's a small, gorgeous addition that makes the tree *self-improve.* RRT* runs the same sample-nearest-steer loop, but adds two rewiring steps every time it inserts a new node `q_new`:

1. **Choose the best parent.** Instead of automatically parenting `q_new` to the nearest node, look at all nearby tree nodes and pick the one that gives `q_new` the *lowest total cost from the start* (via a collision-free connection). Connect through whichever neighbor makes the path to `q_new` cheapest.
2. **Rewire the neighborhood.** Then check the other nearby nodes: for each, would routing *through the new `q_new`* give it a cheaper path than its current parent does? If so, re-parent it to `q_new`. The tree locally reshuffles its connections to shorten paths.

That rewiring is everything. Over iterations, kinks straighten, detours collapse, and the tree's paths converge toward the true optimum. This is what "**asymptotically optimal**" means: RRT* isn't optimal after a fixed number of samples, but as samples → ∞ the cost of its path converges to the best possible. In practice you run it for a fixed time budget and take the best path so far — and it's dramatically smoother and shorter than vanilla RRT's first jagged attempt. The trade is compute: all that neighbor-checking and rewiring costs more per sample. Vanilla RRT when you just need *a* path fast; RRT* when path quality is worth the cycles.

[FIG 6.3] title: "RRT: a tree reaching for the goal"
type: stepper on a field
shows: a C-space with start, goal, and a few C-obstacles; an RRT tree growing outward from the start, one extension at a time, edges curving around the obstacles toward random samples
controls: play/pause, step (one sample-extend per press), reset (re-seeds deterministically), a "goal bias" slider, and a toggle for nonholonomic steering (straight edges vs car-like curves)
interaction: each step drops a random sample, highlights the nearest tree node, and extends a new edge toward it; raising goal bias visibly pulls the tree toward the goal; flipping nonholonomic on makes edges follow feasible curves instead of straight lines
animation: the new edge eases into place each step; when a node reaches the goal region the solution path lights up through the tree
color: blue = the tree, amber = the current random sample and the chosen extension, grey = obstacles, green = goal region and final path, red = a rejected (in-collision) extension
caption: "RRT explores by always extending from its nearest node toward a random target, so it rushes into open space — and because the extension can be a feasible car-like motion, every edge is something the robot can actually drive."

[FIG 6.4] title: "RRT vs RRT*: jagged vs smooth"
type: toggle-compare stepper, side by side
shows: the same start, goal, and obstacles for both; left panel runs RRT and freezes its first found path (visibly jagged); right panel runs RRT* and keeps rewiring, its path smoothing and shortening as iterations climb, with a live path-length readout for each
controls: play/pause, step, reset, an iteration counter, and a slider to scrub the iteration count
interaction: scrubbing iterations forward leaves RRT's path unchanged (first-found, frozen) while RRT*'s path visibly straightens and its length readout ticks down toward a near-optimal value
animation: on the RRT* side, rewired edges snap to shorter connections and the path eases into a smoother curve as the counter climbs
color: blue = the trees, green = each side's current best path, amber = length readouts, grey = obstacles, red = the length gap between the two paths
caption: "RRT takes the first path it finds and stops, so it stays jagged; RRT* keeps rewiring the tree to reroute nodes through cheaper parents, so its path smooths and its length converges toward optimal as iterations grow."

**Check your understanding.** A mobile robot works in a fixed warehouse and must plan hundreds of paths a day between different shelves. A self-parking car must find *one* feasible path into *this* spot, right now, obeying its turning radius. Which planner suits each, and why?

> Show answer ▸
>
> The warehouse robot wants **PRM**. The environment is fixed, so you pay once to build a roadmap of the free space and then answer every shelf-to-shelf query cheaply with A* on that graph — the up-front sampling cost amortizes across hundreds of daily queries, which is exactly PRM's multi-query sweet spot. The self-parking car wants **RRT** (or RRT* if it has cycles to spare). It's a single query — one spot, one attempt — so building a whole roadmap is wasted effort, and crucially the car is nonholonomic: RRT's steer step can extend the tree using the car's actual drive-and-steer dynamics, so every edge is a maneuver the wheels can follow, turning radius and all. A grid or PRM connecting nodes with straight lines would propose sideways slides the car physically can't do. Fixed environment + many queries → PRM; single query + motion constraints → RRT.

---

## From path to trajectory: adding time and smoothness

Say the planner hands you a beautiful collision-free path through C-space. You are not done. A path is pure *geometry* — an ordered set of configurations, a squiggle in joint space. It says *where* to go but says nothing about *when*, and a real robot can't execute a where without a when.

Three things are missing, and each one bites:

- **Timing.** How fast do you traverse the path? A configuration-only path has no velocities. You need a schedule — a time-stamped trajectory `q(t)` — assigning a moment to every point.
- **Smoothness.** RRT's output has corners, and RRT*'s is better but still not silky. A robot cannot infinitely-sharply change direction: a corner demands infinite acceleration, which means infinite force, which no motor has. Corners must be rounded into curves the body can actually flow through.
- **Limits.** Every joint has a top speed and a top acceleration (and torque limits under load — Chapter 1's motors and gearboxes have their say here). A trajectory that commands more than the hardware can deliver is a trajectory the robot will fail to track, and tracking failure means you're not where the plan thinks you are.

So the last step is turning a geometric path into an executable **trajectory**: a smooth, time-parameterized `q(t)` that respects velocity and acceleration limits. The tools that do this are **trajectory optimization** methods — you'll hear **CHOMP** (Covariant Hamiltonian Optimization for Motion Planning, Ratliff et al., 2009) and **TrajOpt** (Schulman et al., 2013) by name. They take an initial path — often a rough one straight from RRT, or even a naive straight line — and iteratively *deform* it to minimize a cost that trades off smoothness (low acceleration, no jerky corners) against staying clear of obstacles, all while honoring the robot's limits. The path flows away from obstacles and relaxes into a smooth, dynamically-feasible sweep the controller from Chapter 4 can actually track.

You'll often see this as a two-stage pipeline: a sampling planner finds *a* feasible path through a cluttered space (its strength), then an optimizer polishes that path into something smooth and fast (its strength). One finds the route; the other makes it graceful. Keep it brief in your head: **planning finds a path, trajectory optimization makes it executable.**

---

## The two-layer architecture: global route, local reflexes

Here's the last problem, and it's the one that separates a demo from a robot that ships. Everything so far assumed a **static, known map**. But Chapter 1's Villain #1 never left: *the world doesn't hold still.* You planned a gorgeous path across the office, and then a person walks across it. A door that was open is now closed. A box appears in the hallway. Replanning your entire global path from scratch, every time a pixel changes, at the speed people move? Hopeless — global planning is too slow to run in the tight sense-plan-act loop.

So real navigation stacks split the job into **two layers running at two speeds**, and the split maps cleanly onto Chapter 1's loop:

- **The global planner** runs on the *known map*, occasionally. Give it your best map (from Chapter 5's SLAM) and it finds a full route from here to the goal — A* on the occupancy grid, or a sampling planner for a high-DoF body. It's the strategist: it knows the whole map but it's slow, so it runs at maybe 1 Hz, or only when the goal changes or the robot gets badly off-plan.
- **The local planner** (a.k.a. the reactive controller) runs *fast* — tens of hertz — on whatever the sensors see *right now*. Its job isn't to solve the whole maze; it's to follow the global route while dodging obstacles that weren't on the map: the person, the box, the swinging door. It only reasons about the next couple of seconds and the immediate surroundings, which is exactly why it can run fast enough to be reactive.

The canonical local planner is the **Dynamic Window Approach (DWA)** — Fox, Burgard & Thrun, 1997. Its idea is direct and it leans hard on Chapter 1's holonomy lesson. At each tick, DWA looks only at the velocities the robot can *actually reach in the next instant* given its current speed and its acceleration limits — that reachable set is the "dynamic window," and it exists precisely because the robot can't teleport to any velocity; it's bounded by its own dynamics. For each candidate velocity in that window, DWA simulates the short arc the robot would trace and scores it on three things: does it head toward the global goal, does it stay clear of obstacles, and does it keep speed up. Pick the best-scoring velocity, execute it for one tick, and repeat. It's sense-plan-act at the reflex level — a tight, fast loop that hugs the global plan but flinches away from anything new.

Put the two together and you get the architecture nearly every mobile robot runs: **the global planner draws the route on the map; the local planner walks that route in real time while dodging the world's surprises.** The global layer handles *where to go*; the local layer handles *what just happened*. It's the sense-plan-act loop of Chapter 1, wearing a bigger coat — a slow deliberate planner wrapped around a fast reactive one, each covering the other's blindness, exactly the way we fused sensors in Chapter 5.

[FIG 6.5] title: "Global route, local dodge"
type: draggable-field with a live loop
shows: a mobile robot following a global path (planned by A* across a known map) from start to goal; the reader can drop a dynamic obstacle — a "person" — anywhere on the path, and the local planner (DWA) reroutes around it in real time while snapping back to the global route once past
controls: play/pause, drag to place or move the person obstacle, a "replan global" button, a speed slider, and a toggle to show DWA's dynamic-window velocity fan
interaction: dragging the person onto the path makes the robot bulge locally around them and rejoin the global line; toggling the velocity fan shows DWA's candidate arcs being scored and the best one chosen each tick
animation: the robot advances along the global path; when the person blocks it, the local detour eases out and back; the velocity fan flickers as candidates are scored
color: amber = the global planned route, blue = the robot and its actual traveled path, red = the dynamic obstacle (person), green = the goal, grey = the known map/static obstacles
caption: "Two layers, two speeds: the global planner draws the route on the map once, and the fast local planner (DWA) dodges the obstacles that appear in real time — the sense-plan-act loop, split into a slow strategist and a fast reflex."

**Check your understanding.** Why not just run the global planner (A* on the full map) at 30 Hz and skip the local planner entirely — wouldn't that both find the optimal route *and* react to obstacles instantly?

> Show answer ▸
>
> Two reasons, one practical and one conceptual. Practically, global planning over a full map is too slow to run at reflex rates — a fresh A* or sampling search across the whole environment can take tens or hundreds of milliseconds, and by the time it finishes the fast-moving obstacle has moved and the plan is already stale. You can't close a 30 Hz reactive loop around a planner that takes longer than a tick. Conceptually, the two layers reason about different things: the global planner needs the *whole map* to find a good route but doesn't need to know about the person who just appeared; the local planner needs *only the immediate surroundings and the robot's dynamics* to dodge, and doesn't need to re-solve the whole maze to do it. Splitting them lets each run at the rate its job actually needs — slow-and-global for strategy, fast-and-local for reflexes — which is the same "fuse things with complementary strengths" pattern we've used since Chapter 1's sensors.

---

## Where this leaves us

The robot can now go somewhere. Chapter 5 gave it a pose on a map; this chapter turned "I'm here, I want to be there" into an executable motion. The spine of it: **planning is drawing a path through configuration space** — the space where the robot shrinks to a point (Fig 1.3's promise, cashed in via obstacle inflation) and obstacles become forbidden regions. On a low-dimensional mobile base you grid that space and run **A***, which is just Dijkstra with an admissible heuristic that aims the search at the goal. When the dimension climbs and the grid detonates under the **curse of dimensionality**, you stop enumerating and start sampling — **PRM** to build a reusable roadmap for many queries, **RRT** to grow a single tree fast (and respect nonholonomic constraints), **RRT*** to rewire that tree toward the optimal path. Then trajectory optimization (**CHOMP**, **TrajOpt**) turns the geometric squiggle into a smooth, timed, limit-respecting trajectory the controller can track. And in the real, moving world, you split the job: a **global** planner for the route, a fast **local** planner (**DWA**) for the surprises.

Notice what we did *not* do: we never asked the robot to *learn* anything. Every planner here was handed a map and a model of how the robot moves, and it computed. That's the classical stack, and it's genuinely enough for enormous swaths of real robotics. But it has a ceiling. It needs a map it can trust and a motion model it can simulate, and it plans for the world as *given* rather than discovering good behavior on its own. What happens when the "cost" of a motion is too subtle to write down — when good behavior has to be *learned* from trying, failing, and trying again? That's the turn the guide takes next. Chapter 7 hands the robot a reward instead of a map and lets it discover its own policy through reinforcement learning — trading the planner's guarantees for the ability to learn behaviors no one could hand-code.

Every planner in this chapter was still just the "Plan" beat of Fig 1.1's loop, done deliberately. Next we let the robot learn that beat for itself.

---

**Future reference:** The core ideas here are bedrock and won't move: configuration space, the A* family, the sampling-based trio (PRM / RRT / RRT*), and the global-plus-local architecture have all been stable for years and are what real stacks (ROS's `move_base` and its successors) still run today. What's actively churning is the fusion of these classical planners with learned components — learned samplers that bias RRT toward promising regions, neural heuristics for A*, and end-to-end learned navigation — so treat any claim about "the state of the art in learned planning" as a moving target. But the classical skeleton in this chapter is the thing those learned methods plug *into*, not replace. Come back to Fig 6.1 whenever a planning idea stops making sense — almost every method here is a different way to steer a point through inflated C-space, and re-grounding in that picture usually untangles it.

*Prev: Chapter 5 — Estimation, Localization & SLAM · Next: Chapter 7 — Reinforcement Learning for Robots*
