import styled from '@emotion/styled';

export const Wrapper = styled.div`
  padding: 0 12px;
  min-width: 100%;
`;

export const PostContent = styled.div`
  --motion-wall: ${({ theme }) => theme.color.white100};
  --motion-wall-shadow: color-mix(in srgb, ${({ theme }) => theme.color.white100} 75%, #000);
  --motion-wall-light: ${({ theme }) =>
    theme.color.white100 === '#FFFFFF'
      ? '#d1d1d1'
      : `color-mix(in srgb, ${theme.color.white100} 88%, #fff)`};
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  margin-bottom: 30px;
`;
