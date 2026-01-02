import { useMemo, useState } from 'react';

const useHobbiesFilter = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('클라이밍');

  const categories = useMemo(() => {
    return ['음주','클라이밍'];
  }, []);

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
  };

  return {
    categories,
    selectedCategory,
    handleCategoryClick,
  };
};

export default useHobbiesFilter;
