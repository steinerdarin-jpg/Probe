const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb8d9ff);
scene.fog = new THREE.Fog(0xb8d9ff, 35, 260);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 7, 14);

const clock = new THREE.Clock();
const startMenu = document.getElementById('startMenu');
const startBtn = document.getElementById('startBtn');
const hostGameBtn = document.getElementById('hostGameBtn');
const joinGameBtn = document.getElementById('joinGameBtn');
const roomCards = [...document.querySelectorAll('.room-card')];
const hud = document.getElementById('hud');
const garage = document.getElementById('garage');
const uiStatus = document.getElementById('status');
const moneyDisplay = document.getElementById('moneyDisplay');
const carDisplay = document.getElementById('carDisplay');
const powerDisplay = document.getElementById('powerDisplay');
const rankDisplay = document.getElementById('rankDisplay');
const missionDisplay = document.getElementById('missionDisplay');
const paintSelect = document.getElementById('paintSelect');
const wheelSelect = document.getElementById('wheelSelect');
const spoilerToggle = document.getElementById('spoilerToggle');
const neonToggle = document.getElementById('neonToggle');
const applyStyleBtn = document.getElementById('applyStyleBtn');
const shopButtons = [...document.querySelectorAll('.shop-item')];

let gameStarted = false;
let selectedRoom = 'Downtown Drift';

function beginGame() {
  if (gameStarted) return;
  gameStarted = true;
  startMenu.classList.add('hidden');
  hud.classList.remove('hidden');
  garage.classList.remove('hidden');
  uiStatus.textContent = `Lobby: ${selectedRoom}`;
}

function setSelectedRoom(roomName) {
  selectedRoom = roomName;
  roomCards.forEach((card) => {
    const active = card.dataset.room === roomName;
    card.classList.toggle('active', active);
  });
}

const keys = {};
const mouse = {
  down: false,
  x: 0,
  y: 0,
  dragX: 0,
  dragY: 0,
};
const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x20262d, roughness: 0.9, metalness: 0.25 });
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x5e8f46, roughness: 1 });
const buildingColors = [0x5a6c84, 0x7c8aa1, 0x8a9db3, 0x4e5d73, 0x6b6f80, 0x7b6a68];

const VEHICLES = {
  corolla: { name: 'Toyota Corolla', price: 0, maxSpeed: 30, accel: 15, body: 'sedan', className: 'Starter' },
  civic: { name: 'Honda Civic Type R', price: 18500, maxSpeed: 39, accel: 18, body: 'hatch', className: 'Track' },
  m3: { name: 'BMW M3', price: 42000, maxSpeed: 46, accel: 22, body: 'sedan', className: 'Sport' },
  gtr: { name: 'Nissan GT-R', price: 76000, maxSpeed: 55, accel: 27, body: 'coupe', className: 'Hyper' },
  porsche: { name: 'Porsche 911', price: 98000, maxSpeed: 58, accel: 29, body: 'supercar', className: 'Iconic' },
};

const player = {
  mesh: null,
  velocity: 0,
  maxSpeed: 30,
  steering: 0,
  angle: 0,
  position: new THREE.Vector3(0, 0, 0),
  flex: 0,
  flexCooldown: 0,
  money: 650,
  selectedCar: 'corolla',
  paint: '#ff7b54',
  wheelStyle: 'stock',
  spoiler: false,
  neon: false,
  carBase: null,
  rank: 1,
  xp: 0,
  ownedCars: { corolla: true },
  name: 'P1',
};

const secondPlayer = {
  mesh: null,
  velocity: 0,
  maxSpeed: 32,
  steering: 0,
  angle: Math.PI / 2,
  position: new THREE.Vector3(-8, 0, 0),
  flex: 0,
  flexCooldown: 0,
  money: 650,
  selectedCar: 'civic',
  paint: '#22c55e',
  wheelStyle: 'sport',
  spoiler: true,
  neon: true,
  carBase: null,
  rank: 1,
  xp: 0,
  ownedCars: { corolla: true, civic: true },
  name: 'P2',
};

