# Robotics Bible

*A from-scratch guide to robots: the body, the math, classical autonomy, reinforcement learning, and the vision-language-action models driving the current wave of general-purpose machines.*

This is the content for the table-of-contents page at `/writing/robotics-guide`. Render it like the ML Bible TOC — a numbered list of chapter links, each with its one-line description and published date.

## Table of contents

1. **Anatomy of a Robot** — What a robot actually is: the sense–plan–act loop, joints, degrees of freedom, actuators, sensors, and why parallel parking is hard. → `/writing/robotics-guide/chapter-1-anatomy` · *Jul 6, 2026*
2. **The Language of Space: Frames, Rotations & Transforms** — Coordinate frames, rotation matrices, gimbal lock, quaternions, and the 4×4 transforms that let a robot translate between everything it sees. → `/writing/robotics-guide/chapter-2-frames-transforms` · *Jul 13, 2026*
3. **Kinematics: Forward, Inverse & the Jacobian** — Turning joint angles into hand positions and back again; why inverse kinematics is hard, why 6 DoF is magic, and what the Jacobian buys you. → `/writing/robotics-guide/chapter-3-kinematics` · *Jul 20, 2026*
4. **Control: From PID to Whole-Body** — Making the body actually track a command against gravity and friction: P, I, D, feedforward, and force/impedance control. → `/writing/robotics-guide/chapter-4-control` · *Jul 27, 2026*
5. **Estimation, Localization & SLAM** — Fighting drift and lying sensors with probability: Bayes filters, Kalman, particle filters, mapping, and loop closure. → `/writing/robotics-guide/chapter-5-slam` · *Aug 3, 2026*
6. **Motion Planning & Navigation** — Finding a path through configuration space: Dijkstra, A*, RRT and RRT*, trajectory optimization, and the global/local planner split. → `/writing/robotics-guide/chapter-6-planning` · *Aug 10, 2026*
7. **Reinforcement Learning for Robots** — Learning the policy when you can't hand-code it: MDPs, value functions, policy gradients, PPO, sim2real, and teacher–student. → `/writing/robotics-guide/chapter-7-rl` · *Aug 17, 2026*
8. **Perception: Vision & Vision-Language Models** — The eyes of a modern robot: attention and Q/K/V, ViT, CLIP, SigLIP, and the diffusion/flow-matching machinery that generates behavior. → `/writing/robotics-guide/chapter-8-vlms` · *Aug 24, 2026*
9. **Vision-Language-Action Models** — The models running today's robots, as a lineage where each fixes the last: RT-1/2, OpenVLA, Octo, π0/π0.5, FAST, MolmoAct, GR00T, and Gemini Robotics. → `/writing/robotics-guide/chapter-9-vla` · *Aug 31, 2026*
10. **Learning from Demonstration & Data Collection** — Where robot data comes from: behavior cloning, action chunking (ACT), Diffusion Policy, teleop, UMI, and the LeRobot/Rerun tooling. → `/writing/robotics-guide/chapter-10-data` · *Sep 7, 2026*
11. **World Models & Simulation** — Escaping the data bottleneck: learned world models, Dreamer, video-generation models, Gaussian splatting, sim2real, and phys2real. → `/writing/robotics-guide/chapter-11-world-models` · *Sep 14, 2026*
12. **Manipulation, Humanoids & Deploying Real Systems** — Assembling the whole stack: grasping, dexterous hands, humanoids, ROS 2, evaluation, and safety — plus where the field goes next. → `/writing/robotics-guide/chapter-12-systems` · *Sep 21, 2026*

---

*built with next.js in waterloo, 2026*
