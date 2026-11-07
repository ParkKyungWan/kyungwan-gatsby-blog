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

export const PostCard = styled(Link)(({ theme }) => cardStyle(theme));
export const EmptyCard = styled.div(({ theme }) => [cardStyle(theme), { cursor: 'default' }]);

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
