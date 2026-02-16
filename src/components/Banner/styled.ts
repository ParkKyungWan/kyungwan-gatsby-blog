import { bannerHeight, contentMaxWidth, headerHeight, m_bannerHeight, MOBILE_MEDIA_QUERY } from '@/src/styles/const';
import { keyframes } from '@emotion/react';
import styled from '@emotion/styled';

export const Wrapper = styled.div`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  width: 100%;
  height: ${bannerHeight};
  margin-top: ${headerHeight};
  background-color: ${({ theme }) => theme.color.white99};
  box-shadow: inset 0 6px 12px rgb(0, 0, 0, 0.06);
  z-index: -1;

  @media ${MOBILE_MEDIA_QUERY} {
    height: ${m_bannerHeight};
  }
`;

export const Inner = styled.div`
  position: relative;
  width: ${contentMaxWidth};
  height: 100%;
  z-index: -1;

  /* 100vw 대신 100% 사용: 모바일에서 뒤로가기(bfcache) 시 100vw가
   * 뷰포트와 어긋나 스티커 위치가 잘못 계산되는 현상 방지 */
  @media ${MOBILE_MEDIA_QUERY} {
    width: 100%;
  }
`;

const createFloatAnimation = (
  baseTransform: string,
  x1: number,
  y1: number,
  rotate1: number,
  x2: number,
  y2: number,
  rotate2: number,
) => keyframes`
  0%, 100% {
    transform: ${baseTransform} translate(0, 0) rotate(0deg);
  }
  50% {
    transform: ${baseTransform} translate(${x1}px, ${y1}px) rotate(${rotate1}deg);
  }
`;

type FloatingImageProps = {
  position: {
    left?: string;
    right?: string;
    top?: string;
    bottom?: string;
  };
  animation: ReturnType<typeof keyframes>;
};

export const FloatingImage = styled.img<FloatingImageProps>`
  position: absolute;
  left: ${({ position }) => position.left};
  right: ${({ position }) => position.right};
  top: ${({ position }) => position.top};
  bottom: ${({ position }) => position.bottom};
  will-change: transform;
  animation-name: ${({ animation }) => animation};
  animation-duration: 20s;
  animation-delay: -1.5s;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  width: 104px;

  @media ${MOBILE_MEDIA_QUERY} {
    scale: 0.77;
  }
`;