const world = {
  chunkSize: 80,
  renderRadius: 2,
  chunks: new Set(),
  traffic: [],
  lastTrafficSpawn: 0,
  raceZone: { x: 90, z: 40, radius: 15 },
  raceActive: false,
  raceStart: 0,
  raceGoal: 420,
  raceReward: 0,
  raceDistance: 0,
  raceStartPos: null,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatMoney(value) {
  return `€${Math.round(value).toLocaleString('de-DE')}`;
}

function getRankLabel(rank) {
  const labels = ['Rookie', 'Street Runner', 'Street Pro', 'City King', 'Legend'];
  return `${labels[Math.min(rank - 1, labels.length - 1)]} ${Math.min(rank, 5)}`;
}

function getNextUnlock() {
  const cars = ['corolla', 'civic', 'm3', 'gtr', 'porsche'];
  for (const carId of cars) {
    if (!player.ownedCars[carId]) {
      return carId;
    }
  }
  return 'porsche';
}

function updateHud() {
  const carName = VEHICLES[player.selectedCar]?.name || 'Toyota Corolla';
  const nextUnlock = getNextUnlock();
  const nextUnlockPrice = VEHICLES[nextUnlock]?.price || 0;

  moneyDisplay.textContent = formatMoney(player.money);
  carDisplay.textContent = carName;
  powerDisplay.textContent = `${VEHICLES[player.selectedCar].maxSpeed} HP`;
  rankDisplay.textContent = getRankLabel(player.rank);
  missionDisplay.textContent = nextUnlockPrice > 0 ? `Next Car: ${VEHICLES[nextUnlock].name} • ${formatMoney(nextUnlockPrice)}` : 'Alle Autos freigeschaltet';
}

function addLights() {
  const hemi = new THREE.HemisphereLight(0xeaf9ff, 0x2e4a2e, 1.7);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff4d6, 1.7);
  sun.position.set(24, 30, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.left = -90;
  sun.shadow.camera.right = 90;
  sun.shadow.camera.top = 90;
  sun.shadow.camera.bottom = -90;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0x9ed0ff, 0.75);
  fill.position.set(-18, 18, -10);
  scene.add(fill);
}

function addSkyGlow() {
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(180, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xdff4ff, side: THREE.BackSide })
  );
  glow.position.y = 50;
  scene.add(glow);
}

function addStreetLights() {
  for (let x = -180; x <= 180; x += 24) {
    for (let z = -180; z <= 180; z += 24) {
      if (Math.random() > 0.42) continue;

      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.18, 5.4, 8),
        new THREE.MeshStandardMaterial({ color: 0x4b525d, roughness: 0.8, metalness: 0.6 })
      );
      pole.position.set(x, 2.7, z);
      pole.castShadow = true;
      scene.add(pole);

      const lamp = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.3, 0.5),
        new THREE.MeshStandardMaterial({ color: 0xfff0b0, emissive: 0xffd56c, emissiveIntensity: 1.2 })
      );
      lamp.position.set(x, 5.2, z);
      scene.add(lamp);

      const light = new THREE.PointLight(0xffe7a1, 1.8, 18, 2);
      light.position.set(x, 5.2, z);
      scene.add(light);
    }
  }
}

function addRaceMarker() {
  const marker = new THREE.Mesh(
    new THREE.CylinderGeometry(8, 8, 0.4, 32),
    new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x0ea5e9, emissiveIntensity: 0.7 })
  );
  marker.position.set(world.raceZone.x, 0.2, world.raceZone.z);
  marker.rotation.x = Math.PI / 2;
  scene.add(marker);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(9.6, 0.5, 18, 50),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, emissive: 0x7dd3fc, emissiveIntensity: 0.8 })
  );
  ring.position.set(world.raceZone.x, 0.6, world.raceZone.z);
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);
}

function laneColor() {
  return new THREE.MeshStandardMaterial({ color: 0xfaf7d0, emissive: 0x5e4d00, emissiveIntensity: 0.2 });
}

function buildWheel(widthScale = 1) {
  const group = new THREE.Group();

  const rimMaterial = new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.5, metalness: 1 });
  const tireMaterial = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95, metalness: 0.15 });
  const spokeMaterial = new THREE.MeshStandardMaterial({ color: 0xcfd8e3, roughness: 0.25, metalness: 1 });

  const tire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.48 * widthScale, 0.48 * widthScale, 0.42, 24),
    tireMaterial
  );
  tire.rotation.z = Math.PI / 2;
  group.add(tire);

  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.31 * widthScale, 0.31 * widthScale, 0.44, 18),
    rimMaterial
  );
  rim.rotation.z = Math.PI / 2;
  group.add(rim);

  const rimInner = new THREE.Mesh(
    new THREE.TorusGeometry(0.22 * widthScale, 0.045, 10, 24),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 1 })
  );
  rimInner.rotation.y = Math.PI / 2;
  group.add(rimInner);

  for (let i = 0; i < 5; i += 1) {
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(0.12 * widthScale, 0.02, 0.34 * widthScale),
      spokeMaterial
    );
    spoke.position.y = 0.02;
    spoke.rotation.z = (i / 5) * Math.PI * 2;
    spoke.rotation.y = Math.PI / 2;
    group.add(spoke);
  }

  return group;
}

