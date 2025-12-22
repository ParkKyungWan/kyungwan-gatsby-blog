import React from 'react';

import PostClass from '@/src/models/post';

import * as S from './styled';

type PostItemProps = {
  posts: PostClass[];
};

const PostItem: React.FC<PostItemProps> = ({ posts }) => {
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

export default PostItem;
