# Self-hosted fonts

- Gmarket Sans Light/Medium/Bold: existing WOFF assets from https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/ . Official source and SIL OFL terms: https://corp.gmarket.com/fonts/ . License bundled in gmarket/.
- Noto Sans KR 400: @fontsource/noto-sans-kr 5.3.1, sourced via npm. Unmodified WOFF2 unicode subsets with their original unicode-range declarations. SIL OFL license bundled in noto-sans-kr/LICENSE.txt.

fonts.css is loaded in the server-rendered head. No runtime third-party font requests are required. Gmarket family aliases intentionally retain weight 400 to preserve existing styles; bold text in Noto uses browser synthesis as before.
