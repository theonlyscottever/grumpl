// Grumpl landing: the hero stage.
// Built from the Light Study (v26): same body shader, cloud shading and physics, with
// - one fixed product-photography light (no cursor light),
// - the newest drop on a turntable of clouds (focused one in the middle, the others further back),
// - the brand-book logo pressed into one foreground cloud,
// - a page tint taken from the focused Grumpl's secondary color.
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { buildStudioEnv, makeLightU, buildFigure, loadGLB, roomSet } from './grumpl-look.js';
import { roomWant, turnRoom, roomEnv } from './room.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { DROP, FLAVORS } from './drop.js';
import { initUI } from './ui.js';
import { createMotion, canMove, haptic } from './motion.js';
import { sound } from './sound.js';
import { setFinish, cursor } from './finish.js';

const HULL = {"v":[[-0.3237,0.0,0.1173],[0.5271,1.9964,-0.329],[0.9383,0.6757,0.0653],[-0.1516,1.2282,0.56],[-0.4956,1.9708,-0.3318],[0.2007,0.5576,-0.5524],[-0.9294,0.7082,0.1177],[0.2442,0.4608,0.5809],[0.4813,0.0073,-0.0364],[0.0212,1.9077,0.2427],[-0.4673,0.585,-0.4272],[0.0209,1.7802,-0.6516],[-0.3224,0.6529,0.5423],[0.3647,1.4639,0.4544],[-0.3369,1.626,0.3886],[0.4025,1.5924,-0.5027],[-0.3495,1.5827,-0.5076],[0.501,1.7099,0.1171],[0.4827,0.333,-0.3489],[-0.2092,0.2646,-0.4104],[-0.118,0.3431,0.5525],[0.013,1.6479,0.5067],[-0.1505,0.5936,-0.5573],[-0.0102,0.7329,0.6432],[0.3602,0.0024,0.2699],[0.2938,1.7752,0.3555],[0.1704,1.2287,0.5663],[0.4872,0.6315,-0.4523],[-0.2741,1.8422,0.2349],[0.3307,0.7125,0.5626],[-0.2687,0.0128,-0.1393],[0.2524,0.3158,-0.4574],[-0.4396,0.3542,-0.3639],[-0.1151,1.7982,0.3936],[-0.3222,0.4259,0.5003],[0.0016,0.5144,0.6415],[-0.1851,1.5292,0.5017],[0.5453,0.0098,0.1634],[-0.3063,0.4402,-0.501],[0.0354,1.9571,0.045],[0.2219,1.6036,0.4907],[0.0829,0.3333,0.5636],[0.0901,1.8083,0.4009],[0.3715,0.4699,-0.5024],[0.2882,0.0011,-0.0808],[-0.436,0.0105,-0.039],[0.1542,0.6235,0.638],[0.239,1.8843,0.2146],[0.4038,0.4522,0.4856],[-0.1533,0.6155,0.624],[-0.5062,0.0092,0.1347],[-0.4068,1.7179,0.224],[0.4395,1.682,0.2825],[0.2642,1.5104,-0.5724],[-0.313,0.6173,-0.5254],[-0.393,0.0085,0.2644],[-0.8881,0.6296,-0.0163],[-0.2035,1.6811,0.4564],[-0.1308,1.9071,0.1972],[0.3962,0.0001,0.1135],[0.3565,1.6414,0.4093],[0.0158,1.2311,0.5803],[-0.1528,0.4394,-0.5236],[0.3417,0.6186,-0.5321]],"f":[[6,4,56],[16,56,4],[51,4,6],[18,27,2],[43,27,18],[2,1,17],[17,52,2],[1,52,17],[11,4,1],[11,16,4],[56,16,10],[1,4,39],[39,9,1],[33,9,58],[58,39,4],[9,39,58],[25,52,1],[2,13,29],[43,18,31],[2,52,60],[60,13,2],[52,25,60],[61,3,23],[5,31,62],[43,31,5],[16,11,54],[54,10,16],[14,51,6],[36,57,14],[33,58,28],[28,57,33],[4,51,28],[28,58,4],[51,14,28],[28,14,57],[1,9,47],[47,25,1],[6,56,50],[42,9,33],[42,47,9],[25,47,42],[13,60,40],[40,60,25],[25,42,40],[43,5,63],[63,5,11],[11,53,63],[63,27,43],[15,1,2],[2,27,15],[15,11,1],[15,53,11],[27,63,15],[15,63,53],[22,54,11],[22,5,62],[11,5,22],[12,3,36],[12,14,6],[36,14,12],[34,12,6],[26,29,13],[13,40,26],[26,61,23],[36,3,21],[3,61,21],[21,57,36],[61,26,21],[21,26,40],[21,40,42],[33,57,21],[21,42,33],[62,31,19],[31,30,19],[8,31,18],[8,18,2],[23,3,49],[3,12,49],[12,34,49],[34,20,49],[32,19,30],[56,10,32],[44,30,31],[31,8,44],[37,8,2],[45,32,30],[45,50,56],[56,32,45],[62,19,38],[19,32,38],[38,22,62],[54,22,38],[10,54,38],[38,32,10],[55,20,34],[6,50,55],[55,34,6],[59,44,8],[8,37,59],[48,37,2],[2,29,48],[29,7,48],[35,49,20],[23,49,35],[20,55,41],[41,35,20],[7,35,41],[24,59,37],[24,41,55],[7,41,24],[37,48,24],[24,48,7],[0,55,50],[44,59,0],[0,24,55],[59,24,0],[50,45,0],[30,44,0],[0,45,30],[46,7,29],[46,35,7],[23,35,46],[46,26,23],[29,26,46]]};
const COM_Y = 0.9;                                   // model origin is at his feet; physics body is centred here
const CLOUD_TOP = 0.1883, SINK = 0.34, LIFT = CLOUD_TOP - SINK;
const BANK_SPHERES = [[-1.744,-1.107,-0.509,0.539],[-1.744,-1.101,0.627,0.566],[-1.182,-0.858,-0.642,0.618],[-1.182,-0.786,0.724,0.581],[1.152,-0.783,-0.646,0.561],[1.152,-0.672,0.091,0.518],[1.152,-0.788,0.615,0.567],[2.007,-1.202,-0.622,0.488],[2.007,-1.232,-0.116,0.484],[2.007,-1.191,0.497,0.428],[0.0,-1.211,0.0,1.35],[0.55,-1.111,-0.25,1.17],[-0.6,-1.161,0.2,1.2]];
const BOUNDS = { x: 3, zBack: -2.0, zFront: 1.3, top: 4.2 };
const FRONT_Z = 2.5;                                 // the foreground cloud with the logo

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;

let kick = 30;
const poke = (n = 6) => { kick = Math.max(kick, n); };
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false });
// Sharp first: start at the screen's own density (up to 2x) and only step down while frames are actually slow.
// adaptResolution steps back up when there's headroom, so one hiccup (a shader compiling, a tab switch) never
// leaves the hero blurry for good.
const DPR_STEPS = [0.75, 1, 1.25, 1.5, 1.75, 2].filter((d) => d <= Math.max(1, Math.min(2, devicePixelRatio)));
let dprIdx = DPR_STEPS.length - 1;
renderer.setPixelRatio(DPR_STEPS[dprIdx]);
renderer.setClearColor(0xffffff, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
const lookAt = new THREE.Vector3();

// ---------- The light: see grumpl-look.js for the studio itself ----------
const rigEnv = buildStudioEnv(renderer);
scene.environment = rigEnv;
const eyeEnv = buildStudioEnv(renderer, true);

const KEY = { az: THREE.MathUtils.degToRad(-36), el: THREE.MathUtils.degToRad(50), r: 4.8 };
const key = new THREE.SpotLight(0xfff1e2, 24, 0, Math.PI / 4, 1, 2);
scene.add(key, key.target);
RectAreaLightUniformsLib.init();
const rims = [[-3.2, 20], [3.2, 15]].map(([x, power]) => {
  const r = new THREE.RectAreaLight(0xf2f6ff, power, 0.5, 3);
  r.position.set(x, 2.0, -2.6);
  r.lookAt(0, 1.1, 0);
  scene.add(r);
  return r;
});

const lightU = makeLightU();
// a soft second light that follows the cursor or finger (Scott, 2026-10-16): the studio key still does the work,
// this one only lets you feel the light move across him
const cursorL = new THREE.PointLight(0xffffff, 1.3, 0, 2); scene.add(cursorL);
let cursorGen = -1;
const _cl = new THREE.Vector3();
function placeCursorLight() {
  if (cursor.gen === cursorGen) return false;
  cursorGen = cursor.gen;
  const r = renderer.domElement.getBoundingClientRect();
  _cl.set(((cursor.x - r.left) / r.width) * 2 - 1, -((cursor.y - r.top) / r.height) * 2 + 1, 0.5).unproject(camera).sub(camera.position).normalize();
  cursorL.position.copy(camera.position).addScaledVector(_cl, camera.position.length() * 0.55);
  return true;
}

// ---------- Physics ----------
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -22, 0) });
world.allowSleep = true;
const mat = new CANNON.Material('clay');
world.defaultContactMaterial.friction = 0.45;
world.defaultContactMaterial.restitution = 0.15;
const cloudPhys = new CANNON.Material('cloud');
world.addContactMaterial(new CANNON.ContactMaterial(mat, cloudPhys, { friction: 0.9, restitution: 0.02 }));
function addWall(normal, point) {
  const b = new CANNON.Body({ mass: 0, material: mat });
  b.addShape(new CANNON.Plane());
  b.quaternion.setFromVectors(new CANNON.Vec3(0, 0, 1), normal);
  b.position.copy(point);
  world.addBody(b);
  return b;
}
// side walls follow the screen's edges (see resize), so a throw never sends him off the page
const wallL = addWall(new CANNON.Vec3(1, 0, 0), new CANNON.Vec3(-BOUNDS.x, 0, 0));
const wallR = addWall(new CANNON.Vec3(-1, 0, 0), new CANNON.Vec3(BOUNDS.x, 0, 0));
addWall(new CANNON.Vec3(0, 0, 1), new CANNON.Vec3(0, 0, BOUNDS.zBack));
const wallF = addWall(new CANNON.Vec3(0, 0, -1), new CANNON.Vec3(0, 0, BOUNDS.zFront));   // the glass (see smoosh)
addWall(new CANNON.Vec3(0, -1, 0), new CANNON.Vec3(0, BOUNDS.top, 0));
// the shared cloud is solid ground everywhere (Scott 2026-10-16: they can never fall off it); thrown off his
// platform he lands on the cloud a little lower than the crest, then hops home
const floorB = new CANNON.Body({ mass: 0, material: cloudPhys });
floorB.addShape(new CANNON.Plane());
floorB.quaternion.setFromVectors(new CANNON.Vec3(0, 0, 1), new CANNON.Vec3(0, 1, 0));
floorB.position.set(0, LIFT - 0.14, 0);
world.addBody(floorB);

