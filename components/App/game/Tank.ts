import { gfx3JoltManager, JOLT_LAYER_MOVING, Gfx3Jolt } from '@lib/gfx3_jolt/gfx3_jolt_manager';
import { Gfx3Mesh } from '@lib/gfx3_mesh/gfx3_mesh';
import { Gfx3MeshJSM } from '@lib/gfx3_mesh/gfx3_mesh_jsm';
import { gfx3MeshRenderer } from '@lib/gfx3_mesh/gfx3_mesh_renderer';
import { Quaternion } from '@lib/core/quaternion';
import { UT } from '@lib/core/utils';
import { createBoxMesh, createUnitBoxMesh } from './GameUtils';

/**
 * The Tank class represents the player-controlled vehicle.
 * It manages multiple mesh components (body, turret, barrel, etc.)
 * and integrates with Jolt Physics for movement.
 */
export class Tank {
  static hpGreen: Gfx3Mesh;
  static hpRed: Gfx3Mesh;
  static hpInit: boolean = false;

  body: Gfx3Mesh;
  turret: Gfx3Mesh;
  barrel: Gfx3Mesh;
  trackL: Gfx3Mesh;
  trackR: Gfx3Mesh;
  engine: Gfx3Mesh;
  hatch: Gfx3Mesh;
  antenna: Gfx3Mesh;
  physicsBody: any;
  velocity: number = 0;
  rotation: number = 0;
  shellRecoil: number = 0;
  grenadeRecoil: number = 0;
  turretYaw: number = 0;
  wasFiringInternal: boolean = false;
  currentUp: vec3 = [0, 1, 0];
  hp: number = 100;
  recoil: number = 0;

  static initHPMeshes() {
    if (Tank.hpInit) return;
    Tank.hpGreen = createUnitBoxMesh([0, 1, 0]);
    Tank.hpRed = createUnitBoxMesh([1, 0, 0]);
    Tank.hpInit = true;
  }
  
  constructor() {
    Tank.initHPMeshes();
    const chassisColor: [number, number, number] = [0.4, 0.5, 0.3];
    const turretColor: [number, number, number] = [0.35, 0.45, 0.25];
    const trackColor: [number, number, number] = [0.15, 0.15, 0.15];
    const engineColor: [number, number, number] = [0.2, 0.2, 0.2];

    // Initial placeholders until JSM models load
    this.body = createBoxMesh(2.25, 0.9, 3.3, chassisColor);
    this.turret = createBoxMesh(1.65, 0.75, 1.65, turretColor);
    this.barrel = createBoxMesh(0.3, 0.3, 2.25, [0.2, 0.2, 0.2]);
    this.trackL = createBoxMesh(0.6, 0.9, 3.6, trackColor);
    this.trackR = createBoxMesh(0.6, 0.9, 3.6, trackColor);
    this.engine = createBoxMesh(1.8, 0.6, 0.9, engineColor);
    this.hatch = createBoxMesh(0.6, 0.15, 0.6, [0.15, 0.15, 0.15]);
    this.antenna = createBoxMesh(0.05, 1.5, 0.05, [0.1, 0.1, 0.1]);

    this.physicsBody = gfx3JoltManager.addBox({
      width: 3.45, height: 1.2, depth: 3.6, // Increased height for better collision volume
      x: 0, y: 1.0, z: 0,
      motionType: Gfx3Jolt.EMotionType_Dynamic,
      layer: JOLT_LAYER_MOVING,
      settings: { 
          mAngularDamping: 10.0, 
          mLinearDamping: 1.5,
          mMassPropertiesOverride: 10000.0, // Even heavier for grounded feel
          mCenterOfMassOffset: new Gfx3Jolt.Vec3(0, -0.4, 0) // Lower center of mass for stability
      }
    });

    // Strategy: We use smoothed velocity updates and a stabilization torque.
  }

