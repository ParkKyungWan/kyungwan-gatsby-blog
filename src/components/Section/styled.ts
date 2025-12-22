import styled from '@emotion/styled';

export const Wrapper = styled.section`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

export const Header = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  border-bottom: 1px solid ${({ theme }) => theme.color.gray20};
  padding: 12px;
  height: 62px;
`;

export const LeftGroup = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

export const Emoji = styled.div`
  font-size: 24px;
  margin-right: 8px;
`;

export const Kr = styled.span`
  font-size: 16px;
  margin-right: 4px;
`;

export const En = styled.span`
  font-size: 16px;
  color: ${({ theme }) => theme.color.gray60};
`;

export const MoreWrapper = styled.div`
  a {
    font-size: 16px;
    font-weight: 500;
    color: ${({ theme }) => theme.color.gray60};
    text-decoration: underline;
  }
`;

export const Content = styled.div`
  width: 100%;
  padding: 24px 6px;
`;

export const Link = styled.a`
  font-size: 18px;
  color: ${({ theme }) => theme.color.gray60};
`;
