import { RenderBodyArgs } from 'gatsby';

const GmarketFontFaceCSS = `
@font-face {
  font-family: 'GmarketSansLight';
  src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/GmarketSansLight.woff') format('woff');
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'GmarketSansMedium';
  src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/GmarketSansMedium.woff') format('woff');
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'GmarketSansBold';
  src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/GmarketSansBold.woff') format('woff');
  font-style: normal;
  font-display: swap;
}
`;

export const onRenderBody = ({ setHtmlAttributes, setHeadComponents }: RenderBodyArgs) => {
  setHtmlAttributes({ lang: `kr` });
  setHeadComponents([
    // 폰트 도메인 미리 연결해 첫 요청 지연 감소
    <link rel='preconnect' href='https://cdn.jsdelivr.net' crossOrigin='anonymous' key='preconnect-jsdelivr' />,
    <link rel='preconnect' href='https://fonts.googleapis.com' key='preconnect-google-fonts' />,
    <link rel='preconnect' href='https://fonts.gstatic.com' crossOrigin='anonymous' key='preconnect-gstatic' />,
    // HTML 최초 파싱 시점에 @font-face 적용 (JS/CSS 청크 대기 없이 폰트 요청)
    <style key='critical-fonts' dangerouslySetInnerHTML={{ __html: GmarketFontFaceCSS }} />,
    <link
      rel='preload'
      href='https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/GmarketSansLight.woff'
      as='font'
      type='font/woff'
      crossOrigin='anonymous'
      key='GmarketSansLight'
    />,
    <link
      rel='preload'
      href='https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/GmarketSansMedium.woff'
      as='font'
      type='font/woff'
      crossOrigin='anonymous'
      key='GmarketSansMedium'
    />,
    <link
      rel='preload'
      href='https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/GmarketSansBold.woff'
      as='font'
      type='font/woff'
      crossOrigin='anonymous'
      key='GmarketSansBold'
    />,
  ]);
};