const crest = new CANNON.Body({ mass: 0, material: cloudPhys });
BANK_SPHERES.forEach(([x, y, z, r]) => crest.addShape(new CANNON.Sphere(r), new CANNON.Vec3(x, y, z)));
crest.addShape(new CANNON.Box(new CANNON.Vec3(1.1, 0.12, 0.65)), new CANNON.Vec3(0, CLOUD_TOP - 0.12, 0));
crest.position.set(0, -SINK, 0);
world.addBody(crest);

const body = new CANNON.Body({ mass: 1, material: mat, angularDamping: 0.3, linearDamping: 0.04, sleepSpeedLimit: 0.05 });
body.addShape(new CANNON.ConvexPolyhedron({ vertices: HULL.v.map(([x, y, z]) => new CANNON.Vec3(x, y - COM_Y, z)), faces: HULL.f }));
world.addBody(body);

const _up = new CANNON.Vec3(), _ax = new CANNON.Vec3(), _fwd = new CANNON.Vec3(), Y_UP = new CANNON.Vec3(0, 1, 0);
let twirlSteps = 0;
let grip = null;
let tiltG = 0;
world.addEventListener('preStep', () => {
  if (grip) return;
  if (smoosh?.hit && performance.now() - smoosh.hit < SMOOSH_HOLD) {   // face on the glass: he sticks, then slowly slides
    body.force.y += 22 * 0.93; body.force.z += 8;
    body.angularVelocity.scale(0.8, body.angularVelocity);
    return;
  }
  if (tiltG) body.force.x += tiltG;               // a deliberate phone tilt lets him slide to the low side
  const p = body.position;
  if (Math.abs(p.x) > 1.8 || Math.abs(p.z) > 1.1 || p.y > LIFT + COM_Y + 0.9 || p.y < LIFT + COM_Y - 0.8) return;
  const v = body.velocity;
  body.force.x += -p.x * 9 - v.x * 2.2;
  body.force.z += -p.z * 9 - v.z * 2.2;
  body.quaternion.vmult(Y_UP, _up);
  _up.cross(Y_UP, _ax);
  const w = body.angularVelocity;
  body.torque.x += _ax.x * 26 - w.x * 2.4;
  body.torque.z += _ax.z * 26 - w.z * 2.4;
  if (twirlSteps > 0 && --twirlSteps < 200) {
    body.quaternion.vmult(_fwd.set(0, 0, 1), _ax);
    const off = Math.atan2(_ax.x, _ax.z);
    w.y += (-Math.atan2(Math.sin(off), Math.cos(off)) * 4 - w.y) * 0.12;   // settle back to facing you
  } else if (turntable()) w.y += (TURNTABLE - w.y) * 0.04;                // left alone, he turns slowly to show off
});
// Scott: the one in front faces you when he arrives, then, if nobody touches him, turns slowly on the spot
// like a figure on a turntable. Any touch, key, swipe or shake stops it until he's been left alone again.
const TURNTABLE = 0.6, CALM_MS = 1600;   // Scott (2026-10-16): slow, just a little faster than 0.4
let calmAt = performance.now();
const calm = () => { calmAt = performance.now(); };
const turntable = () => !reduceMotion && twirlSteps === 0 && ring.t >= 1 && !grip && !smoosh && performance.now() - calmAt >= CALM_MS;
// a sleeping body ignores forces, so wake him when it's time to turn
world.addEventListener('postStep', () => { if (body.sleepState === CANNON.Body.SLEEPING && turntable()) body.wakeUp(); });
const hand = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC });
world.addBody(hand);
// Jason's idea: each Grumpl in the line-up faces his own way, so you see every side of him before you touch anything
const HOME_YAW = [-0.55, 1.15, -2.35, 0.6, 2.6, -1.3];
const homeYaw = (i) => HOME_YAW[i % HOME_YAW.length];
let standYaw = 0;             // the one in front faces the camera; his neighbours keep their own angles
function standUp() {
  body.position.set(0, COM_Y + LIFT + 0.02, 0);
  body.quaternion.setFromAxisAngle(Y_UP, standYaw);
  body.velocity.setZero();
  body.angularVelocity.setZero();
  body.wakeUp();
}
standUp();

// ---------- Cloud shading (from the Light Study) ----------
const OCC_LOCAL = [[0, 0.72, 0.02, 0.62], [0, 1.45, -0.05, 0.55], [-0.4, 0.12, 0.12, 0.22], [0.4, 0.12, 0.12, 0.22]]
  .map(([x, y, z, r]) => [new THREE.Vector3(x, y - COM_Y, z), r]);
const occU = { value: OCC_LOCAL.map(() => new THREE.Vector4()) };
const AO_GLSL = `
  uniform vec4 uOcc[4];
  float sphereAO( vec3 p, vec3 n ) {
    float o = 0.0;
    for ( int i = 0; i < 4; i ++ ) {
      vec3 d = uOcc[i].xyz - p; float l2 = max( dot( d, d ), 1e-4 ); float r = uOcc[i].w;
      o += clamp( dot( n, d ) * inversesqrt( l2 ), 0.0, 1.0 ) * min( r * r / l2, 1.5 ) * ( 1.0 - smoothstep( r, 2.6 * r, sqrt( l2 ) ) );
    }
    return exp( -1.1 * o );
  }`;