function makeCar(modelKey = 'corolla', color = 0xff7b54) {
  const group = new THREE.Group();
  const vehicle = VEHICLES[modelKey] || VEHICLES.corolla;

  const bodyMaterial = new THREE.MeshStandardMaterial({ color, metalness: 0.7, roughness: 0.28, envMapIntensity: 1.2 });
  const windowMaterial = new THREE.MeshStandardMaterial({ color: 0xb8ccd8, metalness: 0.9, roughness: 0.12, transparent: true, opacity: 0.92 });
  const accentMaterial = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.8, roughness: 0.2 });
  const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x101827, roughness: 0.7, metalness: 0.9 });
  const underglowMaterial = new THREE.MeshStandardMaterial({ color: 0x4ade80, emissive: 0x22c55e, emissiveIntensity: 1.2 });
  const headlightMaterial = new THREE.MeshStandardMaterial({ color: 0xfaf3d0, emissive: 0xfecf4d, emissiveIntensity: 1.5, roughness: 0.18 });
  const tailLightMaterial = new THREE.MeshStandardMaterial({ color: 0xff5c6b, emissive: 0xf43f5e, emissiveIntensity: 1.3, roughness: 0.2 });

  let bodyLength = 4.8;
  let bodyHeight = 0.92;
  let bodyWidth = 2.52;
  let cabinScale = { x: 1.38, y: 0.88, z: 1.02 };
  let roofOffset = 0.14;

  if (vehicle.body === 'supercar') {
    bodyLength = 5.05;
    bodyHeight = 0.82;
    bodyWidth = 2.2;
    cabinScale = { x: 1.2, y: 0.76, z: 0.96 };
    roofOffset = 0.08;
  } else if (vehicle.body === 'coupe') {
    bodyLength = 4.85;
    bodyHeight = 0.9;
    bodyWidth = 2.32;
    cabinScale = { x: 1.18, y: 0.8, z: 0.9 };
    roofOffset = 0.1;
  } else if (vehicle.body === 'hatch') {
    bodyLength = 4.68;
    bodyHeight = 0.88;
    bodyWidth = 2.4;
    cabinScale = { x: 1.3, y: 0.82, z: 1.0 };
  }

  const body = new THREE.Mesh(new THREE.BoxGeometry(bodyLength, bodyHeight, bodyWidth), bodyMaterial);
  body.position.y = 0.82;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(bodyLength * 0.58, bodyHeight * 0.44, bodyWidth * 0.7), accentMaterial);
  hood.position.set(0, 1.14, 1.18);
  hood.castShadow = true;
  group.add(hood);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(bodyLength * 0.46 * cabinScale.x, bodyHeight * 0.58 * cabinScale.y, bodyWidth * 0.6 * cabinScale.z), windowMaterial);
  roof.position.set(0, 1.56 + roofOffset, 0.16);
  roof.castShadow = true;
  group.add(roof);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(bodyLength * 0.22, bodyHeight * 0.42, bodyWidth * 0.62), windowMaterial);
  windshield.position.set(bodyLength * 0.18, 1.46, 0.1);
  windshield.rotation.z = -0.18;
  group.add(windshield);

  const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(bodyLength * 0.18, bodyHeight * 0.38, bodyWidth * 0.56), windowMaterial);
  rearGlass.position.set(-bodyLength * 0.2, 1.46, 0.1);
  rearGlass.rotation.z = 0.18;
  group.add(rearGlass);

  const sideSkirtLeft = new THREE.Mesh(new THREE.BoxGeometry(bodyLength * 0.78, 0.14, 0.12), darkMaterial);
  sideSkirtLeft.position.set(0, 0.45, bodyWidth / 2 - 0.06);
  group.add(sideSkirtLeft);

  const sideSkirtRight = sideSkirtLeft.clone();
  sideSkirtRight.position.z = -bodyWidth / 2 + 0.06;
  group.add(sideSkirtRight);

  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(bodyLength * 0.18, bodyHeight * 0.22, bodyWidth * 0.8), accentMaterial);
  frontBumper.position.set(bodyLength * 0.5, 0.62, 0);
  group.add(frontBumper);

  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(bodyLength * 0.14, bodyHeight * 0.2, bodyWidth * 0.76), accentMaterial);
  rearBumper.position.set(-bodyLength * 0.5, 0.66, 0);
  group.add(rearBumper);

  const headlightLeft = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.26), headlightMaterial);
  headlightLeft.position.set(bodyLength * 0.54, 1.05, bodyWidth * 0.28);
  group.add(headlightLeft);

  const headlightRight = headlightLeft.clone();
  headlightRight.position.z = -bodyWidth * 0.28;
  group.add(headlightRight);

  const tailLeft = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.22), tailLightMaterial);
  tailLeft.position.set(-bodyLength * 0.55, 1.0, bodyWidth * 0.28);
  group.add(tailLeft);

  const tailRight = tailLeft.clone();
  tailRight.position.z = -bodyWidth * 0.28;
  group.add(tailRight);

  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.33, 0.64), darkMaterial);
  grille.position.set(bodyLength * 0.52, 0.92, 0);
  group.add(grille);

  const underGlow = new THREE.Mesh(new THREE.BoxGeometry(bodyLength * 0.7, 0.1, bodyWidth * 0.82), underglowMaterial);
  underGlow.position.set(0, 0.17, 0);
  underGlow.visible = false;
  group.add(underGlow);

  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(bodyLength * 0.42, 0.12, 0.75), accentMaterial);
  spoiler.position.set(-bodyLength * 0.28, 1.82, 0);
  spoiler.rotation.y = Math.PI / 2;
  spoiler.visible = false;
  group.add(spoiler);

  const sideMirrorLeft = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.15, 0.22), accentMaterial);
  sideMirrorLeft.position.set(bodyLength * 0.08, 1.42, bodyWidth * 0.54);
  group.add(sideMirrorLeft);

  const sideMirrorRight = sideMirrorLeft.clone();
  sideMirrorRight.position.z = -bodyWidth * 0.54;
  group.add(sideMirrorRight);

  const wheelPositions = [
    [-1.2, 0.34, 1.5],
    [1.2, 0.34, 1.5],
    [-1.2, 0.34, -1.5],
    [1.2, 0.34, -1.5],
  ];

  wheelPositions.forEach(([x, y, z]) => {
    const wheel = buildWheel(1.12);
    wheel.position.set(x, y, z);
    group.add(wheel);
  });

  group.userData = { color, underGlow, spoiler, vehicle, accentMaterial, bodyMaterial, windowMaterial, wheelScale: 1.1 };

  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return group;
}

