import styled from '@emotion/styled';
import { css, Theme } from '@emotion/react';
import { Link } from 'gatsby';

export const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 8px;
`;

const itemStyles = (theme: Theme) => css`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  padding: 18px;
  border: 1px solid ${theme.color.gray20};
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  font-size: 14px;
  &:hover {
    background-color: ${theme.color.gray10};
  }
`;

export const Item = styled(Link)`
  ${({ theme }) => itemStyles(theme)};
  position: relative;
  isolation: isolate;
  @media (hover: none) and (pointer: coarse) {
    -webkit-touch-callout: none;
    user-select: none;
    &:active {
      z-index: 5;
      background-color: ${({ theme }) => theme.color.gray10};
    }
  }
  @media (hover: hover) and (pointer: fine) {
    &:hover,
    &:focus-visible {
      z-index: 5;
    }
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
  width: 77%;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
`;

export const Categories = styled.div`
  display: flex;
  flex-direction: row;
  gap: 6px;
  align-items: center;
  flex-shrink: 0;
`;

export const Category = styled.div`
  font-size: 12px;
  line-height: 1.4;
  color: ${({ theme }) => theme.color.gray60};
  text-decoration: none;
  padding: 4px 8px;
  border-radius: 4px;
  background-color: ${({ theme }) => theme.color.gray10};
  white-space: nowrap;
`;

export const Title = styled.span`
  padding: 0 6px;
  font-size: 14px;
  font-family: 'Noto Sans KR', sans-serif;
`;

export const Date = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.gray60};
`;

export const Excerpt = styled.span`
  font-size: 14px;
  line-height: 1.4;
  color: ${({ theme }) => theme.color.gray60};
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: 'Noto Sans KR', sans-serif;
  padding: 4px 0px 7px 0px;
`;

export const PostCount = styled.span`
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.color.gray60};
  white-space: nowrap;

  strong {
    font-weight: inherit;
    color: ${({ theme }) => theme.color.black100};
  }
`;

export const MoreLink = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 52px;
  margin-top: 8px;
  padding: 14px 18px;
  border: 1px solid ${({ theme }) => theme.color.gray20};
  border-radius: 8px;
  background-color: ${({ theme }) => theme.color.white99};
  font-family: 'Noto Sans KR', sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.4;
  color: ${({ theme }) => theme.color.gray80};
  transition: background-color 150ms ease, color 150ms ease;

  &:hover {
    background-color: ${({ theme }) => theme.color.gray10};
    color: ${({ theme }) => theme.color.black100};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.gray80};
    outline-offset: 3px;
  }
`;
