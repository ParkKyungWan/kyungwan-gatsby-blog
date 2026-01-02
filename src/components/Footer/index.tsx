import React from 'react';

import * as S from './styled';

/**
 * 이 파일은 삭제/수정하지 말아주세요!
 */
const Footer: React.FC = () => {
  return (
    <S.Wrapper>
      <S.Footer>
        © Powered by <S.Link href='https://github.com/danmin20'>danmin </S.Link>
        <S.SubLink href='https://github.com/ParkKyungWan'>(Redesigned)</S.SubLink>
      </S.Footer>
    </S.Wrapper>
  );
};

export default Footer;
