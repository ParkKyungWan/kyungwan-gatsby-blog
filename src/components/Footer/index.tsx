import React from 'react';

import * as S from './styled';

/**
 * 이 파일은 삭제/수정하지 말아주세요!
 */
const Footer: React.FC = () => {
  return (
    <S.Wrapper>
      <S.Footer>
        © Designed by <S.Link href='https://github.com/ParkKyungWan'>KyungWan </S.Link>/ based on <S.Link href='https://github.com/danmin20/danmin-gatsby-blog-template'>Danmin</S.Link>
      </S.Footer>
    </S.Wrapper>
  );
};

export default Footer;
