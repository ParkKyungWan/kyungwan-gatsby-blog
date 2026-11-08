import styled from '@emotion/styled';

export const PhotoFan = styled.span`
  display: block;
  position: absolute;
  left: 50%;
  top: 0;
  width: 0;
  height: 0;
  pointer-events: none;
  z-index: -1;
  @media (hover: none) and (pointer: coarse) {
    transform: scale(var(--fan-mobile-scale, 0.72));
  }
`;

export const FanPhoto = styled.img`
  position: absolute;
  left: -54px;
  top: -140px;
  width: 108px;
  height: 132px;
  object-fit: cover;
  border: 2px solid ${({ theme }) => theme.color.photoBorder};
  border-radius: 3px;
  box-shadow: 0 5px 16px rgb(0 0 0 / 0.16);
  transform-origin: 50% 120%;
  opacity: 0;
  transform: translateY(114px) rotate(0deg) scale(0.65);
  transition: transform 280ms cubic-bezier(0.2, 0.75, 0.25, 1), opacity 150ms ease;
  @media (hover: hover) and (pointer: fine) {
    [data-photo-preview]:hover & {
      opacity: 1;
      transform: translate(var(--fan-x), var(--fan-y)) rotate(var(--fan-angle)) scale(1);
      transition-delay: 180ms;
    }
  }
  [data-photo-preview]:focus-visible & {
    opacity: 1;
    transform: translate(var(--fan-x), var(--fan-y)) rotate(var(--fan-angle)) scale(1);
    transition-delay: 180ms;
  }
  @media (hover: none) and (pointer: coarse) {
    [data-photo-preview]:active & {
      opacity: 1;
      transform: translate(var(--fan-x), var(--fan-y)) rotate(var(--fan-angle)) scale(1);
      transition-duration: 160ms;
      transition-delay: 0ms;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    transition: opacity 100ms ease;
  }
`;
