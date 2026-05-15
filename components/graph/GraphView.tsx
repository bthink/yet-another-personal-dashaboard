"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import * as THREE from "three";
import ThreeForceGraph from "three-forcegraph";
import type {
  GraphData as ForceGraphData,
  LinkObject,
  NodeObject,
} from "three-forcegraph";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import useSWR from "swr";

import type { GraphData as VaultGraphData, GraphNode } from "@/lib/graph";
import NotePreview from "./NotePreview";

type ForceNode = GraphNode &
  NodeObject & {
    color: string;
    val: number;
  };

type ForceLink = LinkObject<ForceNode>;

const FOLDER_COLORS: Record<string, string> = {
  "97_Inbox": "#4cc9f0",
  "01_Projects": "#52dfa2",
  "03_Knowledge": "#8b7cf6",
  "04_Ideas": "#ff8bd4",
  "00_System": "#a8adbd",
};

const GRAPH_THEME_STYLE = {
  "--panel": "oklch(0.17 0.018 260)",
  "--panel-2": "oklch(0.21 0.02 260)",
  "--border": "oklch(0.35 0.03 260)",
  "--border-strong": "oklch(0.43 0.04 260)",
  "--text": "oklch(0.94 0.015 260)",
  "--text-2": "oklch(0.78 0.02 260)",
  "--text-3": "oklch(0.62 0.025 260)",
  "--accent": "oklch(0.74 0.15 235)",
  "--accent-soft": "oklch(0.29 0.055 235)",
  "--radius": "6px",
} as CSSProperties;

function getNodeColor(node: GraphNode): string {
  return FOLDER_COLORS[node.folder] ?? "#f1f4ff";
}

function getNodeValue(node: GraphNode): number {
  return Math.max(1, Math.sqrt(node.linkCount + 1) * 2.4);
}

async function fetchGraph(url: string): Promise<VaultGraphData> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json() as Promise<VaultGraphData>;
}

function createNodeObject(node: ForceNode): THREE.Object3D {
  const color = new THREE.Color(node.color);
  const radius = Math.max(2.4, node.val);
  const group = new THREE.Group();
  group.userData.graphNode = node;

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 14, 14),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.85,
      metalness: 0.08,
      roughness: 0.38,
    })
  );
  sphere.userData.graphNode = node;
  group.add(sphere);

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.75, 12, 12),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    })
  );
  halo.userData.graphNode = node;
  group.add(halo);

  return group;
}

function createStarField(): THREE.Points {
  const count = 520;
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    positions[i3] = (Math.random() - 0.5) * 1800;
    positions[i3 + 1] = (Math.random() - 0.5) * 1200;
    positions[i3 + 2] = (Math.random() - 0.5) * 1800;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: "#c5d7ff",
      size: 1.15,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    })
  );
}

function findGraphNode(object: THREE.Object3D | null): ForceNode | null {
  let current: THREE.Object3D | null = object;

  while (current) {
    const node = current.userData.graphNode as ForceNode | undefined;
    if (node) return node;
    current = current.parent;
  }

  return null;
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Points) {
      child.geometry.dispose();

      if (Array.isArray(child.material)) {
        child.material.forEach((material) => material.dispose());
      } else {
        child.material.dispose();
      }
    }
  });
}

function fitCameraToGraph(
  graph: THREE.Object3D,
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls
): void {
  const box = new THREE.Box3().setFromObject(graph);
  if (box.isEmpty()) return;

  const center = box.getCenter(new THREE.Vector3());
  const size = Math.max(180, box.getSize(new THREE.Vector3()).length());

  camera.position.set(center.x, center.y + size * 0.18, center.z + size * 1.1);
  controls.target.copy(center);
  controls.update();
}

