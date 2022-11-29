import * as THREE from "https://cdn.skypack.dev/three@0.136.0";
import {OrbitControls} from "https://cdn.skypack.dev/three@0.136.0/examples/jsm/controls/OrbitControls";

console.clear();

let scene = new THREE.Scene();
scene.background = new THREE.Color(0x07021a);
scene.fog = new THREE.Fog(0x07021a, 1, 60);
let camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 1, 1000);
camera.position.set(0, 2, 30);
let renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);
window.addEventListener("resize", event => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
})

let controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = true;

let gu = {
  time: {value: 0}
}

let pts = [];
let sizes = [];
let shift = [];
let pushShift = () => {
    // shift.push(0,0,0,0);
  shift.push(
    Math.random() * Math.PI, 
    Math.random() * Math.PI * 2, 
    (Math.random() * 0.9 + 0.1) * Math.PI * 0.1,
    Math.random() * 0.9 + 0.1
  );
};

let isHeart = (x,z,y) => {
    var t1 = (x * x + 2 * y * y + z * z - 1);
    var t2 = x * x * z * z * z;
    var t3 = 0.1 * y * y * z * z * z;
    var tf = t1 * t1 * t1 - t2 - t3;
    return tf < 0 && tf > -0.4;
};

if(true)
{
    let r = 15, R = 100;
    for(let i = 0; i < 80000; i++){
        let rand = Math.pow(Math.random(), 1.5);
        let radius = Math.sqrt(R * R * rand + (1 - rand) * r * r);
        pts.push(new THREE.Vector3().setFromCylindricalCoords(radius, Math.random() * 2 * Math.PI, (Math.random() - 0.5) * 2 ));
        sizes.push(Math.random() * 1.5 + 1);
        pushShift();
    }
}
if(true)
{
    let scale = 8;
    let d = 1.5;
    for(let i = 0; i < 500000; i++){
        let rx = Math.random() * 2 * d - d;
        let ry = Math.random() * 2 * d - d;
        let rz = Math.random() * 2 * d - d;
        if(isHeart(rx,ry,rz))
        {
            pts.push(new THREE.Vector3(rx*scale,ry*scale,rz*scale));
            sizes.push(Math.random() * 1.0 + 0.5);
            pushShift();
        }
    }
}

let onBeforeCompile = shader => {
    shader.uniforms.time = gu.time;
    shader.vertexShader = `
      uniform float time;
      attribute float sizes;
      attribute vec4 shift;
      varying vec3 vColor;
      ${shader.vertexShader}
    `.replace(
      `gl_PointSize = size;`,
      `gl_PointSize = size * sizes;`
    ).replace(
      `#include <color_vertex>`,
      `#include <color_vertex>
        float d = length(abs(position) / vec3(70., 10., 70));
        d = clamp(d, 0., 1.);
        vColor = mix(vec3(227., 155., 0.), vec3(100., 50., 255.), d) / 255.;
      `
    ).replace(
      `#include <begin_vertex>`,
      `#include <begin_vertex>
        float t = time;
        float moveT = mod(shift.x + shift.z * t, PI2);
        float moveS = mod(shift.y + shift.z * t, PI2);
        transformed += vec3(cos(moveS) * sin(moveT), cos(moveT), sin(moveS) * sin(moveT)) * shift.a;

        float d22 = length(transformed) / 15.0;
        d22 = 1.0 - clamp(d22, 0.0, 1.0);
        d22 = pow(d22, 0.8);
        if(d22>0.0)
        {
          float tzA = 0.5;
          float tzB = 1.25;
          float tzSum = tzA + tzB;
          float tt = mod(t, tzSum);
          float ts = 0.0;
          if(tt < tzA)
          {
            ts = 1.0 - pow(tt / tzA * 2.0 - 1.0, 2.0);
          }
          else
          {
          }
          float s22 = ts * 0.15 + 0.9;
          s22 = mix(1.0, s22, d22);
          transformed *= s22;
        }
      `
    );
    // console.log(shader.vertexShader);
    shader.fragmentShader = `
      varying vec3 vColor;
      ${shader.fragmentShader}
    `.replace(
      `#include <clipping_planes_fragment>`,
      `#include <clipping_planes_fragment>
        float d = length(gl_PointCoord.xy - 0.5);
        //if (d > 0.5) discard;
      `
    ).replace(
      `vec4 diffuseColor = vec4( diffuse, opacity );`,
      `vec4 diffuseColor = vec4( vColor, smoothstep(0.5, 0.1, d)/* * 0.5 + 0.5*/ );`
    );
    // console.log(shader.fragmentShader);
};
    
