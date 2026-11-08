import { Size } from './board';

/** Draw the print and tape into the same canvas, so both appear naturally inside the lens. */
export function drawTapedPhoto(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  frame: Size,
  isDark = false,
  showFront = true,
): void {
  const left = -frame.width / 2;
  const top = -frame.height / 2;
  context.save();
  context.shadowColor = isDark ? 'rgba(0, 0, 0, 0.42)' : 'rgba(25, 25, 25, 0.16)';
  context.shadowBlur = 4;
  context.shadowOffsetY = 2;
  context.fillStyle = showFront ? (isDark ? '#b8b8ba' : '#ffffff') : isDark ? '#929497' : '#f4f4f3';
  context.fillRect(left, top + 5, frame.width, frame.height - 5);
  context.shadowColor = 'transparent';
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  if (showFront) {
    context.drawImage(image, left + 4, top + 9, frame.width - 8, frame.height - 13);
  } else {
    // Quiet photographic-paper backing, with a small printer's mark instead of image content.
    context.fillStyle = isDark ? 'rgba(255, 255, 255, 0.32)' : 'rgba(55, 60, 65, 0.2)';
    context.font = '7px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('PHOTO PAPER', 0, 4);
    context.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(55, 60, 65, 0.1)';
    context.lineWidth = 0.5;
    context.beginPath();
    context.moveTo(-14, 12);
    context.lineTo(14, 12);
    context.stroke();
  }
  // A neutral paper border with clear tape across opposite corners.
  context.strokeStyle = isDark ? 'rgba(25, 25, 25, 0.32)' : 'rgba(75, 75, 75, 0.12)';
  context.lineWidth = 0.5;
  context.strokeRect(left + 0.25, top + 5.25, frame.width - 0.5, frame.height - 5.5);
  const tapeCorners = [
    { x: left + 7, y: top + 12 },
    { x: left + frame.width - 7, y: top + frame.height - 7 },
  ];
  for (const corner of tapeCorners) {
    context.save();
    context.translate(corner.x, corner.y);
    context.rotate(-Math.PI / 4);
    // Clear adhesive stays colorless; a faint edge and reflection reveal the film.
    context.fillStyle = isDark ? 'rgba(255, 255, 255, 0.09)' : 'rgba(255, 255, 255, 0.14)';
    context.strokeStyle = isDark ? 'rgba(220, 222, 226, 0.18)' : 'rgba(80, 85, 90, 0.16)';
    context.lineWidth = 0.45;
    context.beginPath();
    context.moveTo(-15, -4.5);
    context.lineTo(14, -4.5);
    context.lineTo(15, -2);
    context.lineTo(14.5, 0.5);
    context.lineTo(15, 4.5);
    context.lineTo(-14.5, 4.5);
    context.lineTo(-15, 2);
    context.lineTo(-14.5, -1);
    context.closePath();
    context.fill();
    context.stroke();
    context.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.32)' : 'rgba(255, 255, 255, 0.55)';
    context.lineWidth = 0.8;
    context.beginPath();
    context.moveTo(-12, -3.2);
    context.lineTo(12, -3.2);
    context.stroke();
    context.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.22)';
    context.lineWidth = 1.8;
    context.beginPath();
    context.moveTo(-11, 1);
    context.lineTo(10, 1);
    context.stroke();
    context.restore();
  }
  context.restore();
}
