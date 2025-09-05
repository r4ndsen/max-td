// Experimental 3D renderer using Three.js from CDN (no build step)
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export function initThreeRenderer(rootEl, state, CONFIG, hideCanvasEl){
  if(!rootEl) return null;
  const width = hideCanvasEl?.width || 900;
  const height = hideCanvasEl?.height || 600;

  // Do not hide 2D canvas until 3D is fully initialized; we will hide at the end

  const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
  renderer.setSize(width, height);
  renderer.domElement.className = 'three-canvas';
  rootEl.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0f1a);

  const camera = new THREE.PerspectiveCamera(45, width/height, 0.1, 5000);
  const baseTarget = new THREE.Vector3(450, 0, 300);
  const basePos = new THREE.Vector3(450, 520, 700);
  camera.position.copy(basePos);
  camera.lookAt(baseTarget);

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dir = new THREE.DirectionalLight(0xfff0cc, 0.8);
  dir.position.set(400, 800, 500);
  scene.add(dir);

  // Ground plane with procedural grass texture (no external assets)
  function makeGrassTexture(size=256){
    const c = document.createElement('canvas');
    c.width=size; c.height=size;
    const g = c.getContext('2d');
    // base
    g.fillStyle = '#1e2b17';
    g.fillRect(0,0,size,size);
    // noise patches
    for(let y=0; y<size; y+=2){
      for(let x=0; x<size; x+=2){
        const n = Math.random();
        const r = 28 + Math.floor(n*30); // green brightness
        const gch = 90 + Math.floor(n*80);
        const b = 28 + Math.floor(n*25);
        g.fillStyle = `rgb(${r},${gch},${b})`;
        g.fillRect(x,y,2,2);
      }
    }
    // sparse blades
    g.globalAlpha = 0.15;
    for(let i=0;i<400;i++){
      const x = Math.random()*size, y = Math.random()*size;
      const len = 4 + Math.random()*8;
      g.strokeStyle = Math.random()<0.5? '#7aa65a' : '#6c9b52';
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(x,y); g.lineTo(x+Math.random()*1.5, y-len); g.stroke();
    }
    g.globalAlpha = 1;
    return c;
  }
  const grassTex = new THREE.CanvasTexture(makeGrassTexture(256));
  grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;
  grassTex.repeat.set(10, 7); // tile to cover 1000x700 nicely
  if(THREE.SRGBColorSpace) grassTex.colorSpace = THREE.SRGBColorSpace;
  try{ grassTex.anisotropy = renderer.capabilities.getMaxAnisotropy?.() || 1; }catch(e){}

  const groundGeom = new THREE.PlaneGeometry(1000, 700);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: grassTex, metalness:0.0, roughness:1.0 });
  const ground = new THREE.Mesh(groundGeom, groundMat);
  ground.rotation.x = -Math.PI/2;
  ground.position.set(450, 0, 300);
  scene.add(ground);

  // Dirt path mesh on top of grass
  function makeDirtTexture(size=256){
    const c = document.createElement('canvas'); c.width=size; c.height=size;
    const g = c.getContext('2d');
    g.fillStyle = '#5f4a2b'; g.fillRect(0,0,size,size);
    for(let y=0;y<size;y+=2){
      for(let x=0;x<size;x+=2){
        const n=Math.random();
        const r=85+Math.floor(n*40), gr=64+Math.floor(n*32), b=40+Math.floor(n*20);
        g.fillStyle = `rgb(${r},${gr},${b})`;
        g.fillRect(x,y,2,2);
      }
    }
    g.globalAlpha=0.15;
    g.strokeStyle='#c8b08a';
    for(let i=0;i<120;i++){
      const x=Math.random()*size, y=Math.random()*size; const w=2+Math.random()*8;
      g.beginPath(); g.moveTo(x,y); g.lineTo(x+w, y); g.stroke();
    }
    g.globalAlpha=1;
    return c;
  }
  const dirtTex = new THREE.CanvasTexture(makeDirtTexture(256));
  dirtTex.wrapS = dirtTex.wrapT = THREE.RepeatWrapping;
  if(THREE.SRGBColorSpace) dirtTex.colorSpace = THREE.SRGBColorSpace;
  try{ dirtTex.anisotropy = renderer.capabilities.getMaxAnisotropy?.() || 1; }catch(e){}

  function buildPathStrip(points, width){
    const hw = width/2;
    const positions = [];
    const uvs = [];
    const indices = [];
    const len = points.length;
    const tangents = [];
    const perps = [];
    // compute tangents and perps in XZ plane
    for(let i=0;i<len;i++){
      const pPrev = points[Math.max(0,i-1)];
      const pNext = points[Math.min(len-1,i+1)];
      const tx = pNext.x - pPrev.x;
      const tz = pNext.y - pPrev.y;
      const tl = Math.hypot(tx,tz)||1; const nx = tx/tl, nz = tz/tl;
      tangents.push([nx,nz]);
      // perp to tangent in XZ
      perps.push([-nz, nx]);
    }
    // cumulative length for u coord
    let acc=0;
    const segLen=[]; for(let i=0;i<len-1;i++){ const dx=points[i+1].x-points[i].x, dz=points[i+1].y-points[i].y; segLen[i]=Math.hypot(dx,dz); }
    for(let i=0;i<len;i++){
      if(i>0) acc += segLen[i-1]||0;
      const [px,pz] = perps[i];
      const x = points[i].x, z=points[i].y;
    // left (raise a bit to avoid z-fighting)
    positions.push(x+px*hw, 0.2, z+pz*hw);
    uvs.push(0, acc/64);
    // right
    positions.push(x-px*hw, 0.2, z-pz*hw);
    uvs.push(1, acc/64);
      if(i<len-1){
        const base = i*2;
        indices.push(base, base+1, base+2, base+1, base+3, base+2);
      }
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs,2));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }

  const pathGeom = buildPathStrip(CONFIG.pathPoints, 72);
  const pathMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: dirtTex, metalness:0.0, roughness:1.0 });
  // help z-fighting: draw slightly on top
  pathMat.polygonOffset = true;
  pathMat.polygonOffsetFactor = -1;
  pathMat.polygonOffsetUnits = -4;
  pathMat.side = THREE.DoubleSide;
  const pathMesh = new THREE.Mesh(pathGeom, pathMat);
  pathMesh.renderOrder = 1;
  scene.add(pathMesh);

  // Pools
  const towerMap = new Map(); // Tower -> Mesh
  const enemyMap = new Map(); // Enemy -> Mesh
  const projMap = new Map();  // Projectile-like -> Mesh
  let hoveredTower = null;

  const towerGeom = new THREE.CylinderGeometry(16, 16, 40, 16);
  const towerMat = new THREE.MeshStandardMaterial({ color: 0xcbd3ff });

  const sphereGeom = new THREE.SphereGeometry(12, 16, 12);
  const enemyMat = new THREE.MeshStandardMaterial({ color: 0x4d85ff });

  const projGeom = new THREE.SphereGeometry(4, 8, 8);
  const projMat = new THREE.MeshStandardMaterial({ color: 0xffd27f, emissive:0x553300, emissiveIntensity:0.4 });

  function setMeshXZ(mesh, x, z, y=0){
    mesh.position.set(x, y, z);
  }

  function syncTowers(){
    // create/update
    for(const t of state.towers){
      if(!towerMap.has(t)){
        const mat = towerMat.clone();
        const m = new THREE.Mesh(towerGeom, mat);
        m.castShadow = false; m.receiveShadow = false;
        scene.add(m);
        towerMap.set(t, m);
      }
      const m = towerMap.get(t);
      setMeshXZ(m, t.x, t.y, 20);
      // color by specialization
      if(t.sniperLevel>0) m.material.color.set(0xa7ffe6);
      else if(t.bombLevel>0) m.material.color.set(0xeec07a);
      else if(t.elements?.ice) m.material.color.set(0xcbe8ff);
      else if(t.dotLevels?.fire>0) m.material.color.set(0xffd1a6);
      else if(t.dotLevels?.poison>0) m.material.color.set(0xc4ffcf);
      else if((t.dotLevels?.curse||0)>0) m.material.color.set(0xe7d7ff);
      else if((t.dotLevels?.lightning||0)>0) m.material.color.set(0xbde3ff);
      else if((t.dotLevels?.gatling||0)>0) m.material.color.set(0xf7f79a);
      else m.material.color.set(0xcbd3ff);
      m.material.needsUpdate = true;

      // hover visual
      const isHovered = (hoveredTower === t);
      m.scale.setScalar(isHovered ? 1.08 : 1.0);
      m.material.emissive = new THREE.Color(isHovered ? 0x66d9ef : 0x000000);
      m.material.emissiveIntensity = isHovered ? 0.6 : 0.0;
    }
    // remove
    for(const [t,m] of Array.from(towerMap.entries())){
      if(!state.towers.includes(t)){
        scene.remove(m); m.geometry.dispose(); m.material.dispose();
        towerMap.delete(t);
      }
    }
  }

  function syncEnemies(){
    for(const e of state.enemies){
      if(!enemyMap.has(e)){
        const m = new THREE.Mesh(sphereGeom, enemyMat.clone());
        scene.add(m);
        enemyMap.set(e, m);
      }
      const m = enemyMap.get(e);
      setMeshXZ(m, e.pos.x, e.pos.y, 12);
      // tint by effects
      const hasIce = e.effects?.some(x=>x.type==='ice');
      const hasFire = e.effects?.some(x=>x.type==='fire');
      const hasPoison = e.effects?.some(x=>x.type==='poison');
      if(hasFire) m.material.color.set(0xff7828);
      else if(hasPoison) m.material.color.set(0x3cff64);
      else if(hasIce) m.material.color.set(0x78b4ff);
      else m.material.color.set(0x4d85ff);
      m.material.needsUpdate = true;
    }
    for(const [e,m] of Array.from(enemyMap.entries())){
      if(!state.enemies.includes(e)){
        scene.remove(m); m.geometry.dispose(); m.material.dispose();
        enemyMap.delete(e);
      }
    }
  }

  function syncProjectiles(){
    for(const p of state.projectiles){
      if(!projMap.has(p)){
        const m = new THREE.Mesh(projGeom, projMat.clone());
        scene.add(m);
        projMap.set(p, m);
      }
      const m = projMap.get(p);
      const px = (p.pos?.x ?? p.x ?? 0);
      const py = (p.pos?.y ?? p.y ?? 0);
      setMeshXZ(m, px, py, 6);
      // Color by projectile kind
      const k = p.kind || (p.blastRadius ? 'bomb' : 'arrow');
      if(k==='bomb'){
        m.material.color.set(0xffd27f);
        m.material.emissive = new THREE.Color(0x553300);
        m.material.emissiveIntensity = 0.6;
      } else if(k==='fire'){
        m.material.color.set(0xffab6b);
        m.material.emissive = new THREE.Color(0x552200);
        m.material.emissiveIntensity = 0.4;
      } else if(k==='poison'){
        m.material.color.set(0x7cf79a);
        m.material.emissive = new THREE.Color(0x003311);
        m.material.emissiveIntensity = 0.3;
      } else if(k==='ice'){
        m.material.color.set(0x66d9ef);
        m.material.emissive = new THREE.Color(0x003344);
        m.material.emissiveIntensity = 0.3;
      } else if(k==='sniper'){
        m.material.color.set(0xa7ffe6);
        m.material.emissive = new THREE.Color(0x004433);
        m.material.emissiveIntensity = 0.35;
      } else if(k==='gatling'){
        m.material.color.set(0xf7f79a);
        m.material.emissive = new THREE.Color(0x444400);
        m.material.emissiveIntensity = 0.3;
      } else if(k==='curse'){
        m.material.color.set(0xd9c4ff);
        m.material.emissive = new THREE.Color(0x220044);
        m.material.emissiveIntensity = 0.4;
      } else {
        m.material.color.set(0xeae7b1);
        m.material.emissiveIntensity = 0.2;
      }
    }
    for(const [p,m] of Array.from(projMap.entries())){
      if(!state.projectiles.includes(p)){
        scene.remove(m); m.geometry.dispose(); m.material.dispose();
        projMap.delete(p);
      }
    }
  }

  // Mouse-tilt state
  let nx = 0, ny = 0; // smoothed [-1..1]
  let nxTarget = 0, nyTarget = 0; // target [-1..1]
  function setMouseTilt(nextNx, nextNy){
    nxTarget = Math.max(-1, Math.min(1, nextNx||0));
    nyTarget = Math.max(-1, Math.min(1, nextNy||0));
  }

  function update(){
    // Smooth towards target
    nx += (nxTarget - nx) * 0.08;
    ny += (nyTarget - ny) * 0.08;

    // Compute subtle camera parallax and aim offsets
    const posX = basePos.x + nx * 80;
    const posY = basePos.y + (-ny) * 60;
    const posZ = basePos.z + 0;
    camera.position.set(posX, posY, posZ);

    const lookX = baseTarget.x + nx * 140;
    const lookY = baseTarget.y + ny * 90;
    const lookZ = baseTarget.z;
    camera.lookAt(lookX, lookY, lookZ);

    syncTowers();
    syncEnemies();
    syncProjectiles();
    renderer.render(scene, camera);
  }

  function resize(w, h){
    const W = w || rootEl.clientWidth || width;
    const H = h || rootEl.clientHeight || height;
    renderer.setSize(W, H);
    camera.aspect = W/H; camera.updateProjectionMatrix();
  }

  window.addEventListener('resize', ()=> resize());
  resize(width, height);

  function setHoveredTower(t){ hoveredTower = t || null; }

  // Project world XZ point to screen pixel coordinates
  const projVec = new THREE.Vector3();
  function screenFromWorld(x, z, y=12){
    projVec.set(x, y, z).project(camera);
    const dom = renderer.domElement;
    const W = dom.width || dom.clientWidth || width;
    const H = dom.height || dom.clientHeight || height;
    const sx = (projVec.x * 0.5 + 0.5) * W;
    const sy = (-projVec.y * 0.5 + 0.5) * H;
    const visible = projVec.z < 1; // in front of camera
    return { x: sx, y: sy, visible };
  }

  // Raycasting helpers for mapping screen -> world (XZ on y=0)
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0,1,0), 0); // y = 0 plane
  const hitPoint = new THREE.Vector3();
  function worldFromClient(clientX, clientY){
    const rect = renderer.domElement.getBoundingClientRect();
    if(rect.width === 0 || rect.height === 0) return null;
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const ok = raycaster.ray.intersectPlane(plane, hitPoint);
    if(!ok) return null;
    return { x: hitPoint.x, y: hitPoint.z };
  }

  // 3D ready: now safely hide 2D canvas so WebGL is visible
  try{ if(hideCanvasEl) hideCanvasEl.style.display = 'none'; }catch(_){ }
  return { update, resize, root: rootEl, canvas: renderer.domElement, setMouseTilt, setHoveredTower, worldFromClient, screenFromWorld };
}
