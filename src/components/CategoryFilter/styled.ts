import styled from '@emotion/styled';

export const List = styled.div`
  display: flex;
  flex-direction: row;
  gap: 12px;
  width: 100%;
  margin-bottom: 24px;
  overflow-x: scroll;
  overflow-y: hidden;
  padding-left: 3px;
`;

export const Button = styled.button<{ isSelected: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  height: 28px;
  padding: 6px 12px;
  border-radius: 5px;
  background-color: ${({ theme, isSelected }) =>
    isSelected ? theme.color.black100 : theme.color.white100};
  color: ${({ theme, isSelected }) =>
    isSelected ? theme.color.white100 : theme.color.gray60};
  border: ${({ theme, isSelected }) =>
    isSelected ? 'none' : `1px solid ${theme.color.gray20}`};
  cursor: pointer;
`;

