import React from 'react';
import * as S from './styled';

const PhotoFan: React.FC<{ images: string[] }> = ({ images }) => (
  <>
    {images.length > 0 && (
      <S.PhotoFan aria-hidden='true'>
        {images.map((src, index, images) => (
          <S.FanPhoto
            key={src}
            src={src}
            alt=''
            loading='lazy'
            decoding='async'
            style={
              {
                '--fan-x': `${(index - (images.length - 1) / 2) * 62}px`,
                '--fan-angle': `${(index - (images.length - 1) / 2) * 12}deg`,
                '--fan-y': `${Math.abs(index - (images.length - 1) / 2) * 12}px`,
              } as React.CSSProperties
            }
          />
        ))}
      </S.PhotoFan>
    )}
  </>
);
export default PhotoFan;
