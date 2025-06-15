# Simulação de Tráfego com Semáforos

## Link da aplicação
A simulação está publicada em GitHub Pages:
https://gabecmelo.github.io/AEP-3S-A/

## Descrição do Projeto
Este projeto implementa uma simulação de tráfego urbano usando HTML5 Canvas e JavaScript. Ele representa uma interseção com:
- Estradas verticais e horizontais.
- Carros se movendo em diferentes direções, com detecção de colisões.
- Semáforos com três fases que controlam o fluxo.
- Botões de controle: reiniciar simulação, habilitar/desabilitar semáforos e alternar viadutos (saída para Maringá / saída para Água boa).

O desenvolvimento foi feito como parte desta AEP, incluindo lógica de desenho, animação e controle de estados.

## Tecnologias
- HTML5 Canvas
- JavaScript puro (ES6+)
- CSS básico para posicionar o canvas e botões

## Estrutura
- `index.html`: contém o `<canvas>` com id `simCanvas` e botões de controle (`resetBtn`, `toggleSignalsBtn`, `toggleViaductBtn`).
- `index.js`: toda a lógica de inicialização, desenho (draw), atualização (update) e animação (requestAnimationFrame).
- estilos CSS no arquivo `styles.css`

## Como executar localmente
1. Abra o repositório/clonagem localmente.
2. Abra `index.html` em um navegador moderno (Chrome, Firefox, Edge etc.).
3. A simulação inicia automaticamente. Use os botões para reiniciar ou alterar configurações.
