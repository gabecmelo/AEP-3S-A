// Obtém referência ao canvas e ao contexto 2D
const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

// Duração total da simulação em milissegundos
const SIM_DURATION_MS = 60 * 1000;

// Cores utilizadas para desenhar estradas, viaduto e carros
const ROAD_COLOR = '#999';
const VIADUCT_COLOR = '#777';
const CAR_COLOR = '#3498db';
const CAR_COLLIDED_COLOR = '#e67e22';

// Tamanho do raio dos carros em pixels
const CAR_RADIUS = 8;
// Largura das estradas em pixels
const ROAD_WIDTH = 100;
// Deslocamento da faixa em relação ao centro da estrada principal
const LANE_OFFSET = ROAD_WIDTH / 4;
// Posição X da borda esquerda da estrada vertical
const ROAD_EDGE = (canvas.width - ROAD_WIDTH) / 2;
// Ponto central X da estrada vertical principal
const MAIN_ROAD_X = canvas.width / 2;
// Posições Y onde as estradas horizontais se cruzam com a vertical
const TOP_ROAD_Y = canvas.height / 3;
const BOTTOM_ROAD_Y = 2 * canvas.height / 3;
// Tamanho dos semáforos
const LIGHT_SIZE = 12;
// Altura do retângulo que representa o viaduto
const VIADUCT_HEIGHT = 40;
// Tempo de cada fase do sinal em milissegundos
const PHASE_DURATION = 5500;
// Velocidade dos carros em pixels por segundo
const CAR_SPEED = 100;
// Distância mínima (em pixels) entre dois carros antes de considerar colisão
const MIN_GAP = CAR_RADIUS * 2 + 4;

// Quantidade de carros em cada sentido/faixa
const NUM_CARS_VERTICAL = 8;         // Carros que vêm verticalmente
const NUM_CARS_LEFT_TO_RIGHT = 8;    // Carros que vêm da esquerda para a direita e depois sobem
const NUM_CARS_RIGHT_TO_LEFT = 5;    // Carros que vêm da direita para a esquerda

// Variáveis de controle da simulação
let currentPhase = 0;   // Fase atual do semáforo (0,1,2)
let phaseTime = 0;      // Tempo decorrido na fase atual
let startTime = null;   // Marca de tempo do início da simulação
let animationId = null; // ID retornado por requestAnimationFrame
const cars = [];        // Array que armazena todos os carros na simulação

// Flag para habilitar/desabilitar semáforos
let signalsEnabled = true;
// Flag para alternar viaduto: false = primeiro viaduto (Maringá), true = segundo (Água boa)
let useSecondViaduct = false;

// Função para adicionar um carro ao array de carros
// x: posição inicial X do carro
// y: posição inicial Y do carro
// dx: direção horizontal (-1, 0 ou 1)
// dy: direção vertical (-1, 0 ou 1)
// turnsUp: indica se o carro deve curvar para cima ao atingir a estrada principal
function addCar(x, y, dx, dy, turnsUp = false) {
  cars.push({ x, y, dx, dy, speed: CAR_SPEED, radius: CAR_RADIUS, turnsUp, collided: false });
}

// Inicializa todos os carros posicionando-os fora da tela, conforme viaduto selecionado
function initCars() {
  cars.length = 0;

  // --- Carros verticais ---
  if (!useSecondViaduct) {
    // Primeiro viaduto (Maringá): fluxo original vertical (faixa esquerda, de cima para baixo)
    for (let i = 0; i < NUM_CARS_VERTICAL; i++) {
      addCar(
        MAIN_ROAD_X - LANE_OFFSET,  // faixa esquerda vertical
        -20 - i * 100,              // fora da tela acima
        0,
        1
      );
      // marca esse carro para virar à direita ao atingir a via horizontal inferior
      cars[cars.length - 1].turnsRight = true;
    }
  } else {
    // Segundo viaduto (Água boa):
    // 1) Mantém também o fluxo original vertical (faixa esquerda, de cima para baixo)
    for (let i = 0; i < NUM_CARS_VERTICAL; i++) {
      addCar(
        MAIN_ROAD_X - LANE_OFFSET,
        -20 - i * 100,
        0,
        1
      );
      cars[cars.length - 1].turnsRight = true;
    }
    // 2) Novo fluxo vertical no sentido inverso (faixa direita, de baixo para cima)
    for (let i = 0; i < NUM_CARS_VERTICAL; i++) {
      addCar(
        MAIN_ROAD_X + LANE_OFFSET,      // faixa direita vertical
        canvas.height + 20 + i * 100,   // fora da tela abaixo
        0,
        -1
      );
      // opcional: se quiser curva ao encontrar cruzamento, mas não foi solicitado
    }
  }

  // --- Carros vindos da esquerda para a direita que viram para cima ---
  for (let i = 0; i < NUM_CARS_LEFT_TO_RIGHT; i++) {
    addCar(
      -20 - i * 120,
      BOTTOM_ROAD_Y + ROAD_WIDTH / 2 - 10,
      1,
      0,
      true
    );
  }

  // --- Carros vindos da direita para a esquerda ---
  for (let i = 0; i < NUM_CARS_RIGHT_TO_LEFT; i++) {
    addCar(
      canvas.width + 20 + i * 120,
      TOP_ROAD_Y - ROAD_WIDTH / 2 + 10,
      -1,
      0
    );
  }
}

