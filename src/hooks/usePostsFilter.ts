import { useMemo, useState } from 'react';

import PostClass from '../models/post';

const usePostsFilter = (posts: PostClass[]) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = useMemo(() => {
    const categorySet = new Set<string>();
    posts.forEach((post) => {
      post.categories.forEach((category) => {
        const filteredCategory = category.replace('featured-', '').trim();
        if (filteredCategory) {
          categorySet.add(filteredCategory);
        }
      });
    });
    return ['All', ...[...categorySet].sort((a, b) => a.localeCompare(b))];
  }, [posts]);

  const filteredPosts = useMemo(() => {
    if (selectedCategory === 'All') {
      return posts;
    }
    return posts.filter((post) =>
      post.categories.some((category) => category.replace('featured-', '').trim() === selectedCategory),
    );
  }, [posts, selectedCategory]);

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
  };

  return {
    categories,
    filteredPosts,
    selectedCategory,
    handleCategoryClick,
  };
};

export default usePostsFilter;