function applyCarStyling() {
  if (!player.mesh) return;

  const { bodyMaterial, underGlow, spoiler } = player.mesh.userData;
  bodyMaterial.color.set(player.paint);
  underGlow.visible = player.neon;
  spoiler.visible = player.spoiler;

  const wheelScale = player.wheelStyle === 'deep' ? 1.3 : player.wheelStyle === 'sport' ? 1.15 : 1;
  player.mesh.children.forEach((child) => {
    if (child.type === 'Group' && child.children.length > 0) {
      child.scale.setScalar(wheelScale);
    }
  });
}

function updateVehicleModel(target = player) {
  if (target.mesh) {
    scene.remove(target.mesh);
  }

  const car = makeCar(target.selectedCar, new THREE.Color(target.paint).getHex());
  car.position.set(target.position.x, 0, target.position.z);
  car.rotation.y = target.angle;
  scene.add(car);
  target.mesh = car;
  target.position.copy(car.position);
  target.angle = car.rotation.y;
  target.maxSpeed = VEHICLES[target.selectedCar].maxSpeed;
  target.carBase = VEHICLES[target.selectedCar];
  if (target === player) {
    applyCarStyling();
    updateHud();
  }
}

function setupPlayer() {
  player.paint = '#ff7b54';
  player.selectedCar = 'corolla';
  player.maxSpeed = VEHICLES.corolla.maxSpeed;
  updateVehicleModel(player);

  secondPlayer.paint = '#22c55e';
  secondPlayer.selectedCar = 'civic';
  secondPlayer.maxSpeed = VEHICLES.civic.maxSpeed;
  secondPlayer.angle = Math.PI / 2;
  secondPlayer.position.set(-8, 0, 0);
  updateVehicleModel(secondPlayer);
}

function chunkOrigin(cx, cz) {
  return {
    x: cx * world.chunkSize,
    z: cz * world.chunkSize,
  };
}

