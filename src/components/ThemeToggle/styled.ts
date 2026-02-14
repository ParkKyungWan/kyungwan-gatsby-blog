import styled from '@emotion/styled';

import { MOBILE_MEDIA_QUERY } from '@/src/styles/const';

export const Wrapper = styled.div<{ isDark: boolean }>`
  cursor: pointer;
  position: relative;
  background-color: ${({ theme }) => theme.color.black40};
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;

  .theme-icon {
    color: ${({ theme }) => theme.color.white100};
    width: 18px;
    height: 18px;
  }

  @media ${MOBILE_MEDIA_QUERY} {
    width: 28px;
    height: 28px;
    .theme-icon {
      width: 15px;
      height: 15px;
    }
  }
`;
