// Obtém referência ao canvas e ao contexto 2D
const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

// Duração total da simulação em milissegundos
const SIM_DURATION_MS = 60 * 1000;
// Cores utilizadas para desenhar estradas, viaduto e carros
const ROAD_COLOR = '#999';
const VIADUCT_COLOR = '#777';
const CAR_COLOR = '#3498db';
const CAR_COLLIDED_COLOR ='#e67e22';
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
const NUM_CARS_VERTICAL = 8;         // Carros que vêm da base para cima
const NUM_CARS_LEFT_TO_RIGHT = 8;    // Carros que vêm da esquerda para a direita e depois sobem
const NUM_CARS_RIGHT_TO_LEFT = 5;    // Carros que vêm da direita para a esquerda

// Variáveis de controle da simulação
let currentPhase = 0;   // Fase atual do semáforo (0,1,2)
let phaseTime = 0;      // Tempo decorrido na fase atual
let startTime = null;   // Marca de tempo do início da simulação
let animationId = null; // ID retornado por requestAnimationFrame
const cars = [];        // Array que armazena todos os carros na simulação

// Função para adicionar um carro ao array de carros
// x: posição inicial X do carro
// y: posição inicial Y do carro
// dx: direção horizontal (-1, 0 ou 1)
// dy: direção vertical (-1, 0 ou 1)
// turnsUp: indica se o carro deve curvar para cima ao atingir a estrada principal
function addCar(x, y, dx, dy, turnsUp = false) {
  cars.push({ x, y, dx, dy, speed: CAR_SPEED, radius: CAR_RADIUS, turnsUp });
}

