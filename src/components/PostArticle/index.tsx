import '../../styles/post-motion.css';
import { installPostMotion } from '../../utils/post-motion';
import React, { useEffect, useRef } from 'react';
import PostHeader from '../PostHeader';
import PostNavigator from '../PostNavigator';
import PostClass from '../../models/post';
import { recoverMarkdownImages } from '../../utils/recover-markdown-images';
import * as S from '../../templates/post-template/styled';

const PostArticle: React.FC<{
  post: PostClass;
  prevPost?: PostClass;
  nextPost?: PostClass;
}> = ({ post, prevPost, nextPost }) => {
  const markdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!markdownRef.current) return;
    const recover = recoverMarkdownImages(markdownRef.current);
    const disposeMotion = installPostMotion(markdownRef.current);
    return () => {
      recover?.();
      disposeMotion();
    };
  }, [post.html]);
  return (
    <S.Wrapper>
      <PostHeader post={post} />
      <S.PostContent>
        <div ref={markdownRef} className='markdown' dangerouslySetInnerHTML={{ __html: post.html }} />
      </S.PostContent>
      <PostNavigator prevPost={prevPost} nextPost={nextPost} />
    </S.Wrapper>
  );
};
export default PostArticle;
