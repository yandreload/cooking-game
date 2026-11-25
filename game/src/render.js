// Simmer & Serve — everything the eye sees, drawn on one canvas with plain
// 2D shapes. No images, no fonts from the network: the kitchen, the chef,
// the food and every screen are painted here from the world state.

import { COLOURS, DAY_TARGETS, HUD_HEIGHT, INGREDIENTS, RECIPES, STATIONS, VIEW } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_DAY_CLEAR = 'day-clear';
export const SCREEN_FAILED = 'failed';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function circle(ctx, x, y, radius) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.closePath();
}

// One cute food icon, centred at (x, y), about `size` wide. Every ingredient
// the game knows has its own little drawing, so tickets and plates read fast.
export function drawIngredientIcon(ctx, id, x, y, size) {
  const s = size / 2;
  ctx.save();
  ctx.translate(x, y);
  if (id === 'tomato') {
    ctx.fillStyle = INGREDIENTS.tomato.colour;
    circle(ctx, 0, 1, s);
    ctx.fill();
    ctx.fillStyle = INGREDIENTS.tomato.dark;
    circle(ctx, -s * 0.35, -s * 0.2, s * 0.22);
    ctx.fill();
    ctx.fillStyle = '#2f7d3d';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.7);
    ctx.lineTo(-s * 0.45, -s * 1.05);
    ctx.lineTo(0, -s * 0.85);
    ctx.lineTo(s * 0.45, -s * 1.05);
    ctx.closePath();
    ctx.fill();
  } else if (id === 'chopped-tomato') {
    ctx.fillStyle = INGREDIENTS.tomato.colour;
    roundRect(ctx, -s, -s * 0.55, s * 2, s * 1.1, s * 0.3);
    ctx.fill();
    ctx.strokeStyle = '#ffb3b5';
    ctx.lineWidth = Math.max(1, s * 0.12);
    ctx.beginPath();
    ctx.moveTo(-s * 0.3, -s * 0.5);
    ctx.lineTo(-s * 0.3, s * 0.5);
    ctx.moveTo(s * 0.35, -s * 0.5);
    ctx.lineTo(s * 0.35, s * 0.5);
    ctx.stroke();
  } else if (id === 'lettuce') {
    ctx.fillStyle = INGREDIENTS.lettuce.colour;
    for (let i = -1; i <= 1; i += 1) {
      circle(ctx, i * s * 0.55, (i % 2 === 0 ? -s * 0.15 : s * 0.15), s * 0.62);
      ctx.fill();
    }
    ctx.fillStyle = INGREDIENTS.lettuce.dark;
    circle(ctx, -s * 0.3, s * 0.1, s * 0.2);
    ctx.fill();
  } else if (id === 'chopped-lettuce') {
    ctx.fillStyle = INGREDIENTS.lettuce.colour;
    for (let i = -1; i <= 1; i += 1) {
      roundRect(ctx, -s * 0.9, i * s * 0.5 - s * 0.22, s * 1.8, s * 0.42, s * 0.2);
      ctx.fill();
    }
    ctx.strokeStyle = INGREDIENTS.lettuce.dark;
    ctx.lineWidth = Math.max(1, s * 0.1);
    ctx.beginPath();
    ctx.moveTo(-s * 0.6, -s * 0.3);
    ctx.lineTo(s * 0.6, -s * 0.3);
    ctx.stroke();
  } else if (id === 'cheese') {
    ctx.fillStyle = INGREDIENTS.cheese.colour;
    ctx.beginPath();
    ctx.moveTo(-s, s * 0.6);
    ctx.lineTo(s, s * 0.6);
    ctx.lineTo(0, -s * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = INGREDIENTS.cheese.dark;
    circle(ctx, -s * 0.25, s * 0.2, s * 0.16);
    ctx.fill();
    circle(ctx, s * 0.3, -s * 0.1, s * 0.13);
    ctx.fill();
  } else if (id === 'patty' || id === 'cooked-patty' || id === 'burnt-patty') {
    ctx.fillStyle = id === 'burnt-patty' ? '#26211c' : id === 'cooked-patty' ? '#6b4426' : INGREDIENTS.patty.colour;
    ctx.beginPath();
    ctx.ellipse(0, 0, s, s * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    if (id !== 'burnt-patty') {
      ctx.strokeStyle = id === 'cooked-patty' ? '#3f2712' : INGREDIENTS.patty.dark;
      ctx.lineWidth = Math.max(1, s * 0.14);
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, -s * 0.25);
      ctx.lineTo(s * 0.5, -s * 0.25);
      ctx.moveTo(-s * 0.5, s * 0.15);
      ctx.lineTo(s * 0.5, s * 0.15);
      ctx.stroke();
    }
  } else if (id === 'bun') {
    ctx.fillStyle = INGREDIENTS.bun.colour;
    ctx.beginPath();
    ctx.arc(0, s * 0.4, s * 0.95, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff3d6';
    circle(ctx, -s * 0.4, -s * 0.25, s * 0.12);
    ctx.fill();
    circle(ctx, s * 0.1, -s * 0.45, s * 0.12);
    ctx.fill();
    circle(ctx, s * 0.45, -s * 0.1, s * 0.12);
    ctx.fill();
  }
  ctx.restore();
}

function drawPlate(ctx, x, y, radius, items) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(0, 0, radius, radius * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d8cfc0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 0.72, radius * 0.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  // The dish builds up in a little stack on the plate.
  items.forEach((item, index) => {
    const offsetY = -items.length * 3 + index * 7;
    drawIngredientIcon(ctx, item, 0, offsetY, Math.min(34, radius * 0.9));
  });
  ctx.restore();
}

function drawProgressRing(ctx, x, y, radius, progress, colour) {
  ctx.save();
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = colour;
  ctx.beginPath();
  ctx.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
  ctx.stroke();
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function drawFloor(now) {
    ctx.fillStyle = COLOURS.floorA;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.fillStyle = COLOURS.floorB;
    const tile = 64;
    for (let ty = 0; ty < VIEW.height / tile; ty += 1) {
      for (let tx = 0; tx < VIEW.width / tile; tx += 1) {
        if ((tx + ty) % 2 === 0) ctx.fillRect(tx * tile, ty * tile, tile, tile);
      }
    }
    // A rug under the middle of the kitchen, so the play space reads as one room.
    ctx.fillStyle = 'rgba(201,111,74,0.16)';
    roundRect(ctx, 220, 200, 840, 560, 18);
    ctx.fill();
    void now;
  }

  function drawTopWall(state) {
    ctx.fillStyle = COLOURS.wall;
    ctx.fillRect(0, 0, VIEW.width, 76);
    ctx.fillStyle = COLOURS.wallTop;
    ctx.fillRect(0, 70, VIEW.width, 6);
    // A wall clock that shows the shift running down.
    const clockX = 820;
    const clockY = 40;
    ctx.fillStyle = '#fff6dd';
    circle(ctx, clockX, clockY, 24);
    ctx.fill();
    ctx.strokeStyle = '#3a2d20';
    ctx.lineWidth = 3;
    circle(ctx, clockX, clockY, 24);
    ctx.stroke();
    const fraction = state.timeLeft / 150;
    const angle = -Math.PI / 2 + (1 - fraction) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(clockX, clockY);
    ctx.lineTo(clockX + Math.cos(angle) * 17, clockY + Math.sin(angle) * 17);
    ctx.stroke();
    ctx.fillStyle = '#3a2d20';
    circle(ctx, clockX, clockY, 3);
    ctx.fill();
    // A menu poster on the wall.
    ctx.fillStyle = '#fff6dd';
    roundRect(ctx, 180, 12, 150, 52, 6);
    ctx.fill();
    ctx.fillStyle = '#3a2d20';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MENU HARI INI', 255, 33);
    ctx.font = '13px sans-serif';
    ctx.fillText('Salad • Burger • Deluxe', 255, 53);
  }

  function drawStation(state, station, now) {
    const { x, y, w, h } = station;
    ctx.fillStyle = COLOURS.counterSide;
    roundRect(ctx, x, y + 6, w, h, 10);
    ctx.fill();
    ctx.fillStyle = COLOURS.counterTop;
    roundRect(ctx, x, y, w, h - 6, 10);
    ctx.fill();
    ctx.strokeStyle = COLOURS.counterEdge;
    ctx.lineWidth = 2;
    roundRect(ctx, x + 2, y + 2, w - 4, h - 10, 8);
    ctx.stroke();
    ctx.fillStyle = '#fff6dd';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';

    if (station.kind === 'crate') {
      drawIngredientIcon(ctx, station.gives, x + w / 2, y + h / 2 - 6, 44);
      ctx.fillText(station.label, x + w / 2, y + h - 12);
    } else if (station.kind === 'stove') {
      ctx.fillText(station.label, x + w / 2, y + 16);
      state.burners.forEach((burner, index) => {
        const bx = x + 55 + index * 110;
        const by = y + 42;
        ctx.fillStyle = '#2b2118';
        circle(ctx, bx, by, 26);
        ctx.fill();
        if (burner.state === 'cooking' || burner.state === 'cooked' || burner.state === 'burnt') {
          const bob = burner.state === 'cooking' ? Math.sin(now * 6 + index) * 1.5 : 0;
          drawIngredientIcon(ctx, burner.state === 'cooked' ? 'cooked-patty' : burner.state === 'burnt' ? 'burnt-patty' : 'patty', bx, by + bob, 40);
          const colour = burner.state === 'burnt' ? COLOURS.bad : burner.state === 'cooked' ? COLOURS.good : COLOURS.warn;
          drawProgressRing(ctx, bx, by, 32, burner.progress, colour);
        }
      });
    } else if (station.kind === 'board') {
      ctx.fillText(station.label, x + w / 2, y + 16);
      ctx.fillStyle = '#e8c08a';
      roundRect(ctx, x + 20, y + 24, w - 40, h - 36, 6);
      ctx.fill();
      if (state.board.item) {
        const rawId = state.board.item.replace('chopped-', '');
        drawIngredientIcon(ctx, state.board.progress >= 1 ? state.board.item : rawId, x + w / 2, y + h / 2 + 8, 46);
        if (state.board.progress > 0 && state.board.progress < 1) {
          drawProgressRing(ctx, x + w / 2, y + h / 2 + 8, 34, state.board.progress, COLOURS.warn);
        }
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.font = '12px sans-serif';
        ctx.fillText('letakkan bahan di sini', x + w / 2, y + h / 2 + 10);
      }
    } else if (station.kind === 'plate') {
      ctx.fillText('PLATING', x + w / 2, y + 16);
      if (state.counterPlate) {
        drawPlate(ctx, x + w / 2, y + h / 2 + 12, 52, state.counterPlate.items);
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.font = '12px sans-serif';
        ctx.fillText('ambil piring, susun hidangan', x + w / 2, y + h / 2 + 10);
      }
    } else if (station.kind === 'serve') {
      ctx.fillStyle = '#fff6dd';
      roundRect(ctx, x + 10, y + 10, w - 20, h - 20, 8);
      ctx.fill();
      ctx.fillStyle = '#3a2d20';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('▲ SERVE ▲', x + w / 2, y + h / 2 + 5);
    } else if (station.kind === 'trash') {
      ctx.fillStyle = '#5d6b7a';
      roundRect(ctx, x + w / 2 - 26, y + 16, 52, h - 30, 8);
      ctx.fill();
      ctx.fillStyle = '#fff6dd';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(station.label, x + w / 2, y + h - 12);
    }
  }

  function drawChef(state, now) {
    const chef = state.chef;
    const bob = chef.moving ? Math.sin(now * 14) * 2 : Math.sin(now * 3) * 1;
    ctx.save();
    ctx.translate(chef.x, chef.y + bob * 0.4);
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 20, 22, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body and apron.
    ctx.fillStyle = COLOURS.chefShirt;
    roundRect(ctx, -17, -8, 34, 30, 12);
    ctx.fill();
    ctx.fillStyle = COLOURS.chefApron;
    roundRect(ctx, -12, 2, 24, 20, 8);
    ctx.fill();
    // Head and toque.
    ctx.fillStyle = COLOURS.chefSkin;
    circle(ctx, 0, -20, 13);
    ctx.fill();
    ctx.fillStyle = COLOURS.toque;
    roundRect(ctx, -14, -40, 28, 14, 7);
    ctx.fill();
    circle(ctx, -9, -38, 7);
    ctx.fill();
    circle(ctx, 0, -41, 8);
    ctx.fill();
    circle(ctx, 9, -38, 7);
    ctx.fill();
    // Eyes look where the chef faces.
    ctx.fillStyle = '#2b2118';
    circle(ctx, chef.facing.x * 3 - 4, -21 + chef.facing.y * 2, 1.8);
    ctx.fill();
    circle(ctx, chef.facing.x * 3 + 4, -21 + chef.facing.y * 2, 1.8);
    ctx.fill();
    // Whatever the chef carries rides above his head.
    if (chef.carrying) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      circle(ctx, 0, -58, 20);
      ctx.fill();
      ctx.strokeStyle = '#d8cfc0';
      ctx.lineWidth = 2;
      circle(ctx, 0, -58, 20);
      ctx.stroke();
      if (chef.carrying.type === 'plate') {
        drawPlate(ctx, 0, -58, 15, chef.carrying.items);
      } else {
        drawIngredientIcon(ctx, chef.carrying.id, 0, -58, 28);
      }
    }
    ctx.restore();
  }

  function drawParticles(state) {
    for (const p of state.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      if (p.kind === 'steam' || p.kind === 'smoke') {
        ctx.fillStyle = p.kind === 'smoke' ? `rgba(60,55,50,${alpha * 0.7})` : `rgba(255,255,255,${alpha * 0.8})`;
        circle(ctx, p.x, p.y, 5 + (1 - alpha) * 7);
        ctx.fill();
      } else if (p.kind === 'sparkle') {
        ctx.fillStyle = `rgba(246,196,83,${alpha})`;
        ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
      } else if (p.kind === 'chop') {
        ctx.fillStyle = `rgba(88,179,104,${alpha})`;
        circle(ctx, p.x, p.y, 3);
        ctx.fill();
      } else {
        ctx.fillStyle = `rgba(200,200,200,${alpha})`;
        circle(ctx, p.x, p.y, 4);
        ctx.fill();
      }
    }
  }

  function drawPopups(state) {
    ctx.textAlign = 'center';
    for (const p of state.popups) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      ctx.font = 'bold 20px sans-serif';
      ctx.fillStyle = p.colour;
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 4;
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawHud(state) {
    // Top bar.
    ctx.fillStyle = COLOURS.hud;
    ctx.fillRect(0, 0, VIEW.width, HUD_HEIGHT);
    ctx.fillStyle = COLOURS.hudPanel;
    ctx.fillRect(0, HUD_HEIGHT - 4, VIEW.width, 4);

    // Left: day, shift clock, coins.
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff6dd';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`DAY ${state.day}`, 18, 30);
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = COLOURS.gold;
    ctx.fillText(`◉ ${state.coins} coins`, 18, 56);
    const shiftFraction = state.timeLeft / 150;
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    roundRect(ctx, 130, 16, 130, 14, 7);
    ctx.fill();
    ctx.fillStyle = shiftFraction > 0.25 ? COLOURS.good : COLOURS.bad;
    roundRect(ctx, 130, 16, 130 * shiftFraction, 14, 7);
    ctx.fill();
    ctx.fillStyle = '#fff6dd';
    ctx.font = '13px sans-serif';
    ctx.fillText(`${Math.ceil(state.timeLeft)}s`, 130, 50);

    // Order tickets.
    const ticketW = 172;
    const ticketH = 60;
    const startX = 300;
    state.orders.forEach((order, index) => {
      const x = startX + index * (ticketW + 10);
      const y = 8;
      const recipe = RECIPES[order.dish];
      const urgency = order.patience / order.maxPatience;
      ctx.fillStyle = COLOURS.ticket;
      roundRect(ctx, x, y, ticketW, ticketH, 8);
      ctx.fill();
      if (urgency <= 0.25) {
        ctx.strokeStyle = COLOURS.bad;
        ctx.lineWidth = 3;
        roundRect(ctx, x, y, ticketW, ticketH, 8);
        ctx.stroke();
      }
      ctx.fillStyle = COLOURS.ticketInk;
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(recipe.name, x + 10, y + 18);
      recipe.items.forEach((item, itemIndex) => {
        drawIngredientIcon(ctx, item, x + 20 + itemIndex * 26, y + 36, 20);
      });
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      roundRect(ctx, x + 10, y + ticketH - 10, ticketW - 20, 5, 2);
      ctx.fill();
      ctx.fillStyle = urgency > 0.5 ? COLOURS.good : urgency > 0.25 ? COLOURS.warn : COLOURS.bad;
      roundRect(ctx, x + 10, y + ticketH - 10, (ticketW - 20) * urgency, 5, 2);
      ctx.fill();
    });
    if (state.orders.length === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = 'italic 14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('No orders yet — get ready!', startX + 10, 42);
    }

    // Right: combo and hearts.
    ctx.textAlign = 'right';
    if (state.combo >= 2) {
      ctx.fillStyle = COLOURS.gold;
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(`COMBO x${state.combo}`, 1252, 30);
    }
    ctx.font = '20px sans-serif';
    let hearts = '';
    for (let i = 0; i < 3; i += 1) hearts += i < 3 - state.strikes ? '❤' : '♡';
    ctx.fillStyle = COLOURS.bad;
    ctx.fillText(hearts, 1252, 58);
  }

  function drawTitle(state, best, now) {
    ctx.fillStyle = 'rgba(43,33,24,0.72)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff6dd';
    ctx.font = 'bold 84px sans-serif';
    ctx.fillText('SIMMER & SERVE', VIEW.width / 2, 250);
    ctx.fillStyle = COLOURS.gold;
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('A frantic little kitchen — chop, cook, plate, serve!', VIEW.width / 2, 300);
    ctx.fillStyle = '#fff6dd';
    ctx.font = '20px sans-serif';
    ctx.fillText('Move with WASD or arrow keys — or click where to walk', VIEW.width / 2, 380);
    ctx.fillText('E or Space: pick up · chop · cook · plate · serve', VIEW.width / 2, 412);
    ctx.fillText('Match the tickets, beat the clock, keep the combo alive', VIEW.width / 2, 444);
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = Math.sin(now / 0.4) > 0 ? '#ffffff' : COLOURS.gold;
    ctx.fillText('Press ENTER to start the shift', VIEW.width / 2, 520);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '16px sans-serif';
    ctx.fillText(`Best score: ${best}   •   P pause   •   M mute   •   R restart`, VIEW.width / 2, 570);
    void state;
  }

  function drawOverlayPanel(title, lines, accent) {
    ctx.fillStyle = 'rgba(43,33,24,0.72)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.fillStyle = '#fff6dd';
    roundRect(ctx, VIEW.width / 2 - 320, 200, 640, 340, 16);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText(title, VIEW.width / 2, 270);
    ctx.fillStyle = '#3a2d20';
    ctx.font = '20px sans-serif';
    lines.forEach((line, index) => {
      ctx.fillText(line, VIEW.width / 2, 320 + index * 34);
    });
  }

  return {
    draw(state, screen, best, now) {
      ctx.clearRect(0, 0, VIEW.width, VIEW.height);
      drawFloor(now);
      for (const station of STATIONS) drawStation(state, station, now);
      drawTopWall(state);
      drawParticles(state);
      drawChef(state, now);
      drawPopups(state);
      drawHud(state);

      if (screen === SCREEN_TITLE) {
        drawTitle(state, best, now);
      } else if (screen === SCREEN_PAUSED) {
        ctx.fillStyle = 'rgba(43,33,24,0.6)';
        ctx.fillRect(0, 0, VIEW.width, VIEW.height);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff6dd';
        ctx.font = 'bold 54px sans-serif';
        ctx.fillText('PAUSED', VIEW.width / 2, 380);
        ctx.font = '20px sans-serif';
        ctx.fillText('Press P to keep cooking', VIEW.width / 2, 430);
      } else if (screen === SCREEN_DAY_CLEAR) {
        const target = DAY_TARGETS[state.day - 1];
        const stars = state.coins >= target * 1.4 ? 3 : state.coins >= target ? 2 : state.coins >= target * 0.5 ? 1 : 0;
        const nextDay = state.day + 1;
        const lines = [
          `Coins earned: ${state.coins}  •  Dishes served: ${state.served}`,
          `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}  —  ${stars === 3 ? 'A flawless shift!' : stars === 2 ? 'A great shift!' : stars === 1 ? 'A decent shift.' : 'Rough shift — keep practising!'}`,
          nextDay <= 3 ? `Day ${nextDay} brings new recipes and faster tickets.` : 'You cleared every day — the kitchen is yours!',
          nextDay <= 3 ? 'Press ENTER for the next day' : 'Press ENTER to play again',
        ];
        drawOverlayPanel(nextDay <= 3 ? `DAY ${state.day} CLEAR!` : 'ALL DAYS CLEAR!', lines, COLOURS.good);
      } else if (screen === SCREEN_FAILED) {
        const lines = [
          `Three orders went unserved — the rush won this time.`,
          `Coins earned: ${state.coins}  •  Dishes served: ${state.served}`,
          'Press R to try the shift again',
        ];
        drawOverlayPanel('SHIFT OVER!', lines, COLOURS.bad);
      }

      // A quiet hint line during play.
      if (screen === SCREEN_PLAY) {
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(43,33,24,0.55)';
        ctx.font = '13px sans-serif';
        ctx.fillText('WASD / arrows move  •  E interact  •  P pause  •  M mute', 18, VIEW.height - 12);
      }
    },
  };
}
