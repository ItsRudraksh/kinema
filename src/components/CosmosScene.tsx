"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useReducedMotion } from "motion/react";
import { fibonacciSpherePoint } from "@/lib/physics";
import type { CosmosNode, MediaCategory } from "@/lib/types";
import type { GlobeLens } from "@/store/useOrbisStore";

const ATLAS_COLS = 12;
const ATLAS_ROWS = 12;
const TILE_W = 168;
const TILE_H = 252;
const ATLAS_W = ATLAS_COLS * TILE_W;
const ATLAS_H = ATLAS_ROWS * TILE_H;
const BASE_SPHERE_RADIUS = 3.25;

interface CosmosSceneProps {
  nodes: CosmosNode[];
  lens: GlobeLens;
  isExplored: boolean;
  spinTriggerCount: number;
  spinCategoryFilter: MediaCategory | "all";
  spinIncludeRewatches: boolean;
  onSelectNode: (node: CosmosNode) => void;
  onSpinWinner: (node: CosmosNode) => void;
}

const VERTEX_SHADER = /* glsl */ `
  attribute vec4 aUvRect;
  attribute vec4 aMeta; // x: status, y: dim, z: isEpisodic, w: highlight
  uniform float uExplored;
  uniform float uTime;
  uniform vec3 uHoverLocalDir;
  uniform float uHoverStrength;
  varying vec2 vUv;
  varying vec4 vUvRect;
  varying vec4 vMeta;
  varying float vViewDepth;
  varying float vTide;

  void main() {
    vUv = uv;
    vUvRect = aUvRect;
    vMeta = aMeta;

    vec3 instCenter = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    float instRadius = max(length(instCenter), 1.0);
    vec3 instDir = instCenter / instRadius;

    float curveSign = 1.0 - 2.0 * uExplored;
    float theta = position.x / instRadius;
    float phi = position.y / instRadius;
    vec3 curvedLocal = vec3(
      instRadius * sin(theta) * cos(phi),
      instRadius * sin(phi),
      curveSign * instRadius * (cos(theta) * cos(phi) - 1.0)
    );

    float align = dot(instDir, normalize(uHoverLocalDir));
    float tide = smoothstep(0.84, 0.985, align) * uHoverStrength * (1.0 - uExplored * 0.45);
    float repelBand = smoothstep(0.66, 0.85, align) * (1.0 - smoothstep(0.86, 0.97, align)) * uHoverStrength;

    vTide = tide;
    curvedLocal.xy *= (1.0 + tide * 0.14);

    vec4 globePos = instanceMatrix * vec4(curvedLocal, 1.0);
    globePos.xyz += instDir * (tide * 0.34);

    vec3 tangentAway = instDir - uHoverLocalDir * align;
    float tLen = length(tangentAway);
    if (tLen > 0.001) {
      globePos.xyz += (tangentAway / tLen) * (repelBand * 0.2);
    }

    vec4 mvPos = modelViewMatrix * globePos;
    vViewDepth = -mvPos.z;
    gl_Position = projectionMatrix * mvPos;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uAtlas;
  uniform float uTime;
  varying vec2 vUv;
  varying vec4 vUvRect;
  varying vec4 vMeta;
  varying float vViewDepth;
  varying float vTide;

  void main() {
    vec2 centered = abs(vUv - 0.5) * 2.0;
    vec2 d = max(centered - vec2(0.88, 0.92), 0.0);
    if (length(d) > 0.12) discard;

    vec2 atlasUv = vec2(
      vUvRect.x + vUv.x * vUvRect.z,
      vUvRect.y + vUv.y * vUvRect.w
    );

    vec4 tex = texture2D(uAtlas, atlasUv);
    vec3 color = tex.rgb;

    float border = clamp(step(0.92, centered.x) + step(0.94, centered.y), 0.0, 1.0);

    vec3 rimColor = vec3(0.24, 0.28, 0.36);
    if (vMeta.x > 2.5) rimColor = vec3(0.96, 0.62, 0.04);
    else if (vMeta.x > 1.5) rimColor = vec3(0.22, 0.74, 0.97);
    else if (vMeta.x > 0.5) rimColor = vec3(0.20, 0.83, 0.60);

    float innerFrame = (vMeta.z > 0.5)
      ? (step(0.85, centered.x) * (1.0 - step(0.89, centered.x)))
      : 0.0;

    color = mix(color, rimColor, border * (0.85 + vTide * 0.15));
    color = mix(color, vec3(0.75, 0.9, 1.0), innerFrame * 0.4);

    if (vMeta.w > 0.5 || vTide > 0.15) {
      float pulse = 0.5 + 0.5 * sin(uTime * 5.0);
      color += rimColor * (vTide * 0.16 + vMeta.w * (0.1 + pulse * 0.14));
    }

    float dimFactor = mix(1.0, 0.18, vMeta.y);
    color *= dimFactor;

    float depthAlpha = mix(1.0, 0.82, clamp((vViewDepth - 6.0) / 11.0, 0.0, 1.0));
    float finalAlpha = mix(0.97, 0.34, vMeta.y) * depthAlpha;

    gl_FragColor = vec4(color, finalAlpha);
  }
`;

