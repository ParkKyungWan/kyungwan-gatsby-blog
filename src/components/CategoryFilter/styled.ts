import styled from '@emotion/styled';
import { css } from '@emotion/react';

export const List = styled.div<{ textTabs: boolean }>`
  display: flex;
  flex-direction: row;
  gap: 12px;
  width: 100%;
  margin-bottom: 24px;
  overflow-x: scroll;
  overflow-y: hidden;
  ${({ textTabs }) =>
    textTabs &&
    css`
      gap: 28px;
      padding: 0 12px;
      overflow-x: auto;
      min-height: 44px;
    `};
`;

export const Button = styled.button<{ isSelected: boolean; textTabs: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  height: 28px;
  padding: 6px 12px;
  border-radius: 5px;
  background-color: ${({ theme, isSelected }) => (isSelected ? theme.color.black100 : theme.color.white100)};
  color: ${({ theme, isSelected }) => (isSelected ? theme.color.white100 : theme.color.gray60)};
  border: ${({ theme, isSelected }) => (isSelected ? 'none' : `1px solid ${theme.color.gray20}`)};
  cursor: pointer;
  ${({ theme, textTabs, isSelected }) =>
    textTabs &&
    css`
      position: relative;
      flex-shrink: 0;
      min-height: 44px;
      height: auto;
      padding: 0;
      border: 0;
      border-radius: 0;
      background: transparent;
      color: ${isSelected ? theme.color.black100 : theme.color.gray60};
      font-family: 'Noto Sans KR', sans-serif;
      font-size: 18px;
      line-height: 1.4;
      white-space: nowrap;
      -webkit-tap-highlight-color: transparent;
      transition: color 150ms ease;
      &:hover {
        color: ${theme.color.black100};
      }
      &:focus-visible {
        outline: 2px solid ${theme.color.gray40};
        outline-offset: -2px;
      }
    `};
`;

export const Count = styled.span`
  margin-left: 6px;
  font-size: 11px;
  color: ${({ theme }) => theme.color.gray60};
  font-variant-numeric: tabular-nums;
`;