function createChunk(cx, cz) {
  const origin = chunkOrigin(cx, cz);
  const chunk = new THREE.Group();

  const ground = new THREE.Mesh(new THREE.BoxGeometry(world.chunkSize, 0.3, world.chunkSize), groundMaterial);
  ground.position.set(origin.x + world.chunkSize / 2, -0.2, origin.z + world.chunkSize / 2);
  ground.receiveShadow = true;
  chunk.add(ground);

  const roadH = new THREE.Mesh(new THREE.BoxGeometry(world.chunkSize + 12, 0.14, 10), roadMaterial);
  roadH.position.set(origin.x + world.chunkSize / 2, 0.08, origin.z + world.chunkSize / 2);
  roadH.receiveShadow = true;
  chunk.add(roadH);

  const roadV = new THREE.Mesh(new THREE.BoxGeometry(10, 0.14, world.chunkSize + 12), roadMaterial);
  roadV.position.set(origin.x + world.chunkSize / 2, 0.08, origin.z + world.chunkSize / 2);
  roadV.receiveShadow = true;
  chunk.add(roadV);

  const laneMarkMaterial = laneColor();
  for (let i = -world.chunkSize / 2 + 6; i <= world.chunkSize / 2 - 6; i += 12) {
    const laneMark = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.04, 0.9), laneMarkMaterial);
    laneMark.position.set(origin.x + world.chunkSize / 2 + i, 0.15, origin.z + world.chunkSize / 2);
    chunk.add(laneMark);

    const laneMark2 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 4.6), laneMarkMaterial);
    laneMark2.position.set(origin.x + world.chunkSize / 2, 0.15, origin.z + world.chunkSize / 2 + i);
    chunk.add(laneMark2);
  }

  for (let bx = 0; bx < world.chunkSize; bx += 12) {
    for (let bz = 0; bz < world.chunkSize; bz += 12) {
      const buildingX = origin.x + bx + 6;
      const buildingZ = origin.z + bz + 6;
      const dx = Math.abs(buildingX - (origin.x + world.chunkSize / 2));
      const dz = Math.abs(buildingZ - (origin.z + world.chunkSize / 2));

      if (dx < 12 || dz < 12) {
        continue;
      }

      const buildingHeight = 10 + Math.random() * 38;
      const baseColor = buildingColors[Math.floor(Math.random() * buildingColors.length)];
      const building = new THREE.Mesh(
        new THREE.BoxGeometry(8.8, buildingHeight, 8.8),
        new THREE.MeshStandardMaterial({
          color: baseColor,
          roughness: 0.8,
          metalness: 0.15,
          emissive: new THREE.Color(baseColor).multiplyScalar(0.05),
          emissiveIntensity: 0.5,
        })
      );

      building.position.set(buildingX, buildingHeight / 2, buildingZ);
      building.castShadow = true;
      building.receiveShadow = true;
      chunk.add(building);

      const windowBand = new THREE.Mesh(
        new THREE.BoxGeometry(7.3, Math.max(1.8, buildingHeight * 0.12), 0.18),
        new THREE.MeshStandardMaterial({
          color: 0xa7d6ff,
          emissive: 0x7dd3fc,
          emissiveIntensity: 0.5,
          roughness: 0.25,
          metalness: 0.35,
        })
      );
      windowBand.position.set(buildingX, buildingHeight * 0.4, buildingZ + 4.46);
      chunk.add(windowBand);

      const windowBand2 = windowBand.clone();
      windowBand2.position.z = buildingZ - 4.46;
      chunk.add(windowBand2);
    }
  }

  scene.add(chunk);
}

function addCityProps() {
  for (let i = 0; i < 60; i += 1) {
    const x = (Math.random() - 0.5) * 360;
    const z = (Math.random() - 0.5) * 360;

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.36, 2.8, 8),
      new THREE.MeshStandardMaterial({ color: 0x5d3a27, roughness: 1 })
    );
    trunk.position.set(x, 1.4, z);
    trunk.castShadow = true; trunk.receiveShadow = true;
    scene.add(trunk);

    const leaves = new THREE.Mesh(
      new THREE.SphereGeometry(1.7, 14, 14),
      new THREE.MeshStandardMaterial({ color: 0x3aa35a, roughness: 0.9 })
    );
    leaves.position.set(x, 4.2, z);
    leaves.scale.set(1.4, 1.1, 1.3);
    leaves.castShadow = true;
    scene.add(leaves);
  }

  for (let i = 0; i < 24; i += 1) {
    const x = (Math.random() - 0.5) * 310;
    const z = (Math.random() - 0.5) * 310;
    const barrier = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 0.8, 0.6),
      new THREE.MeshStandardMaterial({ color: 0xfff7ed, emissive: 0xf59e0b, emissiveIntensity: 0.4 })
    );
    barrier.position.set(x, 0.55, z);
    barrier.rotation.y = Math.random() * Math.PI;
    barrier.castShadow = true;
    scene.add(barrier);
  }
}