function drawFallbackTile(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  node: CosmosNode,
) {
  const x = col * TILE_W;
  const y = row * TILE_H;
  const grad = ctx.createLinearGradient(x, y, x + TILE_W, y + TILE_H);
  grad.addColorStop(0, "#151a28");
  grad.addColorStop(1, "#090b10");
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, TILE_W, TILE_H);

  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.strokeRect(x + 6, y + 6, TILE_W - 12, TILE_H - 12);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "600 10px monospace";
  ctx.fillText(node.category.toUpperCase(), x + 14, y + 26);

  ctx.fillStyle = "#f4f4f5";
  ctx.font = "600 14px Georgia, serif";
  const words = node.title.split(" ");
  let line = "";
  let lineY = y + TILE_H - 58;
  for (const w of words.slice(0, 6)) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > TILE_W - 28) {
      ctx.fillText(line, x + 14, lineY);
      line = w;
      lineY += 18;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x + 14, lineY);
}

interface SharedSceneRef {
  dragging: boolean;
  velX: number;
  velY: number;
  rotX: number;
  rotY: number;
  lastSpinTrigger: number;
  spinningMode: boolean;
  spinSettled: boolean;
  targetRotX: number | null;
  targetRotY: number | null;
  pointerNdcX: number;
  pointerNdcY: number;
  pointerActive: boolean;
  dragMovedPx: number;
}

interface GlobeInnerProps extends CosmosSceneProps {
  shared: React.MutableRefObject<SharedSceneRef>;
  onHoverTitle: (title: string | null) => void;
}