const pressU = { value: new THREE.Vector4(0, CLOUD_TOP, 0, 0) };
const skyU = { value: new THREE.Color(0x9fbcf0) };
const tintU = { value: new THREE.Color(0x56c2dc) };
// Lights out: the clouds go dark except for a warm pool under the lamp
const nightU = { value: 0 };
const lampU = { value: new THREE.Vector3(0, 0, 0) };
const logoMaskU = { value: null };
const logoLineU = { value: null };   // a tighter silhouette for the crisp line where the logo is pressed in
const logoRectU = { value: new THREE.Vector4(0, 0, 1, 1) };   // centre xy, size xy in the front cloud's own space
const hemCutU = { value: -2 };   // NDC y below which only the hem draws (placeHem)
function makeCloudMat({ fade = true, front = false, hem = false } = {}) {
  // The clouds only use their lighting for a brightness (shade, below), so they get the cheap version of the rig:
  // standard instead of physical (no sheen), and the two rim strips, which barely touch a cloud's front, are left
  // out. The clouds cover most of the screen, so this is where per-pixel cost adds up.
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0,
    envMapIntensity: 1.25, vertexColors: true, toneMapped: false });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uOcc = occU; sh.uniforms.uPress = pressU; sh.uniforms.uSky = skyU; sh.uniforms.uTint = tintU;
    sh.uniforms.uMask = logoMaskU; sh.uniforms.uLine = logoLineU; sh.uniforms.uRect = logoRectU; sh.uniforms.uNight = nightU; sh.uniforms.uLamp = lampU; sh.uniforms.uHemCut = hemCutU;
    const DENT = `
      uniform vec4 uPress; uniform sampler2D uMask; uniform vec4 uRect;
      float dentH( vec2 q ) {
        q.y *= 1.25;
        float d = length( q );
        return - uPress.w * exp( - d * d / 0.5 ) + uPress.w * 0.38 * exp( - ( d - 1.0 ) * ( d - 1.0 ) / 0.07 );
      }`;
    // The front cloud: where the logo sits the fluff is pressed back, so the logo lies in a hollow and the
    // puffs round over its edges. The mask is the logo's silhouette, blurred and pulled in a little.
    const LOGO_V = front ? `
      vec2 lUv = ( position.xy - uRect.xy ) / uRect.zw + 0.5;
      float lIn = step( 0.0, lUv.x ) * step( lUv.x, 1.0 ) * step( 0.0, lUv.y ) * step( lUv.y, 1.0 );
      vLogo = texture2D( uMask, lUv ).r * lIn;
      vLogoUv = lUv;
      transformed.z -= vLogo * 0.2 * smoothstep( -0.2, 0.5, objectNormal.z );   // a soft cushion, like it landed on whipped cream` : '';
    sh.vertexShader = 'varying vec3 vCW, vCN; varying float vSY, vLogo; varying vec2 vLogoUv;\n' + DENT + '\n' + sh.vertexShader
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        vec4 dW = modelMatrix * vec4( position, 1.0 );
        vec3 dN = normalize( mat3( modelMatrix ) * objectNormal );
        float dUp = smoothstep( -0.1, 0.6, dN.y ) * smoothstep( uPress.y - 1.0, uPress.y - 0.5, dW.y ) * ${front ? '0.0' : '1.0'};
        vec2 dq = dW.xz - uPress.xz;
        float dE = 0.03;
        vec2 dG = vec2( dentH( dq + vec2( dE, 0.0 ) ) - dentH( dq - vec2( dE, 0.0 ) ),
                        dentH( dq + vec2( 0.0, dE ) ) - dentH( dq - vec2( 0.0, dE ) ) ) / ( 2.0 * dE ) * dUp;
        dW.y += dentH( dq ) * dUp;
        objectNormal = normalize( transpose( mat3( modelMatrix ) ) * normalize( dN + vec3( - dG.x, 0.0, - dG.y ) ) );`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed = ( inverse( modelMatrix ) * dW ).xyz;' + LOGO_V)
      .replace('#include <worldpos_vertex>',
        '#include <worldpos_vertex>\n vCW = (modelMatrix * vec4(transformed, 1.0)).xyz; vCN = normalize(mat3(modelMatrix) * objectNormal);')
      .replace('#include <project_vertex>', '#include <project_vertex>\n vSY = gl_Position.y / gl_Position.w;');
    sh.fragmentShader = 'varying vec3 vCW, vCN; varying float vSY, vLogo; varying vec2 vLogoUv; uniform vec3 uSky, uTint, uLamp; uniform float uNight, uHemCut; uniform sampler2D uLine;\n' + AO_GLSL + `
      float cHash( vec3 p ) { p = fract( p * 0.1031 ); p += dot( p, p.zyx + 31.32 ); return fract( ( p.x + p.y ) * p.z ); }
      float cloudNoise( vec3 p ) {
        vec3 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
        return mix( mix( mix( cHash( i ), cHash( i + vec3( 1, 0, 0 ) ), f.x ), mix( cHash( i + vec3( 0, 1, 0 ) ), cHash( i + vec3( 1, 1, 0 ) ), f.x ), f.y ),
                    mix( mix( cHash( i + vec3( 0, 0, 1 ) ), cHash( i + vec3( 1, 0, 1 ) ), f.x ), mix( cHash( i + vec3( 0, 1, 1 ) ), cHash( i + vec3( 1, 1, 1 ) ), f.x ), f.y ), f.z );
      }
    ` + sh.fragmentShader
      .replace('#include <color_fragment>', `
        ${hem ? '' : 'if ( vSY < uHemCut ) discard;                  // below the fold only the hem\'s billows draw, so their dips stay open'}
        float puffAO = vColor.r;`)
      .replace('#include <lights_fragment_begin>', THREE.ShaderChunk.lights_fragment_begin.replace('defined( RE_Direct_RectArea )', 'defined( RE_Direct_RectArea ) && 0'))
      .replace('#include <opaque_fragment>', `
        vec3 cN = normalize( vCN );
        vec3 cV = normalize( cameraPosition - vCW );
        float lum = dot( outgoingLight, vec3( 0.2126, 0.7152, 0.0722 ) );
        float shade = 0.35 + 0.65 * smoothstep( 0.1, 1.5, lum );
        float fold = ( 1.0 - smoothstep( 0.4, 1.0, puffAO ) ) * 0.75 + ( 1.0 - smoothstep( -0.6, 0.3, cN.y ) ) * 0.2;
        float press = 1.0 - sphereAO( vCW, cN );
        shade *= 1.0 - clamp( fold, 0.0, 1.0 ) * 0.7;
        shade *= 1.0 - clamp( press * 1.3, 0.0, 1.0 ) * 0.7;
        ${front ? `shade = mix( shade, 1.0, 0.45 );                                    // it faces us and the key: brighter than the bank
        shade *= 1.0 - smoothstep( 0.05, 0.9, vLogo ) * 0.3;                   // the shade of the dip it rests in
        // the line where it's pressed in (Jason + Scott 2026-10-16): a narrow crease hugging the badge, so the white
        // badge reads against the white cloud
        vec2 lnUv = ( vLogoUv - 0.5 ) / 1.15 + 0.5;                          // its mask has room around the badge
        float lM = all( greaterThan( lnUv, vec2( 0.0 ) ) ) && all( lessThan( lnUv, vec2( 1.0 ) ) ) ? texture2D( uLine, lnUv ).r : 0.0;
        float crease = smoothstep( 0.04, 0.24, lM ) * ( 1.0 - smoothstep( 0.42, 0.66, lM ) );` : ''}
        vec3 shadowCol = mix( uSky, uSky * 0.55 + uTint * 0.6, clamp( press * 1.4, 0.0, 1.0 ) );
        vec3 lit = mix( mix( shadowCol, vec3( 1.0 ), 0.25 ), vec3( 1.0 ), smoothstep( 0.1, 0.9, shade ) );
        float wisp = ${hem ? '0.5' : 'cloudNoise( vCW * 3.1 ) * 0.6 + cloudNoise( vCW * 7.3 ) * 0.4'};   // the hem is smooth: no wisps
        float edge = smoothstep( 0.5, 0.92, ( 1.0 - abs( dot( cN, cV ) ) ) + ( wisp - 0.5 ) * 0.35 );
        lit = mix( lit, vec3( 1.0 ), edge * ( 1.0 - clamp( press * 1.5, 0.0, 1.0 ) ) ${front ? '* ( 1.0 - smoothstep( 0.05, 0.5, vLogo ) )' : ''} );
        ${front ? 'lit = mix( lit, mix( uSky, uSky * 0.5 + uTint * 0.6, 0.75 ), crease * 0.6 );' : ''}
        lit = mix( lit, vec3( 1.0 ), smoothstep( 9.0, 22.0, length( cameraPosition - vCW ) ) * 0.85 );
        outgoingLight = lit;
        if ( uNight > 0.0 ) {
          vec2 lq = vCW.xz - uLamp.xz;
          float pool = exp( - dot( lq, lq ) / 1.3 ) * ( 0.35 + 0.65 * smoothstep( -0.4, 0.6, cN.y ) );
          outgoingLight = mix( lit, lit * ( vec3( 0.03, 0.026, 0.045 ) + vec3( 1.0, 0.72, 0.45 ) * pool * 0.7 ), uNight );
        }
        #include <opaque_fragment>`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        ${fade ? 'gl_FragColor.rgb = mix( gl_FragColor.rgb, mix( vec3( 1.0 ), vec3( 0.047, 0.039, 0.059 ), uNight ), smoothstep( -0.2, -0.75, vSY ) );' : ''}`);
  };
  m.customProgramCacheKey = () => `cloud-${fade}-${front}-${hem}`;
  return m;
}
const cloudMat = makeCloudMat();
const frontMat = makeCloudMat({ fade: false, front: true });

// ---------- The hem ----------
// Scott's final crit: the header has to sit on the hero's own clouds, not on a separate drawing. The hero runs a
// little past the bottom of the screen (--hem, nav.css), and along its bottom a row of billows in the same cloud
// material, in this scene and this light, gives the cloud mass a soft rolling edge. Once you scroll, the hero
// sticks with just that band showing, and the burger, logo and Save the date sit on it.
const HEM_Z = 3.3;
const hemMat = makeCloudMat({ fade: false, hem: true });
const hemBall = new THREE.SphereGeometry(1, 40, 20);
hemBall.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(hemBall.attributes.position.count * 3).fill(1), 3));
const hemGroup = new THREE.Group();
scene.add(hemGroup);
function placeHem(w, hc, hem, portrait) {
  hemGroup.clear();
  hemCutU.value = hem ? 1 - 2 * (hc - hem) / hc : -2;
  if (!hem) return;
  const P = (x, y) => screenToPlaneZ(x / w * 2 - 1, 1 - y / hc * 2, HEM_Z, new THREE.Vector3());
  const upp = P(w, hc).x - P(0, hc).x;                     // world units across the screen at the hem's depth
  const px = upp / w;
  let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // Scott: "softer and less bumpy... light rolling over a larger form". A few broad, low forms, like the flat
  // underside of a cumulus seen from below: about three across the screen, the light sliding slowly over each.
  // Two rows: the front makes the edge, the one behind (a little higher) fills the dips. They stay below the
  // logo's cloud, so the hero itself looks as it did.
  for (const [lift, z, n] of [[0, 0, portrait ? 2.2 : 3.2], [0.35, 0.4, portrait ? 1.6 : 2.4]]) {
    const step = w / n;
    for (let x = -step * (0.3 + rnd() * 0.3); x < w + step;) {
      const rx = step * (0.62 + rnd() * 0.16), ry = hem * (0.8 + rnd() * 0.15) * (1 + lift * 0.4);
      const bottom = hc - 3 - rnd() * hem * 0.2 - lift * hem;
      const c = P(x, bottom - ry);
      const m = new THREE.Mesh(hemBall, hemMat);
      m.scale.set(rx * px, ry * px, Math.min(rx, ry * 3) * px);
      m.position.set(c.x, c.y, HEM_Z - z - ry * px);
      hemGroup.add(m);
      x += step * (0.95 + rnd() * 0.2);
    }
  }
}

const meshOf = (o, material) => {
  if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
  const m = new THREE.Mesh(o.geometry, material);
  m.applyMatrix4(o.matrixWorld);       // keep quantized data intact; place the mesh instead
  return m;
};

