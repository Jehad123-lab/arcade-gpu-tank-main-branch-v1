# Bug Report Log

Tracking all issues, from critical bugs to minor suggestions.

## Critical (App Breaking)

-   **[RESOLVED] PROJECTILE PHYSICS DESYNC**: Shells weren't passing rotation to Jolt. Visually rotated, physically axis-aligned. Fixed by passing Euler-to-Quat to `addBox`.
-   **[RESOLVED] RECOIL CLIPPING**: Projectiles spawned at static offsets while barrel was recoiling, causing shells to spawn inside the turret. Fixed with dynamic muzzle offset.
-   **[RESOLVED] ELASTIC BOUNCE BUG**: Shells didn't explode on walls because speed didn't drop (elastic collision). Fixed by checking vector direction changes.
-   **[RESOLVED] THE 12-METER SAFE ZONE**: Projectiles were "invulnerable" for too long (0.1s), letting shells bounce off nearby walls without exploding. Fixed by tightening the window.
-   **[RESOLVED] TURRET INTERSECTION**: Turret center was at 0.675, body top at 0.45. Intersection caused Z-fighting/disappearing. Elevated to 0.85.
-   **[RESOLVED] GRENADE DUD BUG**: Grenades didn't explode if they came to a rest before life expired. Added expiry explosion logic.
-   **[RESOLVED] MOUSE LOOK/LOCK**: Added pointer lock and refined fire mappings for desktop feel.
-   **[RESOLVED] UI CLUTTER**: Virtual joysticks and action buttons now hide automatically in desktop mode.
-   **[RESOLVED] TANK DEFORMATION**: Sub-meshes drifted during rotation. Fixed with rigid matrix hierarchy sync.
-   **[RESOLVED] GROUND SINKING**: Visual meshes were offset downwards. Fixed by center-aligning meshes with physics bodies.
-   **[RESOLVED] CAMERA TRACKING**: Camera tracked stale mesh positions. Fixed by tracking physics bodies directly.
-   **[RESOLVED] CAMERA JITTER**: Refactored camera orbit interpolation to eliminate micro-shaking.
-   **[RESOLVED] TANK HANDLING**: Added momentum and improved steering responsiveness.
-   **[RESOLVED] AIMING DIFFICULTY**: Increased turret traverse speed and added red laser pointer for visual guidance. (Laser removed later per feedback).
-   **[RESOLVED] CAMERA AUTO-FOLLOW**: Camera now intelligently follows tank movement direction for easier navigation.
-   **[RESOLVED] ARCADE PHYSICS**: Controls now feature speed-sensitive steering and snappy braking/acceleration.
-   **[RESOLVED] CAMERA SMOOTHING**: Refined interpolation for a better "Modern Arcade" tactical view.

## Warning (Unexpected Behavior)

-   ...

## Suggestion (Improvements)

-   [ ] Add more interactive SVG animations to the System Spec window for each rule.
-   ...
