# Developer Notebook

A log of all tasks, ideas, and progress for this project.

## To Do

-   [ ] Integrate Gemini API for a core feature.
-   [ ] Create a more complex page layout.
-   [ ] Add interactive 3D elements with Three.js.

## In Progress

-   ...

## Done

-   **[2026-05-16 10:14]**: Major Stability & Control Overhaul: Switched to velocity-based movement (SetLinearVelocity) for both Player and AI to eliminate physics jitter/shaking. Implemented an aggressive anti-flip system that forces physics hulls to remain perfectly upright. Standardized forward vectors and throttle signs to fix W/S and A/D inversions. Toned down screen shake and refined camera look-at tracking.
-   **[2026-05-16 10:04]**: Fixed `ReferenceError: baseRotSpeed is not defined`. Standardized Forward vector to `[0, 0, -1]` to fix W/S inversion (W=Forward, S=Backward). Corrected A/D steering (D=Right/Clockwise). Reduced physics jitter by optimizing PID force calculation and using angular velocity damping instead of frame-by-frame rotation overrides.
-   **[2026-05-16 09:59]**: Fixed control inversions (W/S and A/D) by standardizing the forward vector to `[0, 0, 1]`. Resolved physics "shaking" by replacing hard frame-by-frame rotation overrides with high angular damping on X/Z and a lower PID gain ($K_p=25$). Refined camera tracking for smoother look-at behavior and reduced screen shake magnitude.
-   **[2026-05-16 09:52]**: Fixed "Flipping Tank" syndrome by enforcing upright physics orientation every frame (locking X/Z rotation). Retuned camera for a "Tactical Arcade" view: increased height, distance, and pitch for better battlefield situational awareness. Smoothed out camera tracking and look-target interpolation to reduce jitter.
-   **[2026-05-16 09:44]**: Fixed fundamental control inversion and "W-goes-right" behavior. Standardized yaw extraction using `atan2(-x, -z)`. Synchronized initial camera state to prevent orientation jumps. Overhauled physics parameters (Mass 1000, KP 40) for a "Modern Arcade" responsive feel with tight drifting and high-precision steering.
-   **[2026-05-16 09:35]**: Fixed critical crash `TypeError: currentQuat.toEuler is not a function` by implementing manual yaw extraction from the forward vector.
-   **[2026-05-16 09:31]**: Major steering overhaul: Switched from "Warp-based" rotation to physics-based `SetAngularVelocity` for realistic hull collisions and momentum. Implemented "Manual Override" for the auto-follow camera, which pauses alignment during active aiming to prevent camera fighting. Increased tank mass and refined forces for a "Heavy Arcade" feel inspired by modern tank sims.
-   **[2026-05-16 09:22]**: Implemented "Modern Arcade" control suite: Added speed-sensitive steering (tighter pivot turns, wider high-speed turns), responsive braking momentum, and a "Dynamic Swing" auto-follow camera that mimics vehicle physics. Increased camera height for better tactical awareness.
-   **[2026-05-16 09:15]**: Removed visible laser sight as requested. Implemented "Smart Follow" camera that automatically aligns behind the tank during movement while allowing manual orbit overrides.
-   **[2026-05-16 09:10]**: Improved aiming mechanics: Increased turret traverse speed from 1.5 to 4.5 rad/s for faster target acquisition. Added a visible red laser sight originating from the barrel tip to assist in precise aiming. (DEPRECATED Laser)
-   **[2026-05-16 09:05]**: Fixed camera jitter by refactoring `GameScreen.ts` to use higher-order interpolation and stabilized target tracking. Improved tank controls in `Tank.ts` with momentum-based rotation and refined physics force application for a more responsive arcade feel.
-   **[2026-05-16 08:58]**: Fixed "Tanks in the ground" issue by aligning visual mesh origins with physics centers in `Tank.ts` and `Enemy.ts`. Fixed Camera and fire consistency by tracking physics position directly instead of stale mesh transforms.
-   **[2026-05-16 07:40]**: Fixed "Tank Deformation" when turning (A/D) by refactoring component synchronization to use a strict matrix hierarchy (`bodyMatrix` parent). Replaced manual vector math with `UT.MAT4_MULTIPLY` chains.
-   **[2026-05-16 07:35]**: Fixed `TypeError: Cannot read properties of undefined (reading 'setPosition')` in `Tank.ts` caused by calling `setPosition` on an undefined `group` property. Synced all tank meshes to a calculated `origin` instead.
-   **[2026-05-16 07:30]**: Implemented "Modern Arcade" stability system. Separated vertical physics orientation (Pitch/Roll locked to 0) from visual banking. Lifted physics bodies (0.35m cushion) to prevent terrain snags. Increased mass (500) and angular damping (50) for premium weighty feel.
-   **[2026-05-16 07:20]**: Fixed `gfx3JoltManager.bodyInterface.SetAllowedDOFs is not a function` error by using `body.GetMotionProperties().SetAllowedDOFs(63)` instead.  
-   **[2026-05-16 07:15]**: Fixed major tank/enemy flipping issues by increasing angular damping (10x), resetting angular velocity after forced rotation, and projecting movement forces onto the ground normal. Enabled all rotation DOFs to support smooth ground alignment.
-   **[2026-05-16 07:10]**: Fixed Jolt physics API errors (`optimizeBroadPhase`, `removeBody`). Corrected player property access in `App.tsx`. Resolved numerous TypeScript linting errors in `Tank.ts`, `Enemy.ts`, and `ErrorBoundary.tsx`. Updated design system with `Bebas Neue`, `Victor Mono`, and Phosphor icons. 
-   **[2026-05-12 17:35]**: **v0.3.4 Desktop Optimization**. Disabled virtual mobile controls in desktop mode to clean up the UI for keyboard/mouse players.
-   **[2026-05-12 17:30]**: **v0.3.3 Visual & Control Polish**. Fixed turret/body mesh intersection. Added grenade expiry explosions. Implemented Pointer Lock and enhanced desktop controls (Shift/E for Grenades).
-   **[2026-05-12 17:15]**: **v0.3.2 Projectile Overhaul**. Fixed major physics desync where shells had no rotation. Corrected muzzle spawn calculation with recoil compensation. Replaced fuzzy impact detection with high-precision vector delta tracking.
-   **[2026-02-20 08:45]**: Implemented "System Spec" floating window and toggle in the Inspector group. Added interactive visuals, SVG animations, and "Copy as Markdown" button.
-   **[2024-05-21 13:30]**: Replaced the number input in Range Sliders with an interactive, animated counter for a more dynamic feel.
-   **[2024-05-21 13:15]**: Added a toggleable measurement overlay to the Stage, showing real-time dimensions for the button component.
-   **[2024-05-21 13:00]**: Completed extensive refactor into granular components (new Core inputs, Package panels for each window, Section for Stage).
-   **[2024-05-21 12:30]**: Refactored MetaPrototype into a modular component structure (App, Package, Section, Core) for better organization and scalability.
-   **[2024-05-21 12:00]**: Implemented Meta Prototype environment with draggable windows and State Layer physics.
-   **[2024-05-21 10:30]**: Implemented Tier 3 documentation files (`README.md`, `LLM.md`, `noteBook.md`, `bugReport.md`) as per system prompt.
-   **[2024-05-21 09:00]**: Initial project setup with React, Theme Provider, and responsive breakpoints.