export default function GraphView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const noteRequestRef = useRef(0);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null);
  const [noteContent, setNoteContent] = useState<string | null>(null);
  const [noteLoading, setNoteLoading] = useState(false);

  const {
    data: graphData,
    error,
    isLoading,
  } = useSWR<VaultGraphData>("/api/vault/graph", fetchGraph);

  const forceData = useMemo<ForceGraphData<ForceNode, ForceLink> | null>(() => {
    if (!graphData) return null;

    return {
      nodes: graphData.nodes.map((node) => ({
        ...node,
        color: getNodeColor(node),
        val: getNodeValue(node),
      })),
      links: graphData.links.map((link) => ({ ...link })),
    };
  }, [graphData]);

  const handleNodeClick = useCallback(async (node: GraphNode) => {
    const requestId = noteRequestRef.current + 1;
    noteRequestRef.current = requestId;

    setSelectedNode(node);
    setNoteContent(null);
    setNoteLoading(true);

    try {
      const response = await fetch(
        `/api/vault/graph/note?path=${encodeURIComponent(node.id)}`
      );
      if (!response.ok) throw new Error(await response.text());

      const payload = (await response.json()) as { content: string };
      if (noteRequestRef.current === requestId) {
        setNoteContent(payload.content);
      }
    } catch (err) {
      console.error("note preview failed", err);
      if (noteRequestRef.current === requestId) {
        setNoteContent(null);
      }
    } finally {
      if (noteRequestRef.current === requestId) {
        setNoteLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current || !forceData) return;

    const container = containerRef.current;
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    const pointer = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();
    const downPosition = new THREE.Vector2();

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor("#03050f", 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#03050f");
    scene.fog = new THREE.FogExp2("#03050f", 0.0017);
    scene.add(createStarField());

    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 4000);
    camera.position.set(0, 40, 420);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.rotateSpeed = 0.42;
    controls.zoomSpeed = 0.74;
    controls.minDistance = 80;
    controls.maxDistance = 1600;

    scene.add(new THREE.AmbientLight("#b8c8ff", 1.15));

    const keyLight = new THREE.PointLight("#70d5ff", 3.5, 850);
    keyLight.position.set(160, 260, 220);
    scene.add(keyLight);

    const fillLight = new THREE.PointLight("#ff8bd4", 1.8, 700);
    fillLight.position.set(-260, -160, 180);
    scene.add(fillLight);

    const composer = new EffectComposer(renderer);
    composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(
      new UnrealBloomPass(new THREE.Vector2(width, height), 1.45, 0.52, 0.12)
    );
    composer.addPass(new OutputPass());

    const graph = new ThreeForceGraph<ForceNode, ForceLink>()
      .graphData(forceData)
      .nodeId("id")
      .nodeVal("val")
      .nodeColor("color")
      .nodeThreeObject((node) => createNodeObject(node))
      .nodeThreeObjectExtend(false)
      .linkColor(() => "#7dcdff")
      .linkOpacity(0.34)
      .linkWidth(0.7)
      .linkDirectionalParticles(1)
      .linkDirectionalParticleWidth(1.25)
      .linkDirectionalParticleSpeed(0.0042)
      .d3AlphaDecay(0.018)
      .d3VelocityDecay(0.34)
      .warmupTicks(80)
      .cooldownTicks(260)
      .onEngineStop(() => fitCameraToGraph(graph, camera, controls));

    const chargeForce = graph.d3Force("charge");
    if (chargeForce && typeof chargeForce.strength === "function") {
      chargeForce.strength(-95);
    }

    const linkForce = graph.d3Force("link");
    if (linkForce && typeof linkForce.distance === "function") {
      linkForce.distance(46);
    }

    scene.add(graph);

    function resize(): void {
      const nextWidth = Math.max(container.clientWidth, 1);
      const nextHeight = Math.max(container.clientHeight, 1);

      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight);
      composer.setSize(nextWidth, nextHeight);
    }

    function pickNode(event: PointerEvent): ForceNode | null {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      const intersections = raycaster.intersectObjects(graph.children, true);
      return findGraphNode(intersections[0]?.object ?? null);
    }

    function handlePointerDown(event: PointerEvent): void {
      downPosition.set(event.clientX, event.clientY);
    }

    function handlePointerMove(event: PointerEvent): void {
      const node = pickNode(event);
      renderer.domElement.style.cursor = node ? "pointer" : "grab";
      setHoverNode((current) => (current?.id === node?.id ? current : node));
    }

    function handlePointerUp(event: PointerEvent): void {
      const movement = downPosition.distanceTo(
        new THREE.Vector2(event.clientX, event.clientY)
      );

      if (movement > 4) return;

      const node = pickNode(event);
      if (node) {
        handleNodeClick(node);
      }
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);

    let frameId = 0;
    const animate = () => {
      frameId = window.requestAnimationFrame(animate);
      graph.tickFrame();
      controls.update();
      composer.render();
    };
    animate();

    fitCameraToGraph(graph, camera, controls);

    return () => {
      window.cancelAnimationFrame(frameId);
      setHoverNode(null);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      controls.dispose();
      disposeObject(scene);
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [forceData, handleNodeClick]);

  const totalLinks = graphData?.links.length ?? 0;
  const totalNodes = graphData?.nodes.length ?? 0;

  return (
    <div
      className="relative flex h-full w-full overflow-hidden"
      style={GRAPH_THEME_STYLE}
    >
      <div className="relative min-w-0 flex-1 overflow-hidden bg-[#03050f]">
        <div
          ref={containerRef}
          className="h-full w-full"
          aria-label="3D knowledge graph"
          aria-busy={isLoading}
        />

        <div className="pointer-events-none absolute left-4 top-4 rounded-md border border-white/10 bg-[#090d1d]/80 px-3 py-2 text-xs text-slate-200 shadow-lg">
          <p className="m-0 font-medium">Knowledge network</p>
          <p className="m-0 mt-1 font-mono text-[11px] text-slate-400">
            {totalNodes} notes / {totalLinks} links
          </p>
        </div>

        {hoverNode && (
          <div className="pointer-events-none absolute bottom-4 left-4 max-w-[min(28rem,calc(100%-2rem))] rounded-md border border-white/10 bg-[#090d1d]/85 px-3 py-2 text-xs text-slate-200 shadow-lg">
            <p className="m-0 truncate font-medium">{hoverNode.label}</p>
            <p className="m-0 mt-1 truncate font-mono text-[11px] text-slate-400">
              {hoverNode.id}
            </p>
          </div>
        )}

        {isLoading && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-[#03050f] text-sm text-slate-400"
            role="status"
          >
            Loading graph...
          </div>
        )}

        {error && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-[#03050f] px-6 text-center text-sm text-red-300"
            role="alert"
          >
            Graph data could not be loaded.
          </div>
        )}
      </div>

      {selectedNode && (
        <NotePreview
          node={selectedNode}
          content={noteContent}
          loading={noteLoading}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}
