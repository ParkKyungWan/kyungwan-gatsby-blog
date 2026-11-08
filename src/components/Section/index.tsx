import React from 'react';

import * as S from './styled';

type SectionProps = {
  header?: {
    emoji?: string;
    kr?: string;
    en?: string;
    more?: React.ReactNode;
  };
  children: React.ReactNode;
};

const Section: React.FC<SectionProps> = ({ header, children }) => {
  return (
    <S.Wrapper>
      {header && (
        <S.Header>
          {(header.emoji || header.kr || header.en) && (
            <S.LeftGroup>
              {header.emoji && <S.Emoji>{header.emoji}</S.Emoji>}
              {header.kr && <S.Kr>{header.kr}</S.Kr>}
              {header.en && <S.En>{header.en}</S.En>}
            </S.LeftGroup>
          )}
          {header.more && <S.MoreWrapper>{header.more}</S.MoreWrapper>}
        </S.Header>
      )}
      <S.Content>{children}</S.Content>
    </S.Wrapper>
  );
};

export default Section;
