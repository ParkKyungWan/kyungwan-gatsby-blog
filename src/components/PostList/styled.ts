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
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  padding: 18px;
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

export const TopContent = styled.div`
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

export const MiddleContent = styled.div`
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

export const Categories = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 6px;
  align-items: center;
`;

export const Category = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.color.gray60};
  text-decoration: none;
  padding: 4px 8px;
  border-radius: 4px;
  background-color: ${({ theme }) => theme.color.gray10};
`;

export const Title = styled.span`
  padding: 0 6px;
  font-size: 14px;
`;

export const Date = styled.span`
  font-size: 14px;
  color: ${({ theme }) => theme.color.gray60};
`;

export const Excerpt = styled.span`
  padding: 0 6px;
  font-size: 14px;
  color: ${({ theme }) => theme.color.gray60};
  width: 77%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;