// Desenha as estradas verticais e horizontais, bem como o viaduto
function drawRoads() {
  // Estrada vertical central
  ctx.fillStyle = ROAD_COLOR;
  ctx.fillRect(ROAD_EDGE, 0, ROAD_WIDTH, canvas.height);

  // Estrada horizontal superior
  ctx.fillRect(
    0,
    TOP_ROAD_Y - ROAD_WIDTH / 2,
    canvas.width,
    ROAD_WIDTH
  );

  // Estrada horizontal inferior
  ctx.fillRect(
    0,
    BOTTOM_ROAD_Y - ROAD_WIDTH / 2,
    canvas.width,
    ROAD_WIDTH
  );

  // Viaduto: apenas desenho visual. Se quiser, podemos mudar cor ou texto indicando Maringá/Água boa.
  ctx.fillStyle = VIADUCT_COLOR;
  ctx.fillRect(
    0,
    canvas.height / 2 - VIADUCT_HEIGHT / 2,
    canvas.width,
    VIADUCT_HEIGHT
  );

  // Texto indicando qual saída está ativa
  ctx.fillStyle = '#fff';
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  const label = useSecondViaduct ? 'Saída para Água boa' : 'Saída para Maringá';
  ctx.fillText(label, canvas.width / 2, canvas.height / 2 + 5);
}

// Desenha os semáforos posicionados no cruzamento
function drawTrafficLights() {
  if (!signalsEnabled) return;

  const centerX = MAIN_ROAD_X;
  const centerY = TOP_ROAD_Y;

  const lights = [
    { x: centerX, y: centerY - ROAD_WIDTH / 2 - 30, phase: 0 }, // Semáforo fluxo cima-baixo
    { x: centerX, y: centerY + ROAD_WIDTH / 2 + 30, phase: 1 }, // Semáforo fluxo baixo-cima
    { x: centerX + ROAD_WIDTH / 2 + 30, y: centerY, phase: 2 }  // Semáforo fluxo direita-esquerda
  ];

  for (const light of lights) {
    ctx.fillStyle = (currentPhase === light.phase) ? 'green' : 'red';
    ctx.beginPath();
    ctx.arc(light.x, light.y, LIGHT_SIZE, 0, 2 * Math.PI);
    ctx.fill();
  }
}

// Desenha todos os carros presentes no array "cars"
function drawCars() {
  for (const car of cars) {
    ctx.fillStyle = car.collided ? CAR_COLLIDED_COLOR : CAR_COLOR;
    ctx.beginPath();
    ctx.arc(car.x, car.y, car.radius, 0, 2 * Math.PI);
    ctx.fill();
  }
}

// Atualiza o temporizador dos semáforos
function updateLights(dt) {
  if (!signalsEnabled) return;

  phaseTime += dt;
  if (phaseTime >= PHASE_DURATION) {
    currentPhase = (currentPhase + 1) % 3;
    phaseTime = 0;
  }
}

