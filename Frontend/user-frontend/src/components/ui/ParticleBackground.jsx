import React, { useEffect, useRef } from 'react';

const ParticleBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Configuration
    const particleColor = 'rgba(34, 211, 238, 0.5)'; // Cyan-400 with opacity
    const particleRadius = 1.5;
    const gridSpacing = 40;
    const mouseRadius = 150;
    const repulsionStrength = 20;
    const returnSpeed = 0.1; // Spring stiffness
    const damping = 0.9; // Friction

    let particles = [];
    let mouse = { x: -1000, y: -1000 };

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      const cols = Math.floor(canvas.width / gridSpacing);
      const rows = Math.floor(canvas.height / gridSpacing);

      // Center the grid
      const offsetX = (canvas.width - cols * gridSpacing) / 2;
      const offsetY = (canvas.height - rows * gridSpacing) / 2;

      for (let i = 0; i <= cols; i++) {
        for (let j = 0; j <= rows; j++) {
          const x = offsetX + i * gridSpacing;
          const y = offsetY + j * gridSpacing;
          particles.push({
            x,
            y,
            originX: x,
            originY: y,
            vx: 0,
            vy: 0,
          });
        }
      }
    };

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const update = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        // Calculate distance to mouse
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Repulsion force
        if (distance < mouseRadius) {
          const force = (mouseRadius - distance) / mouseRadius;
          const angle = Math.atan2(dy, dx);
          const pushX = Math.cos(angle) * force * repulsionStrength;
          const pushY = Math.sin(angle) * force * repulsionStrength;
          
          // Push away from mouse (invert angle for repulsion)
          p.vx -= pushX;
          p.vy -= pushY;
        }

        // Return to origin (spring force)
        const springDx = p.originX - p.x;
        const springDy = p.originY - p.y;
        
        p.vx += springDx * returnSpeed;
        p.vy += springDy * returnSpeed;

        // Apply damping
        p.vx *= damping;
        p.vy *= damping;

        // Update position
        p.x += p.vx;
        p.y += p.vy;

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, particleRadius, 0, Math.PI * 2);
        ctx.fillStyle = particleColor;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(update);
    };

    // Initialize
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    
    // Start loop
    update();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
      style={{ background: 'transparent' }} 
    />
  );
};

export default ParticleBackground;