let g = new THREE.BufferGeometry().setFromPoints(pts);
g.setAttribute("sizes", new THREE.Float32BufferAttribute(sizes, 1));
g.setAttribute("shift", new THREE.Float32BufferAttribute(shift, 4));
let m = new THREE.PointsMaterial({
  size: 0.125,
  transparent: true,
  depthTest: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  onBeforeCompile: onBeforeCompile
  });
let p = new THREE.Points(g, m);
p.rotation.order = "ZYX";
p.rotation.z = 0.2;
scene.add(p)

let imageConfigs = [
  {fileName:"1.jpg", ratio:1283/2048},
  {fileName:"2.jpg", ratio:1284/1712},
  {fileName:"3.jpg", ratio:1284/1712},
  {fileName:"4.jpg", ratio:1284/1712},
  {fileName:"5.jpg", ratio:1284/962},
  {fileName:"6.jpg", ratio:1284/1712},
];

let imgGroup = new THREE.Group();
let imgSizeScale = 4;
imageConfigs.forEach((imgConfig,i)=>{
  let height = imgSizeScale / (imgConfig.ratio + 1) * 2;
  let width = height * imgConfig.ratio;
  let geometry = new THREE.PlaneGeometry( width, height );
  
  let map = new THREE.TextureLoader().load( `orbit_imgs/${imgConfig.fileName}` );
  let material = new THREE.MeshBasicMaterial( {
    color: 0xffffff, 
    map:map, 
    side: THREE.DoubleSide, 
  } );
  let plane = new THREE.Mesh( geometry, material );

  let spinEul = new THREE.Euler(0, Math.PI * 2 / imageConfigs.length * i, 0,'XYZ');
  let shift = new THREE.Vector3(12,0,0);
  shift.applyEuler(spinEul);
  plane.position.copy(shift);

  let tiltEul = new THREE.Euler(25 / 180 * Math.PI, -Math.PI / 2, 0,'YXZ');
  let tiltRot = new THREE.Quaternion();
  tiltRot.multiply(new THREE.Quaternion().setFromEuler(spinEul));
  tiltRot.multiply(new THREE.Quaternion().setFromEuler(tiltEul));
  plane.quaternion.copy(tiltRot);

  imgGroup.add( plane );

});
imgGroup.rotation.order = "ZYX";
imgGroup.rotation.z = 0.2;
scene.add(imgGroup);

let spriteMat = new THREE.SpriteMaterial( { 
  fog:false, 
  transparent:true, 
  depthFunc:THREE.AlwaysDepth,
  color: 0x000000, 
  opacity: 1,
} );
let sprite = new THREE.Sprite(spriteMat);
sprite.scale.set(999,999,999);
scene.add(sprite);

let clock = new THREE.Clock();
let delay0 = 1.25;
let zoomTime = 0.75;

renderer.setAnimationLoop(() => {
  controls.update();
  let t = clock.getElapsedTime() * 0.5;
  gu.time.value = t * Math.PI;
  p.rotation.y = t * 0.1;
  imgGroup.rotation.y = -t * 0.1 - 1.2;

  if(t<delay0) return;
  if(t<delay0+zoomTime)
  {
    let r = (t-delay0)/zoomTime;
    let z = (24 - 250) * Math.pow(r, 0.3) + 250;
    camera.position.z = z;
    spriteMat.opacity = 1-r;

    if(r>=1) sprite.removeFromParent();
  }

  renderer.render(scene, camera);
});