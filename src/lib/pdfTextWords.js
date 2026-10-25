export function wordsFromPdf(items, viewport) {
  return items.filter(item => item.str?.trim()).flatMap(item => {
    const [a, b, , , tx, ty] = item.transform;
    const [x, y] = viewport.convertToViewportPoint(tx, ty);
    const [endX, endY] = viewport.convertToViewportPoint(tx + a, ty + b);
    const length = Math.hypot(endX - x, endY - y) || 1;
    const ux = (endX - x) / length, uy = (endY - y) / length;
    const height = Math.abs(item.height * viewport.scale) || 10;
    const width = Math.abs(item.width * viewport.scale);
    const angle = Math.atan2(uy / viewport.height, ux / viewport.width);
    const tokens = [...item.str.matchAll(/\S+/g)];
    return tokens.map(token => {
      const start = width * token.index / item.str.length, extent = width * token[0].length / item.str.length;
      const points = [[start, 0], [start + extent, 0], [start, height], [start + extent, height]].map(([along, above]) =>
        [(x + ux * along + uy * above) / viewport.width, (y + uy * along - ux * above) / viewport.height]);
      const left = Math.min(...points.map(p => p[0])), top = Math.min(...points.map(p => p[1]));
      return { text: token[0], confidence: tokens.length > 1 ? 0.8 : 1, angle,
        textHeight: Math.hypot(uy * height / viewport.width, ux * height / viewport.height),
        box: { x: left, y: top, width: Math.max(...points.map(p => p[0])) - left, height: Math.max(...points.map(p => p[1])) - top } };
    });
  });
}