// ---------- The turntable ----------
// Each Grumpl in the drop stands on its own cloud. They sit on an arc: the focused one in the middle,
// the others further back to the left and right. Switching turns the arc, so the next one comes forward.
const N = FLAVORS.length;
const ring = { f: 0, show: 0, from: 0, t: 1, dur: 0.9 };    // show = the arc's position, eased toward f
const slots = FLAVORS.map((f) => ({ f, group: new THREE.Group(), cloud: new THREE.Group(), set: null, meshes: [] }));
slots.forEach((s) => scene.add(s.group, s.cloud));
let ARC = { rx: 2.0, rz: 1.9, step: THREE.MathUtils.degToRad(58) };
const wrapU = (u) => { u = ((u % N) + N) % N; return u > N / 2 ? u - N : u; };
const _slotP = new THREE.Vector3();
function slotPose(u, out) {
  // u = place on the arc: 0 front and centre, ±1 the neighbours, ±1.5 behind (where wrapping happens)
  const a = THREE.MathUtils.clamp(u, -1, 1) * ARC.step;
  out.set(ARC.rx * Math.sin(a) / Math.sin(ARC.step), 0, -ARC.rz * (1 - Math.cos(a)) / (1 - Math.cos(ARC.step)));
  if (Math.abs(u) > 1) {                                       // past the neighbours: sink down into the back clouds
    const k = Math.abs(u) - 1;
    out.x = Math.sign(u) * ARC.rx * (1 + 0.25 * k);
    out.z = -ARC.rz * (1 + 0.8 * k);
    out.y = -2.4 * k * k;
  }
  return out;
}
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
// Trading places is exciting: the one coming in and the one going out each do their own trick on the way.
const MOVES = {
  spin:      (t) => ({ y: Math.sin(Math.PI * t) * 0.9, yaw: Math.PI * 2 * ease(t) }),
  flip:      (t) => ({ y: Math.sin(Math.PI * t) * 1.25, pitch: -Math.PI * 2 * ease(THREE.MathUtils.clamp((t - 0.1) / 0.75, 0, 1)) }),
  hops:      (t) => ({ y: Math.abs(Math.sin(Math.PI * 3 * t)) * 0.45 * (1 - t * 0.3), yaw: Math.sin(Math.PI * 3 * t) * 0.5 }),
  cartwheel: (t) => ({ y: Math.sin(Math.PI * t) * 1.0, roll: Math.PI * 2 * ease(t) }),
  corkscrew: (t) => ({ y: Math.sin(Math.PI * t) * 1.4, yaw: -Math.PI * 4 * ease(t), roll: Math.sin(Math.PI * t) * 0.5 }),
  wiggle:    (t) => ({ y: Math.sin(Math.PI * t) * 0.6, roll: Math.sin(Math.PI * 4 * t) * 0.4 * (1 - t), yaw: Math.PI * ease(t) * 2 }),
};
const MOVE_KEYS = Object.keys(MOVES);
// small idle tricks (not used for swaps): a hop with a full turn, and a double bounce
const IDLE_MOVES = {
  hopspin: (t) => ({ y: Math.sin(Math.PI * t) * 0.42, yaw: Math.PI * 2 * ease(t) }),
  bounce:  (t) => ({ y: Math.abs(Math.sin(Math.PI * 2 * t)) * 0.3 * (1 - t * 0.4), roll: Math.sin(Math.PI * 2 * t) * 0.12 * (1 - t) }),
};
Object.assign(MOVES, IDLE_MOVES);
// the entrance: dropped in from above, a squashy landing and a little bounce (staggered per Grumpl)
MOVES.arrive = (t) => {
  const f = 0.5;
  if (t < f) { const k = t / f; return { y: 5 * (1 - k * k), yaw: (1 - k) * 1.2 }; }
  const k = (t - f) / (1 - f);
  return { y: Math.abs(Math.sin(Math.PI * 2 * k)) * 0.35 * (1 - k) };
};
addEventListener('grumpl-arrive', () => {
  if (reduceMotion) return;
  const now = performance.now();
  slots.forEach((s, i) => { s.trick = { name: 'arrive', t0: now + (i === ring.f ? 0 : 140 + 160 * ((i - ring.f + N) % N)), dur: 1250 }; });
  nextHop = now + 6000;
  poke(10);
});
const swapMoves = { in: 'spin', out: 'hops' };
const _mq = new THREE.Quaternion(), _me = new THREE.Euler();
function applyMove(g, name, t) {
  if (t <= 0 || t >= 1) return;
  const m = MOVES[name](t);
  g.position.y += m.y || 0;
  _mq.setFromEuler(_me.set(m.pitch || 0, m.yaw || 0, m.roll || 0, 'YXZ'));
  g.quaternion.multiply(_mq);
}

// the focused Grumpl hands over to physics; the one leaving keeps whatever pose he had and eases upright
const leaving = { slot: -1, p: new THREE.Vector3(), q: new THREE.Quaternion() };
const focusGroup = () => slots[ring.f].group;
function focus(i, dir) {
  i = ((i % N) + N) % N;
  if (i === ring.f && ring.t >= 1) return;
  if (grip) release();
  leaving.slot = ring.f;
  leaving.p.copy(focusGroup().position); leaving.q.copy(focusGroup().quaternion);
  // go the short way round unless a direction was asked for
  let target = ring.show + wrapU(i - ring.show);
  if (dir && Math.sign(target - ring.show) !== dir && Math.abs(wrapU(i - ring.show)) > 0.01) target += dir * N;
  ring.from = ring.show; ring.to = target; ring.t = 0;
  ring.dur = reduceMotion ? 0.01 : 1.05 + 0.2 * Math.abs(target - ring.show);
  swapMoves.in = MOVE_KEYS[(Math.random() * MOVE_KEYS.length) | 0];
  do swapMoves.out = MOVE_KEYS[(Math.random() * MOVE_KEYS.length) | 0]; while (swapMoves.out === swapMoves.in);
  ring.f = i;
  standYaw = 0;
  calm();
  onFocus(FLAVORS[i], i);
  poke(4);
}
function updateRing(dt) {
  if (ring.t < 1) {
    ring.t = Math.min(1, ring.t + dt / ring.dur);
    ring.show = ring.from + (ring.to - ring.from) * ease(ring.t);
    if (ring.t >= 1) {
      ring.show = ((ring.to % N) + N) % N;
      standUp();
      body.velocity.set(0, -1, 0);
      leaving.slot = -1;
      sound.thump(5);
    }
    poke(2);
  }
  const _q = new THREE.Quaternion();
  slots.forEach((s, i) => {
    const u = wrapU(i - ring.show);
    slotPose(u, _slotP);
    s.cloud.position.copy(_slotP);
    if (i === ring.f && ring.t >= 1) return;                       // physics drives him
    // stand on his cloud, turned a little toward the middle so the line-up reads as a group
    let yaw = homeYaw(i) - u * 0.25;
    if (i === ring.f && ring.t < 1) yaw *= 1 - ease(ring.t);       // the one arriving turns to face you as he lands
    _q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, yaw);
    s.group.position.set(_slotP.x, _slotP.y + LIFT + COM_Y, _slotP.z);
    s.group.quaternion.copy(_q);
    if (i === leaving.slot && ring.t < 1) {                        // the one leaving lets go of his pose first
      const k = ease(Math.min(1, ring.t / 0.35));
      s.group.position.lerpVectors(leaving.p, s.group.position, k);
      s.group.quaternion.slerpQuaternions(leaving.q, _q, k);
      applyMove(s.group, swapMoves.out, (ring.t - 0.12) / 0.86);
    } else if (i === ring.f && ring.t < 1) applyMove(s.group, swapMoves.in, ring.t / 0.97);
    else if (s.trick) {                                            // left alone, the neighbours hop and spin now and then
      const t = (performance.now() - s.trick.t0) / s.trick.dur;
      if (t >= 1) s.trick = null; else { applyMove(s.group, s.trick.name, t); poke(2); }
    }
    const hide = THREE.MathUtils.smoothstep(Math.abs(u), 1.25, 1.5);
    s.group.visible = s.cloud.visible = hide < 0.999;
  });
}

// ---------- The foreground cloud and the logo ----------
const front = { group: new THREE.Group(), logo: null, canvas: null, ctx: null, pieces: [], tex: null, s: 1, anim: [] };
scene.add(front.group);
const LOGO_W = 4.15, LOGO_H = LOGO_W * 758 / 1307;          // in the cloud's own units
const LOGO_C = new THREE.Vector2(0.06, -1.38);
const LOGO_Z = 0.9;                                  // the badge's depth in the cloud: just proud of the hollow's floor (its surface is ~0.77 to ~1.08 there)
logoRectU.value.set(LOGO_C.x, LOGO_C.y, LOGO_W, LOGO_H);

