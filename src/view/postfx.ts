import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    vignette: { value: 0.38 },
    sat: { value: 1.18 },
    warm: { value: 0.06 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float vignette;
    uniform float sat;
    uniform float warm;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float g = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      c.rgb = mix(vec3(g), c.rgb, sat);
      c.rgb += vec3(warm, warm * 0.4, -warm * 0.25);
      float d = distance(vUv, vec2(0.5));
      c.rgb *= 1.0 - smoothstep(0.45, 1.05, d) * vignette;
      gl_FragColor = c;
    }
  `,
};

export class PostFx {
  readonly composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private grade: ShaderPass;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.18, 0.45, 0.86);
    this.composer.addPass(this.bloom);
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);
  }

  setEnabled(bloom: boolean): void {
    this.bloom.enabled = bloom;
  }

  resize(w: number, h: number): void {
    this.composer.setSize(w, h);
    this.bloom.setSize(w, h);
  }

  render(): void {
    this.composer.render();
  }
}
