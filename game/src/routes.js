// Simmer & Serve — how anything walks around the kitchen without getting
// wedged on a counter corner. The floor has a few open corridors; this file
// plans a route through them (a waypoint graph over the open floor) and
// falls back to a straight line whenever the way is clear.

import { STATIONS } from './config.js';

// Corridor crossings, all on open floor: the top lane, the bottom lane and
// the two side lanes. No edge crosses a station.
const NODES = {
  A: { x: 210, y: 210 },
  B: { x: 900, y: 210 },
  C: { x: 210, y: 600 },
  D: { x: 900, y: 600 },
  E: { x: 640, y: 210 },
  F: { x: 640, y: 600 },
};
const EDGES = {
  A: ['B', 'C', 'E'],
  B: ['A', 'D', 'E'],
  C: ['A', 'D', 'F'],
  D: ['B', 'C', 'F'],
  E: ['A', 'B'],
  F: ['C', 'D'],
};

// True when a straight walk from `a` to `b` stays clear of every station
// (each treated as its rectangle grown by the walker's radius plus a margin).
export function segmentClear(a, b, radius) {
  const distance = Math.hypot(b.x - a.x, b.y - a.y);
  const steps = Math.max(1, Math.ceil(distance / 8));
  for (let i = 0; i <= steps; i += 1) {
    const x = a.x + ((b.x - a.x) * i) / steps;
    const y = a.y + ((b.y - a.y) * i) / steps;
    for (const station of STATIONS) {
      const margin = radius + 6;
      if (
        x > station.x - margin &&
        x < station.x + station.w + margin &&
        y > station.y - margin &&
        y < station.y + station.h + margin
      ) {
        return false;
      }
    }
  }
  return true;
}

function nearestReachableNode(from, radius) {
  let best = null;
  let bestDistance = Infinity;
  for (const [name, node] of Object.entries(NODES)) {
    if (!segmentClear(from, node, radius)) continue;
    const distance = Math.hypot(node.x - from.x, node.y - from.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = name;
    }
  }
  return best;
}

function shortestPath(startName, goalName) {
  const previous = { [startName]: null };
  const queue = [startName];
  while (queue.length > 0) {
    const name = queue.shift();
    if (name === goalName) break;
    for (const next of EDGES[name]) {
      if (!(next in previous)) {
        previous[next] = name;
        queue.push(next);
      }
    }
  }
  if (!(goalName in previous)) return null;
  const path = [];
  let name = goalName;
  while (name) {
    path.unshift(name);
    name = previous[name];
  }
  return path;
}

// A list of points to walk through to reach `to` from `from`, the last one
// being `to` itself. Straight there when the way is clear, otherwise along
// the corridor graph.
export function planRoute(from, to, radius) {
  if (segmentClear(from, to, radius)) return [to];
  const startNode = nearestReachableNode(from, radius);
  const goalNode = nearestReachableNode(to, radius);
  if (!startNode || !goalNode) return [to];
  const path = shortestPath(startNode, goalNode);
  if (!path) return [to];
  const points = path.map((name) => NODES[name]);
  points.push(to);
  return points;
}