function updateChunkGeneration() {
  const playerChunkX = Math.floor(player.position.x / world.chunkSize);
  const playerChunkZ = Math.floor(player.position.z / world.chunkSize);

  for (let x = -world.renderRadius; x <= world.renderRadius; x += 1) {
    for (let z = -world.renderRadius; z <= world.renderRadius; z += 1) {
      const key = `${playerChunkX + x}:${playerChunkZ + z}`;
      if (!world.chunks.has(key)) {
        createChunk(playerChunkX + x, playerChunkZ + z);
        world.chunks.add(key);
      }
    }
  }
}

function randomRoadPosition() {
  const playerChunkX = Math.floor(player.position.x / world.chunkSize);
  const playerChunkZ = Math.floor(player.position.z / world.chunkSize);
  const chunkX = playerChunkX + Math.floor((Math.random() - 0.5) * 3);
  const chunkZ = playerChunkZ + Math.floor((Math.random() - 0.5) * 3);
  const origin = chunkOrigin(chunkX, chunkZ);

  if (Math.random() < 0.5) {
    const x = origin.x + Math.random() * world.chunkSize;
    const z = origin.z + world.chunkSize / 2;
    return { x, z, heading: 0 };
  }

  const x = origin.x + world.chunkSize / 2;
  const z = origin.z + Math.random() * world.chunkSize;
  return { x, z, heading: Math.PI / 2 };
}

function spawnTraffic() {
  const modelList = ['corolla', 'civic', 'm3', 'gtr'];
  const trafficCar = makeCar(modelList[Math.floor(Math.random() * modelList.length)], new THREE.Color().setHSL(Math.random(), 0.7, 0.55).getHex());

  const pos = randomRoadPosition();
  trafficCar.position.set(pos.x, 0, pos.z);
  trafficCar.rotation.y = pos.heading;

  const direction = Math.random() < 0.5 ? -1 : 1;
  trafficCar.userData = {
    speed: 12 + Math.random() * 10,
    direction,
    heading: pos.heading,
    axis: Math.abs(Math.sin(pos.heading)) > 0.5 ? 'z' : 'x',
  };

  scene.add(trafficCar);
  world.traffic.push(trafficCar);
}

function updateTraffic(dt) {
  if (performance.now() - world.lastTrafficSpawn > 1700) {
    if (world.traffic.length < 24) {
      spawnTraffic();
    }
    world.lastTrafficSpawn = performance.now();
  }

  for (let i = world.traffic.length - 1; i >= 0; i -= 1) {
    const car = world.traffic[i];
    const data = car.userData;

    if (data.axis === 'x') {
      car.position.x += data.direction * data.speed * dt;
      car.rotation.y = data.heading;
    } else {
      car.position.z += data.direction * data.speed * dt;
      car.rotation.y = data.heading;
    }

    const distanceToPlayer = car.position.distanceTo(player.position);
    if (distanceToPlayer > 220) {
      scene.remove(car);
      world.traffic.splice(i, 1);
    }
  }
}

function handleVehicleInput(target, dt, controls) {
  const accelerate = controls.accelerate.some((code) => keys[code]);
  const brake = controls.brake.some((code) => keys[code]);
  const left = controls.left.some((code) => keys[code]);
  const right = controls.right.some((code) => keys[code]);

  const absSpeed = Math.abs(target.velocity);
  const maxReverseSpeed = Math.max(6, target.maxSpeed * 0.25);
  const accelForce = (target.carBase?.accel ?? 16) * (0.85 + Math.min(absSpeed / target.maxSpeed, 1) * 0.2);
  const brakeForce = 22 + absSpeed * 0.75;

  if (accelerate) {
    target.velocity += accelForce * dt;
  }

  if (brake) {
    target.velocity -= brakeForce * dt;
  }

  if (!accelerate && !brake) {
    const rollingResistance = 7 + absSpeed * 0.9;
    if (target.velocity > 0) {
      target.velocity = Math.max(0, target.velocity - rollingResistance * dt);
    } else if (target.velocity < 0) {
      target.velocity = Math.min(0, target.velocity + rollingResistance * dt);
    }
  }

  target.velocity = clamp(target.velocity, -maxReverseSpeed, target.maxSpeed);

  const steerInput = (left ? 1 : 0) - (right ? 1 : 0);
  const speedRatio = clamp(absSpeed / Math.max(target.maxSpeed, 1), 0, 1);
  const steeringLimit = 1.05 - speedRatio * 0.45;
  const desiredSteer = steerInput * steeringLimit;
  target.steering = THREE.MathUtils.lerp(target.steering, desiredSteer, 0.12);

  const turnStrength = (0.9 + speedRatio * 1.8) * (0.7 + Math.abs(target.velocity) * 0.045);
  const directionSign = target.velocity >= 0 ? 1 : -1;
  target.angle += target.steering * turnStrength * dt * directionSign;

  const forwardSpeed = target.velocity * (1 - Math.min(Math.abs(target.steering) * 0.18, 0.18));
  const forwardX = Math.sin(target.angle) * forwardSpeed * dt;
  const forwardZ = Math.cos(target.angle) * forwardSpeed * dt;

  target.position.x += forwardX;
  target.position.z += forwardZ;

  target.mesh.position.set(target.position.x, 0, target.position.z);
  target.mesh.rotation.y = target.angle;
}

