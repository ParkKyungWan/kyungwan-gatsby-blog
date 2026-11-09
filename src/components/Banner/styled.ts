import styled from '@emotion/styled';

import { LENS } from './board';

import { contentMaxWidth, MOBILE_MEDIA_QUERY } from '@/src/styles/const';

export const Wrapper = styled.section`
  position: relative;
  width: 100%;
  background-color: ${({ theme }) => theme.color.white100};
  padding: 26px 18px 16px;
`;

export const Inner = styled.div`
  width: 100%;
  max-width: ${contentMaxWidth};
  margin: 0 auto;
  display: flex;
  justify-content: center;

  @media ${MOBILE_MEDIA_QUERY} {
    flex-direction: column;
    align-items: stretch;
  }
`;

export const Viewport = styled.div`
  width: 100%;
  max-width: 660px;

  @media ${MOBILE_MEDIA_QUERY} {
    max-width: none;
  }
  height: 160px;
  position: relative;
  overflow: visible;
  border: 1px solid ${({ theme }) => theme.color.gray20};
  border-radius: 2px;
  background-color: ${({ theme }) => theme.color.white99};
  background-image: linear-gradient(${({ theme }) => theme.color.gray20} 1px, transparent 1px),
    linear-gradient(90deg, ${({ theme }) => theme.color.gray20} 1px, transparent 1px);
  background-size: 20px 20px;
  background-position: -1px -1px;
`;

export const Canvas = styled.canvas`
  position: absolute;
  left: -12px;
  top: -12px;
  display: block;
  width: calc(100% + 24px);
  height: calc(100% + 24px);
  pointer-events: none;
`;

export const Lens = styled.div`
  position: absolute;
  left: ${LENS.position * 100}%;
  top: 50%;
  width: ${LENS.diameter}px;
  height: ${LENS.diameter}px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  overflow: hidden;
  pointer-events: none;
  z-index: 1;

  @media ${MOBILE_MEDIA_QUERY} {
    width: 120px;
    height: 120px;
    visibility: hidden;
    [data-mobile-selected='true'] & {
      visibility: visible;
    }
  }

  [data-lens-active='true'] & {
    z-index: 101;
  }
  border: 1px solid ${({ theme }) => theme.color.gray40};
  box-shadow: 0 8px 18px rgb(0 0 0 / 0.08), 0 2px 4px rgb(0 0 0 / 0.05), inset 0 0 0 2px rgb(255 255 255 / 0.65);

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: radial-gradient(ellipse at 30% 19%, rgb(255 255 255 / 0.48), transparent 48%),
      radial-gradient(circle at 50% 50%, transparent 68%, rgb(125 140 155 / 0.12) 95%);
    box-shadow: inset 2px 3px 5px rgb(255 255 255 / 0.85), inset -2px -3px 6px rgb(100 115 130 / 0.13);
  }
`;

export const StickerTarget = styled.button`
  display: none;
  @media ${MOBILE_MEDIA_QUERY} {
    display: block;
    position: absolute;
    transform: translate(-50%, -50%);
    padding: 0;
    border: 0;
    background: transparent;
    -webkit-tap-highlight-color: transparent;
    -webkit-appearance: none;
    appearance: none;
    cursor: pointer;
    touch-action: manipulation;
    &:focus-visible {
      outline: 2px solid ${({ theme }) => theme.color.gray60};
      outline-offset: 3px;
      border-radius: 8px;
    }
  }
`;

export const LensCanvas = styled.canvas`
  display: block;
  width: 100%;
  height: 100%;
`;
