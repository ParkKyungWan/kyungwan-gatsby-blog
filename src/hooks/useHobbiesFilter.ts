import { useMemo, useState } from 'react';

const useHobbiesFilter = () => {
  const [selectedCategoryH, setSelectedCategoryH] = useState<string>('음주');

  const categoriesH = useMemo(() => {
    return ['음주', '클라이밍'];
  }, []);

  const handleCategoryClickH = (category: string) => {
    setSelectedCategoryH(category);
  };

  return {
    categoriesH,
    selectedCategoryH,
    handleCategoryClickH,
  };
};

export default useHobbiesFilter;
