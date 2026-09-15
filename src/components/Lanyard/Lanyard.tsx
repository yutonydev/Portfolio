/* eslint-disable react/no-unknown-property */
'use client';
import { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { Canvas, extend, useFrame, useThree, type ThreeElement, type ThreeEvent } from '@react-three/fiber';
import { useGLTF, useTexture, Environment, Lightformer } from '@react-three/drei';
import {
  BallCollider,
  CuboidCollider,
  Physics,
  RigidBody,
  useRopeJoint,
  useSphericalJoint,
  type RapierRigidBody,
  type RigidBodyProps
} from '@react-three/rapier';
import { MeshLineGeometry, MeshLineMaterial } from 'meshline';
import * as THREE from 'three';

import cardGLB from './card.glb';
import lanyard from './lanyard.png';

extend({ MeshLineGeometry, MeshLineMaterial });

// Start loading the model as soon as this module is imported.
useGLTF.preload(cardGLB);

/** Composited card textures, cached so revisits skip rebuilding and re-uploading them. */
const cardMapCache = new Map<string, THREE.CanvasTexture>();

declare module '@react-three/fiber' {
  interface ThreeElements {
    meshLineGeometry: ThreeElement<typeof MeshLineGeometry>;
    meshLineMaterial: ThreeElement<typeof MeshLineMaterial>;
  }
}

// Placeholder so useTexture can be called unconditionally.
const BLANK_PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// Front face maps to the left half of the atlas, back face to the right.
// 0.7572 is the mesh's real max V; lower values leave a strip of the old texture.
const FRONT_UV_RECT = { x: 0, y: 0, w: 0.5, h: 0.7572 };
const BACK_UV_RECT = { x: 0.5, y: 0, w: 0.5, h: 0.7572 };

/** Radius in world units treated as "over the card" for pointer hit-testing. */
const CARD_HIT_RADIUS = 1.35;

/** Height of the card in world units — its collider is 0.8 x 1.125 half-extents. */
const CARD_WORLD_HEIGHT = 2.25;

/**
 * Sets the camera imperatively, since R3F ignores later changes to <Canvas camera>.
 * Pins the card's on-screen height and hangs the rig anchorRightPx from the right edge.
 */
function CameraRig({
  cardHeightPx,
  anchorRightPx
}: {
  cardHeightPx?: number | null;
  anchorRightPx?: number | null;
}) {
  const { camera, size } = useThree();

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const halfFovTan = Math.tan((cam.fov * Math.PI) / 180 / 2);

    if (cardHeightPx != null && cardHeightPx > 0) {
      cam.position.z = (CARD_WORLD_HEIGHT * size.height) / (2 * halfFovTan * cardHeightPx);
    }

    if (anchorRightPx != null) {
      const unitsPerPx = (2 * halfFovTan * cam.position.z) / size.height;
      cam.position.x = -(size.width - anchorRightPx - size.width / 2) * unitsPerPx;
    }

    cam.updateProjectionMatrix();
  }, [camera, size.width, size.height, cardHeightPx, anchorRightPx]);

  return null;
}

/**
 * Uploads textures and links shaders one per frame before the loop starts, so the
 * first render doesn't freeze the page. compileAsync was over a second slower.
 */
