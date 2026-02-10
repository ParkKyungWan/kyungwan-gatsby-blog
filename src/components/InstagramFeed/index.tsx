import React, { useEffect, useState } from 'react';

import * as S from './styled';

type InstagramPost = {
  id: string;
  media_url: string;
  permalink: string;
  caption?: string;
  timestamp: string;
};

const InstagramFeed: React.FC = () => {
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInstagramFeed = async () => {
      try {
        // Instagram Graph API를 사용하려면 액세스 토큰이 필요합니다
        // 환경 변수에서 토큰 가져오기 (GATSBY_ 접두사 필요)
        const accessToken = process.env.GATSBY_INSTAGRAM_ACCESS_TOKEN;

        if (!accessToken) {
          setError('Instagram API 토큰이 설정되지 않았습니다. 환경 변수 GATSBY_INSTAGRAM_ACCESS_TOKEN을 설정해주세요.');
          setLoading(false);
          return;
        }

        // Instagram User ID를 가져오기 (username으로 검색)
        // 또는 직접 User ID를 알고 있다면 사용 가능
        const userId = process.env.GATSBY_INSTAGRAM_USER_ID || '';

        if (!userId) {
          setError('Instagram User ID가 설정되지 않았습니다. 환경 변수 GATSBY_INSTAGRAM_USER_ID를 설정해주세요.');
          setLoading(false);
          return;
        }

        // Instagram Graph API로 미디어 가져오기
        const response = await fetch(
          `https://graph.instagram.com/${userId}/media?fields=id,media_url,permalink,caption,timestamp&access_token=${accessToken}&limit=12`,
        );

        if (!response.ok) {
          throw new Error('Instagram API 요청 실패');
        }

        const data = await response.json();

        if (data.data) {
          setPosts(data.data);
        } else {
          setError('데이터를 불러올 수 없습니다.');
        }

        setLoading(false);
      } catch (err) {
        setError('Instagram 피드를 불러오는 중 오류가 발생했습니다.');
        setLoading(false);
      }
    };

    fetchInstagramFeed();
  }, []);

  if (loading) {
    return <S.Loading>로딩 중...</S.Loading>;
  }

  if (error) {
    return <S.Error>{error}</S.Error>;
  }

  if (posts.length === 0) {
    return <S.Empty>표시할 게시물이 없습니다.</S.Empty>;
  }

  return (
    <S.Wrapper>
      {posts.map((post) => (
        <S.ImageItem key={post.id} href={post.permalink} target='_blank' rel='noopener noreferrer'>
          <S.Image src={post.media_url} alt={post.caption || 'Instagram post'} />
        </S.ImageItem>
      ))}
    </S.Wrapper>
  );
};

export default InstagramFeed;
