import { CONFIG } from './GameConfig';
import * as THREE from 'three';
import type { CharacterDefinition } from '../characters/CharacterDefinitions';
import { CHARACTERS } from '../characters/CharacterDefinitions';
import { PURSUERS } from '../characters/PursuerDefinitions';
import { createCharacter } from '../characters/CharacterFactory';
import type { LocationDefinition } from '../locations/LocationDefinitions';
import { LOCATIONS } from '../locations/LocationDefinitions';
import { createLocation } from '../locations/LocationFactory';
import { assets, disposeObject } from './AssetManager';
import { CameraController } from './CameraController';
import { createRenderer } from './createRenderer';

export type Quality = 'low' | 'medium' | 'high';

/** Owns renderer lifetime; simulation and animation remain in their own systems. */
export class SceneFactory {
  readonly renderer: THREE.WebGLRenderer;
  readonly compatibilityMode: boolean;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(43, 1, 0.1, 190);
  readonly cameraController: CameraController;
  environment = new THREE.Group();
  player = new THREE.Group();
  police = new THREE.Group();
  private readonly sunlight: THREE.DirectionalLight;
  private quality: Quality = 'medium';
  private menuScaleApplied = false;

  constructor(
    private readonly container: HTMLElement,
    preferLowGraphics = false,
  ) {
    const graphics = createRenderer(preferLowGraphics);
    this.renderer = graphics.renderer;
    this.compatibilityMode = graphics.compatibilityMode;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute(
      'aria-label',
      'A colourful original 3D Delhi-inspired street',
    );
    this.renderer.domElement.dataset.testid = 'game-canvas';
    this.container.append(this.renderer.domElement);
    this.scene.add(new THREE.HemisphereLight('#fff3d3', '#7a9c94', 2.3));
    this.sunlight = new THREE.DirectionalLight('#ffd8a1', 3.4);
    this.sunlight.position.set(-22, 34, 20);
    this.sunlight.castShadow = true;
    this.sunlight.shadow.mapSize.set(1024, 1024);
    this.sunlight.shadow.camera.left = -30;
    this.sunlight.shadow.camera.right = 30;
    this.sunlight.shadow.camera.top = 35;
    this.sunlight.shadow.camera.bottom = -35;
    this.sunlight.shadow.camera.near = 1;
    this.sunlight.shadow.camera.far = 95;
    this.sunlight.shadow.normalBias = 0.045;
    this.sunlight.shadow.bias = -0.0004;
    this.sunlight.target.position.set(0, 0, -12);
    this.scene.add(this.sunlight, this.sunlight.target);
    this.cameraController = new CameraController(this.camera);
    this.setLocation(LOCATIONS[0]);
    this.setCharacter(CHARACTERS[0]);
    this.police = createCharacter(PURSUERS[0]);
    this.police.position.set(0.9, 0, 4.5);
    this.police.visible = false;
    this.scene.add(this.police);
    this.resize();
    this.cameraController.update(0, 0, true);
  }

  /** Alias kept concise for systems that scroll scenery. */
  get env(): THREE.Group {
    return this.environment;
  }

  setLocation(definition: LocationDefinition): void {
    disposeObject(this.environment);
    this.environment = createLocation(definition);
    this.scene.add(this.environment);
    this.scene.background = new THREE.Color(definition.sky);
    this.scene.fog = new THREE.Fog(definition.sky, 45, 140);
  }

  setCharacter(definition: CharacterDefinition): void {
    const position = this.player.position.clone();
    const rotation = this.player.rotation.clone();
    disposeObject(this.player);
    this.player = createCharacter(definition);
    this.player.position.copy(position);
    this.player.rotation.copy(rotation);
    this.scene.add(this.player);
  }

  setQuality(quality: Quality): void {
    this.quality = quality;
    this.renderer.shadowMap.enabled = quality !== 'low';
    const size = quality === 'high' ? 2048 : 1024;
    if (this.sunlight.shadow.mapSize.x !== size) {
      this.sunlight.shadow.mapSize.set(size, size);
      this.sunlight.shadow.map?.dispose();
      this.sunlight.shadow.map = null;
    }
    this.resize();
  }

  setPursuer(definition: CharacterDefinition): void {
    const position = this.police.position.clone();
    const rotation = this.police.rotation.clone();
    const visible = this.police.visible;
    disposeObject(this.police);
    this.police = createCharacter(definition);
    this.police.position.copy(position);
    this.police.rotation.copy(rotation);
    this.police.visible = visible;
    this.scene.add(this.police);
  }

  resize(): void {
    const width = Math.max(1, this.container.clientWidth || window.innerWidth);
    const height = Math.max(1, this.container.clientHeight || window.innerHeight);
    this.renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio || 1,
        this.quality === 'low'
          ? 1
          : this.quality === 'high'
            ? CONFIG.maxPixelRatio
            : Math.min(1.35, CONFIG.maxPixelRatio),
      ),
    );
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  render(): void {
    if (this.cameraController.mode === 'menu') {
      this.player.scale.setScalar(2.1);
      this.menuScaleApplied = true;
    } else if (this.menuScaleApplied) {
      this.player.scale.setScalar(1);
      this.menuScaleApplied = false;
    }
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    disposeObject(this.environment);
    disposeObject(this.player);
    disposeObject(this.police);
    this.sunlight.shadow.map?.dispose();
    this.scene.clear();
    assets.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
