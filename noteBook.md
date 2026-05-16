# Developer Notebook

A log of all tasks, ideas, and progress for this project.

## To Do

-   [ ] Integrate Gemini API for a core feature.
-   [ ] Create a more complex page layout.
-   [ ] Add interactive 3D elements with Three.js.

## In Progress

-   ...

## Done

-   **[2026-05-16 09:10]**: Improved aiming mechanics: Increased turret traverse speed from 1.5 to 4.5 rad/s for faster target acquisition. Added a visible red laser sight originating from the barrel tip to assist in precise aiming.
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