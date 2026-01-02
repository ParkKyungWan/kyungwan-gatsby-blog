import React from 'react';

import CategoryFilter from '../components/CategoryFilter';
import ImageCarousel from '../components/ImageCarousel';
import InstagramFeed from '../components/InstagramFeed';
import Section from '../components/Section';
import Seo from '../components/Seo';
import useHobbiesFilter from '../hooks/useHobbiesFilter';
import Layout from '../layout';

type HobbiesProps = {
  location: Location;
};

const Hobbies: React.FC<HobbiesProps> = ({ location }) => {
  const { categoriesH, selectedCategoryH, handleCategoryClickH } = useHobbiesFilter();

  const climbingImages = [
    '/hobbies/climbing1.png',
    '/hobbies/climbing1.png',
    '/hobbies/climbing1.png',
    '/hobbies/climbing1.png',
    '/hobbies/climbing1.png',
    '/hobbies/climbing1.png',
    '/hobbies/climbing1.png',
    '/hobbies/climbing1.png',
  ];

  const renderContent = () => {
    switch (selectedCategoryH) {
      case '음주':
        return <InstagramFeed />;
      case '클라이밍':
        return <ImageCarousel images={climbingImages} />;
      default:
        return <div>컨텐츠를 선택해주세요</div>;
    }
  };

  return (
    <Layout location={location} hasBanner={false}>
      <Seo title='경완 | Hobbies' />
      <Section
        header={{
          emoji: '🍷',
          kr: '취미',
          en: 'Hobbies',
        }}
      >
        <CategoryFilter
          categories={categoriesH}
          selectedCategory={selectedCategoryH}
          onCategoryClick={handleCategoryClickH}
        />
        {renderContent()}
      </Section>
    </Layout>
  );
};

export default Hobbies;
