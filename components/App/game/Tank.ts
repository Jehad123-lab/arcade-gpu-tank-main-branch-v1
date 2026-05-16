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
      width: 3.45, height: 0.9, depth: 3.6,
      x: 0, y: 0.5, z: 0,
      motionType: Gfx3Jolt.EMotionType_Dynamic,
      layer: JOLT_LAYER_MOVING,
      settings: { mAngularDamping: 10.0, mMassPropertiesOverride: 100.0 }
    });
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
  update(ts: number, moveDir: { x: number, y: number }, fireNormal: boolean, fireGrenade: boolean, cameraYaw: number = 0, cameraPitch: number = 0): { normal: boolean, grenade: boolean } {
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
    
    // Steering Logic
    this.rotation -= moveDir.x * rotSpeed * (ts / 1000); 
    
    const throttle = moveDir.y;
    const targetVelocity = throttle * speed;
    const accelRate = throttle !== 0 ? 0.05 : 0.1;
    this.velocity = UT.LERP(this.velocity, targetVelocity, accelRate);

    // Physics Update
    const pos = this.physicsBody.body.GetPosition();
    let quat = Quaternion.createFromEuler(this.rotation, 0, 0, 'YXZ');
    
    // Cast rays from 4 corners down to find the ground normal for smooth banking
    const hw = 1.4; // Half-width
    const hd = 1.6; // Half-depth

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
      const ray = gfx3JoltManager.createRay(wx, cy, wz, wx, cy - 3.0, wz);
      if (ray.fraction < 1.0 && ray.normal && ray.normal.GetY() > 0.5) {
        return [wx, cy - ray.fraction * 3.0, wz];
      }
      // If no valid ground hit, assume the ground is flat at cy - 0.5
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
    
    // Smoothly lerp the current up vector towards the ground normal
    this.currentUp = UT.VEC3_LERP(this.currentUp, targetUp, 6.0 * (ts / 1000));
    this.currentUp = UT.VEC3_NORMALIZE(this.currentUp);

    const up: vec3 = [0, 1, 0];
    let axis = UT.VEC3_CROSS(up, this.currentUp);
    const dot = UT.VEC3_DOT(up, this.currentUp);
    // Only align if there's a valid angle
    if (UT.VEC3_LENGTH(axis) > 0.001 && Math.abs(dot) < 0.999) {
        axis = UT.VEC3_NORMALIZE(axis);
        const clampedDot = Math.max(-1, Math.min(1, dot));
        const angle = Math.acos(clampedDot);
        const alignQ = Quaternion.createFromAxisAngle(axis, angle);
        quat = alignQ.mul(quat.w, quat.x, quat.y, quat.z); // Multiply align * yaw
    }

    const joltQuat = new Gfx3Jolt.Quat(quat.x, quat.y, quat.z, quat.w);
    // Sync physics body rotation with visual rotation (including ground alignment)
    gfx3JoltManager.bodyInterface.SetRotation(this.physicsBody.body.GetID(), joltQuat, Gfx3Jolt.EActivation_Activate);
    // Reset angular velocity to prevent physics engine from fighting our forced rotation
    gfx3JoltManager.bodyInterface.SetAngularVelocity(this.physicsBody.body.GetID(), new Gfx3Jolt.Vec3(0, 0, 0));

    // Physics Movement Update (using ground-aligned orientation)
    const forward = quat.rotateVector([0, 0, -1]);
    const linVel = UT.VEC3_SCALE(forward, this.velocity);
    const curVel = this.physicsBody.body.GetLinearVelocity();
    
    const mass = 100.0;
    const velDiffX = linVel[0] - curVel.GetX();
    const velDiffY = linVel[1] - curVel.GetY();
    const velDiffZ = linVel[2] - curVel.GetZ();
    
    const kp = 10.0; 
    const maxForce = 5000.0;
    const forceX = Math.max(-maxForce, Math.min(maxForce, velDiffX * mass * kp));
    const forceY = Math.max(-maxForce, Math.min(maxForce, velDiffY * mass * kp));
    const forceZ = Math.max(-maxForce, Math.min(maxForce, velDiffZ * mass * kp));
    
    const joltForce = new Gfx3Jolt.Vec3(forceX, forceY, forceZ);
    gfx3JoltManager.bodyInterface.AddForce(this.physicsBody.body.GetID(), joltForce, Gfx3Jolt.EActivation_Activate);

    // Sync Mesh Positions
    const q = quat;

    this.body.setPosition(pos.GetX(), pos.GetY(), pos.GetZ());
    this.body.setQuaternion(q);

    // Component Offsets
    const trackOffsetL = q.rotateVector([-1.425, -0.15, 0]);
    this.trackL.setPosition(pos.GetX() + trackOffsetL[0], pos.GetY() + trackOffsetL[1], pos.GetZ() + trackOffsetL[2]);
    this.trackL.setQuaternion(q);

    const trackOffsetR = q.rotateVector([1.425, -0.15, 0]);
    this.trackR.setPosition(pos.GetX() + trackOffsetR[0], pos.GetY() + trackOffsetR[1], pos.GetZ() + trackOffsetR[2]);
    this.trackR.setQuaternion(q);

    const engineOffset = q.rotateVector([0, 0.3, 1.8]);
    this.engine.setPosition(pos.GetX() + engineOffset[0], pos.GetY() + engineOffset[1], pos.GetZ() + engineOffset[2]);
    this.engine.setQuaternion(q);

    // Turret follows body tilt but has independent yaw
    // We want the turret to smoothly turn to face cameraYaw.
    // Calculate the shortest angle path
    let yawDiff = ((cameraYaw - this.turretYaw) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    if (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
    
    const turretTraverseSpeed = 1.5; // rad per second
    const traverseAmount = turretTraverseSpeed * (ts / 1000);
    
    if (Math.abs(yawDiff) < traverseAmount) {
        this.turretYaw = cameraYaw;
    } else {
        this.turretYaw += Math.sign(yawDiff) * traverseAmount;
    }
    
    const localYaw = (this.turretYaw - this.rotation);
    const localYawQ = Quaternion.createFromEuler(localYaw, 0, 0, 'YXZ');
    const turretQ = q.mul(localYawQ.w, localYawQ.x, localYawQ.y, localYawQ.z);
    
    // Apply pitch exclusively to the barrel/turret gun
    // Note: To pitch up, we rotate around X axis.
    // Inverting cameraPitch so that looking down with camera aims barrel down.
    const maxDepress = 0.25; 
    const maxElevate = 0.2;
    const clampedPitch = Math.max(-maxElevate, Math.min(maxDepress, cameraPitch));
    const pitchQ = Quaternion.createFromEuler(0, -clampedPitch, 0, 'YXZ'); // pitch is X axis rotation
    const barrelQ = turretQ.mul(pitchQ.w, pitchQ.x, pitchQ.y, pitchQ.z);

    // Increase turret elevation to sit properly on body top (body height 0.9 -> top 0.45)
    // Turret height 0.75 -> center at 0.45 + 0.375 = 0.825. Using 0.85 for safety.
    const turretOffset = q.rotateVector([0, 0.85, 0]);
    this.turret.setPosition(pos.GetX() + turretOffset[0], pos.GetY() + turretOffset[1], pos.GetZ() + turretOffset[2]);
    this.turret.setQuaternion(turretQ);

    const visualRecoil = this.shellRecoil > 0 ? this.shellRecoil * 0.45 : 0;
    const barrelRelativePos = barrelQ.rotateVector([0, 0.1, -1.2 + visualRecoil]); // Slightly elevate barrel center
    const turretPos = this.turret.getPosition();
    this.barrel.setPosition(turretPos[0] + barrelRelativePos[0], turretPos[1] + barrelRelativePos[1], turretPos[2] + barrelRelativePos[2]);
    this.barrel.setQuaternion(barrelQ);
    
    const hatchOffset = turretQ.rotateVector([0, 0.375 + 0.075, 0.3]);
    this.hatch.setPosition(turretPos[0] + hatchOffset[0], turretPos[1] + hatchOffset[1], turretPos[2] + hatchOffset[2]);
    this.hatch.setQuaternion(turretQ);
    
    const antennaOffset = turretQ.rotateVector([-0.6, 0.375 + 0.75, 0.6]);
    this.antenna.setPosition(turretPos[0] + antennaOffset[0], turretPos[1] + antennaOffset[1], turretPos[2] + antennaOffset[2]);
    this.antenna.setQuaternion(turretQ);
    
    return { normal: didShootNormal, grenade: didShootGrenade };
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