  /**
   * Loads high-fidelity JSM models for the tank components.
   */
  async load() {
    const bodyJSM = new Gfx3MeshJSM();
    const turretJSM = new Gfx3MeshJSM();
    const barrelJSM = new Gfx3MeshJSM();

    try {
      await Promise.all([
        bodyJSM.loadFromFile('models/tank_body.jsm'),
        turretJSM.loadFromFile('models/tank_turret.jsm'),
        barrelJSM.loadFromFile('models/tank_barrel.jsm')
      ]);

      this.body = bodyJSM;
      this.turret = turretJSM;
      this.barrel = barrelJSM;
    } catch (e) {
      console.warn('Failed to load JSM models, falling back to procedural boxes.', e);
    }
  }

  /**
   * Updates physics and syncs mesh transforms.
   */
  update(ts: number, moveDir: { x: number, y: number }, fireNormal: boolean, fireGrenade: boolean, cameraYaw: number = 0, cameraPitch: number = 0): { normal: boolean, grenade: boolean, muzzlePos: vec3, muzzleDir: vec3 } {
    const speed = 15;
    const rotSpeed = 3.5;

    let didShootNormal = false;
    let didShootGrenade = false;

    if (fireNormal && this.shellRecoil <= 0) {
      this.shellRecoil = 1.0;
      didShootNormal = true;
    }

    if (fireGrenade && this.grenadeRecoil <= 0) {
      this.grenadeRecoil = 1.0;
      didShootGrenade = true;
    }

    this.shellRecoil -= (ts / 1000) * 5; 
    if (this.shellRecoil < 0) this.shellRecoil = 0;

    this.grenadeRecoil -= (ts / 1000) * 2; // Grenades have slower fire rate
    if (this.grenadeRecoil < 0) this.grenadeRecoil = 0;
    
    // Steering Logic: A/D should feel natural (A=Left, D=Right)
    const speedFactor = Math.min(1.0, Math.abs(this.velocity) / speed);
    const baseRotSpeed = rotSpeed * (1.1 - speedFactor * 0.4); 
    const targetTurnVelocity = moveDir.x * baseRotSpeed; // D is +1, turns Right
    
    // Y-axis angular velocity: negative is clockwise (Right), positive is counter-clockwise (Left)
    const angVelCurrent = this.physicsBody.body.GetAngularVelocity();
    const turnAlphaValue = 1.0 - Math.exp(-25.0 * (ts / 1000)); 
    const targetAngVelY = UT.LERP(angVelCurrent.GetY(), -targetTurnVelocity, turnAlphaValue);
    
    // Smoothly apply angular velocity and aggressively dampen X/Z
    gfx3JoltManager.bodyInterface.SetAngularVelocity(
      this.physicsBody.body.GetID(), 
      new Gfx3Jolt.Vec3(angVelCurrent.GetX() * 0.2, targetAngVelY, angVelCurrent.GetZ() * 0.2)
    );
    
    // FORWARD MOVEMENT LOGIC
    // W should move Forward. User reports: "w means backward and s means front".
    const throttle = -moveDir.y; 
    const isBraking = (throttle > 0 && this.velocity < 0) || (throttle < 0 && this.velocity > 0);
    const targetVelocity = throttle * speed;
    
    // Accel/Decel smoothing
    const accelRate = throttle !== 0 ? (isBraking ? -20.0 : -6.0) : -15.0;
    const accelAlphaValue = 1.0 - Math.exp(accelRate * (ts / 1000));
    this.velocity = UT.LERP(this.velocity, targetVelocity, accelAlphaValue);

    // Physics Update
    const pos = this.physicsBody.body.GetPosition();
    const qPhysics = this.physicsBody.body.GetRotation();
    const currentQuat = new Quaternion(qPhysics.GetW(), qPhysics.GetX(), qPhysics.GetY(), qPhysics.GetZ());
    
    // Extract Yaw from current physics orientation
    const forwardVec = currentQuat.rotateVector([0, 0, 1]);
    this.rotation = Math.atan2(-forwardVec[0], -forwardVec[2]);

    const uprightQuat = Quaternion.createFromEuler(this.rotation, 0, 0, 'YXZ');
    
    // STABILIZATION TORQUE: Neutralize Pitch and Roll (X, Z) to keep the tank upright.
    // We calculate the current local "up" in world space and apply torque towards world "up".
    const currentUpVec = currentQuat.rotateVector([0, 1, 0]);
    const tiltErrorX = -currentUpVec[2]; // Simplified roll/pitch error
    const tiltErrorZ = currentUpVec[0];  
    const stabilityAlpha = 5000000.0; // Strong corrective torque
    
    gfx3JoltManager.bodyInterface.AddTorque(
        this.physicsBody.body.GetID(), 
        new Gfx3Jolt.Vec3(tiltErrorX * stabilityAlpha, 0, tiltErrorZ * stabilityAlpha)
    );

    // MOVEMENT STABILITY: Proportional Velocity matching
    const forwardVecActual = uprightQuat.rotateVector([0, 0, 1]);
    const currentJoltVel = this.physicsBody.body.GetLinearVelocity();
    const targetLinearVel = UT.VEC3_SCALE(forwardVecActual, this.velocity);
    
    // Exponential smoothing for linear velocity to eliminate high-frequency jitter
    const velAlphaValue = 1.0 - Math.exp(-20.0 * (ts / 1000));
    const nextVX = UT.LERP(currentJoltVel.GetX(), targetLinearVel[0], velAlphaValue);
    const nextVZ = UT.LERP(currentJoltVel.GetZ(), targetLinearVel[2], velAlphaValue);

    // Maintain natural Y velocity (gravity/falling)
    gfx3JoltManager.bodyInterface.SetLinearVelocity(
        this.physicsBody.body.GetID(), 
        new Gfx3Jolt.Vec3(nextVX, currentJoltVel.GetY(), nextVZ)
    );

    // Visual Banking (Mesh only)
    let visualQuat = uprightQuat;
    
    // Cast rays from 4 corners down to find the ground normal for smooth banking
    const hw = 1.5; 
    const hd = 1.8; 

    // Extract Yaw component only for raycast orientation consistency
    const sinYaw = Math.sin(this.rotation);
    const cosYaw = Math.cos(this.rotation);
    const fx = -sinYaw, fz = -cosYaw;
    const rx = cosYaw, rz = -sinYaw;
    
    const cx = pos.GetX();
    const cy = pos.GetY();
    const cz = pos.GetZ();

    const getHitPoint = (dx: number, dz: number): vec3 => {
      const wx = cx + rx * dx + fx * dz;
      const wz = cz + rz * dx + fz * dz;
      const ray = gfx3JoltManager.createRay(wx, cy + 0.5, wz, wx, cy - 3.0, wz);
      if (ray.fraction < 1.0 && ray.normal && ray.normal.GetY() > 0.5) {
        return [wx, cy + 0.5 - ray.fraction * 3.5, wz];
      }
      return [wx, cy - 0.5, wz]; 
    };

    const fl = getHitPoint(-hw, hd);
    const fr = getHitPoint(hw, hd);
    const bl = getHitPoint(-hw, -hd);
    const br = getHitPoint(hw, -hd);

    const vecFront = UT.VEC3_SCALE(UT.VEC3_ADD(fl, fr), 0.5);
    const vecBack = UT.VEC3_SCALE(UT.VEC3_ADD(bl, br), 0.5);
    const vecLeft = UT.VEC3_SCALE(UT.VEC3_ADD(fl, bl), 0.5);
    const vecRight = UT.VEC3_SCALE(UT.VEC3_ADD(fr, br), 0.5);

    const vForward = UT.VEC3_NORMALIZE(UT.VEC3_SUBSTRACT(vecFront, vecBack));
    const vRight = UT.VEC3_NORMALIZE(UT.VEC3_SUBSTRACT(vecRight, vecLeft));

    let targetUp = UT.VEC3_CROSS(vRight, vForward);
    
    if (UT.VEC3_LENGTH(targetUp) < 0.001) {
       targetUp = [0, 1, 0];
    } else {
       targetUp = UT.VEC3_NORMALIZE(targetUp);
       if (targetUp[1] < 0) targetUp = UT.VEC3_SCALE(targetUp, -1);
    }
    
    // More conservative smoothing for visual banking (2.0 smoothing factor)
    this.currentUp = UT.VEC3_LERP(this.currentUp, targetUp, 2.0 * (ts / 1000));
    this.currentUp = UT.VEC3_NORMALIZE(this.currentUp);

    const up: vec3 = [0, 1, 0];
    let axis = UT.VEC3_CROSS(up, this.currentUp);
    const dot = UT.VEC3_DOT(up, this.currentUp);
    if (UT.VEC3_LENGTH(axis) > 0.001 && Math.abs(dot) < 0.999) {
        axis = UT.VEC3_NORMALIZE(axis);
        const clampedDot = Math.max(-1, Math.min(1, dot));
        const angle = Math.acos(clampedDot);
        const alignQ = Quaternion.createFromAxisAngle(axis, angle);
        visualQuat = alignQ.mul(visualQuat.w, visualQuat.x, visualQuat.y, visualQuat.z);
    }

    // Sync Visuals
    const q = visualQuat;
    const origin: vec3 = [pos.GetX(), pos.GetY(), pos.GetZ()];

    // Root Body Matrix
    const bodyRecoil = this.recoil > 0 ? this.recoil * 0.05 : 0;
    const recoilQ = Quaternion.createFromEuler(0, bodyRecoil, 0, 'YXZ');
    const finalVisualQ = q.mul(recoilQ.w, recoilQ.x, recoilQ.y, recoilQ.z);

    const bodyMatrix = UT.MAT4_TRANSFORM(origin, [0, 0, 0], [1, 1, 1], finalVisualQ);
    this.recoil = UT.LERP(this.recoil, 0, 5.0 * (ts / 1000));
    
    // Body Mesh
    this.body.enableManualTransform(bodyMatrix);

    // Helper for rigid attachment
    const syncRigid = (mesh: Gfx3Mesh, localPos: vec3) => {
        const localMatrix = UT.MAT4_TRANSFORM(localPos, [0, 0, 0], [1, 1, 1], new Quaternion());
        mesh.enableManualTransform(UT.MAT4_MULTIPLY(bodyMatrix, localMatrix));
    };

    syncRigid(this.trackL, [-1.425, -0.15, 0]);
    syncRigid(this.trackR, [1.425, -0.15, 0]);
    syncRigid(this.engine, [0, 0.3, 1.8]);

    // Turret Logic
    let yawDiff = ((cameraYaw - this.turretYaw) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    if (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
    
    // Increased traverse speed for snappier arcade feel
    const turretTraverseSpeed = 4.5;
    const traverseAmount = turretTraverseSpeed * (ts / 1000);
    
    if (Math.abs(yawDiff) < traverseAmount) {
        this.turretYaw = cameraYaw;
    } else {
        this.turretYaw += Math.sign(yawDiff) * traverseAmount;
    }
    
    const localYaw = (this.turretYaw - this.rotation);
    const localYawQ = Quaternion.createFromEuler(localYaw, 0, 0, 'YXZ');
    
    // Turret Matrix = BodyMatrix * LocalOffset * LocalYaw
    const turretPivotMatrix = UT.MAT4_MULTIPLY(bodyMatrix, UT.MAT4_TRANSLATE(0, 0.85, 0));
    const turretMatrix = UT.MAT4_MULTIPLY(turretPivotMatrix, localYawQ.toMatrix4());
    this.turret.enableManualTransform(turretMatrix);

    // Barrel Logic
    const maxDepress = 0.25; 
    const maxElevate = 0.2;
    const clampedPitch = Math.max(-maxElevate, Math.min(maxDepress, cameraPitch));
    const pitchQ = Quaternion.createFromEuler(0, -clampedPitch, 0, 'YXZ');

    const visualRecoilValue = this.shellRecoil > 0 ? this.shellRecoil * 0.45 : 0;
    const barrelPivotMatrix = UT.MAT4_MULTIPLY(turretMatrix, UT.MAT4_TRANSLATE(0, 0.1, -1.2 + visualRecoilValue));
    const barrelMatrix = UT.MAT4_MULTIPLY(barrelPivotMatrix, pitchQ.toMatrix4());
    this.barrel.enableManualTransform(barrelMatrix);
    
    // Hatch & Antenna (Fixed to Turret)
    const syncToTurret = (mesh: Gfx3Mesh, localPos: vec3) => {
        const localMatrix = UT.MAT4_TRANSLATE(localPos[0], localPos[1], localPos[2]);
        mesh.enableManualTransform(UT.MAT4_MULTIPLY(turretMatrix, localMatrix));
    };

    syncToTurret(this.hatch, [0, 0.375 + 0.075, 0.3]);
    syncToTurret(this.antenna, [-0.6, 0.375 + 0.75, 0.6]);

    // Calculate Muzzle Pos & Dir from barrelMatrix
    // Muzzle is at local [0, 0, -1.125] relative to barrel center
    const muzzleLocalPos = [0, 0, -1.125, 1];
    const muzzleWorldPosVec4 = UT.MAT4_MULTIPLY_BY_VEC4(barrelMatrix, muzzleLocalPos);
    const muzzleWorldPos: vec3 = [muzzleWorldPosVec4[0], muzzleWorldPosVec4[1], muzzleWorldPosVec4[2]];
    
    // Direction is forward of barrelMatrix [0, 0, -1]
    const muzzleWorldDirVec4 = UT.MAT4_MULTIPLY_BY_VEC4(barrelMatrix, [0, 0, -1, 0]);
    const muzzleWorldDir = UT.VEC3_NORMALIZE([muzzleWorldDirVec4[0], muzzleWorldDirVec4[1], muzzleWorldDirVec4[2]]);
    
    return { 
      normal: didShootNormal, 
      grenade: didShootGrenade,
      muzzlePos: muzzleWorldPos,
      muzzleDir: muzzleWorldDir
    };
  }
  
  /**
   * Renders all tank components.
   */
  draw(cameraYaw: number = 0) {
    this.body.draw();
    this.trackL.draw();
    this.trackR.draw();
    this.engine.draw();
    this.turret.draw();
    this.barrel.draw();
    this.hatch.draw();
    this.antenna.draw();
  }

  drawHealthBar(origin: vec3, hp: number, maxHp: number, cameraYaw: number = 0) {
      const hpPercentage = Math.max(0, hp / maxHp);
      const barMesh = hpPercentage > 0.5 ? Tank.hpGreen : Tank.hpRed;
      
      const barWidth = 1.5;
      const barHeight = 0.2;
      const barDepth = 0.2;
      
      // Calculate scale and position to shrink towards the left
      const scaleX = barWidth * hpPercentage;
      
      // Billboarding: Rotate healthbar to face camera yaw
      const barRotation = Quaternion.createFromEuler(cameraYaw, 0, 0, 'YXZ');
      
      // Calculate offset in billboard space so it shrinks correctly
      const offsetLocal = [-(barWidth - scaleX) / 2, 0, 0] as vec3;
      const offsetWorld = barRotation.rotateVector(offsetLocal);
      
      const matBar = UT.MAT4_TRANSFORM(
          [origin[0] + offsetWorld[0], origin[1] + 3.0, origin[2] + offsetWorld[2]], 
          [0, 0, 0], 
          [scaleX, barHeight, barDepth], 
          barRotation
      );
      
      gfx3MeshRenderer.drawMesh(barMesh, matBar);
  }
}

