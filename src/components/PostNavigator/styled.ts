import styled from '@emotion/styled';
import { css, Theme } from '@emotion/react';
import { Link } from 'gatsby';

export const Wrapper = styled.div`
  display: grid;
  width: 100%;
  grid-template-columns: 49.3% 49.3%;
  column-gap: 1.4%;
  margin-top: 12px;
`;

const cardStyle = (theme: Theme) => css`
  display: flex;
  flex-direction: column;
  width: 100%;
  background-color: ${theme.color.gray10};
  border-radius: 6px;
  padding: 15px;
  height: 105px;

  cursor: pointer;

  &:hover {
    background-color: ${theme.color.gray20};
    .title {
      text-decoration: underline;
    }
  }

  &.prev {
    margin-right: auto;
  }

  &.next {
    margin-left: auto;
  }
`;

const postCardStyle = (theme: Theme) => css`
  ${cardStyle(theme)};
  position: relative;
  isolation: isolate;
  @media (hover: none) and (pointer: coarse) {
    --fan-mobile-scale: 0.52;
    -webkit-touch-callout: none;
    user-select: none;
    &:active {
      z-index: 5;
      background-color: ${theme.color.gray20};
    }
  }
  @media (hover: hover) and (pointer: fine) {
    &:hover,
    &:focus-visible {
      z-index: 5;
    }
  }
`;
export const PostCard = styled(Link)`
  ${({ theme }) => postCardStyle(theme)};
`;
export const NativePostCard = styled.a`
  ${({ theme }) => postCardStyle(theme)};
`;
export const EmptyCard = styled.div(({ theme }) => [
  cardStyle(theme),
  { 'cursor': 'default', 'opacity': 0.4, '&:hover': { backgroundColor: theme.color.gray10 } },
]);

export const Direction = styled.div`
  color: ${({ theme }) => theme.color.gray60};
  margin-bottom: 10px;
`;

export const Title = styled.div`
  font-size: 14px;
  line-height: 150%;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;
