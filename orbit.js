import * as THREE from "https://cdn.skypack.dev/three@0.136.0";
import {OrbitControls} from "https://cdn.skypack.dev/three@0.136.0/examples/jsm/controls/OrbitControls";

console.clear();

let scene = new THREE.Scene();
scene.background = new THREE.Color(0,0,0);
let camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 1, 1000);
camera.position.set(0, 1, 21);
let renderer = new THREE.WebGLRenderer();
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);
window.addEventListener("resize", event => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
})

let controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;

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
    let r = 15, R = 60;
    for(let i = 0; i < 100000; i++){
        let rand = Math.pow(Math.random(), 1.5);
        let radius = Math.sqrt(R * R * rand + (1 - rand) * r * r);
        pts.push(new THREE.Vector3().setFromCylindricalCoords(radius, Math.random() * 2 * Math.PI, (Math.random() - 0.5) * 2 ));
        sizes.push(Math.random() * 1.5 + 0.5);
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
            sizes.push(Math.random() * 1.5 + 0.5);
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
        float d = length(abs(position) / vec3(40., 20., 40));
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

        if(t<1.25)
        {
            transformed *= pow(t / 1.25, 0.4);
        }

        float d22 = length(transformed) / 15.0;
        d22 = 1.0 - clamp(d22, 0.0, 1.0);
        d22 = pow(d22, 0.8);
        float tz0 = 3.5;
        float tt = t * tz0;
        if(mod(floor(tt / tz0), 2.0) <= 1.0)
        {
            tt = (sin(tt) + 1.0) / 2.0;
            tt = pow(tt, 2.0);
        }
        else
        {
            tt = (sin(tt) + 1.0) / 2.0;
            tt = pow(tt, 0.5);
        }
        float s22 = tt * 0.25 + 0.9;
        s22 = 1.0 + d22 * (s22 - 1.0);
        transformed *= s22;
      `
    );
    console.log(shader.vertexShader);
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
    console.log(shader.fragmentShader);
};
    
let g = new THREE.BufferGeometry().setFromPoints(pts);
g.setAttribute("sizes", new THREE.Float32BufferAttribute(sizes, 1));
g.setAttribute("shift", new THREE.Float32BufferAttribute(shift, 4));
let m = new THREE.PointsMaterial({
  size: 0.125,
  transparent: true,
  depthTest: false,
  blending: THREE.AdditiveBlending,
  onBeforeCompile: onBeforeCompile
  });
let p = new THREE.Points(g, m);
p.rotation.order = "ZYX";
p.rotation.z = 0.2;
scene.add(p)

let clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  controls.update();
  let t = clock.getElapsedTime() * 0.5;
  gu.time.value = t * Math.PI;
  p.rotation.y = t * 0.05;
  renderer.render(scene, camera);
});