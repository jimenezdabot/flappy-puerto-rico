// Obstacle logic refactored for clarity
obstacles.forEach((o,i)=>{
  o.x -= OBSTACLE_SPEED;
  ctx.drawImage(images[o.type], o.x, o.y, o.w, o.h);

  // Check pass
  if (!o.passed && o.x + o.w < bird.x) {
    o.passed = true;
    score++;
    level = Math.min(score, 10);
  }

  // Collision
  if (
    o.x + o.w > bird.x &&
    o.x < bird.x + bird.w &&
    o.y + o.h > bird.y &&
    o.y < bird.y + bird.h
  ) {
    gameOver = true;
  }

  // Remove offscreen
  if (o.x + o.w < 0) obstacles.splice(i, 1);
});
