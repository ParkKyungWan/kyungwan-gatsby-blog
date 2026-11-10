import React, { useEffect, useRef } from 'react';
import usePostNavigation from '../../hooks/usePostNavigation';
import PostHeader from '../PostHeader';
import PostNavigator from '../PostNavigator';
import PostClass from '../../models/post';
import { recoverMarkdownImages } from '../../utils/recover-markdown-images';
import * as S from '../../templates/post-template/styled';

const PostArticle: React.FC<{
  post: PostClass;
  prevPost?: PostClass;
  nextPost?: PostClass;
  liveNavigation?: boolean;
}> = ({ post, prevPost, nextPost, liveNavigation = false }) => {
  const navigation = usePostNavigation(post.slug, liveNavigation, prevPost, nextPost);
  const markdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (markdownRef.current) return recoverMarkdownImages(markdownRef.current);
  }, [post.html]);
  return (
    <S.Wrapper>
      <PostHeader post={post} />
      <S.PostContent>
        <div ref={markdownRef} className='markdown' dangerouslySetInnerHTML={{ __html: post.html }} />
      </S.PostContent>
      <PostNavigator {...navigation} />
    </S.Wrapper>
  );
};
export default PostArticle;
