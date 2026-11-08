import React from 'react';

import PostClass from '@/src/models/post';
import PhotoFan from '../PhotoFan';

import * as S from './styled';

type PostListProps = {
  posts: PostClass[];
  samplePreview?: boolean;
};

const PostList: React.FC<PostListProps> = ({ posts, samplePreview = false }) => {
  return (
    <S.Wrapper>
      {posts.map((post) => {
        const { id, slug, title, date, filteredCategories, excerpt } = post;
        return (
          <S.Item data-photo-preview key={id} to={slug}>
            <PhotoFan images={post.previewImages} />
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
              <S.Excerpt>{excerpt}</S.Excerpt>
            </S.MiddleContent>
          </S.Item>
        );
      })}
      {samplePreview && (
        <S.PreviewItem aria-label='샘플 게시글 미리보기'>
          <S.TopContent>
            <S.Title>작은 취향을 모으는 주말</S.Title>
            <S.Date>2026.11.08</S.Date>
          </S.TopContent>
          <S.MiddleContent>
            <S.Categories>
              <S.Category>샘플</S.Category>
            </S.Categories>
            <S.Excerpt>
              클라이밍을 하고, 좋아하는 음식을 만들고, 사진으로 남긴 주말의 기록. 레이아웃 확인용 미리보기입니다.
            </S.Excerpt>
          </S.MiddleContent>
        </S.PreviewItem>
      )}
    </S.Wrapper>
  );
};

export default PostList;
