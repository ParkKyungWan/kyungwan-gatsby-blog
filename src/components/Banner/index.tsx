import React from 'react';
import { keyframes } from '@emotion/react';

import * as S from './styled';

// 소극적이고 천천히 움직이는 애니메이션 생성 함수
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
  33% {
    transform: ${baseTransform} translate(${x1}px, ${y1}px) rotate(${rotate1}deg);
  }
  66% {
    transform: ${baseTransform} translate(${x2}px, ${y2}px) rotate(${rotate2}deg);
  }
`;

type BannerImageProps = {
  src: string;
  alt: string;
  position: {
    left?: string;
    right?: string;
    top?: string;
    bottom?: string;
  };
  animation: ReturnType<typeof keyframes>;
};

const BannerImage: React.FC<BannerImageProps> = ({ src, alt, position, animation }) => {
  return <S.FloatingImage src={src} alt={alt} position={position} animation={animation} />;
};

const HomeBanner: React.FC = () => {
  return (
    <S.Wrapper>
      <S.Inner>
        <BannerImage
          src="/banner/guinea.png"
          alt="guinea"
          position={{ left: '3%', top: '35%' }}
          animation={createFloatAnimation('translateY(-50%)', 8, -10, 1.5, -5, 8, -1)}
        />
        <BannerImage
          src="/banner/stone.png"
          alt="stone"
          position={{ left: '51%', top: '-2%' }}
          animation={createFloatAnimation('translateX(-50%)', -9, 6, -1.5, 6, -8, 1)}
        />
        <BannerImage
          src="/banner/shoe.png"
          alt="shoe"
          position={{ right: '0', top: '36%' }}
          animation={createFloatAnimation('translateY(-50%)', -6, 9, -1, 10, -5, 1.5)}
        />
        <BannerImage
          src="/banner/wine.png"
          alt="wine"
          position={{ left: '30%', bottom: '-5%' }}
          animation={createFloatAnimation('translateX(-50%)', 9, -8, 1, -8, 10, -1.5)}
        />
        <BannerImage
          src="/banner/drip.png"
          alt="drip"
          position={{ right: '30%', bottom: '-2%' }}
          animation={createFloatAnimation('translateX(50%)', -10, -6, -1, 8, 9, 1.5)}
        />
      </S.Inner>
    </S.Wrapper>
  );
};

export default HomeBanner;
