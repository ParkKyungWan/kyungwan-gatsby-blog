import React, { useState } from 'react';

import * as S from './styled';

type ImageCarouselProps = {
  images: string[];
};

const ImageCarousel: React.FC<ImageCarouselProps> = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? prevIndex : prevIndex - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 3 >= images.length - 1 ? prevIndex : prevIndex + 1));
  };

  const itemWidth = 161;
  const gap = 12;
  const translateX = -(currentIndex * (itemWidth + gap));

  if (images.length === 0) {
    return null;
  }

  return (
    <S.Wrapper>
      <S.CarouselContainer>
        <S.PrevButton onClick={goToPrevious} aria-label='Previous image'>
          <S.Icon src='/common/icons/leftButton.png' alt='Previous' />
        </S.PrevButton>
        <S.ImageContainer>
          <S.ImageList $translateX={translateX}>
            {images.map((image, index) => (
              <S.ImageItem key={index}>
                <S.Image src={image} alt={`Image ${index + 1}`} />
              </S.ImageItem>
            ))}
          </S.ImageList>
        </S.ImageContainer>
        <S.NextButton onClick={goToNext} aria-label='Next image'>
          <S.Icon src='/common/icons/rightButton.png' alt='Next' />
        </S.NextButton>
      </S.CarouselContainer>
    </S.Wrapper>
  );
};

export default ImageCarousel;