// Inicializa todos os carros posicionando-os fora da tela
function initCars() {
  // Limpa qualquer carro existente
  cars.length = 0;

  // --- Carros verticais (vindo da base para cima) ---
  for (let i = 0; i < NUM_CARS_VERTICAL; i++) {
    // Posiciona o carro acima da tela, alinhado à esquerda da faixa vertical
    addCar(
      MAIN_ROAD_X - LANE_OFFSET,  // x
      -20 - i * 100,              // y (fora da tela, espaçado a cada 100px)
      0,                          // dx = sem movimento horizontal
      1                           // dy = movimento para baixo para cima
    );
  }

  // --- Carros vindos da esquerda para a direita que viram para cima ---
  for (let i = 0; i < NUM_CARS_LEFT_TO_RIGHT; i++) {
    addCar(
      -20 - i * 120,                        // x inicial fora da tela à esquerda
      BOTTOM_ROAD_Y + ROAD_WIDTH / 2 - 10,  // y próximo à estrada horizontal inferior
      1,                                    // dx = movimento para a direita
      0,                                    // dy = sem movimento vertical
      true                                  // turnsUp = irá curvar para cima
    );
  }

  // --- Carros vindos da direita para a esquerda ---
  for (let i = 0; i < NUM_CARS_RIGHT_TO_LEFT; i++) {
    addCar(
      canvas.width + 20 + i * 120,         // x inicial fora da tela à direita
      TOP_ROAD_Y - ROAD_WIDTH / 2 + 10,     // y próximo à estrada horizontal superior
      -1,                                   // dx = movimento para a esquerda
      0                                     // dy = sem movimento vertical
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

  // Viaduto (reta central mais escura)
  ctx.fillStyle = VIADUCT_COLOR;
  ctx.fillRect(
    0,
    canvas.height / 2 - VIADUCT_HEIGHT / 2,
    canvas.width,
    VIADUCT_HEIGHT
  );
}

// Desenha os semáforos posicionados no cruzamento
// Cada objeto em "lights" contém x, y e a fase em que fica verde
function drawTrafficLights() {
  const centerX = MAIN_ROAD_X;
  const centerY = TOP_ROAD_Y;

  const lights = [
    { x: centerX, y: centerY - ROAD_WIDTH / 2 - 30, phase: 0 }, // Semáforo fluxo cima-baixo
    { x: centerX, y: centerY + ROAD_WIDTH / 2 + 30, phase: 1 }, // Semáforo fluxo baixo-cima
    { x: centerX + ROAD_WIDTH / 2 + 30, y: centerY, phase: 2 }  // Semáforo fluxo direita-esquerda
  ];

  for (const light of lights) {
    // Semáforo verde somente na fase correspondente; caso contrário, vermelho
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

// Atualiza o temporizador dos semáforos e alterna a fase quando o tempo excede PHASE_DURATION
// dt: delta time em milissegundos desde a última atualização
function updateLights(dt) {
  phaseTime += dt;
  if (phaseTime >= PHASE_DURATION) {
    // Avança para a próxima fase (cíclica de 0 a 2)
    currentPhase = (currentPhase + 1) % 3;
    phaseTime = 0;
  }
}

// Atualiza a posição dos carros, considerando semáforos e colisões
// dt: delta time em milissegundos desde a última atualização
function updateCars(dt) {
  // Indica se cada carro deve parar nesta iteração
  const willStop = Array(cars.length).fill(false);

  // Primeiro passo: verifica semáforo e carros à frente
  for (let i = 0; i < cars.length; i++) {
    const car = cars[i];

    // Se o carro deve curvar para cima ao alcançar a estrada principal
    if (car.turnsUp && car.dx === 1 && car.x >= MAIN_ROAD_X + LANE_OFFSET) {
      // Ajusta posição e direção; desativa will-turn-up
      car.x = MAIN_ROAD_X + LANE_OFFSET;
      car.dx = 0;
      car.dy = -1;
      car.turnsUp = false;
    }

    // Verifica semáforo: se não estiver verde, marca para parar
    if (
      car.dy === 1 && // Carro descendo verticalmente
      car.y + car.radius >= TOP_ROAD_Y - ROAD_WIDTH / 2 &&
      car.y <= TOP_ROAD_Y + ROAD_WIDTH / 2 - 100
    ) {
      if (currentPhase !== 0) willStop[i] = true;

    } else if (
      car.dy === -1 && // Carro subindo verticalmente
      car.y - car.radius <= TOP_ROAD_Y + ROAD_WIDTH / 2 &&
      car.y >= TOP_ROAD_Y - ROAD_WIDTH / 2
    ) {
      if (currentPhase !== 1) willStop[i] = true;

    } else if (
      car.dx === -1 && // Carro indo da direita para a esquerda
      car.y < TOP_ROAD_Y + ROAD_WIDTH / 2 &&
      car.x - car.radius <= MAIN_ROAD_X + ROAD_WIDTH / 2 &&
      car.x >= MAIN_ROAD_X - ROAD_WIDTH / 2
    ) {
      if (currentPhase !== 2) willStop[i] = true;
    }

    // Verifica se há carro muito próximo à frente na mesma direção
    for (let j = 0; j < cars.length; j++) {
      if (i === j) continue;
      const other = cars[j];
      if (car.dx === other.dx && car.dy === other.dy) {
        // Mesma pista: X próximo quando vertical, Y próximo quando horizontal
        const sameLane = (
          (car.dx === 0 && Math.abs(car.x - other.x) < 1) ||
          (car.dy === 0 && Math.abs(car.y - other.y) < 1)
        );
        // Verifica se o outro carro está à frente
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

  // Segundo passo: atualiza posição dos carros que não devem parar
  for (let i = 0; i < cars.length; i++) {
    if (willStop[i]) continue; // Pula carros que devem parar
    const car = cars[i];
    const nextX = car.x + car.dx * car.speed * dt / 1000;
    const nextY = car.y + car.dy * car.speed * dt / 1000;

    // Verifica colisão futura com outros carros
    for (let j = 0; j < cars.length; j++) {
      if (i === j || willStop[j]) continue;
      const other = cars[j];
      const otherNextX = other.x + other.dx * other.speed * dt / 1000;
      const otherNextY = other.y + other.dy * other.speed * dt / 1000;
      const dist = Math.hypot(nextX - otherNextX, nextY - otherNextY);
      if (dist < car.radius + other.radius) {
        // Em caso de colisão, ambos param
        willStop[i] = true;
        willStop[j] = true;

        car.collided = true;
        other.collided = true;
      }
    }

    // Atualiza posição se não houver necessidade de parar
    if (!willStop[i]) {
      car.x += car.dx * car.speed * dt / 1000;
      car.y += car.dy * car.speed * dt / 1000;
    }
  }
}

function resetSimulation() {
  // Cancela qualquer animação pendente
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
  // Zera estados de semáforo
  currentPhase = 0;
  phaseTime = 0;
  // Zera tempo de início para que animate trate como nova simulação
  startTime = null;
  // Zera última marcação de tempo em animate
  animate.lastTime = undefined;
  // Re-inicializa carros
  initCars();
  // Limpa o canvas imediatamente (opcional)
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Redesenha estado inicial (opcional)
  drawRoads();
  drawTrafficLights();
  drawCars();
  // Reinicia o loop de animação
  animationId = requestAnimationFrame(animate);
}

// Configura listener do botão após o DOM carregar
window.addEventListener('DOMContentLoaded', () => {
  const resetBtn = document.getElementById('resetBtn');
  resetBtn.addEventListener('click', resetSimulation);
});

// Laço principal de animação, chamado por requestAnimationFrame
// timestamp: tempo (ms) atual fornecido pelo navegador
function animate(timestamp) {
  if (!startTime) startTime = timestamp; // Define o momento inicial
  const elapsed = timestamp - startTime;

  // Para a simulação se ultrapassar a duração configurada
  if (elapsed >= SIM_DURATION_MS) return cancelAnimationFrame(animationId);

  // Calcula delta time (dt) desde o último quadro
  const dt = elapsed - (animate.lastTime || elapsed);
  animate.lastTime = elapsed;

  // Limpa o canvas antes de redesenhar
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Desenha estradas e viaduto
  drawRoads();
  // Atualiza fase dos semáforos
  updateLights(dt);
  // Desenha semáforos
  drawTrafficLights();
  // Atualiza posição dos carros
  updateCars(dt);
  // Desenha carros
  drawCars();

  // Chama o próximo frame
  animationId = requestAnimationFrame(animate);
}

// Inicializa carros e inicia o loop de animação
initCars();
animationId = requestAnimationFrame(animate);
