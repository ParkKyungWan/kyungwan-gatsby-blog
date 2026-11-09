import { LENS, PlacedSticker } from './board';

const clamp = (value: number) => Math.max(0, Math.min(1, value));

// Draw only brewing ingredients over the original sticker. Never replace the dripper image.
export function drawCoffeeBrew(
  ctx: CanvasRenderingContext2D,
  diameter: number,
  elapsed: number,
  sticker: PlacedSticker,
  opacity: number,
) {
  const t = (elapsed % 12000) / 1000;
  const crop = sticker.crop ?? { x: 0, y: 0, width: 201, height: 188 };
  const scale = (sticker.width * LENS.zoom) / crop.width;
  const fade = opacity * (1 - clamp((t - 11.2) / 0.8));
  ctx.save();
  ctx.translate(diameter / 2, diameter / 2);
  ctx.rotate(sticker.rotation);
  ctx.scale(scale, scale);
  ctx.translate(-crop.x - crop.width / 2, -crop.y - crop.height / 2);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = fade;

  // Clip at the front rim: paper and ingredients enter the opening, never cover the ceramic front.
  const clipOpening = () => {
    ctx.beginPath();
    ctx.moveTo(-200, -300);
    ctx.lineTo(400, -300);
    ctx.lineTo(400, -56);
    ctx.lineTo(-200, 142);
    ctx.closePath();
    ctx.ellipse(86, 43, 58, 9, -0.32, 0, Math.PI * 2);
    ctx.clip();
  };
  if (t > 0.3) {
    const descent = clamp((t - 0.3) / 2);
    // Three distinct pushes compress and wobble the paper as it seats inside the dripper.
    const push = descent < 1 ? Math.max(0, Math.sin(descent * Math.PI * 6)) : 0;
    const lift = -78 * (1 - descent) ** 1.3 + push * 9;
    const squeeze = 1 - descent * 0.1 - push * 0.055;
    const wobble = Math.sin(descent * Math.PI * 6) * (1 - descent) * 4;
    ctx.save();
    clipOpening();
    ctx.globalAlpha = fade * clamp((t - 0.3) / 0.25);
    ctx.translate(86 + wobble, 43 + lift);
    ctx.rotate(-0.32 + wobble * 0.012);
    ctx.scale(squeeze, 1);
    ctx.beginPath();
    ctx.moveTo(-62, 0);
    ctx.quadraticCurveTo(-32, 30, 0, 79);
    ctx.quadraticCurveTo(35, 27, 62, 0);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = '#c9cbd0';
    ctx.stroke();
    // Uneven folded lip and light creases make it read as thin white filter paper.
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const x = Math.cos(angle) * 62;
      const y = Math.sin(angle) * 9 + Math.sin(angle * 8) * (0.8 + push);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = '#fafbfc';
    ctx.fill();
    ctx.strokeStyle = '#bfc3c9';
    ctx.stroke();
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 21, 5);
      ctx.quadraticCurveTo(i * 12 + push * 3, 25, i * 3, 64);
      ctx.strokeStyle = '#e1e3e7';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
    ctx.restore();
    // Redraw only the front rim line to reinforce that the filter is tucked behind it.
    ctx.globalAlpha = fade;
    ctx.beginPath();
    ctx.ellipse(86, 43, 60, 10, -0.32, 0, Math.PI);
    ctx.strokeStyle = '#7d8388';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  const grounds = clamp((t - 2.7) / 1.2);
  ctx.globalAlpha = fade;
  if (grounds > 0) {
    ctx.save();
    clipOpening();
    ctx.beginPath();
    ctx.ellipse(87, 47, 43 * grounds, 7 * grounds, -0.32, 0, Math.PI * 2);
    ctx.fillStyle = t > 4.8 ? '#5e3b27' : '#795439';
    ctx.fill();
    for (let i = 0; i < 32; i++) {
      ctx.beginPath();
      ctx.arc(53 + (i % 16) * 4.5, 54 - (i % 16) * 1.3 + Math.sin(i * 3) * 3, 1.2 * grounds, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 ? '#b28a62' : '#4f3528';
      ctx.fill();
    }
    ctx.restore();
  }

  // A small tilted dosing cup pours grounds into the original dripper opening.
  if (t > 2.4 && t < 4.5) {
    ctx.save();
    ctx.globalAlpha = fade * Math.min(clamp((t - 2.4) / 0.2), clamp((4.5 - t) / 0.3));
    ctx.translate(54, -10);
    ctx.rotate(1.05);
    ctx.scale(1.5, 1.5);
    ctx.beginPath();
    ctx.moveTo(-12, -10);
    ctx.lineTo(-9, 9);
    ctx.lineTo(11, 9);
    ctx.lineTo(14, -10);
    ctx.closePath();
    ctx.fillStyle = '#e1e5e7';
    ctx.fill();
    ctx.strokeStyle = '#81898d';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
    if (t < 4.1) {
      for (let i = 0; i < 48; i++) {
        const fall = ((t - 2.4) * 2.7 + i / 48) % 1;
        ctx.beginPath();
        ctx.ellipse(
          65 + fall * 22 + Math.sin(i * 2.4) * (4 + fall * 6),
          -6 + fall * 51,
          1.7 + (i % 3) * 0.4,
          1.4,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = '#795439';
        ctx.fill();
      }
    }
  }

  // Only the gooseneck spout enters the lens; the sticker itself remains unchanged.
  if (t > 4.5 && t < 9.2) {
    ctx.globalAlpha = fade * Math.min(clamp((t - 4.5) / 0.3), clamp((9.2 - t) / 0.3));
    const sway = Math.sin(t * 2.6) * 4;
    ctx.beginPath();
    ctx.moveTo(181 + sway, -7);
    ctx.bezierCurveTo(137 + sway, -7, 143 + sway, -28, 115 + sway, -16);
    ctx.strokeStyle = '#899398';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.strokeStyle = '#e5edef';
    ctx.lineWidth = 3;
    ctx.stroke();
    if (t > 4.75 && t < 8.9) {
      ctx.beginPath();
      ctx.moveTo(115 + sway, -14);
      ctx.quadraticCurveTo(104 + sway, 12, 88 + Math.sin(t * 5) * 5, 44);
      ctx.strokeStyle = '#8fb8c8';
      ctx.lineWidth = 7.5 + Math.sin(t * 20) * 0.8;
      ctx.stroke();
      ctx.strokeStyle = '#d9edf3';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Lively splashes and widening ripples make the generous pour tangible.
      ctx.save();
      clipOpening();
      ctx.strokeStyle = '#b8d7e0';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const ripple = (t * 1.8 + i / 3) % 1;
        ctx.globalAlpha = fade * (1 - ripple) * 0.8;
        ctx.beginPath();
        ctx.ellipse(88, 46, 8 + ripple * 35, 1 + ripple * 6, -0.32, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      ctx.globalAlpha = fade * 0.85;
      ctx.fillStyle = '#a5c9d6';
      for (let i = 0; i < 8; i++) {
        const splash = (t * 2.1 + i / 8) % 1;
        ctx.beginPath();
        ctx.ellipse(
          88 + Math.sin(i * 2) * splash * 22,
          43 - Math.sin(splash * Math.PI) * 13,
          1.2,
          2,
          i,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.beginPath();
      ctx.stroke();
    }
  }
  if (t > 5.2 && t < 10.9) {
    const flow = clamp((t - 5.2) / 0.5) * clamp((10.9 - t) / 0.8);
    ctx.globalAlpha = fade * flow;
    // A coffee thread runs out beneath the original base, followed by falling drops.
    ctx.beginPath();
    ctx.moveTo(101, 171);
    ctx.lineTo(101, 186);
    ctx.lineWidth = 3.4;
    ctx.strokeStyle = '#82502e';
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const fall = (t * 1.9 + i / 4) % 1;
      ctx.beginPath();
      ctx.ellipse(101, 183 + fall * 64, 1.8, 3, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#82502e';
      ctx.fill();
    }
    for (let i = 0; i < 2; i++) {
      const rise = (t * 0.45 + i / 2) % 1;
      ctx.globalAlpha = fade * flow * (1 - rise) * 0.4;
      ctx.beginPath();
      ctx.moveTo(75 + i * 22, 30 - rise * 20);
      ctx.bezierCurveTo(68 + i * 22, 22 - rise * 20, 83 + i * 22, 15 - rise * 20, 77 + i * 22, 7 - rise * 20);
      ctx.strokeStyle = '#a9b6bc';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }
  ctx.restore();
}