// Atualiza a posição dos carros, considerando semáforos, colisões e curvas
function updateCars(dt) {
  const willStop = Array(cars.length).fill(false);

  // Primeiro passo: semáforos, detecção de proximidade, curvas
  for (let i = 0; i < cars.length; i++) {
    const car = cars[i];

    // Nova lógica: curva para a direita se configurado e na linha da via horizontal inferior
    if (car.turnsRight && car.dy === 1 &&
        car.x === MAIN_ROAD_X - LANE_OFFSET &&
        car.y + car.radius >= BOTTOM_ROAD_Y + 45 && !useSecondViaduct) {
      // Ajusta posição e direção para ir à direita
      car.x = MAIN_ROAD_X - LANE_OFFSET;
      car.dx = 1;
      car.dy = 0;
      car.turnsRight = false;
    }

    // Curva para cima se necessário (lógica existente para turnsUp)
    if (car.turnsUp && car.dx === 1 && car.x >= MAIN_ROAD_X + LANE_OFFSET) {
      car.x = MAIN_ROAD_X + LANE_OFFSET;
      car.dx = 0;
      car.dy = -1;
      car.turnsUp = false;
    }

    // Se semáforos habilitados, freia conforme fase
    if (signalsEnabled) {
      if (
        car.dy === 1 &&
        car.y + car.radius >= TOP_ROAD_Y - ROAD_WIDTH / 2 &&
        car.y <= TOP_ROAD_Y + ROAD_WIDTH / 2 - 100
      ) {
        if (currentPhase !== 0) willStop[i] = true;
      } else if (
        car.dy === -1 &&
        car.y - car.radius <= TOP_ROAD_Y + ROAD_WIDTH / 2 &&
        car.y >= TOP_ROAD_Y - ROAD_WIDTH / 2
      ) {
        if (currentPhase !== 1) willStop[i] = true;
      } else if (
        car.dx === -1 &&
        car.y < TOP_ROAD_Y + ROAD_WIDTH / 2 &&
        car.x - car.radius <= MAIN_ROAD_X + ROAD_WIDTH / 2 &&
        car.x >= MAIN_ROAD_X - ROAD_WIDTH / 2
      ) {
        if (currentPhase !== 2) willStop[i] = true;
      }
    }

    // Verifica proximidade de outros carros na mesma direção/pista
    for (let j = 0; j < cars.length; j++) {
      if (i === j) continue;
      const other = cars[j];
      if (car.dx === other.dx && car.dy === other.dy) {
        const sameLane = (
          (car.dx === 0 && Math.abs(car.x - other.x) < 1) ||
          (car.dy === 0 && Math.abs(car.y - other.y) < 1)
        );
        const inFront = (
          (car.dy === 1 && other.y > car.y) ||
          (car.dy === -1 && other.y < car.y) ||
          (car.dx === 1 && other.x > car.x) ||
          (car.dx === -1 && other.x < car.x)
        );
        if (sameLane && inFront) {
          const gap = car.dx !== 0
            ? Math.abs(other.x - car.x)
            : Math.abs(other.y - car.y);
          if (gap < MIN_GAP) willStop[i] = true;
        }
      }
    }
  }

  // Segundo passo: movimenta quem não deve parar e verifica colisões futuras
  for (let i = 0; i < cars.length; i++) {
    if (willStop[i]) continue;
    const car = cars[i];
    const nextX = car.x + car.dx * car.speed * dt / 1000;
    const nextY = car.y + car.dy * car.speed * dt / 1000;

    for (let j = 0; j < cars.length; j++) {
      if (i === j || willStop[j]) continue;
      const other = cars[j];
      const otherNextX = other.x + other.dx * other.speed * dt / 1000;
      const otherNextY = other.y + other.dy * other.speed * dt / 1000;
      const dist = Math.hypot(nextX - otherNextX, nextY - otherNextY);
      if (dist < car.radius + other.radius) {
        willStop[i] = true;
        willStop[j] = true;
        car.collided = true;
        other.collided = true;
      }
    }

    if (!willStop[i]) {
      car.x += car.dx * car.speed * dt / 1000;
      car.y += car.dy * car.speed * dt / 1000;
    }
  }
}

// Reinicia a simulação
function resetSimulation() {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
  currentPhase = 0;
  phaseTime = 0;
  startTime = null;
  animate.lastTime = undefined;
  initCars();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawRoads();
  drawTrafficLights();
  drawCars();
  animationId = requestAnimationFrame(animate);
}

// Loop principal
function animate(timestamp) {
  if (!startTime) startTime = timestamp;
  const elapsed = timestamp - startTime;

  if (elapsed >= SIM_DURATION_MS) return cancelAnimationFrame(animationId);

  const dt = elapsed - (animate.lastTime || elapsed);
  animate.lastTime = elapsed;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawRoads();
  updateLights(dt);
  drawTrafficLights();
  updateCars(dt);
  drawCars();

  animationId = requestAnimationFrame(animate);
}

// Configura listeners após DOM carregar
window.addEventListener('DOMContentLoaded', () => {
  const resetBtn = document.getElementById('resetBtn');
  const toggleSignalsBtn = document.getElementById('toggleSignalsBtn');
  const toggleViaductBtn = document.getElementById('toggleViaductBtn');

  resetBtn.addEventListener('click', () => {
    resetSimulation();
  });

  toggleSignalsBtn.addEventListener('click', () => {
    signalsEnabled = !signalsEnabled;
    toggleSignalsBtn.textContent = signalsEnabled ? 'Desabilitar Semáforos' : 'Habilitar Semáforos';
    resetSimulation();
  });

  toggleViaductBtn.addEventListener('click', () => {
    useSecondViaduct = !useSecondViaduct;
    if (useSecondViaduct) {
      toggleViaductBtn.textContent = 'Mudar para o primeiro viaduto (saída para Maringá)';
    } else {
      toggleViaductBtn.textContent = 'Mudar para o segundo viaduto (saída para Água boa)';
    }
    resetSimulation();
  });
});

// Inicializa na carga
initCars();
animationId = requestAnimationFrame(animate);
