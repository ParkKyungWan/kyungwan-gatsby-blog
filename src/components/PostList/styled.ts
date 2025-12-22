import styled from '@emotion/styled';
import { Link } from 'gatsby';

export const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 8px;
`;

export const Item = styled(Link)`
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 12px 24px;
  border: 1px solid ${({ theme }) => theme.color.gray20};
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  font-size: 14px;
  &:hover {
    background-color: ${({ theme }) => theme.color.gray10};
  }
`;
