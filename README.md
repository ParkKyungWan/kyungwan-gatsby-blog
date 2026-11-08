## Gatsby 기반의 Custom Blog
**WebLink**: [**ruddhks.my**](https://ruddhks.my/)  
**Templete Base**: [**Github-단민**](https://github.com/danmin20/danmin-gatsby-blog-template)

<br/>

---

## 라이트 모드
<img width="931" height="872" alt="스크린샷 2026-02-24 오후 7 42 29" src="https://github.com/user-attachments/assets/16061f75-18c2-4ee9-b177-02416b31e31e" />
<img width="931" alt="스크린샷 2026-02-24 오후 7 44 16" src="https://github.com/user-attachments/assets/8919e671-0db4-40d9-8732-522f161850e0" />

<br/>

---

## 다크 모드
<img width="931" height="872" alt="스크린샷 2026-02-24 오후 7 43 34" src="https://github.com/user-attachments/assets/7811bfca-3dcf-4964-87bc-4006a5d2245e" />
<img width="931" alt="스크린샷 2026-02-24 오후 7 43 56" src="https://github.com/user-attachments/assets/52221db3-ea0b-4e78-9f7e-3f1fb9e7b589" />

## 로컬 실행과 배포

Node 버전은 `.nvmrc`(22.23.4), 패키지 관리 도구는 npm 10.9.4를 기준으로 합니다.
다른 버전의 Node가 설치돼 있다면 버전 관리 도구에서 먼저 전환하세요.

```sh
nvm install
nvm use
npm install --global npm@10.9.4
npm ci
npm run dev
```

`http://localhost:8000`에서 확인합니다. 패키지는 `package-lock.json`으로 관리하며 Yarn은 사용하지 않습니다.
Netlify는 `netlify.toml`의 Node/npm 버전과 `npm run build`, `public` 출력을 사용합니다.
Gatsby의 Sharp 하위 의존성도 `overrides`로 0.34.5에 통일합니다. 구형 Sharp의 GitHub libvips 다운로드 실패를 피하고, `.npmrc`의 `include=optional`로 플랫폼별 npm 바이너리를 설치합니다.
Git 연동 배포라면 설정된 운영 브랜치에 반영할 때 배포됩니다. 수동 업로드 방식이면
`npm run build` 후 `public` 폴더를 업로드하세요. 실제 계정의 Git 연동 여부는 대시보드에서 확인합니다.
GitHub Actions는 설치·테스트·타입 검사·운영 빌드를 검사합니다.

## 새 글 작성

```sh
npm run post:new -- coffee-notes "커피 기록" "취향" "일상"
npm run dev:drafts
```

`content/coffee-notes/index.md`를 생성하며 기존 폴더는 덮어쓰지 않습니다.
날짜는 한국 시간 기준이고 새 글은 항상 `draft: true`입니다.
초안은 일반 `npm run dev`와 운영 빌드에서 글·이미지 모두 제외됩니다.
`npm run dev:drafts`는 로컬 전용 미리보기입니다. 초안을 추가하거나 공개 여부를 바꾸면 개발 서버를 재시작하세요.
공개 GitHub 저장소에 커밋한 초안과 사진은 GitHub에서 볼 수 있습니다. 초안은 비밀 자료 보관 기능이 아닙니다.

```yaml
---
emoji: ☕
title: '커피 기록'
date: '2026-11-07'
categories: ['취향', '책과 영화']
featured: false
draft: true
---

## 본문
```

분류명은 배열로 적고 공백이 들어간 이름도 사용할 수 있습니다.
`featured-` 접두어 대신 `featured: true`를 사용합니다. 현재 화면은 추천 여부와 무관하게 최신순입니다.
기존 `/1/`, `/2/` 주소는 유지했습니다. 공개한 뒤 폴더 이름을 바꾸면 주소가 바뀌므로 주의하세요.
발행할 때 `draft: false`로 바꾸고 로컬 확인 후 운영 브랜치에 반영합니다.
미래 날짜는 예약 발행 기능이 아닙니다. 공개 여부는 `draft`로 결정됩니다.

## 사진 추가

```sh
npm run image:add -- coffee-notes "/사진/원본.jpg" "직접 내린 커피" --append
```

긴 변 최대 1600px, WebP 품질 82로 변환하고 회전을 보정하며 EXIF/GPS 메타데이터를 제거합니다.
원본은 변경하지 않으므로 원본을 글 폴더 밖에서 선택하세요. 변환한 파일만 글 폴더에 저장합니다.
`--append`는 이미지 Markdown을 본문 끝에 추가합니다. 생략하면 복사할 Markdown만 출력합니다.
파일명은 이미지 내용으로 정해져 같은 사진을 다시 가져와도 중복 파일이 생기지 않습니다.
설명에는 사진 내용을 입력하세요. GIF 등 움직이는 이미지는 정지 이미지로 처리합니다.
기존 글의 원본 사진은 보존했으며 자동으로 일괄 재압축하지 않습니다.

## 발행 전 확인

```sh
npm run content:check
npm test
npm run typecheck
npm run build
```

제목, 유효한 날짜, 분류 배열, 초안·추천 여부를 검사하고 문제가 있으면 빌드를 중단합니다.
글은 각각 `content/글주소/index.md`로 관리하세요. RSS는 `/rss.xml`에 게시글만 생성됩니다.
사이트맵과 RSS, 공유 URL의 기준 주소는 `gatsby-site-meta-data.ts`의 `siteUrl`입니다.

## 활동 기능 보관

활동 기능의 페이지 구현(`src/pages/activity.tsx`), 컴포넌트·훅, `activities/` 데이터는 보존합니다.
현재 웹에서는 메뉴와 홈 활동 섹션·데이터 조회를 제거했고, `gatsby-node.ts`의 `onCreatePage`에서
`/activity/` 페이지 생성을 막습니다. 직접 접속하면 404이며 사이트맵에도 포함되지 않습니다.
복원하려면 해당 페이지 제외 처리를 해제하고 메뉴·홈 섹션을 다시 연결하세요.

## 히어로 스티커 캔버스

높이 160px의 모눈 배너에서 렌즈는 왼쪽 22% 위치, 지름 184px, 확대율 1.28배입니다.
오른쪽에는 기니피그·클라이밍 홀드·암벽화·와인·드립커피 스티커 5개를 배치합니다.
렌즈 안쪽 반지름 80%는 기본 배치에서 비워두며, 시각적 균형과 간격을 평가해 무작위 배치를 선택합니다.
노트 위에서 마우스를 움직이면 렌즈가 짧게 버티다가 끌려와 가까운 스티커에 붙고,
노트를 벗어나면 왼쪽의 원래 위치로 돌아갑니다.