function handleKeyState(dt) {
  handleVehicleInput(player, dt, {
    accelerate: ['KeyW'],
    brake: ['KeyS'],
    left: ['KeyA'],
    right: ['KeyD'],
  });

  handleVehicleInput(secondPlayer, dt, {
    accelerate: ['KeyI'],
    brake: ['KeyK'],
    left: ['KeyJ'],
    right: ['KeyL'],
  });
}

function triggerFlex(target) {
  if (target.flexCooldown > 0) {
    return;
  }

  target.flex = 1;
  target.flexCooldown = 2.8;
  if (target === player) {
    uiStatus.textContent = 'Flex-Stunt aktiv';
  }
}

function updateFlex(dt, target) {
  if (target.flexCooldown > 0) {
    target.flexCooldown = Math.max(0, target.flexCooldown - dt);
  }

  if (target.flex > 0) {
    target.flex = Math.max(0, target.flex - dt * 0.6);
    const pulse = 1 + Math.sin(performance.now() * 0.025) * 0.28;
    target.mesh.scale.setScalar(1.15 * pulse);
    target.mesh.position.y = 0.18 + Math.sin(performance.now() * 0.06) * 0.45;
    target.mesh.traverse((child) => {
      if (child.isMesh && child.material && 'emissive' in child.material) {
        child.material.emissive = new THREE.Color().setHSL((performance.now() * 0.001) % 1, 0.8, 0.62);
      }
    });
  } else {
    target.mesh.scale.setScalar(1);
    target.mesh.position.y = 0;
    if (target === player && !world.raceActive) {
      uiStatus.textContent = 'Starterpaket aktiv';
    }
    target.mesh.traverse((child) => {
      if (child.isMesh && child.material && 'emissive' in child.material) {
        child.material.emissive = new THREE.Color(0x000000);
      }
    });
  }
}

function updateCamera() {
  const followDistance = 10.5;
  const height = 5.8;
  const orbitYaw = player.angle + mouse.dragX * 0.012;
  const orbitPitch = THREE.MathUtils.clamp(0.7 + mouse.dragY * 0.004, 0.25, 1.4);

  const targetX = player.position.x - Math.sin(orbitYaw) * followDistance;
  const targetZ = player.position.z - Math.cos(orbitYaw) * followDistance;
  const targetCamera = new THREE.Vector3(targetX, height + orbitPitch * 2.2, targetZ);

  camera.position.lerp(targetCamera, 0.08);
  const lookTarget = new THREE.Vector3(player.position.x, 1.2, player.position.z);
  camera.lookAt(lookTarget);
}

function handleInput() {
  if (keys['ShiftLeft'] || keys['ShiftRight']) {
    triggerFlex(player);
  }
  if (keys['KeyU']) {
    triggerFlex(secondPlayer);
  }

  if (keys['KeyE'] && !world.raceActive) {
    const dist = Math.hypot(player.position.x - world.raceZone.x, player.position.z - world.raceZone.z);
    if (dist < world.raceZone.radius + 8) {
      startRace();
    }
  }
}

function startRace() {
  world.raceActive = true;
  world.raceStartPos = player.position.clone();
  world.raceDistance = 0;
  world.raceGoal = 440 + player.rank * 45;
  world.raceReward = 1600 + player.rank * 330 + Math.random() * 800;
  uiStatus.textContent = 'Rennen läuft! Fahre so weit wie möglich durch die Zone.';
}

function endRace(win) {
  if (!world.raceActive) return;
  world.raceActive = false;
  if (win) {
    player.money += world.raceReward;
    player.xp += 90 + player.rank * 15;
    player.rank = Math.max(1, 1 + Math.floor(player.xp / 500));
    uiStatus.textContent = `Rennen gewonnen! + ${formatMoney(world.raceReward)}`;
  } else {
    uiStatus.textContent = 'Rennen verloren! Werde wieder stärker.';
  }
  updateHud();
}