async function buildLogo() {
  const txt = await (await fetch('assets/logo.svg')).text();
  const holder = document.createElement('div');
  holder.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden';
  holder.innerHTML = txt;
  document.body.appendChild(holder);
  const svg = holder.querySelector('svg');
  const get = (id) => svg.querySelector('#' + id);
  const P = (el) => ({ id: el.id, path: new Path2D(el.getAttribute('d')), fill: el.getAttribute('fill'), alpha: +(el.getAttribute('fill-opacity') || 1), rule: el.getAttribute('fill-rule') || 'nonzero' });
  const cloudParts = ['cloud-shadow', 'cloud-outline', 'cloud-fill', 'cloud-shade'].map((id) => P(get(id)));
  front.pieces = ['g', 'r', 'u', 'm', 'p', 'l'].map((k) => {
    const els = [...svg.querySelectorAll(`[id^="drop-${k}-"]`), get('letter-' + k)];
    const bb = get('letter-' + k).getBBox();
    return { k, parts: els.map(P), cx: bb.x + bb.width / 2, cy: bb.y + bb.height * 0.62, y0: bb.y, y1: bb.y + bb.height, t: -1 };
  });
  const outline = get('cloud-outline').getAttribute('d');
  front.fills = Object.fromEntries([...svg.querySelectorAll('path[id]')].map((el) => [el.id, el.getAttribute('fill')]));
  holder.remove();

  const S = 1536 / 1307, W = 1536, H = Math.round(758 * S);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  front.canvas = cv; front.ctx = cv.getContext('2d');
  front.draw = () => {
    const g = front.ctx;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    g.setTransform(S, 0, 0, S, 0, 0);
    for (const c of cloudParts.slice(1)) { g.globalAlpha = c.alpha; g.fillStyle = c.fill; g.fill(c.path, c.rule); }
    g.globalAlpha = 1;
    let busy = false;
    for (const pc of front.pieces) {
      busy = puffOf(pc) || busy;
      if (logo3D.on) continue;                  // the 3D letters stand in for the flat ones
      g.save();
      g.translate(pc.cx, pc.cy + pc.dy); g.rotate(pc.rot); g.scale(pc.sc, pc.sc); g.translate(-pc.cx, -pc.cy);
      let candy = null;
      if (front.candy) {                        // Halloween: every letter is a candy corn, yellow base, orange middle, white tip
        candy = g.createLinearGradient(0, pc.y1, 0, pc.y0);
        candy.addColorStop(0, '#ffc21a'); candy.addColorStop(0.42, '#ffc21a'); candy.addColorStop(0.42, '#ff8a1c');
        candy.addColorStop(0.74, '#ff8a1c'); candy.addColorStop(0.74, '#fff3dc'); candy.addColorStop(1, '#fff3dc');
      }
      for (const c of pc.parts) { g.fillStyle = candy || c.fill; g.fill(c.path, c.rule); }
      g.restore();
    }
    if (front.tex) front.tex.needsUpdate = true;
    return busy;
  };
  front.draw();
  front.tex = new THREE.CanvasTexture(cv);
  front.tex.colorSpace = THREE.SRGBColorSpace;
  front.tex.anisotropy = 4;

  // the silhouette, blurred: drives the hollow in the cloud and the soft shadow its rim casts on the logo
  const mk = (blur, inset) => {
    const m = document.createElement('canvas'); m.width = 256; m.height = Math.round(256 * 758 / 1307);
    const g = m.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, m.width, m.height);
    g.filter = `blur(${blur}px)`;
    const k = m.width / 1307;
    g.setTransform(k * inset, 0, 0, k * inset, m.width * (1 - inset) / 2, m.height * (1 - inset) / 2);
    g.fillStyle = '#fff'; g.fill(new Path2D(outline));
    const t = new THREE.CanvasTexture(m);
    t.flipY = true;
    return t;
  };
  logoMaskU.value = mk(16, 1.02);
  logoLineU.value = mk(3, 1.035 / 1.15);
  const rimTex = mk(9, 0.96);

  const logoMat = new THREE.ShaderMaterial({
    transparent: true, toneMapped: false, depthWrite: false,   // no depth: the gummy letters are drawn after it, in their own pass
    uniforms: { uTex: { value: front.tex }, uRim: { value: rimTex }, uSky: skyU, uNight: nightU },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform sampler2D uTex, uRim; uniform vec3 uSky; uniform float uNight; varying vec2 vUv;
      void main(){
        vec4 c = texture2D(uTex, vUv);
        // the cloud's lip shades the logo's upper-left edge (the key comes from there)
        float lip = texture2D(uRim, vUv + vec2(-0.012, 0.03)).r;
        c.rgb *= mix(mix(uSky, vec3(1.0), 0.45), vec3(1.0), smoothstep(0.35, 0.95, lip));
        c.rgb *= mix(1.0, 0.62, uNight);
        gl_FragColor = c;
        #include <colorspace_fragment>
      }`
  });
  front.logo = new THREE.Mesh(new THREE.PlaneGeometry(LOGO_W, LOGO_H), logoMat);
  front.logo.position.set(LOGO_C.x, LOGO_C.y, LOGO_Z);
  front.logo.renderOrder = 2;
  front.logo.visible = false;          // the flat logo is drawn by the page as a vector on top; this plane backs the 3D finishes
  front.group.add(front.logo);
  frontMat.needsUpdate = true;
  poke(10);
}
// a puff: squash, pop up big, settle with a wobble (the brand-book letter jump). Writes sc, dy, rot onto the piece.
function puffOf(pc) {
  pc.sc = 1; pc.dy = 0; pc.rot = 0;
  if (pc.t <= 0) return false;
  const t = (performance.now() - pc.t) / 520;
  if (t >= 1) { pc.t = -1; return false; }
  const pop = Math.sin(Math.PI * Math.min(1, t * 1.6)) * (1 - t * 0.4);
  pc.sc = 1 + 0.16 * pop - 0.05 * Math.sin(t * 14) * (1 - t);
  pc.dy = -26 * pop;
  pc.rot = 0.05 * Math.sin(t * 11) * (1 - t);
  return true;
}

// ---------- The 3D logo finishes (tap the logo): flat, gummy, chrome ----------
const logo3D = { on: false, mode: 'flat' };

// The logo wears the focused Grumpl's finish (Scott, 2026-10-16): chrome Grumpl, chrome logo; flocked, flocked;
// vinyl, vinyl, in that flavor's colors. ?logo=flat forces the flat vector logo (testing), and so does Save-Data
// (the 3D logo is a 1.9 MB download). Seasons can still set a finish of their own.
const SEASONS = [   // from/to are 'MM-DD', inclusive (a range may wrap the new year)
  { name: 'halloween', from: '10-01', to: '10-31', auto: false, finish: 'gummy' },
];
const urlQ = new URLSearchParams(location.search);
const SEASON = (() => {
  const q = urlQ.get('season');
  if (q) return SEASONS.find((s) => s.name === q) || null;
  const d = new Date(), md = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return SEASONS.find((s) => s.auto && (s.from <= s.to ? md >= s.from && md <= s.to : md >= s.from || md <= s.to)) || null;
})();
const logoFlat = urlQ.get('logo') === 'flat' || !!navigator.connection?.saveData;
const logoFor = (f) => (logoFlat ? 'flat' : SEASON?.finish || f.kind || 'vinyl');

// The gummy and chrome finishes are the puff-logo experiment itself (grumpl/logo/grumpl-puff-logo.html, Cloud view),
// drawn by assets/logo3d.js in its own small canvas over the hero's cloud: full resolution, its own warm room light,
// and none of its cost in the hero's frame. It loads only when a visit lands on (or taps to) a 3D finish.
const room = { want: roomWant };          // where the cursor or the phone's tilt points, -1..1: turns the warm room (room.js)
const hasChrome = FLAVORS.some((f) => f.kind === 'chrome');
addEventListener('grumpl-room-ready', () => poke(10));
addEventListener('pointermove', (e) => {
  if (coarse && motion?.on) return;
  const r = stage.getBoundingClientRect();
  room.want.set(THREE.MathUtils.clamp((e.clientX - r.left) / r.width * 2 - 1, -1, 1), THREE.MathUtils.clamp(-((e.clientY - r.top) / r.height * 2 - 1), -1, 1));
}, { passive: true });
let logoMod = null;
async function setLogoFinish(mode, { puff = true } = {}) {
  if (!front.logo) return;
  logo3D.mode = mode;
  const want3D = mode !== 'flat' && !night.on;
  if (want3D && !logoMod) {
    document.body.classList.add('logo-loading');
    try {
      const m = await import('./logo3d.js');
      await m.initLogo3D({ after: stage, onTap: () => cycleLogo() });
      logoMod = m;
    } catch (e) { console.error('logo 3D', e); }
    document.body.classList.remove('logo-loading');
    if (!logoMod || logo3D.mode !== mode) return;
    logoMod.setLogo3DMode(mode);
    sendLogoRect();
  }
  logo3D.on = want3D && !!logoMod;
  logoMod?.setLogo3DMode(logo3D.on ? mode : 'flat');
  dispatchEvent(new CustomEvent('grumpl-logo-mode', { detail: { mode: logo3D.on ? mode : 'flat' } }));
  front.draw?.(); poke(6);
  if (puff) puffRow();
}
function cycleLogo() { puffRow(); }   // a tap on the logo makes the letters jump (its finish follows the Grumpl)

function puffLetter(i, delay = 0) {
  const pc = front.pieces[i]; if (!pc) return;
  setTimeout(() => { pc.t = performance.now(); front.busy = true; poke(); }, delay);
}
// each puff also swings the room a little, so on a phone with nothing to steer it the jelly still catches the light
function puffRow() {
  front.pieces.forEach((_, i) => puffLetter(i, i * 110));
  logoMod?.puffLogo3D();
  dispatchEvent(new Event('grumpl-puff'));
}

// ---------- Load everything ----------
const ready = Promise.all([
  loadGLB('assets/models/grumpl.glb'),
  loadGLB('assets/models/cloud-bank.glb'),
  loadGLB('assets/models/cloud-front.glb'),
  buildLogo().catch((e) => console.error('logo', e)),
]).then(async ([fig, bank, fc]) => {
  // background rows of the bank stay put; the hero puff is copied under each Grumpl on the arc
  bank.scene.traverse((o) => {
    if (!o.isMesh) return;
    if (o.name === 'hero') slots.forEach((s) => s.cloud.add(meshOf(o, cloudMat)));
    else if (!o.name.startsWith('front')) scene.add(meshOf(o, cloudMat));
    else {
      // Scott (2026-10-16): the shared cloud runs right up to the glass, so there is no gap in front of his
      // platform to fall into. The front rows are raised to the crest and squeezed to end at the glass.
      const m = meshOf(o, cloudMat);
      m.scale.set(1.05, 1, 0.55); m.position.set(0, 0.3, 0.45);
      scene.add(m);
    }
  });
  fc.scene.traverse((o) => { if (o.isMesh) front.group.add(meshOf(o, frontMat)); });

  slots.forEach((s) => {
    const fg = buildFigure(fig, s.f, lightU, eyeEnv, coarse ? 12000 : 20000);
    s.set = fg.set; s.meshes = fg.meshes;
    fg.group.position.y = -COM_Y;
    s.group.add(fg.group);
  });
  updateRing(0);
  resize();
  if (night.on) setNight(true);
  // Warm everything before the curtain lifts (Scott: a longer load is fine if what follows is smooth):
  // the warm room for the chrome, the 3D logo, and every shader compiled and drawn once, off screen
  hold(8000);
  const firstLogo = logoFor(FLAVORS[0]);
  const warm = [];
  warm.push(roomEnv(renderer).then((t) => slots.forEach(({ set }) => roomSet(set, t))));
  if (firstLogo !== 'flat') warm.push(setLogoFinish(firstLogo, { puff: false }));
  await Promise.race([Promise.all(warm), new Promise((r) => setTimeout(r, 8000))]);
  try { await renderer.compileAsync(scene, camera); } catch { renderer.compile(scene, camera); }
  const frame = () => new Promise((r) => requestAnimationFrame(r));
  for (let i = 0; i < 2; i++) { renderer.render(scene, camera); await frame(); }
  document.body.classList.add('ready');
  hold(2500);                      // texture uploads right after the reveal: not a reason to drop resolution
  poke(30);
  if (logo3D.on) setTimeout(puffRow, 250);
  dispatchEvent(new Event('grumpl-hero-ready'));
}).catch((e) => {
  document.getElementById('loading').textContent = 'The Grumpl could not load. Reload to try again.';
  console.error(e);
});

// ---------- Tint ----------
// The page wash takes the focused Grumpl's secondary color, softened to a pale pastel.
const tmpC = new THREE.Color();
function onFocus(f, i) {
  const hsl = {};
  tmpC.set(f.edge).getHSL(hsl);
  skyU.value.set(0x9fbcf0).lerp(tmpC.set(f.edge), 0.22);
  tintU.value.set(f.base);
  ui.focus(f, i);
  setFinish(f);
  if (logo3D.mode !== 'flat' && logoFor(f) !== logo3D.mode) setLogoFinish(logoFor(f));
  else logoMod?.refreshLogo3D?.();
}

// ---------- Jump ----------
function jump() {
  if (ring.t < 1) return;
  if (grip) release();
  body.wakeUp();
  const dir = Math.random() < 0.5 ? -1 : 1;
  body.velocity.set(0, Math.max(body.velocity.y, 6.2), 0);
  body.angularVelocity.set(0, body.angularVelocity.y + dir * 9, 0);
  twirlSteps = 280;
  navigator.vibrate?.(12);
  poke();
}

// ---------- Cushion ----------
const press = { s: 0, v: 0, rest: 0, prevVy: 0, lastBoop: 0 };
let offAt = 0;
function updateCushion(dt) {
  const p = body.position;
  const above = p.y - (LIFT + COM_Y);
  const onCrest = Math.abs(p.x) < 1.9 && Math.abs(p.z) < 1.1 && above < 0.6 && !grip;
  const target = onCrest ? 0.24 * (1 - THREE.MathUtils.smoothstep(above, 0.0, 0.6)) : 0;
  press.rest += (target - press.rest) * Math.min(1, dt * 10);
  if (onCrest && press.prevVy < -1.5 && body.velocity.y > press.prevVy + 1.2) {
    press.v += -press.prevVy * 0.16;
    // every landing makes the letters go boop boop boop
    const now = performance.now();
    if (-press.prevVy > 4 && now - press.lastBoop > 1200) { press.lastBoop = now; puffRow(); }
  }
  press.prevVy = body.velocity.y;
  if (dt > 0) {
    press.v += (-140 * press.s - 11 * press.v) * dt;
    press.s = THREE.MathUtils.clamp(press.s + press.v * dt, -0.05, 0.22);
  }
  pressU.value.set(p.x, CLOUD_TOP, p.z, press.rest + press.s);
  // knocked off the crest into the fluff: once he's still for a moment, he hops back home
  if (!onCrest && !grip && body.velocity.length() < 0.6 && above < 0.2) {
    if (!offAt) offAt = performance.now();
    else if (performance.now() - offAt > 1400) {
      offAt = 0;
      const t = 0.75;
      body.wakeUp();
      body.quaternion.set(0, 0, 0, 1);
      body.velocity.set(-p.x / t, 6.5, -p.z / t);
      body.angularVelocity.set(0, (Math.random() - 0.5) * 6, 0);
      twirlSteps = 260;
    }
  } else offAt = 0;
}

// ---------- Input ----------
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const dragPlane = new THREE.Plane();
const handTarget = new THREE.Vector3();
const canvas = renderer.domElement;
let mode = null, sx = 0, sy = 0, lastY = 0;
const toNdc = (e) => { const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); };
function handPoint() {
  raycaster.setFromCamera(ndc, camera);
  if (!raycaster.ray.intersectPlane(dragPlane, handTarget)) return;
  handTarget.x = THREE.MathUtils.clamp(handTarget.x, -BOUNDS.x + 0.3, BOUNDS.x - 0.3);
  handTarget.y = THREE.MathUtils.clamp(handTarget.y, -0.6, BOUNDS.top - 0.3);
  handTarget.z = THREE.MathUtils.clamp(handTarget.z, BOUNDS.zBack + 0.3, BOUNDS.zFront - 0.3);
}
function hitLogo() {
  if (!front.logo || !front.logo.visible) return false;
  raycaster.setFromCamera(ndc, camera);
  const h = raycaster.intersectObject(front.logo, false)[0];
  if (!h || !h.uv) return false;
  // only the drawn logo counts, not the transparent corners of its plane
  const px = Math.floor(h.uv.x * front.canvas.width), py = Math.floor((1 - h.uv.y) * front.canvas.height);
  try { return front.ctx.getImageData(px, py, 1, 1).data[3] > 40; } catch { return true; }
}
function hitSlot() {
  raycaster.setFromCamera(ndc, camera);
  let best = null;
  slots.forEach((s, i) => {
    if (!s.group.visible) return;
    const h = raycaster.intersectObjects(s.meshes, false)[0];
    if (h && (!best || h.distance < best.h.distance)) best = { i, h };
  });
  return best;
}
canvas.addEventListener('pointerdown', (e) => {
  toNdc(e);
  sx = e.clientX; sy = lastY = e.clientY;
  const hit = ring.t >= 1 ? hitSlot() : null;
  if (hit && hit.i === ring.f) {
    canvas.setPointerCapture(e.pointerId);
    mode = 'grab';
    const p = hit.h.point;
    dragPlane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()).negate(), p);
    hand.position.set(p.x, p.y, p.z);
    handTarget.copy(p);
    grip = new CANNON.PointToPointConstraint(body, body.pointToLocalFrame(new CANNON.Vec3(p.x, p.y, p.z)), hand, new CANNON.Vec3(0, 0, 0), 40);
    world.addConstraint(grip);
    body.angularDamping = 0.7;
    body.wakeUp();
    canvas.style.cursor = 'grabbing';
    ui.played();
  } else if (hit) {
    mode = 'tap'; mode_i = hit.i;
  } else if (hitLogo()) {
    mode = 'logo';
  } else {
    mode = 'swipe';
    canvas.setPointerCapture(e.pointerId);
  }
});
let mode_i = -1;
canvas.addEventListener('pointermove', (e) => {
  toNdc(e);
  if (mode === 'grab') { handPoint(); return; }
  if (mode === 'swipe' && coarse) {                       // vertical drags off the Grumpl still scroll the page
    const dy = e.clientY - lastY; lastY = e.clientY;
    if (Math.abs(e.clientY - sy) > Math.abs(e.clientX - sx)) scrollBy(0, -dy);
    return;
  }
  if (!mode && !coarse) {
    const h = hitSlot();
    canvas.style.cursor = h ? (h.i === ring.f ? 'grab' : 'pointer') : hitLogo() ? 'pointer' : 'default';
  }
});
function release() {
  if (grip) { world.removeConstraint(grip); grip = null; }
  hand.velocity.setZero();
  body.angularDamping = 0.3;
  canvas.style.cursor = 'default';
}
canvas.addEventListener('pointerup', (e) => {
  const dx = e.clientX - sx, dy = e.clientY - sy;
  if (mode === 'swipe' && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) step(dx < 0 ? 1 : -1);
  else if (mode === 'tap' && Math.hypot(dx, dy) < 12) focus(mode_i);
  else if (mode === 'logo' && Math.hypot(dx, dy) < 12) cycleLogo();
  mode = null; release();
});
canvas.addEventListener('pointercancel', () => { mode = null; release(); });
// a double-click only stands him up: clicking means pick him up, so the glass smoosh comes on its own (below)
canvas.addEventListener('dblclick', () => standUp());
const step = (d) => focus(ring.f + d, d);
addEventListener('keydown', (e) => {
  if (e.target.closest?.('input, textarea, [contenteditable]')) return;
  if (e.key === 'ArrowLeft') step(-1);
  else if (e.key === 'ArrowRight') step(1);
  else if (e.code === 'Space' && scrollY < innerHeight * 0.6) { e.preventDefault(); jump(); }
});
let touchedAt = performance.now();
['pointerdown', 'keydown', 'resize'].forEach((ev) => addEventListener(ev, () => { poke(); idleAt = touchedAt = performance.now(); calm(); }, true));

// Scott (2026-10-16): instead of only turning, the Grumpls hop up, bounce and spin on a loose timer. It says
// "I'm a toy, touch me". The one in front does it for real (physics); his neighbours do it on their clouds.
let nextHop = performance.now() + 3500;
if (!reduceMotion) setInterval(() => {
  const now = performance.now();
  if (document.visibilityState !== 'visible' || !heroOn || covered() || ring.t < 1 || now < nextHop) return;
  nextHop = now + 3200 + Math.random() * 3800;
  const others = slots.filter((s, i) => i !== ring.f && s.group.visible && !s.trick);
  if (turntable() && Math.random() < 0.55) {
    slots[ring.f].trick = { name: Math.random() < 0.6 ? 'hopspin' : 'bounce', t0: now, dur: 950 };
  } else if (others.length) {
    const s = others[(Math.random() * others.length) | 0];
    s.trick = { name: Math.random() < 0.6 ? 'hopspin' : 'bounce', t0: now, dur: 900 };
  }
  poke(4);
}, 400);

// Scott (2026-10-16): every once in a while, with no warning, the front Grumpl flings himself at the glass
// (smooshAt below). A long random timer, only while nobody is touching him and he is standing on his cloud.
let nextSmoosh = Infinity;
addEventListener('grumpl-hero-ready', () => { nextSmoosh = performance.now() + 25000 + Math.random() * 15000; }, { once: true });
if (!reduceMotion) setInterval(() => {
  const now = performance.now();
  if (now < nextSmoosh || document.visibilityState !== 'visible' || !heroOn || covered() || now - touchedAt < 8000 || !turntable()) return;
  nextSmoosh = now + 50000 + Math.random() * 60000;
  smooshAt();
}, 1000);

// idle: the letters puff one after another, like on the brand book
let idleAt = performance.now();
if (!reduceMotion) setInterval(() => {
  if (performance.now() - idleAt > 6000 && document.visibilityState === 'visible') { puffRow(); idleAt = performance.now(); }
}, 700);

// ---------- Tilt and shake (phones; from the drop site, grumpl/handoff/motion) ----------
// Tilt: the camera leans with the phone, so you look around him a little. Past 12° he slides downhill.
// Shake: a jostle sets him wobbling; a hard shake tosses him the opposite way to the phone, like a toy in a box.
const camBase = new THREE.Vector3();
const par = { cur: new THREE.Vector3(), want: new THREE.Vector3() };
const motion = createMotion({
  onTilt({ x, y, slide }) {
    par.want.set(x * 0.9, y * 0.6, 0); tiltG = slide * 0.45;
    room.want.set(THREE.MathUtils.clamp(-x * 1.8, -1, 1), THREE.MathUtils.clamp(y * 1.8, -1, 1));   // tilt the phone, the warm room turns (the 3D logo, the chrome Grumpl)
  },
  onWobble({ dir, strength }) {
    if (ring.t < 1 || grip) return;
    calm();
    body.wakeUp();
    body.angularVelocity.x += -dir[2] * strength; body.angularVelocity.y += (Math.random() - 0.5) * strength; body.angularVelocity.z += dir[0] * strength;
    body.velocity.y = Math.max(body.velocity.y, 1.5);
    haptic(10); poke();
  },
  onToss({ velocity }) {
    if (ring.t < 1 || grip) return;
    calm();
    body.wakeUp();
    body.velocity.set(velocity[0], Math.max(velocity[1], 3), velocity[2]);
    body.angularVelocity.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 10);
    twirlSteps = 260;
    haptic([18, 30, 12]); poke();
  },
});
let lastWallHit = 0, lastThump = 0;
body.addEventListener('collide', (e) => {
  if (e.body === hand) return;
  const v = Math.abs(e.contact.getImpactVelocityAlongNormal()), now = performance.now();
  if (e.body === wallF && smoosh && !smoosh.hit && v > 1.5) { glassHit(v); return; }
  if (e.body === crest || e.body === floorB) {
    if (v > 2.5 && now - lastThump > 160) { lastThump = now; sound.thump(v); }
    return;
  }
  // the box: every wall knock rattles, and buzzes the phone when shake is on
  if (v > 1.6 && now - lastWallHit > 80) {
    lastWallHit = now;
    sound.rattle(v);
    if (motion.on) haptic(Math.min(28, v * 2.2));
  }
});

// ---------- Pressed against the glass ----------
// Every so often (a long random timer): he leaps at you, squashes flat on the glass, fogs it, and slides off.
const SMOOSH_HOLD = 900;
let smoosh = null;
const squash = { a: 0, v: 0, want: 0 };
const fog = document.createElement('div');
fog.id = 'Fog';
stage.after(fog);
function smooshAt() {
  if (ring.t < 1 || smoosh || night.on) return;
  if (grip) release();
  const glassZ = camBase.z - 2.35;
  wallF.position.z = glassZ;
  body.wakeUp();
  body.quaternion.set(0, 0, 0, 1);
  body.angularVelocity.setZero();
  body.velocity.set(-body.position.x * 1.5, 5.8, (glassZ - 0.6 - body.position.z) / 0.42);
  twirlSteps = 0;
  smoosh = { at: performance.now(), hit: 0 };
  ui.played();
  poke(10);
}
const _fp = new THREE.Vector3();
function glassHit(v) {
  smoosh.hit = performance.now();
  body.velocity.set(0, -0.2, 0);
  body.quaternion.set(0, 0, 0, 1);
  body.angularVelocity.setZero();
  squash.v += 4 + v * 0.5; squash.want = 0.8;
  sound.squeak(); haptic([10, 30, 22]);
  // a fogged patch where his face meets the glass
  _fp.set(body.position.x, body.position.y + 0.35, body.position.z + 0.6).project(camera);
  const r = stage.getBoundingClientRect();
  fog.style.left = `${(_fp.x + 1) / 2 * r.width}px`;
  fog.style.top = `${(1 - _fp.y) / 2 * r.height}px`;
  fog.style.setProperty('--s', `${Math.min(r.width, r.height) * 0.42}px`);
  fog.classList.remove('on'); void fog.offsetWidth; fog.classList.add('on');
}
function updateSmoosh(dt) {
  if (smoosh) {
    const now = performance.now();
    if (smoosh.hit && now - smoosh.hit > SMOOSH_HOLD && !smoosh.off) {     // peel off and drop back home
      smoosh.off = now; squash.want = 0;
      body.velocity.set(-body.position.x * 0.6, 3.2, -6.5);
      body.angularVelocity.set(-3, (Math.random() - 0.5) * 4, 0);
    }
    if ((smoosh.off && body.position.z < BOUNDS.zFront - 0.4) || now - smoosh.at > 4000) {
      wallF.position.z = BOUNDS.zFront;
      if (body.position.z > BOUNDS.zFront - 0.3) body.position.z = 0;
      smoosh = null;
    }
    poke(2);
  }
  if (squash.a !== 0 || squash.v !== 0 || squash.want) {
    squash.v += (-90 * (squash.a - squash.want) - 9 * squash.v) * dt;
    squash.a = THREE.MathUtils.clamp(squash.a + squash.v * dt, -0.3, 0.95);
    if (!squash.want && Math.abs(squash.a) < 0.002 && Math.abs(squash.v) < 0.01) squash.a = squash.v = 0;
    poke(2);
  }
}

// ---------- Lights out (Halloween) ----------
// Oct 31 (or the easter egg): the page goes dark, his studio lights go off, and one warm lamp follows your
// finger or cursor. The logo turns to candy corn. Eyes blink in the dark behind him (page.js draws those).
const night = { on: false, k: 0, aim: new THREE.Vector3(0, LIFT + 1, 0), want: new THREE.Vector3(0, LIFT + 1, 0), movedAt: 0, screen: { x: 0, y: 0, r: 0 } };
const NIGHT_PLANE = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
function setNight(on) {
  night.on = on;
  front.candy = on;
  if (on && smoosh) { wallF.position.z = BOUNDS.zFront; smoosh = null; squash.want = 0; }
  key.color.set(on ? 0xffc890 : 0xfff1e2);
  key.angle = on ? 0.42 : Math.PI / 4;
  key.penumbra = on ? 0.9 : 1;
  rims.forEach((r) => (r.visible = !on));
  slots.forEach((s) => s.group.traverse((o) => {      // the studio's reflections go dark too; the eyes keep a glint
    const m = o.material; if (!m || m.envMapIntensity == null) return;
    m.userData.env ??= m.envMapIntensity;
    m.envMapIntensity = on ? m.userData.env * (m === s.set?.eyes ? 0.5 : 0.05) : m.userData.env;
  }));
  setLogoFinish(logo3D.mode);
  front.draw?.();
  poke(10);
}
function updateNight(dt) {
  const target = night.on ? 1 : 0;
  if (night.k !== target) { night.k += Math.sign(target - night.k) * Math.min(Math.abs(target - night.k), dt * 1.6); nightU.value = night.k; poke(2); }
  if (!night.on) return;
  const now = performance.now();
  if (now - night.movedAt > 4000) {                     // nobody's steering: the lamp wanders on its own
    const t = now / 1000;
    night.want.set(Math.sin(t * 0.37) * 1.4, LIFT + 1.0 + Math.sin(t * 0.61) * 0.5, 0);
  }
  night.aim.lerp(night.want, Math.min(1, dt * 2.6));     // trails behind, so it feels dragged
  const flick = 1 + (Math.random() - 0.5) * 0.06;
  key.intensity = 30 * flick;
  key.position.set(night.aim.x + 0.5, night.aim.y + 3.0, night.aim.z + 2.2);
  key.target.position.copy(night.aim);
  lampU.value.copy(night.aim);
  _fp.copy(night.aim).project(camera);
  const r = stage.getBoundingClientRect();
  night.screen.x = r.left + (_fp.x + 1) / 2 * r.width; night.screen.y = r.top + (1 - _fp.y) / 2 * r.height; night.screen.r = Math.min(r.width, r.height) * 0.22;
  poke(2);
}
addEventListener('pointermove', (e) => {
  if (!night.on || mode === 'grab') return;
  toNdc(e);
  raycaster.setFromCamera(ndc, camera);
  if (raycaster.ray.intersectPlane(NIGHT_PLANE, _fp)) {
    night.want.set(THREE.MathUtils.clamp(_fp.x, -3, 3), THREE.MathUtils.clamp(_fp.y, LIFT - 0.3, LIFT + 2.6), 0);
    night.movedAt = performance.now();
  }
}, { passive: true });
addEventListener('grumpl-night', (e) => setNight(!!e.detail?.on));

// ---------- Layout ----------
const _r = new THREE.Vector3(), _n = new THREE.Vector3();
function screenToPlaneZ(nx, ny, z, out) {
  raycaster.setFromCamera(_n.set(nx, ny, 0), camera);
  const t = (z - raycaster.ray.origin.z) / raycaster.ray.direction.z;
  return out.copy(raycaster.ray.origin).addScaledVector(raycaster.ray.direction, t);
}
function resize() {
  const w = innerWidth, hc = stage.clientHeight || innerHeight;
  renderer.setSize(w, hc, false);
  // the hero runs a cloud's hem (--hem, nav.css) past the bottom of the screen: frame for the screen, then let the
  // camera see that much further down, so the first screen is unchanged and the hem is more of the same clouds
  const hem = Math.min(hc * 0.2, parseFloat(getComputedStyle(stage).getPropertyValue('--hem')) || 0);
  const h = hc - hem;
  const aspect = w / h;
  camera.aspect = aspect;
  const tanH = Math.tan(THREE.MathUtils.degToRad(16));
  const portrait = aspect < 0.8;
  // He commands the frame: on a phone he fills most of the width; on a wide screen, about half the height.
  const dist = portrait ? Math.max(6.4, 2.5 / (2 * tanH * aspect)) : Math.max(5.6, 2.3 / (2 * tanH * Math.min(aspect, 1.3)) * 0.92);
  const halfH = tanH * dist;
  // his middle sits a little above centre; the foreground cloud takes the bottom
  const centreNdc = portrait ? 0.08 : 0.02;
  lookAt.set(0, LIFT + 1.0 - centreNdc * halfH, 0);
  camBase.set(0, lookAt.y + dist * 0.13, dist);
  camera.position.copy(camBase).add(par.cur);
  camera.lookAt(lookAt);
  if (hem > 0) camera.setViewOffset(w, h, 0, 0, w, hc); else camera.clearViewOffset();
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  // walls at the screen's edges, measured where he stands
  const halfW = halfH * aspect;
  const wx = Math.max(1.3, Math.min(5, halfW - 0.55));
  wallL.position.x = -wx; wallR.position.x = wx;
  // the neighbours stand well back: smaller, half out of frame on a phone, framing him on a wide screen
  ARC = portrait ? { rx: Math.max(1.7, halfW * 1.5), rz: 4.6, step: THREE.MathUtils.degToRad(58) }
                 : { rx: Math.min(4.2, halfW * 0.95), rz: 4.2, step: THREE.MathUtils.degToRad(58) };
  // the foreground cloud: logo across most of a phone, a modest badge on a wide screen
  const depth = dist - FRONT_Z;
  const halfWf = tanH * depth * aspect;
  const logoW = portrait ? halfWf * 2 * 0.8 : Math.min(halfWf * 2 * 0.24, tanH * depth * 2 * 0.3 * 1.72);
  front.s = logoW / LOGO_W;
  front.group.scale.setScalar(front.s);
  // the logo sits low, but never under the flavor dock: if they'd touch, the cloud rises until there's a gap
  const dockTop = dockEdge(), gapPx = portrait ? 14 : 18;
  let ny = portrait ? -0.56 : -0.74;
  for (let k = 0; k < 3; k++) {
    screenToPlaneZ(0, ny, FRONT_Z, _r);
    front.group.position.set(_r.x - LOGO_C.x * front.s, _r.y - LOGO_C.y * front.s, FRONT_Z - LOGO_Z * front.s);
    const over = logoRect().y1 - (dockTop - gapPx);
    if (over <= 0.5) break;
    ny += over / hc * 2;
  }
  placeHem(w, hc, hem, portrait);
  ui.layout?.({ portrait });
  sendLogoRect();
  poke(4);
}
// The sticky logo (page.js) takes over from the 3D one at the top of the screen: it needs to know where it is.
const _lc = new THREE.Vector3();
function dockEdge() {
  const d = document.getElementById('Dock'), st = stage.getBoundingClientRect();
  if (!d || !d.offsetParent) return stage.clientHeight || innerHeight;
  return d.getBoundingClientRect().top - st.top;
}
function logoRect() {
  front.group.updateMatrixWorld(true);
  const w = stage.clientWidth, h = stage.clientHeight;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    _lc.set(LOGO_C.x + sx * LOGO_W / 2, LOGO_C.y + sy * LOGO_H / 2, LOGO_Z).applyMatrix4(front.group.matrixWorld).project(camera);
    const px = (_lc.x + 1) / 2 * w, py = (1 - _lc.y) / 2 * h;
    x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
  }
  return { x0, y0, x1, y1 };
}
function sendLogoRect() {
  if (!front.logo) return;
  front.group.updateMatrixWorld(true);
  const w = stage.clientWidth, h = stage.clientHeight;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    _lc.set(LOGO_C.x + sx * LOGO_W / 2, LOGO_C.y + sy * LOGO_H / 2, LOGO_Z).applyMatrix4(front.group.matrixWorld).project(camera);
    const px = (_lc.x + 1) / 2 * w, py = (1 - _lc.y) / 2 * h;
    x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
  }
  dispatchEvent(new CustomEvent('grumpl-logo', { detail: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } }));
}

// The hero stops drawing once it has scrolled away
let heroOn = true;
new IntersectionObserver(([e]) => { heroOn = e.isIntersecting; if (heroOn) poke(6); }).observe(document.getElementById('Hero'));
// ...and while the menu or a drop popup covers it (they get the GPU to themselves)
const menuEl = () => document.getElementById('Menu');
const covered = () => menuEl()?.hidden === false || document.body.classList.contains('ds-no-scroll');
const uncover = new MutationObserver(() => { if (!covered()) { hold(); poke(6); } });
uncover.observe(document.body, { attributes: true, attributeFilter: ['class'] });
if (menuEl()) uncover.observe(menuEl(), { attributes: true, attributeFilter: ['hidden'] });
addEventListener('resize', resize);

// ---------- Frame loop ----------
const _v = new THREE.Vector3(), _c3 = new THREE.Vector3();
const backDirW = new THREE.Vector3(0, 0.25, -1).normalize();
const clock = new THREE.Clock();
// Frame pacing, measured only across back-to-back frames (render on demand leaves gaps that mean nothing).
// Slow for ~half a second: one step down. Comfortably fast for ~2 s: one step back up, but not straight back
// to a level that was just too slow (it waits longer each time that happens).
let lastFrameAt = 0, frameAvg = 16.7, run = 0, lastSig = '', settleUntil = 0, failAt = new Map();
const hold = (ms = 1200) => { settleUntil = Math.max(settleUntil, performance.now() + ms); };   // ignore a known hitch
function setDpr(i) {
  dprIdx = i; frameAvg = 16.7; run = 0;
  renderer.setPixelRatio(DPR_STEPS[i]); resize(); hold(600);
}
function adaptResolution() {
  const now = performance.now(), gap = now - lastFrameAt;
  lastFrameAt = now;
  if (gap > 70 || now < settleUntil) return;
  frameAvg += (gap - frameAvg) * 0.12;
  if (frameAvg > 21) { if (++run > 30 && dprIdx > 0) { failAt.set(dprIdx, now); setDpr(dprIdx - 1); } }
  else if (frameAvg < 17.5 && dprIdx < DPR_STEPS.length - 1) {
    const failed = failAt.get(dprIdx + 1) || -1e9;
    if (++run > 120 && now - failed > 20000) setDpr(dprIdx + 1);
  } else run = 0;
}
window.__grumpl = { renderer, scene, camera, ring, slots, body, focus: (i) => focus(i), jump, puffRow, setNight, setLogoFinish, cycleLogo, smoosh: smooshAt, night, logo3D, room, season: SEASON, logo: () => logoMod };
// the page's lamp-aware eyes read this
window.__grumplLamp = night.screen;
const ui = initUI({ DROP, FLAVORS, focus: (i) => focus(i), step, jump, motion, canMove });
onFocus(FLAVORS[0], 0);
resize();

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 1 / 20);
  if (!slots[0].set || !heroOn || covered() || document.body.classList.contains('hero-pinned')) return;
  if (grip && dt > 0) hand.velocity.set((handTarget.x - hand.position.x) / dt * 0.6, (handTarget.y - hand.position.y) / dt * 0.6, (handTarget.z - hand.position.z) / dt * 0.6);
  motion.tick();
  if (motion.on) {
    par.cur.lerp(par.want, Math.min(1, dt * 6));
    if (par.cur.distanceToSquared(par.want) > 1e-6) { camera.position.copy(camBase).add(par.cur); camera.lookAt(lookAt); poke(2); }
  }
  updateRing(dt);
  const g = focusGroup();
  if (ring.t >= 1) {
    world.step(1 / 60, dt, 4);
    if (body.position.y < -4) standUp();
    updateCushion(dt);
    g.position.copy(body.position); g.position.y -= press.s;
    g.quaternion.copy(body.quaternion);
    const ft = slots[ring.f].trick;                                // his idle hop, drawn on top of the physics pose
    if (ft) { const t = (performance.now() - ft.t0) / ft.dur; if (t >= 1 || grip) slots[ring.f].trick = null; else { applyMove(g, ft.name, t); poke(2); } }
  }
  updateSmoosh(dt);
  g.scale.set(1 + 0.32 * squash.a, 1 + 0.2 * squash.a, Math.max(0.2, 1 - 0.62 * squash.a));
  updateNight(dt);
  if (turnRoom()) poke(2);                        // the room (and every reflection in it) follows the cursor
  if (!night.on && placeCursorLight()) poke(2);
  cursorL.visible = !night.on;
  // fixed key, aimed at the focused Grumpl (at night the key is the lamp: see updateNight)
  if (!night.on) {
    const flat = Math.cos(KEY.el) * KEY.r;
    key.position.set(Math.sin(KEY.az) * flat, Math.sin(KEY.el) * KEY.r + 0.3 + LIFT, Math.cos(KEY.az) * flat);
    key.target.position.set(g.position.x * 0.5, LIFT + 0.8, g.position.z * 0.5);
    key.intensity = 24;
  }
  const vm = camera.matrixWorldInverse;
  lightU.uKeyPosV.value.copy(key.position).applyMatrix4(vm);
  rims.forEach((r, i) => lightU.uRimDirV.value[i].copy(_v.copy(r.position).sub(g.position).normalize().transformDirection(vm)));
  lightU.uBackDirV.value.copy(backDirW).transformDirection(vm);
  g.updateMatrixWorld(true);
  OCC_LOCAL.forEach(([p, r], i) => { _c3.copy(p).applyMatrix4(g.matrixWorld); occU.value[i].set(_c3.x, _c3.y, _c3.z, r); });
  if (front.busy && front.draw) { front.busy = front.draw(); poke(2); }

  const p = g.position, q = g.quaternion;
  const sig = [p.x, p.y, p.z, q.x, q.y, q.z, pressU.value.w, ring.show, squash.a].map((v) => v.toFixed(4)).join();
  if (sig !== lastSig || kick > 0 || grip) {
    adaptResolution();
    renderer.render(scene, camera);
    lastSig = sig;
    kick = Math.max(0, kick - 1);
  }
});
