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
        const { id, slug, title, date, categories } = post;
        return (
          <S.Item key={id} to={slug}>
            hi
          </S.Item>
        );
      })}
    </S.Wrapper>
  );
};

export default PostList;
