import { WebGLRenderer } from 'three';

export class GraphicsUnavailableError extends Error {
  constructor(cause?: unknown) {
    super('The browser could not create a WebGL 2 graphics context.', { cause });
    this.name = 'GraphicsUnavailableError';
  }
}

/** Let the browser choose its GPU; retry without multisampling on constrained devices. */
export function createRenderer(preferLowGraphics = false): {
  renderer: WebGLRenderer;
  compatibilityMode: boolean;
} {
  let lastError: unknown;
  for (const antialias of preferLowGraphics ? [false] : [true, false]) {
    // A fresh canvas is necessary: context attributes cannot change on an existing context.
    const canvas = document.createElement('canvas');
    const options: WebGLContextAttributes = {
      alpha: false,
      antialias,
      depth: true,
      stencil: false,
      powerPreference: 'default',
      failIfMajorPerformanceCaveat: false,
    };
    let context: WebGL2RenderingContext | null;
    try {
      context = canvas.getContext('webgl2', options);
    } catch (error) {
      lastError = error;
      continue;
    }
    if (!context) continue;
    try {
      return {
        renderer: new WebGLRenderer({ canvas, context, ...options }),
        compatibilityMode: !antialias,
      };
    } catch (error) {
      // A working context followed by a renderer exception is not missing WebGL support.
      context.getExtension('WEBGL_lose_context')?.loseContext();
      throw error;
    }
  }
  throw new GraphicsUnavailableError(lastError);
}
