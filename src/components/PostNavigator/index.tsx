import React from 'react';

import PostClass from '@/src/models/post';
import PhotoFan from '../PhotoFan';

import * as S from './styled';

type PostNavigatorProps = {
  prevPost?: PostClass;
  nextPost?: PostClass;
};

const PostNavigator: React.FC<PostNavigatorProps> = ({ prevPost, nextPost }) => {
  return (
    <S.Wrapper>
      <div>
        {prevPost ? (
          <S.PostCard data-photo-preview className='prev' key={prevPost.id} to={prevPost.slug}>
            <PhotoFan images={prevPost.previewImages} />
            <S.Direction>이전 글</S.Direction>
            <S.Title>{prevPost.title}</S.Title>
          </S.PostCard>
        ) : (
          <S.EmptyCard className='prev'>
            <S.Direction>이전 글</S.Direction>
            <S.Title>이전 글이 없습니다.</S.Title>
          </S.EmptyCard>
        )}
      </div>
      <div>
        {nextPost ? (
          <S.PostCard data-photo-preview className='next' key={nextPost.id} to={nextPost.slug}>
            <PhotoFan images={nextPost.previewImages} />
            <S.Direction>다음 글</S.Direction>
            <S.Title>{nextPost.title}</S.Title>
          </S.PostCard>
        ) : (
          <S.EmptyCard className='next'>
            <S.Direction>다음 글</S.Direction>
            <S.Title>다음 글이 없습니다.</S.Title>
          </S.EmptyCard>
        )}
      </div>
    </S.Wrapper>
  );
};

export default PostNavigator;