function WarmUp({ onReady }: { onReady: (ready: boolean) => void }) {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    const nextFrame = () =>
      new Promise<void>(resolve => {
        raf = requestAnimationFrame(() => resolve());
      });

    (async () => {
      await nextFrame();

      const textures = new Set<THREE.Texture>();
      scene.traverse(object => {
        const material = (object as THREE.Mesh).material;
        if (!material) return;
        for (const m of Array.isArray(material) ? material : [material]) {
          const map = (m as THREE.MeshBasicMaterial).map;
          if (map && !(map as THREE.Texture & { isRenderTargetTexture?: boolean }).isRenderTargetTexture) {
            textures.add(map);
          }
        }
      });
      for (const texture of textures) {
        if (cancelled) return;
        gl.initTexture(texture);
        await nextFrame();
      }
      if (cancelled) return;

      gl.compile(scene, camera);
      await nextFrame();

      // compile() defers the blocking link check; getUniforms forces it. Uses
      // three internals, so it's skipped if their shape changes.
      for (const program of gl.info.programs ?? []) {
        if (cancelled) return;
        const { getUniforms } = program as { getUniforms?: () => unknown };
        if (typeof getUniforms !== 'function') break;
        getUniforms.call(program);
        await nextFrame();
      }

      if (!cancelled) onReady(true);
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [gl, scene, camera, onReady]);

  return null;
}

interface LanyardProps {
  position?: [number, number, number];
  gravity?: [number, number, number];
  fov?: number;
  transparent?: boolean;
  frontImage?: string | null;
  backImage?: string | null;
  imageFit?: 'cover' | 'contain';
  lanyardImage?: string | null;
  lanyardWidth?: number;
  /** Pins the card's rendered height in px, independent of canvas size. */
  cardHeightPx?: number | null;
  /** Distance in px from the canvas's right edge to hang the rig from. */
  anchorRightPx?: number | null;
  /** Length of each of the strap's three segments, in world units. */
  ropeSegmentLength?: number;
  /** World length of one repeat of the strap print. */
  strapTileLength?: number;
  /** Fraction of its resting length the rig starts at, giving it a drop on load. */
  dropFrom?: number;
  /** Degrees off vertical the rig starts at, giving the drop a swing. */
  dropTilt?: number;
}

export default function Lanyard({
  position = [0, 0, 30],
  gravity = [0, -40, 0],
  fov = 20,
  transparent = true,
  frontImage = null,
  backImage = null,
  imageFit = 'cover',
  lanyardImage = null,
  lanyardWidth = 1,
  cardHeightPx = null,
  anchorRightPx = null,
  ropeSegmentLength = 1,
  strapTileLength = 0.8,
  dropFrom = 0.55,
  dropTilt = 16
}: LanyardProps) {
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [warm, setWarm] = useState(false);

  useEffect(() => {
    const handleResize = (): void => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="relative h-full w-full flex justify-center items-center transform scale-100 origin-center">
      <Canvas
        camera={{ position, fov }}
        // Held until WarmUp finishes; physics runs in the loop, so the drop waits too.
        frameloop={warm ? 'always' : 'never'}
        dpr={[1, isMobile ? 1.5 : 2]}
        // flat disables tone mapping, which would otherwise tint the photo.
        flat
        // Band re-enables pointer events only while the pointer is over the card.
        style={{ pointerEvents: 'none' }}
        gl={{ alpha: transparent }}
        onCreated={({ gl }) => gl.setClearColor(new THREE.Color(0x000000), transparent ? 0 : 1)}
      >
        <ambientLight intensity={Math.PI} />
        <CameraRig cardHeightPx={cardHeightPx} anchorRightPx={anchorRightPx} />
        <Suspense fallback={null}>
          <Physics gravity={gravity} timeStep={isMobile ? 1 / 30 : 1 / 60}>
            <Band
              isMobile={isMobile}
              frontImage={frontImage}
              backImage={backImage}
              imageFit={imageFit}
              lanyardImage={lanyardImage}
              lanyardWidth={lanyardWidth}
              ropeSegmentLength={ropeSegmentLength}
              strapTileLength={strapTileLength}
              dropFrom={dropFrom}
              dropTilt={dropTilt}
            />
          </Physics>
          {/* Low resolution: it only lights the small metal clip. */}
          <Environment blur={0.75} resolution={64}>
            <Lightformer
              intensity={2}
              color="white"
              position={[0, -1, 5]}
              rotation={[0, 0, Math.PI / 3]}
              scale={[100, 0.1, 1]}
            />
            <Lightformer
              intensity={3}
              color="white"
              position={[-1, -1, 1]}
              rotation={[0, 0, Math.PI / 3]}
              scale={[100, 0.1, 1]}
            />
            <Lightformer
              intensity={3}
              color="white"
              position={[1, 1, 1]}
              rotation={[0, 0, Math.PI / 3]}
              scale={[100, 0.1, 1]}
            />
            <Lightformer
              intensity={10}
              color="white"
              position={[-10, 0, 14]}
              rotation={[0, Math.PI / 2, Math.PI / 3]}
              scale={[100, 10, 1]}
            />
          </Environment>
          <WarmUp onReady={setWarm} />
        </Suspense>
      </Canvas>
    </div>
  );
}

interface BandProps {
  maxSpeed?: number;
  minSpeed?: number;
  isMobile?: boolean;
  frontImage?: string | null;
  backImage?: string | null;
  imageFit?: 'cover' | 'contain';
  lanyardImage?: string | null;
  lanyardWidth?: number;
  ropeSegmentLength?: number;
  strapTileLength?: number;
  dropFrom?: number;
  dropTilt?: number;
}

type LanyardRigidBody = RapierRigidBody & {
  lerped?: THREE.Vector3;
};

function Band({
  maxSpeed = 50,
  minSpeed = 0,
  isMobile = false,
  frontImage = null,
  backImage = null,
  imageFit = 'cover',
  lanyardImage = null,
  lanyardWidth = 1,
  ropeSegmentLength = 1,
  strapTileLength = 0.8,
  dropFrom = 0.55,
  dropTilt = 16
}: BandProps) {
  const band = useRef<THREE.Mesh<InstanceType<typeof MeshLineGeometry>, InstanceType<typeof MeshLineMaterial>>>(null!);
  const fixed = useRef<RapierRigidBody>(null!);
  const j1 = useRef<LanyardRigidBody>(null!);
  const j2 = useRef<LanyardRigidBody>(null!);
  const j3 = useRef<RapierRigidBody>(null!);
  const card = useRef<RapierRigidBody>(null!);

  const vec = new THREE.Vector3();
  const ang = new THREE.Vector3();
  const rot = new THREE.Vector3();
  const dir = new THREE.Vector3();

  const segmentProps: RigidBodyProps = {
    type: 'dynamic',
    canSleep: true,
    colliders: false,
    angularDamping: 4,
    linearDamping: 4
  };

  // Start gathered toward the anchor and tilted, so the rig drops in with a swing.
  const startAt = (depth: number): [number, number, number] => {
    const tilt = (dropTilt * Math.PI) / 180;
    const reach = depth * dropFrom;
    return [reach * Math.sin(tilt), -reach * Math.cos(tilt), 0];
  };

  // Tracked on window, since the canvas usually has pointer events disabled.
  const pointerPx = useRef({ x: -1e4, y: -1e4 });
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointerPx.current.x = e.clientX;
      pointerPx.current.y = e.clientY;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  const getLerped = (body: LanyardRigidBody): THREE.Vector3 => {
    if (!body.lerped) {
      body.lerped = new THREE.Vector3().copy(body.translation());
    }

    return body.lerped;
  };

  const { nodes, materials } = useGLTF(cardGLB) as any;
  const texture = useTexture(lanyardImage || lanyard);
  const frontTex = useTexture(frontImage || BLANK_PIXEL);
  const backTex = useTexture(backImage || BLANK_PIXEL);

  // Composite the face images into their halves of the atlas, aspect-preserving.
  const cardMap = useMemo(() => {
    const baseMap = materials.base.map as THREE.Texture;
    if (!frontImage && !backImage) return baseMap;

    const cacheKey = `${frontImage}|${backImage}|${imageFit}`;
    const cached = cardMapCache.get(cacheKey);
    if (cached) return cached;

    const baseImg = baseMap.image as any;
    const W = baseImg.width;
    const H = baseImg.height;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return baseMap;
    // Keep the baked atlas for the card edges.
    ctx.drawImage(baseImg, 0, 0, W, H);

    const drawFitted = (img: any, rect: typeof FRONT_UV_RECT) => {
      const rx = rect.x * W;
      const ry = rect.y * H;
      const rw = rect.w * W;
      const rh = rect.h * H;
      const pick = imageFit === 'contain' ? Math.min : Math.max;
      const scale = pick(rw / img.width, rh / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      const dx = rx + (rw - dw) / 2;
      const dy = ry + (rh - dh) / 2;
      ctx.save();
      ctx.beginPath();
      ctx.rect(rx, ry, rw, rh);
      ctx.clip();
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();
    };

    if (frontImage && frontTex.image) drawFitted(frontTex.image, FRONT_UV_RECT);
    if (backImage && backTex.image) drawFitted(backTex.image, BACK_UV_RECT);

    const composite = new THREE.CanvasTexture(canvas);
    composite.colorSpace = THREE.SRGBColorSpace;
    composite.flipY = baseMap.flipY;
    composite.anisotropy = 16;
    composite.needsUpdate = true;
    cardMapCache.set(cacheKey, composite);
    return composite;
  }, [frontImage, backImage, imageFit, frontTex, backTex, materials.base.map]);
  const [curve] = useState(
    () =>
      new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()])
  );
  const [dragged, drag] = useState<false | THREE.Vector3>(false);
  const [hovered, hover] = useState(false);

  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], ropeSegmentLength]);
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], ropeSegmentLength]);
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], ropeSegmentLength]);
  useSphericalJoint(j3, card, [
    [0, 0, 0],
    [0, 1.45, 0]
  ]);

  useEffect(() => {
    if (hovered) {
      document.body.style.cursor = dragged ? 'grabbing' : 'grab';
      return () => {
        document.body.style.cursor = 'auto';
      };
    }
  }, [hovered, dragged]);

  // The canvas spans the page, so let clicks through unless over the card or dragging.
  const updatePointerPassthrough = (state: { gl: THREE.WebGLRenderer; camera: THREE.Camera }) => {
    const el = state.gl.domElement;
    if (dragged) {
      el.style.pointerEvents = 'auto';
      return;
    }
    if (!card.current) return;

    const rect = el.getBoundingClientRect();
    const centre = vec.copy(card.current.translation() as THREE.Vector3);
    const edge = dir.copy(centre).setX(centre.x + CARD_HIT_RADIUS);
    centre.project(state.camera);
    edge.project(state.camera);

    const cx = rect.left + (centre.x * 0.5 + 0.5) * rect.width;
    const cy = rect.top + (-centre.y * 0.5 + 0.5) * rect.height;
    const radiusPx = Math.abs(edge.x - centre.x) * 0.5 * rect.width;
    const dx = pointerPx.current.x - cx;
    const dy = pointerPx.current.y - cy;
    el.style.pointerEvents = dx * dx + dy * dy <= radiusPx * radiusPx ? 'auto' : 'none';
  };

  useFrame((state, delta) => {
    updatePointerPassthrough(state);

    if (dragged && typeof dragged !== 'boolean') {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      dir.copy(vec).sub(state.camera.position).normalize();
      vec.add(dir.multiplyScalar(state.camera.position.length()));
      [card, j1, j2, j3, fixed].forEach(ref => ref.current?.wakeUp());
      card.current?.setNextKinematicTranslation({
        x: vec.x - dragged.x,
        y: vec.y - dragged.y,
        z: vec.z - dragged.z
      });
    }
    if (fixed.current) {
      [j1, j2].forEach(ref => {
        const lerped = getLerped(ref.current);
        const clampedDistance = Math.max(0.1, Math.min(1, lerped.distanceTo(ref.current.translation())));
        lerped.lerp(ref.current.translation(), delta * (minSpeed + clampedDistance * (maxSpeed - minSpeed)));
      });
      curve.points[0].copy(j3.current.translation());
      curve.points[1].copy(getLerped(j2.current));
      curve.points[2].copy(getLerped(j1.current));
      curve.points[3].copy(fixed.current.translation());
      const points = curve.getPoints(isMobile ? 16 : 32);
      band.current.geometry.setPoints(points);

      // Tile the strap print by its real length so it doesn't stretch.
      let strapLength = 0;
      for (let i = 1; i < points.length; i++) strapLength += points[i].distanceTo(points[i - 1]);
      (band.current.material as InstanceType<typeof MeshLineMaterial>).repeat.set(
        -strapLength / strapTileLength,
        1
      );
      ang.copy(card.current.angvel());
      rot.copy(card.current.rotation());
      card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z }, true);
    }
  });

  curve.curveType = 'chordal';
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

  return (
    <>
      <group position={[0, 4, 0]}>
        <RigidBody ref={fixed} {...segmentProps} type="fixed" />
        <RigidBody position={startAt(ropeSegmentLength)} ref={j1} {...segmentProps} type="dynamic">
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={startAt(2 * ropeSegmentLength)} ref={j2} {...segmentProps} type="dynamic">
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={startAt(3 * ropeSegmentLength)} ref={j3} {...segmentProps} type="dynamic">
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody
          position={startAt(3 * ropeSegmentLength + 1.45)}
          ref={card}
          {...segmentProps}
          type={dragged ? 'kinematicPosition' : 'dynamic'}
        >
          <CuboidCollider args={[0.8, 1.125, 0.01]} />
          <group
            scale={2.25}
            position={[0, -1.2, -0.05]}
            onPointerOver={() => hover(true)}
            onPointerOut={() => hover(false)}
            onPointerUp={(e: ThreeEvent<PointerEvent>) => {
              (e.target as Element).releasePointerCapture(e.pointerId);
              drag(false);
            }}
            onPointerDown={(e: ThreeEvent<PointerEvent>) => {
              (e.target as Element).setPointerCapture(e.pointerId);
              drag(new THREE.Vector3().copy(e.point).sub(vec.copy(card.current.translation())));
            }}
          >
            <mesh geometry={nodes.card.geometry}>
              {/* Unlit, so the photo matches its source file. */}
              <meshBasicMaterial map={cardMap} map-anisotropy={16} toneMapped={false} />
            </mesh>
            <mesh geometry={nodes.clip.geometry} material={materials.metal} material-roughness={0.3} />
            <mesh geometry={nodes.clamp.geometry} material={materials.metal} />
          </group>
        </RigidBody>
      </group>
      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial
          // args and a numeric useMap are required under strict TS.
          args={[{ resolution: new THREE.Vector2(1000, isMobile ? 2000 : 1000) }]}
          color="white"
          depthTest={false}
          resolution={isMobile ? [1000, 2000] : [1000, 1000]}
          useMap={1}
          map={texture}
          repeat={[-4, 1]}
          lineWidth={lanyardWidth}
        />
      </mesh>
    </>
  );
}