function GlobeInner({
  nodes,
  lens,
  isExplored,
  spinTriggerCount,
  spinCategoryFilter,
  spinIncludeRewatches,
  onSelectNode,
  onSpinWinner,
  shared,
  onHoverTitle,
}: GlobeInnerProps) {
  const { camera, size } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const ringsRef = useRef<THREE.Group>(null);
  const reduceMotion = useReducedMotion();

  const count = Math.min(nodes.length, ATLAS_COLS * ATLAS_ROWS);

  const { atlasCanvas, atlasTexture } = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = ATLAS_W;
    canvas.height = ATLAS_H;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.flipY = true;
    return { atlasCanvas: canvas, atlasTexture: texture };
  }, []);

  useEffect(() => {
    const ctx = atlasCanvas.getContext("2d");
    if (!ctx) return;

    let cancelled = false;
    ctx.fillStyle = "#0b0d14";
    ctx.fillRect(0, 0, ATLAS_W, ATLAS_H);

    for (let i = 0; i < count; i++) {
      drawFallbackTile(
        ctx,
        i % ATLAS_COLS,
        Math.floor(i / ATLAS_COLS),
        nodes[i],
      );
    }
    atlasTexture.needsUpdate = true;

    const loadQueue = async () => {
      const concurrency = 8;
      let cursor = 0;
      const worker = async () => {
        while (!cancelled && cursor < count) {
          const idx = cursor++;
          const node = nodes[idx];
          if (!node.posterPath) continue;
          await new Promise<void>((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              if (!cancelled) {
                const col = idx % ATLAS_COLS;
                const row = Math.floor(idx / ATLAS_COLS);
                ctx.drawImage(img, col * TILE_W, row * TILE_H, TILE_W, TILE_H);
                atlasTexture.needsUpdate = true;
              }
              resolve();
            };
            img.onerror = () => resolve();
            img.src = `/api/poster?path=${encodeURIComponent(node.posterPath!)}&size=w185`;
          });
        }
      };
      await Promise.all(Array.from({ length: concurrency }, worker));
    };

    void loadQueue();
    return () => {
      cancelled = true;
    };
  }, [atlasCanvas, atlasTexture, count, nodes]);

  const shaderMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        transparent: true,
        side: THREE.DoubleSide,
        uniforms: {
          uAtlas: { value: atlasTexture },
          uTime: { value: 0 },
          uExplored: { value: 0 },
          uHoverLocalDir: { value: new THREE.Vector3(0, 0, 1) },
          uHoverStrength: { value: 0 },
        },
      }),
    [atlasTexture],
  );

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(0.64, 0.96, 8, 12);
    const uvRects = new Float32Array(ATLAS_COLS * ATLAS_ROWS * 4);
    const metas = new Float32Array(ATLAS_COLS * ATLAS_ROWS * 4);

    for (let i = 0; i < ATLAS_COLS * ATLAS_ROWS; i++) {
      const col = i % ATLAS_COLS;
      const row = Math.floor(i / ATLAS_COLS);
      uvRects[i * 4 + 0] = col / ATLAS_COLS;
      uvRects[i * 4 + 1] = 1 - (row + 1) / ATLAS_ROWS;
      uvRects[i * 4 + 2] = 1 / ATLAS_COLS;
      uvRects[i * 4 + 3] = 1 / ATLAS_ROWS;
    }

    geo.setAttribute("aUvRect", new THREE.InstancedBufferAttribute(uvRects, 4));
    geo.setAttribute("aMeta", new THREE.InstancedBufferAttribute(metas, 4));
    return geo;
  }, []);

  useEffect(() => {
    const metaAttr = geometry.getAttribute(
      "aMeta",
    ) as THREE.InstancedBufferAttribute;
    const arr = metaAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const node = nodes[i];
      let statusCode = 0;
      if (node.diary?.favorite) statusCode = 3;
      else if (node.diary?.status === "watchlist") statusCode = 2;
      else if (node.diary) statusCode = 1;

      const isEpisodic = node.tmdbType === "tv" ? 1 : 0;

      let matchesLens = true;
      if (lens === "watchlist") {
        matchesLens =
          node.diary?.status === "watchlist" || node.source === "starter";
      } else if (lens !== "all") {
        matchesLens = node.category === lens;
      }

      arr[i * 4 + 0] = statusCode;
      arr[i * 4 + 1] = matchesLens ? 0 : 1;
      arr[i * 4 + 2] = isEpisodic;
      arr[i * 4 + 3] = shared.current.spinningMode && matchesLens ? 1 : 0;
    }
    metaAttr.needsUpdate = true;
  }, [count, geometry, lens, nodes, shared, spinTriggerCount]);

  useEffect(() => {
    if (spinTriggerCount > shared.current.lastSpinTrigger) {
      shared.current.lastSpinTrigger = spinTriggerCount;
      shared.current.spinningMode = true;
      shared.current.spinSettled = false;
      shared.current.targetRotX = null;
      shared.current.targetRotY = null;
      const dir = Math.random() > 0.5 ? 1 : -1;
      shared.current.velY = dir * (16 + Math.random() * 6);
      shared.current.velX = (Math.random() - 0.5) * 3.8;
    }
  }, [spinTriggerCount, shared]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const targetExplored = useRef(0);
  const smoothedHoverDir = useRef(new THREE.Vector3(0, 0, 1));
  const smoothedHoverStrength = useRef(0);
  const rayHelper = useMemo(() => new THREE.Raycaster(), []);
  const ndcVec = useMemo(() => new THREE.Vector2(), []);
  const invQuat = useMemo(() => new THREE.Quaternion(), []);
  const worldHit = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    shaderMaterial.uniforms.uTime.value = state.clock.elapsedTime;

    const exploredGoal = isExplored ? 1 : 0;
    targetExplored.current = THREE.MathUtils.lerp(
      targetExplored.current,
      exploredGoal,
      reduceMotion ? 1 : Math.min(1, dt * 4.5),
    );
    shaderMaterial.uniforms.uExplored.value = targetExplored.current;

    // Since mobile now renders the globe in its own dedicated center stage box,
    // use a clean balanced camera distance that fills the stage without clipping!
    const aspect = size.width / Math.max(size.height, 1);
    const baseZ = aspect < 0.85 ? 9.3 : 8.7;
    const spinBoostZ = shared.current.spinningMode ? 1.15 : 0;
    const camZ = THREE.MathUtils.lerp(
      baseZ + spinBoostZ,
      0.02,
      targetExplored.current,
    );

    camera.position.set(0, 0, camZ);
    camera.lookAt(0, 0, isExplored ? -5 : 0);

    if (groupRef.current) {
      const scrollRatio = Math.min(
        1,
        typeof window !== "undefined" ? window.scrollY / 480 : 0,
      );
      const shrinkScale = isExplored ? 1 : 1 - scrollRatio * 0.42;
      groupRef.current.scale.setScalar(shrinkScale);
    }

    const ds = shared.current;

    if (ds.targetRotY !== null && ds.targetRotX !== null && !ds.dragging) {
      ds.rotY = THREE.MathUtils.lerp(
        ds.rotY,
        ds.targetRotY,
        Math.min(1, dt * 7),
      );
      ds.rotX = THREE.MathUtils.lerp(
        ds.rotX,
        ds.targetRotX,
        Math.min(1, dt * 7),
      );
      if (
        Math.abs(ds.rotY - ds.targetRotY) < 0.01 &&
        Math.abs(ds.rotX - ds.targetRotX) < 0.01
      ) {
        ds.targetRotY = null;
        ds.targetRotX = null;
      }
    } else if (!ds.dragging) {
      ds.rotY += ds.velY * dt;
      ds.rotX += ds.velX * dt;

      const damping = ds.spinningMode ? 0.968 : 0.92;
      ds.velY *= Math.pow(damping, dt * 60);
      ds.velX *= Math.pow(damping, dt * 60);

      if (Math.abs(ds.velY) < 0.05 && !ds.spinningMode && !reduceMotion) {
        ds.rotY += (isExplored ? 0.032 : 0.075) * dt;
      }

      ds.rotX = THREE.MathUtils.clamp(ds.rotX, -1.05, 1.05);

      if (
        ds.spinningMode &&
        !ds.spinSettled &&
        Math.abs(ds.velY) < 0.45 &&
        Math.abs(ds.velX) < 0.45
      ) {
        ds.spinSettled = true;
        ds.spinningMode = false;
        ds.velY = 0;
        ds.velX = 0;

        const candidates = nodes.slice(0, count).filter((n) => {
          const catOk =
            spinCategoryFilter === "all" || n.category === spinCategoryFilter;
          const watchOk = spinIncludeRewatches
            ? true
            : n.diary?.status !== "completed";
          return catOk && watchOk;
        });
        const pool = candidates.length > 0 ? candidates : nodes.slice(0, count);

        let bestIdx = 0;
        let bestDot = -Infinity;
        const rotEuler = new THREE.Euler(ds.rotX, ds.rotY, 0, "XYZ");
        const forward = new THREE.Vector3(0, 0, 1);

        for (let i = 0; i < count; i++) {
          const n = nodes[i];
          if (!pool.some((p) => p.key === n.key)) continue;
          const [px, py, pz] = fibonacciSpherePoint(
            i,
            count,
            BASE_SPHERE_RADIUS,
          );
          const worldVec = new THREE.Vector3(px, py, pz)
            .applyEuler(rotEuler)
            .normalize();
          const dot = worldVec.dot(forward);
          if (dot > bestDot) {
            bestDot = dot;
            bestIdx = i;
          }
        }

        const winner = nodes[bestIdx];
        if (winner) {
          const [wx, wy, wz] = fibonacciSpherePoint(
            bestIdx,
            count,
            BASE_SPHERE_RADIUS,
          );
          const targetYaw = -Math.atan2(wx, wz);
          const targetPitch = Math.asin(
            THREE.MathUtils.clamp(wy / BASE_SPHERE_RADIUS, -0.9, 0.9),
          );
          ds.targetRotY =
            ds.rotY +
            Math.atan2(
              Math.sin(targetYaw - ds.rotY),
              Math.cos(targetYaw - ds.rotY),
            );
          ds.targetRotX = targetPitch;
          onSpinWinner(winner);
        }
      }
    }

    if (groupRef.current) {
      groupRef.current.rotation.x = ds.rotX;
      groupRef.current.rotation.y = ds.rotY;

      if (ds.pointerActive && !ds.dragging && !reduceMotion) {
        ndcVec.set(ds.pointerNdcX, ds.pointerNdcY);
        rayHelper.setFromCamera(ndcVec, camera);

        if (isExplored) {
          worldHit.copy(rayHelper.ray.direction).normalize();
        } else {
          const ray = rayHelper.ray;
          const b = ray.origin.dot(ray.direction);
          const c =
            ray.origin.dot(ray.origin) -
            BASE_SPHERE_RADIUS * BASE_SPHERE_RADIUS;
          const disc = b * b - c;
          if (disc >= 0) {
            const t = -b - Math.sqrt(disc);
            worldHit
              .copy(ray.origin)
              .addScaledVector(ray.direction, Math.max(t, 0.1))
              .normalize();
          } else {
            const closest = ray.origin
              .clone()
              .addScaledVector(ray.direction, -b)
              .normalize();
            worldHit.copy(closest);
          }
        }

        invQuat.copy(groupRef.current.quaternion).invert();
        worldHit.applyQuaternion(invQuat).normalize();
        smoothedHoverDir.current.lerp(worldHit, Math.min(1, dt * 10));
        smoothedHoverStrength.current = THREE.MathUtils.lerp(
          smoothedHoverStrength.current,
          1,
          Math.min(1, dt * 8),
        );
      } else {
        smoothedHoverStrength.current = THREE.MathUtils.lerp(
          smoothedHoverStrength.current,
          0,
          Math.min(1, dt * 6),
        );
      }

      shaderMaterial.uniforms.uHoverLocalDir.value.copy(
        smoothedHoverDir.current,
      );
      shaderMaterial.uniforms.uHoverStrength.value =
        smoothedHoverStrength.current;
    }

    if (ringsRef.current && !reduceMotion) {
      ringsRef.current.rotation.z += 0.06 * dt;
      ringsRef.current.rotation.x =
        Math.sin(state.clock.elapsedTime * 0.25) * 0.15;
    }

    if (meshRef.current) {
      for (let i = 0; i < count; i++) {
        const node = nodes[i];
        const ringDepth =
          node.diary?.favorite || node.diary?.status === "watching"
            ? 4.3
            : node.diary?.status === "watchlist"
              ? 5.6
              : 7.0;

        const r = THREE.MathUtils.lerp(
          BASE_SPHERE_RADIUS,
          ringDepth,
          targetExplored.current,
        );
        const [px, py, pz] = fibonacciSpherePoint(i, count, r);

        dummy.position.set(px, py, pz);
        if (targetExplored.current > 0.5) {
          dummy.lookAt(0, 0, 0);
        } else {
          dummy.lookAt(px * 2, py * 2, pz * 2);
        }

        dummy.scale.setScalar(isExplored ? 1.38 : 1);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
      }
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef}>
      <instancedMesh
        ref={meshRef}
        args={[geometry, shaderMaterial, count]}
        frustumCulled={false}
        onPointerMove={(e) => {
          if (typeof e.instanceId === "number" && nodes[e.instanceId]) {
            onHoverTitle(nodes[e.instanceId].title);
          }
        }}
        onPointerOut={() => onHoverTitle(null)}
        onClick={(e) => {
          e.stopPropagation();
          if (
            typeof e.instanceId === "number" &&
            nodes[e.instanceId] &&
            shared.current.dragMovedPx < 10
          ) {
            onSelectNode(nodes[e.instanceId]);
          }
        }}
      />

      <mesh>
        <sphereGeometry args={[2.52, 32, 32]} />
        <meshBasicMaterial
          color="#081222"
          transparent
          opacity={isExplored ? 0.05 : 0.44}
          depthWrite={false}
        />
      </mesh>

      <group ref={ringsRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[3.68, 3.7, 128]} />
          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={isExplored ? 0.35 : 0.22}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh rotation={[Math.PI / 3, Math.PI / 6, 0]}>
          <ringGeometry args={[3.92, 3.935, 128]} />
          <meshBasicMaterial
            color="#f59e0b"
            transparent
            opacity={isExplored ? 0.28 : 0.16}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh rotation={[-Math.PI / 4, 0, Math.PI / 5]}>
          <ringGeometry args={[4.16, 4.175, 128]} />
          <meshBasicMaterial
            color="#94a3b8"
            transparent
            opacity={0.14}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </group>
  );
}

class WebGLErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

export function CosmosScene(props: CosmosSceneProps) {
  const [webglReady, setWebglReady] = useState(true);
  const [hoverTitle, setHoverTitle] = useState<string | null>(null);

  const shared = useRef<SharedSceneRef>({
    dragging: false,
    velX: 0,
    velY: 0,
    rotX: 0.12,
    rotY: 0,
    lastSpinTrigger: 0,
    spinningMode: false,
    spinSettled: false,
    targetRotX: null,
    targetRotY: null,
    pointerNdcX: 0,
    pointerNdcY: 0,
    pointerActive: false,
    dragMovedPx: 0,
  });

  const lastPtr = useRef<{ x: number; y: number; t: number } | null>(null);

  const updatePointerNdc = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    shared.current.pointerNdcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    shared.current.pointerNdcY =
      -((e.clientY - rect.top) / rect.height) * 2 + 1;
    shared.current.pointerActive = true;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    shared.current.dragging = true;
    shared.current.dragMovedPx = 0;
    shared.current.targetRotX = null;
    shared.current.targetRotY = null;
    shared.current.velX = 0;
    shared.current.velY = 0;
    lastPtr.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    updatePointerNdc(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    updatePointerNdc(e);
    if (!shared.current.dragging || !lastPtr.current) return;

    const now = performance.now();
    const dt = Math.max(8, now - lastPtr.current.t) / 1000;
    const dx = e.clientX - lastPtr.current.x;
    const dy = e.clientY - lastPtr.current.y;
    shared.current.dragMovedPx += Math.hypot(dx, dy);

    const sensitivity = props.isExplored ? 0.0045 : 0.0062;
    const dRotY = dx * sensitivity;
    const dRotX = dy * sensitivity;

    shared.current.rotY += dRotY;
    shared.current.rotX = THREE.MathUtils.clamp(
      shared.current.rotX + dRotX,
      -1.05,
      1.05,
    );

    shared.current.velY = dRotY / dt;
    shared.current.velX = dRotX / dt;

    lastPtr.current = { x: e.clientX, y: e.clientY, t: now };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    shared.current.dragging = false;
    lastPtr.current = null;
  };

  useEffect(() => {
    try {
      const testCanvas = document.createElement("canvas");
      const gl =
        testCanvas.getContext("webgl2") || testCanvas.getContext("webgl");
      if (!gl) setWebglReady(false);
    } catch {
      setWebglReady(false);
    }
  }, []);

  const fallbackGrid = (
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 p-6 max-w-4xl mx-auto overflow-y-auto h-full">
      {props.nodes.slice(0, 20).map((n) => (
        <button
          key={n.key}
          onClick={() => props.onSelectNode(n)}
          className="orbis-press aspect-[2/3] rounded-lg overflow-hidden border border-white/10 bg-[#0d1017] text-left"
        >
          <img
            src={
              n.posterPath
                ? `/api/poster?path=${encodeURIComponent(n.posterPath)}&size=w342`
                : ""
            }
            alt={n.title}
            className="w-full h-full object-cover"
          />
        </button>
      ))}
    </div>
  );

  if (!webglReady) return fallbackGrid;

  return (
    <WebGLErrorBoundary fallback={fallbackGrid}>
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={() => {
          shared.current.pointerActive = false;
          setHoverTitle(null);
        }}
        className="relative w-full h-full touch-none cursor-grab active:cursor-grabbing select-none"
      >
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 0, 8.7], fov: 50, near: 0.1, far: 100 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
          }}
        >
          <GlobeInner {...props} shared={shared} onHoverTitle={setHoverTitle} />
        </Canvas>

        {hoverTitle && (
          <div className="pointer-events-none hidden md:flex items-center gap-2 absolute top-24 right-8 z-20 rounded-full orbis-glass px-3.5 py-1.5 text-xs text-white">
            <span className="size-1.5 rounded-full bg-cyan-400" />
            <span className="font-serif text-sm">{hoverTitle}</span>
          </div>
        )}
      </div>
    </WebGLErrorBoundary>
  );
}
