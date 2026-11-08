import React from 'react';

import * as S from './styled';

type CategoryFilterProps = {
  categories?: string[];
  selectedCategory?: string;
  onCategoryClick: (category: string) => void;
  textTabs?: boolean;
  counts?: Record<string, number>;
};

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories = [],
  selectedCategory,
  onCategoryClick,
  textTabs = false,
  counts,
}) => {
  return (
    <S.List textTabs={textTabs} role='group' aria-label='분류 선택'>
      {categories.map((category) => (
        <S.Button
          key={category}
          onClick={() => onCategoryClick(category)}
          type='button'
          isSelected={selectedCategory === category}
          textTabs={textTabs}
          aria-pressed={selectedCategory === category}
        >
          {category}
          {counts?.[category] !== undefined && <S.Count>{counts[category]}</S.Count>}
        </S.Button>
      ))}
    </S.List>
  );
};

export default CategoryFilter;
