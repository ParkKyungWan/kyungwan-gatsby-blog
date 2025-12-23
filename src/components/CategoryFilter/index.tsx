import React from 'react';

import * as S from './styled';

type CategoryFilterProps = {
  categories?: string[];
  selectedCategory?: string;
  onCategoryClick: (category: string) => void;
};

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories = [],
  selectedCategory,
  onCategoryClick,
}) => {
  return (
    <S.List>
      {categories.map((category) => (
        <S.Button
          key={category}
          onClick={() => onCategoryClick(category)}
          type="button"
          isSelected={selectedCategory === category}
        >
          {category}
        </S.Button>
      ))}
    </S.List>
  );
};

export default CategoryFilter;

