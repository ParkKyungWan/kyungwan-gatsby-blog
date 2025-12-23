import React from 'react';

import PostClass from '@/src/models/post';

import * as S from './styled';

type PostListProps = {
  posts: PostClass[];
};

const PostList: React.FC<PostListProps> = ({ posts }) => {
  return (
    <S.Wrapper>
      {posts.map((post) => {
        const { id, slug, title, date, filteredCategories } = post;
        return (
          <S.Item key={id} to={slug}>
            <S.TopContent>
              <S.Title>{title}</S.Title>
              <S.Date>{date}</S.Date>
            </S.TopContent>
            <S.MiddleContent>
              <S.Categories>
                {filteredCategories.map((category) => (
                  <S.Category key={category}>{category}</S.Category>
                ))}
              </S.Categories>
            </S.MiddleContent>
          </S.Item>
        );
      })}
    </S.Wrapper>
  );
};

export default PostList;
