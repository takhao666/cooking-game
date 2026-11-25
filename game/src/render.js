// render.js — everything the player sees, drawn on one canvas.
// One file, one job: paint the kitchen, the chef, the food and the HUD.

import {
  BOARD, DAY_LENGTH_SECONDS, HUD_HEIGHT, INGREDIENTS, MAX_HEARTS,
  STATIONS, VIEW, displayName,
} from './config.js';

const FONT = "'Trebuchet MS', 'Segoe UI', system-ui, sans-serif";

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

// ------------------------------------------------------------ food drawing
// Each ingredient is a little vector picture, drawn from its id alone.
export function drawIngredient(ctx, id, x, y, size) {
  const [base, form] = id.split('_');
  const burnt = form === 'burnt';
  ctx.save();
  ctx.translate(x, y);
  const s = size / 2;
  if (burnt) {
    ctx.fillStyle = '#3e2723';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1b1512';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-s * 0.4, -s * 0.2);
    ctx.lineTo(0, s * 0.2);
    ctx.lineTo(s * 0.4, -s * 0.3);
    ctx.stroke();
    ctx.restore();
    return;
  }
  switch (base) {
    case 'tomato': {
      if (form === 'chopped') {
        ctx.fillStyle = '#ef5350';
        for (let i = -1; i <= 1; i += 1) {
          ctx.beginPath();
          ctx.arc(i * s * 0.55, (i % 2) * s * 0.3, s * 0.42, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#ffcdd2';
        ctx.beginPath();
        ctx.arc(-s * 0.5, 0, s * 0.16, 0, Math.PI * 2);
        ctx.arc(s * 0.5, s * 0.15, s * 0.16, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#e5484d';
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.95, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.arc(-s * 0.35, -s * 0.35, s * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#46a758';
        ctx.beginPath();
        ctx.ellipse(0, -s * 0.85, s * 0.35, s * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'lettuce': {
      ctx.fillStyle = form === 'chopped' ? '#66bb6a' : '#46a758';
      if (form === 'chopped') {
        for (let i = 0; i < 3; i += 1) {
          ctx.save();
          ctx.rotate((i * Math.PI) / 3);
          roundRect(ctx, -s, -s * 0.22, s * 2, s * 0.44, s * 0.2);
          ctx.fill();
          ctx.restore();
        }
      } else {
        ctx.beginPath();
        ctx.arc(-s * 0.3, 0, s * 0.6, 0, Math.PI * 2);
        ctx.arc(s * 0.3, -s * 0.1, s * 0.6, 0, Math.PI * 2);
        ctx.arc(0, s * 0.3, s * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#81c784';
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'onion': {
      if (form === 'chopped') {
        ctx.fillStyle = '#f3e8ff';
        for (let i = 0; i < 4; i += 1) {
          ctx.fillRect(-s + (i % 2) * s, -s * 0.5 + Math.floor(i / 2) * s * 0.9, s * 0.8, s * 0.7);
        }
        ctx.strokeStyle = '#b39ddb';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-s, -s * 0.5, s * 2, s * 1.8);
      } else {
        ctx.fillStyle = '#e8dff5';
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#b39ddb';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2);
        ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#7cb342';
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.9);
        ctx.lineTo(-s * 0.2, -s * 1.25);
        ctx.lineTo(s * 0.2, -s * 1.25);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case 'patty': {
      ctx.fillStyle = form === 'cooked' ? '#6d4c41' : '#a06a42';
      roundRect(ctx, -s, -s * 0.55, s * 2, s * 1.1, s * 0.45);
      ctx.fill();
      if (form === 'cooked') {
        ctx.strokeStyle = '#4e342e';
        ctx.lineWidth = 2;
        for (let i = -1; i <= 1; i += 1) {
          ctx.beginPath();
          ctx.moveTo(i * s * 0.6 - s * 0.2, -s * 0.4);
          ctx.lineTo(i * s * 0.6 + s * 0.2, s * 0.4);
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = '#c98f5f';
        ctx.beginPath();
        ctx.arc(-s * 0.4, 0, s * 0.18, 0, Math.PI * 2);
        ctx.arc(s * 0.35, -s * 0.15, s * 0.15, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'pasta': {
      ctx.strokeStyle = form === 'cooked' ? '#e6b93d' : '#f5d76e';
      ctx.lineWidth = s * 0.28;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.arc(0, 0, s * (0.3 + i * 0.28), Math.PI * 0.2, Math.PI * 1.5);
        ctx.stroke();
      }
      break;
    }
    case 'broth': {
      ctx.fillStyle = '#8d6e63';
      roundRect(ctx, -s, -s * 0.5, s * 2, s * 1.1, s * 0.3);
      ctx.fill();
      ctx.fillStyle = form === 'hot' ? '#ff8f2b' : '#e8933c';
      ellipse(ctx, 0, -s * 0.35, s * 0.85, s * 0.3);
      ctx.fill();
      if (form === 'hot') {
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-s * 0.3, -s * 0.7);
        ctx.quadraticCurveTo(-s * 0.5, -s * 1.1, -s * 0.3, -s * 1.4);
        ctx.moveTo(s * 0.3, -s * 0.7);
        ctx.quadraticCurveTo(s * 0.5, -s * 1.1, s * 0.3, -s * 1.4);
        ctx.stroke();
      }
      break;
    }
    case 'bun': {
      ctx.fillStyle = '#e8a94e';
      ctx.beginPath();
      ctx.arc(0, s * 0.25, s, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(-s, s * 0.25, s * 2, s * 0.35);
      ctx.fillStyle = '#fff3e0';
      ctx.beginPath();
      ctx.arc(-s * 0.45, -s * 0.35, s * 0.09, 0, Math.PI * 2);
      ctx.arc(0, -s * 0.55, s * 0.09, 0, Math.PI * 2);
      ctx.arc(s * 0.45, -s * 0.35, s * 0.09, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'cheese': {
      ctx.fillStyle = '#f7c948';
      ctx.beginPath();
      ctx.moveTo(-s, s * 0.6);
      ctx.lineTo(s, s * 0.6);
      ctx.lineTo(0, -s * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#e0a92e';
      ctx.beginPath();
      ctx.arc(-s * 0.2, s * 0.2, s * 0.14, 0, Math.PI * 2);
      ctx.arc(s * 0.25, -s * 0.1, s * 0.11, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    default: {
      ctx.fillStyle = '#cccccc';
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawPlate(ctx, x, y, size, items) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#eceff1';
  ellipse(ctx, 0, 0, size, size * 0.42);
  ctx.fill();
  ctx.strokeStyle = '#b0bec5';
  ctx.lineWidth = 2;
  ellipse(ctx, 0, 0, size * 0.78, size * 0.32);
  ctx.stroke();
  items.forEach((id, index) => {
    const angle = (index / Math.max(items.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const offset = items.length > 1 ? size * 0.34 : 0;
    drawIngredient(ctx, id, Math.cos(angle) * offset, Math.sin(angle) * offset * 0.4, size * 0.62);
  });
  ctx.restore();
}

// ------------------------------------------------------------------- kitchen
function drawFloor(ctx) {
  const tile = 64;
  for (let y = HUD_HEIGHT; y < VIEW.height; y += tile) {
    for (let x = BOARD.width; x < VIEW.width; x += tile) {
      const even = ((x - BOARD.width) / tile + (y - HUD_HEIGHT) / tile) % 2 === 0;
      ctx.fillStyle = even ? '#e9c795' : '#dfb57e';
      ctx.fillRect(x, y, tile, tile);
    }
  }
  ctx.strokeStyle = 'rgba(120, 72, 20, 0.12)';
  ctx.lineWidth = 1;
  for (let x = BOARD.width; x <= VIEW.width; x += tile) {
    ctx.beginPath();
    ctx.moveTo(x, HUD_HEIGHT);
    ctx.lineTo(x, VIEW.height);
    ctx.stroke();
  }
  for (let y = HUD_HEIGHT; y <= VIEW.height; y += tile) {
    ctx.beginPath();
    ctx.moveTo(BOARD.width, y);
    ctx.lineTo(VIEW.width, y);
    ctx.stroke();
  }
}

function stationLabel(ctx, text, x, y) {
  ctx.fillStyle = '#5d4037';
  ctx.font = `bold 11px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(text.toUpperCase(), x, y);
}

function drawPantry(ctx, world) {
  const pantry = STATIONS.pantry;
  ctx.fillStyle = '#8d5a2b';
  roundRect(ctx, pantry.x - 6, pantry.y - 6, pantry.width + 12, pantry.height + 12, 10);
  ctx.fill();
  ctx.fillStyle = '#a9713f';
  roundRect(ctx, pantry.x, pantry.y, pantry.width, pantry.height, 8);
  ctx.fill();
  const binWidth = pantry.width / pantry.bins.length;
  pantry.bins.forEach((id, index) => {
    const bx = pantry.x + index * binWidth;
    ctx.fillStyle = '#6d4423';
    roundRect(ctx, bx + 3, pantry.y + 6, binWidth - 6, pantry.height - 12, 6);
    ctx.fill();
    ctx.fillStyle = '#fff8e7';
    roundRect(ctx, bx + 5, pantry.y + 8, binWidth - 10, pantry.height - 16, 5);
    ctx.fill();
    drawIngredient(ctx, id, bx + binWidth / 2, pantry.y + 34, 30);
    ctx.fillStyle = '#5d4037';
    ctx.font = `10px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(INGREDIENTS[id].name, bx + binWidth / 2, pantry.y + pantry.height - 10);
  });
  stationLabel(ctx, 'Pantry — press E to take', pantry.x + pantry.width / 2, pantry.y + pantry.height + 16);
}

function drawBoard(ctx, world) {
  const board = STATIONS.board;
  ctx.fillStyle = '#8d5a2b';
  roundRect(ctx, board.x - 6, board.y - 6, board.width + 12, board.height + 12, 10);
  ctx.fill();
  ctx.fillStyle = '#f0d3a0';
  roundRect(ctx, board.x, board.y, board.width, board.height, 8);
  ctx.fill();
  ctx.strokeStyle = '#b08954';
  ctx.lineWidth = 2;
  roundRect(ctx, board.x + 8, board.y + 8, board.width - 16, board.height - 16, 6);
  ctx.stroke();
  if (world.board.id) {
    drawIngredient(ctx, world.board.id, board.x + board.width / 2 - 18, board.y + board.height / 2, 34);
    // progress ring around the chopping
    ctx.strokeStyle = '#46a758';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(board.x + board.width / 2 - 18, board.y + board.height / 2, 26,
      -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * world.board.progress);
    ctx.stroke();
    if (world.board.progress >= 1) {
      ctx.fillStyle = '#2e7d32';
      ctx.font = `bold 12px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('READY!', board.x + board.width / 2, board.y + board.height - 8);
    }
  } else {
    ctx.fillStyle = '#90a4ae';
    ctx.save();
    ctx.translate(board.x + board.width / 2, board.y + board.height / 2);
    ctx.rotate(-0.5);
    roundRect(ctx, -26, -5, 52, 9, 4);
    ctx.fill();
    ctx.restore();
  }
  stationLabel(ctx, 'Chop — hold E', board.x + board.width / 2, board.y + board.height + 16);
}

function drawStove(ctx, world) {
  const stove = STATIONS.stove;
  ctx.fillStyle = '#546e7a';
  roundRect(ctx, stove.x - 6, stove.y - 6, stove.width + 12, stove.height + 12, 10);
  ctx.fill();
  ctx.fillStyle = '#78909c';
  roundRect(ctx, stove.x, stove.y, stove.width, stove.height, 8);
  ctx.fill();
  stove.burners.forEach((burnerPos, index) => {
    const burner = world.burners[index];
    ctx.fillStyle = '#37474f';
    ctx.beginPath();
    ctx.arc(burnerPos.x, burnerPos.y, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#263238';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(burnerPos.x, burnerPos.y, 22, 0, Math.PI * 2);
    ctx.stroke();
    if (burner.item) {
      if (burner.item.state === 'cooking') {
        ctx.fillStyle = '#ff7043';
        ctx.globalAlpha = 0.5 + 0.3 * Math.sin(Date.now() / 90);
        ctx.beginPath();
        ctx.arc(burnerPos.x, burnerPos.y, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      drawIngredient(ctx, burner.item.id, burnerPos.x, burnerPos.y - 4, 34);
      if (burner.item.state === 'done') {
        ctx.fillStyle = '#2e7d32';
        ctx.font = `bold 13px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('DONE', burnerPos.x, burnerPos.y - 30);
      } else if (burner.item.state === 'burnt') {
        ctx.fillStyle = '#c62828';
        ctx.font = `bold 13px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('BURNT!', burnerPos.x, burnerPos.y - 30);
      } else {
        const ingredient = INGREDIENTS[burner.item.id];
        const share = Math.min(burner.item.t / ingredient.cookSeconds, 1);
        ctx.fillStyle = '#eceff1';
        roundRect(ctx, burnerPos.x - 24, burnerPos.y + 20, 48, 7, 3);
        ctx.fill();
        ctx.fillStyle = '#ff7043';
        roundRect(ctx, burnerPos.x - 24, burnerPos.y + 20, 48 * share, 7, 3);
        ctx.fill();
      }
    }
  });
  stationLabel(ctx, 'Stove — E to cook / take', stove.x + stove.width / 2, stove.y + stove.height + 16);
}

function drawWindow(ctx, world) {
  const win = STATIONS.window;
  ctx.fillStyle = '#6d4423';
  roundRect(ctx, win.x - 6, win.y - 6, win.width + 12, win.height + 12, 10);
  ctx.fill();
  ctx.fillStyle = '#fff3d6';
  roundRect(ctx, win.x, win.y, win.width, win.height, 8);
  ctx.fill();
  ctx.fillStyle = '#ffb300';
  ctx.font = `bold 20px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('SERVE', win.x + win.width / 2, win.y + 34);
  ctx.fillStyle = '#5d4037';
  ctx.font = `12px ${FONT}`;
  ctx.fillText('Ring the bell — bring a finished plate', win.x + win.width / 2, win.y + 56);
  // the bell
  ctx.fillStyle = '#ffd54f';
  ctx.beginPath();
  ctx.arc(win.x + win.width - 34, win.y + 30, 12, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(win.x + win.width - 40, win.y + 30, 12, 4);
}

function drawIsland(ctx, world) {
  const island = STATIONS.island;
  ctx.fillStyle = '#8d5a2b';
  roundRect(ctx, island.x - 6, island.y - 6, island.width + 12, island.height + 12, 12);
  ctx.fill();
  ctx.fillStyle = '#f5f5f5';
  roundRect(ctx, island.x, island.y, island.width, island.height, 10);
  ctx.fill();
  ctx.strokeStyle = '#b0bec5';
  ctx.lineWidth = 2;
  roundRect(ctx, island.x + 6, island.y + 6, island.width - 12, island.height - 12, 8);
  ctx.stroke();
  if (world.islandPlate) {
    drawPlate(ctx, island.x + island.width / 2, island.y + island.height / 2 + 6, 52, world.islandPlate.items);
    ctx.fillStyle = '#5d4037';
    ctx.font = `bold 12px ${FONT}`;
    ctx.textAlign = 'center';
    const done = world.orders.some((order) => {
      const a = [...order.recipe.components].sort();
      const b = [...world.islandPlate.items].sort();
      return a.length === b.length && a.every((v, i) => v === b[i]);
    });
    ctx.fillText(done ? 'READY TO SERVE!' : 'Plating…', island.x + island.width / 2, island.y + island.height - 8);
  } else {
    // a stack of clean plates waiting, with the hint clear of it
    drawPlate(ctx, island.x + 52, island.y + island.height / 2 + 4, 26, []);
    ctx.fillStyle = '#90a4ae';
    ctx.font = `13px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText('Plating counter — E to set a plate down', island.x + 96, island.y + island.height / 2 + 4);
  }
  stationLabel(ctx, 'Plating Counter', island.x + island.width / 2, island.y + island.height + 16);
}

function drawTrash(ctx) {
  const trash = STATIONS.trash;
  ctx.fillStyle = '#78909c';
  roundRect(ctx, trash.x, trash.y, trash.width, trash.height, 10);
  ctx.fill();
  ctx.fillStyle = '#546e7a';
  roundRect(ctx, trash.x + 6, trash.y - 8, trash.width - 12, 12, 5);
  ctx.fill();
  ctx.fillStyle = '#eceff1';
  ctx.font = `bold 12px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('TRASH', trash.x + trash.width / 2, trash.y + trash.height / 2 + 4);
}

// -------------------------------------------------------------------- chef
function drawChef(ctx, world) {
  const chef = world.chef;
  const bob = chef.moving ? Math.sin(chef.walkPhase) * 2 : 0;
  ctx.save();
  ctx.translate(chef.x, chef.y + bob);
  // shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ellipse(ctx, 0, 20 - bob, 20, 7);
  ctx.fill();
  // body / apron
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, -16, -6, 32, 28, 10);
  ctx.fill();
  ctx.fillStyle = '#e53935';
  roundRect(ctx, -16, 12, 32, 10, 5);
  ctx.fill();
  // head
  ctx.fillStyle = '#ffcc9e';
  ctx.beginPath();
  ctx.arc(0, -16, 13, 0, Math.PI * 2);
  ctx.fill();
  // chef hat
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-8, -26, 8, 0, Math.PI * 2);
  ctx.arc(0, -30, 9, 0, Math.PI * 2);
  ctx.arc(8, -26, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-11, -28, 22, 6);
  // face: eyes look the way the chef walks
  const lookX = chef.dir === 'left' ? -3 : chef.dir === 'right' ? 3 : 0;
  ctx.fillStyle = '#3e2723';
  ctx.beginPath();
  ctx.arc(-4 + lookX, -17, 1.8, 0, Math.PI * 2);
  ctx.arc(4 + lookX, -17, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3e2723';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(lookX, -12, 4, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  // held item floats above the hands
  if (chef.holding) {
    const heldY = -52 + Math.sin(Date.now() / 300) * 2;
    if (chef.holding.kind === 'plate') {
      drawPlate(ctx, 0, heldY, 30, chef.holding.items);
    } else {
      drawIngredient(ctx, chef.holding.id, 0, heldY, 30);
    }
  }
  ctx.restore();
}

// -------------------------------------------------------------- order board
function drawTicket(ctx, order, x, y, width, height) {
  const share = Math.max(order.patience / order.maxPatience, 0);
  const urgent = share < 0.35;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((order.id % 3 - 1) * 0.012);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  roundRect(ctx, 3, 4, width, height, 8);
  ctx.fill();
  ctx.fillStyle = urgent ? '#ffebee' : '#fff8e7';
  roundRect(ctx, 0, 0, width, height, 8);
  ctx.fill();
  ctx.strokeStyle = urgent ? '#c62828' : '#d7ccc8';
  ctx.lineWidth = urgent ? 2.5 : 1.5;
  roundRect(ctx, 1, 1, width - 2, height - 2, 8);
  ctx.stroke();
  // pin
  ctx.fillStyle = '#c62828';
  ctx.beginPath();
  ctx.arc(width / 2, 8, 4, 0, Math.PI * 2);
  ctx.fill();
  // dish name
  ctx.fillStyle = '#3e2723';
  ctx.font = `bold 16px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(order.recipe.name, 12, 27);
  ctx.fillStyle = '#8d6e63';
  ctx.font = `italic 10px ${FONT}`;
  ctx.fillText(order.recipe.blurb, 12, 41);
  // components as icons (the pictures say what the dish needs)
  order.recipe.components.forEach((component, index) => {
    const cx = 26 + index * 40;
    drawIngredient(ctx, component, cx, 62, 26);
  });
  // price + seconds on their own row, clear of the icons
  ctx.fillStyle = '#3e2723';
  ctx.font = `bold 13px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(`$${order.recipe.price}`, 12, 86);
  ctx.textAlign = 'right';
  ctx.fillStyle = urgent ? '#c62828' : '#5d4037';
  ctx.fillText(`${Math.ceil(order.patience)}s`, width - 12, 86);
  // patience bar along the bottom edge
  ctx.fillStyle = '#e0e0e0';
  roundRect(ctx, 12, height - 14, width - 24, 8, 4);
  ctx.fill();
  ctx.fillStyle = share > 0.5 ? '#66bb6a' : share > 0.25 ? '#ffa726' : '#e53935';
  roundRect(ctx, 12, height - 14, (width - 24) * share, 8, 4);
  ctx.fill();
  ctx.restore();
}

function drawOrderBoard(ctx, world) {
  ctx.fillStyle = '#8d6e63';
  ctx.fillRect(BOARD.x, BOARD.y, BOARD.width, BOARD.height);
  ctx.fillStyle = '#a1887f';
  for (let y = BOARD.y; y < BOARD.height + BOARD.y; y += 26) {
    ctx.fillRect(BOARD.x, y, BOARD.width, 2);
  }
  ctx.fillStyle = '#fff3e0';
  ctx.font = `bold 18px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('ORDER BOARD', BOARD.width / 2, BOARD.y + 30);
  ctx.fillStyle = '#d7ccc8';
  ctx.font = `12px ${FONT}`;
  ctx.fillText(`${world.orders.length} ticket${world.orders.length === 1 ? '' : 's'} waiting`, BOARD.width / 2, BOARD.y + 50);
  world.orders.forEach((order, index) => {
    // A fresh ticket slides in from the left over a third of a second.
    const age = world.dayTime - (order.spawnedAt ?? 0);
    const slide = age < 0.35 ? -260 * (1 - age / 0.35) * (1 - age / 0.35) : 0;
    drawTicket(ctx, order, 14 + slide, BOARD.y + 62 + index * 116, BOARD.width - 28, 108);
  });
  if (world.orders.length === 0) {
    ctx.fillStyle = '#fff3e0';
    ctx.font = `italic 14px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('No orders yet —', BOARD.width / 2, BOARD.y + 120);
    ctx.fillText('the lunch rush is coming!', BOARD.width / 2, BOARD.y + 142);
  }
}

// ---------------------------------------------------------------------- HUD
function drawHUD(ctx, world, muted) {
  ctx.fillStyle = '#2b2118';
  ctx.fillRect(0, 0, VIEW.width, HUD_HEIGHT);
  ctx.fillStyle = '#ffd166';
  ctx.font = `bold 22px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('SIZZLE & SERVE', 16, 36);
  ctx.fillStyle = '#fff3e0';
  ctx.font = `bold 16px ${FONT}`;
  ctx.fillText(`Day ${world.day}`, 250, 35);
  // day clock
  const timeLeft = Math.max(DAY_LENGTH_SECONDS - world.dayTime, 0);
  const minutes = Math.floor(timeLeft / 60);
  const seconds = Math.floor(timeLeft % 60);
  ctx.fillStyle = '#fff3e0';
  ctx.font = `bold 18px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(`${minutes}:${String(seconds).padStart(2, '0')}`, 420, 35);
  ctx.fillStyle = '#4e342e';
  roundRect(ctx, 360, 44, 120, 6, 3);
  ctx.fill();
  ctx.fillStyle = timeLeft < 30 ? '#e53935' : '#ffd166';
  roundRect(ctx, 360, 44, 120 * (timeLeft / DAY_LENGTH_SECONDS), 6, 3);
  ctx.fill();
  // coins and score
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd166';
  ctx.font = `bold 18px ${FONT}`;
  ctx.fillText(`Coins ${world.coins}`, 520, 35);
  ctx.fillStyle = '#fff3e0';
  ctx.fillText(`Score ${world.score}`, 660, 35);
  // combo
  if (world.combo >= 2) {
    ctx.fillStyle = '#ff7043';
    ctx.font = `bold 18px ${FONT}`;
    ctx.fillText(`COMBO x${world.combo}`, 830, 35);
  }
  // the rush reads in a glance: while a ticket is nearly out, the day clock
  // pulses red. (A full board alone is not an emergency.)
  const rushing = world.orders.some((order) => order.patience < 10);
  if (rushing) {
    const pulse = 0.55 + 0.45 * Math.sin(Date.now() / 180);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = '#e53935';
    ctx.lineWidth = 3;
    roundRect(ctx, 348, 8, 144, 42, 8);
    ctx.stroke();
    ctx.fillStyle = '#ff8a80';
    ctx.font = `bold 18px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(`${minutes}:${String(seconds).padStart(2, '0')}`, 420, 35);
    ctx.restore();
    ctx.textAlign = 'left';
  }
  // hearts
  for (let i = 0; i < MAX_HEARTS; i += 1) {
    const hx = 1010 + i * 30;
    ctx.fillStyle = i < world.hearts ? '#e53935' : '#4e342e';
    ctx.beginPath();
    ctx.arc(hx - 5, 28, 7, 0, Math.PI * 2);
    ctx.arc(hx + 5, 28, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(hx - 11, 30);
    ctx.lineTo(hx, 44);
    ctx.lineTo(hx + 11, 30);
    ctx.closePath();
    ctx.fill();
  }
  // mute + help hints
  ctx.fillStyle = '#bcaaa4';
  ctx.font = `13px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText(muted ? 'M: sound off' : 'M: sound on', 1240, 24);
  ctx.fillText('H: help   P: pause', 1240, 42);
}

// -------------------------------------------------------------- overlays
function dimScreen(ctx) {
  ctx.fillStyle = 'rgba(43, 33, 24, 0.72)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

function panel(ctx, x, y, width, height) {
  ctx.fillStyle = '#fff8e7';
  roundRect(ctx, x, y, width, height, 16);
  ctx.fill();
  ctx.strokeStyle = '#d7ccc8';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, width, height, 16);
  ctx.stroke();
}

function drawTitleScreen(ctx, world) {
  dimScreen(ctx);
  panel(ctx, 290, 110, 700, 470);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e53935';
  ctx.font = `bold 54px ${FONT}`;
  ctx.fillText('SIZZLE & SERVE', 640, 190);
  ctx.fillStyle = '#5d4037';
  ctx.font = `italic 22px ${FONT}`;
  ctx.fillText('Tiny Bistro Rush — a one-chef kitchen chaos', 640, 226);
  ctx.fillStyle = '#3e2723';
  ctx.font = `16px ${FONT}`;
  const lines = [
    'Orders land on the board — cook every dish before its patience runs out.',
    'Grab ingredients from the pantry, chop them on the board,',
    'cook patties, pasta and broth on the stove, plate it up',
    'on the counter and ring the bell at the serving window.',
    '',
    'Move: WASD / arrows or click   •   Use a station: E or click it',
    'Hold E at the board to chop   •   M: sound   •   P: pause   •   H: help',
    '',
    'Serve fast for tips. Three walked-out orders ends the day in tears.',
  ];
  lines.forEach((line, index) => {
    ctx.fillText(line, 640, 268 + index * 26);
  });
  ctx.fillStyle = '#2e7d32';
  ctx.font = `bold 24px ${FONT}`;
  ctx.fillText('Press ENTER to start cooking', 640, 540);
}

function drawDayEndScreen(ctx, world) {
  dimScreen(ctx);
  panel(ctx, 390, 150, 500, 380);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#2e7d32';
  ctx.font = `bold 40px ${FONT}`;
  ctx.fillText(`Day ${world.day} complete!`, 640, 220);
  ctx.fillStyle = '#3e2723';
  ctx.font = `18px ${FONT}`;
  const lines = [
    `Dishes served: ${world.served}`,
    `Orders walked out: ${world.missed}`,
    `Coins earned today: ${world.earnedToday}`,
    `Best combo: x${world.bestCombo}`,
    `Total score: ${world.score}`,
    '',
    world.day === 1 ? 'Day 2 unlocks the Cheeseburger and Tomato Pasta!' : 'Day 3 unlocks the Hearty Soup!',
  ];
  lines.forEach((line, index) => {
    ctx.fillText(line, 640, 268 + index * 30);
  });
  ctx.fillStyle = '#2e7d32';
  ctx.font = `bold 22px ${FONT}`;
  ctx.fillText('Press ENTER for the next day', 640, 490);
}

function drawGameOverScreen(ctx, world) {
  dimScreen(ctx);
  panel(ctx, 390, 150, 500, 380);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#c62828';
  ctx.font = `bold 40px ${FONT}`;
  ctx.fillText('Kitchen closed!', 640, 220);
  ctx.fillStyle = '#3e2723';
  ctx.font = `18px ${FONT}`;
  const lines = [
    'Three orders walked out — the critics were not kind.',
    '',
    `Dishes served: ${world.served}`,
    `Coins earned: ${world.coins}`,
    `Best combo: x${world.bestCombo}`,
    `Final score: ${world.score}`,
  ];
  lines.forEach((line, index) => {
    ctx.fillText(line, 640, 268 + index * 30);
  });
  ctx.fillStyle = '#c62828';
  ctx.font = `bold 22px ${FONT}`;
  ctx.fillText('Press ENTER to cook again', 640, 480);
}

function drawPausedScreen(ctx) {
  dimScreen(ctx);
  ctx.fillStyle = '#fff8e7';
  ctx.font = `bold 44px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('Paused', 640, 340);
  ctx.font = `18px ${FONT}`;
  ctx.fillText('Press P to keep cooking', 640, 380);
}

function drawHelpScreen(ctx) {
  dimScreen(ctx);
  panel(ctx, 330, 120, 620, 440);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#3e2723';
  ctx.font = `bold 28px ${FONT}`;
  ctx.fillText('How to play', 640, 170);
  ctx.font = `16px ${FONT}`;
  ctx.textAlign = 'left';
  const lines = [
    '1. Read the order board (left). Each ticket lists a dish.',
    '2. Pantry (top left): press E near a bin to take an ingredient.',
    '3. Chopping board: put a veggie down with E, then hold E to chop.',
    '4. Stove: put patties, pasta or broth on a burner with E.',
    '   Take it off when DONE — left too long it burns!',
    '5. Plating counter: set a plate down with E, then add',
    '   ingredients to it with E while holding them.',
    '6. Serving window: bring the finished plate and press E.',
    '   The plate must match a ticket exactly.',
    '7. Trash (bottom left) throws away whatever you hold.',
    '',
    'Tips: serve with patience left for a tip, chain serves',
    'for a combo bonus, and never leave the stove alone.',
  ];
  lines.forEach((line, index) => {
    ctx.fillText(line, 380, 210 + index * 26);
  });
  ctx.textAlign = 'center';
  ctx.font = `bold 18px ${FONT}`;
  ctx.fillStyle = '#2e7d32';
  ctx.fillText('Press H or Esc to close', 640, 520);
}

function drawParticles(ctx, world) {
  world.particles.forEach((particle) => {
    const share = 1 - particle.life / particle.maxLife;
    ctx.globalAlpha = Math.max(share, 0);
    ctx.fillStyle = particle.color;
    if (particle.kind === 'steam') {
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * (1 + particle.life), 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
    }
  });
  ctx.globalAlpha = 1;
}

function drawFloaters(ctx, world) {
  world.floaters.forEach((floater) => {
    const share = 1 - floater.life / floater.maxLife;
    ctx.globalAlpha = Math.max(share, 0);
    ctx.fillStyle = floater.color;
    ctx.font = `bold 22px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 3;
    ctx.strokeText(floater.text, floater.x, floater.y);
    ctx.fillText(floater.text, floater.x, floater.y);
  });
  ctx.globalAlpha = 1;
}

function drawToast(ctx, world) {
  if (!world.toast) return;
  ctx.save();
  ctx.globalAlpha = Math.min(world.toast.t, 1);
  ctx.fillStyle = '#3e2723';
  ctx.font = `bold 18px ${FONT}`;
  ctx.textAlign = 'center';
  const width = ctx.measureText(world.toast.text).width + 36;
  roundRect(ctx, 640 - width / 2, VIEW.height - 56, width, 36, 18);
  ctx.fill();
  ctx.fillStyle = '#fff8e7';
  ctx.fillText(world.toast.text, 640, VIEW.height - 32);
  ctx.restore();
}

function drawInteractHint(ctx, world, target) {
  if (!target) return;
  const labels = {
    pantry: `E — take ${INGREDIENTS[target.bin].name}`,
    board: world.board.id ? (world.board.progress >= 1 ? 'E — take it off the board' : 'Hold E — chop!') : 'E — put a veggie on the board',
    stove: 'E — cook / take',
    window: 'E — serve the plate',
    island: 'E — plate / add / take',
    trash: 'E — throw it away',
  };
  const label = labels[target.station] || 'E — use';
  ctx.font = `bold 14px ${FONT}`;
  const width = ctx.measureText(label).width + 24;
  ctx.fillStyle = 'rgba(43, 33, 24, 0.85)';
  roundRect(ctx, target.x - width / 2, target.y - 64, width, 28, 14);
  ctx.fill();
  ctx.fillStyle = '#ffd166';
  ctx.textAlign = 'center';
  ctx.fillText(label, target.x, target.y - 45);
}

// The whole frame: kitchen, then HUD, then any overlay on top.
export function render(ctx, world, ui) {
  ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  drawFloor(ctx);
  drawOrderBoard(ctx, world);
  drawPantry(ctx, world);
  drawBoard(ctx, world);
  drawStove(ctx, world);
  drawWindow(ctx, world);
  drawIsland(ctx, world);
  drawTrash(ctx);
  drawChef(ctx, world);
  drawParticles(ctx, world);
  drawFloaters(ctx, world);
  drawHUD(ctx, world, ui.muted);
  if (ui.phase === 'play') drawInteractHint(ctx, world, ui.nearest);
  drawToast(ctx, world);
  if (ui.phase === 'title') drawTitleScreen(ctx, world);
  if (ui.phase === 'dayend') drawDayEndScreen(ctx, world);
  if (ui.phase === 'gameover') drawGameOverScreen(ctx, world);
  if (ui.phase === 'paused') drawPausedScreen(ctx);
  if (ui.showHelp) drawHelpScreen(ctx);
}