function updateRace() {
  if (!world.raceActive || !world.raceStartPos) return;

  const dist = player.position.distanceTo(world.raceStartPos);
  world.raceDistance = dist;

  if (dist >= world.raceGoal) {
    endRace(true);
  }

  if (player.position.length() > 260) {
    endRace(false);
  }
}

function buyCar(modelKey) {
  const vehicle = VEHICLES[modelKey];
  if (!vehicle) return;

  if (player.ownedCars[modelKey]) {
    player.selectedCar = modelKey;
    player.maxSpeed = vehicle.maxSpeed;
    updateVehicleModel();
    uiStatus.textContent = `${vehicle.name} ausgewählt.`;
    updateHud();
    return;
  }

  if (player.money >= vehicle.price) {
    player.money -= vehicle.price;
    player.ownedCars[modelKey] = true;
    player.selectedCar = modelKey;
    player.maxSpeed = vehicle.maxSpeed;
    engineSetPaint();
    updateVehicleModel();
    uiStatus.textContent = `${vehicle.name} gekauft!`;
    updateHud();
  } else {
    uiStatus.textContent = `Zu wenig Geld für ${vehicle.name}`;
  }
}

function engineSetPaint() {
  const selectedColor = paintSelect.value || '#ff7b54';
  player.paint = selectedColor;
}

function bindGarageControls() {
  paintSelect.addEventListener('change', () => {
    player.paint = paintSelect.value;
    applyCarStyling();
  });

  wheelSelect.addEventListener('change', () => {
    player.wheelStyle = wheelSelect.value;
    applyCarStyling();
  });

  spoilerToggle.addEventListener('change', () => {
    player.spoiler = spoilerToggle.checked;
    applyCarStyling();
  });

  neonToggle.addEventListener('change', () => {
    player.neon = neonToggle.checked;
    applyCarStyling();
  });

  applyStyleBtn.addEventListener('click', () => {
    engineSetPaint();
    applyCarStyling();
    uiStatus.textContent = 'Style angepasst';
  });

  shopButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const carId = button.dataset.car;
      buyCar(carId);
      shopButtons.forEach((entry) => entry.classList.toggle('active', entry.dataset.car === player.selectedCar));
    });
  });
}

function updateGarageButtons() {
  shopButtons.forEach((button) => {
    const carId = button.dataset.car;
    const unlocked = player.ownedCars[carId];
    button.textContent = unlocked
      ? `${VEHICLES[carId].name} – gekauft`
      : `${VEHICLES[carId].name} – ${formatMoney(VEHICLES[carId].price)}`;
    button.classList.toggle('active', carId === player.selectedCar);
  });
}

function animate() {
  const dt = Math.min(clock.getDelta(), 0.033);

  handleInput();
  handleKeyState(dt);
  updateChunkGeneration();
  updateTraffic(dt);
  updateFlex(dt, player);
  updateFlex(dt, secondPlayer);
  updateRace();
  updateCamera();

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

startBtn.addEventListener('click', beginGame);
hostGameBtn.addEventListener('click', () => {
  setSelectedRoom(selectedRoom || 'Downtown Drift');
  uiStatus.textContent = `Host Game • ${selectedRoom}`;
});
joinGameBtn.addEventListener('click', () => {
  setSelectedRoom(selectedRoom || 'Downtown Drift');
  uiStatus.textContent = `Join Game • ${selectedRoom}`;
});
roomCards.forEach((card) => {
  card.addEventListener('click', () => {
    setSelectedRoom(card.dataset.room);
  });
});

document.addEventListener('keydown', (event) => {
  keys[event.code] = true;
});

document.addEventListener('keyup', (event) => {
  keys[event.code] = false;
});

document.addEventListener('contextmenu', (event) => {
  event.preventDefault();
});

document.addEventListener('mousedown', (event) => {
  if (event.button === 2) {
    mouse.down = true;
    mouse.x = event.clientX;
    mouse.y = event.clientY;
  }
});

document.addEventListener('mouseup', (event) => {
  if (event.button === 2) {
    mouse.down = false;
  }
});

document.addEventListener('mousemove', (event) => {
  if (!mouse.down) return;

  const deltaX = event.clientX - mouse.x;
  const deltaY = event.clientY - mouse.y;
  mouse.dragX += deltaX;
  mouse.dragY += deltaY;
  mouse.x = event.clientX;
  mouse.y = event.clientY;
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

addLights();
addSkyGlow();
addStreetLights();
addRaceMarker();
addCityProps();
setupPlayer();
bindGarageControls();
updateGarageButtons();
updateChunkGeneration();
for (let i = 0; i < 6; i += 1) {
  spawnTraffic();
}
updateHud();
animate();
