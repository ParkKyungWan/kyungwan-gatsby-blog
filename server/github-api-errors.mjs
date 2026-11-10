// Report only known categories and request metadata, never tokens or submitted content.
export function githubFailure({ status, method, path, message = '', remaining, requestId }) {
  const where = `${method} ${path.split('?')[0]}`;
  const suffix = ` (GitHub ${status} · ${where}${requestId ? ` · 요청 ${requestId}` : ''})`;
  const issue = (text, code = 503) => Object.assign(new Error(text + suffix), { status: code, githubStatus: status });
  if (status === 401)
    return issue('GitHub 토큰 인증에 실패했어요. WRITE_GITHUB_TOKEN의 값과 만료 여부를 확인해 주세요.');
  if (status === 429 || (status === 403 && remaining === '0'))
    return issue('GitHub 요청 한도에 도달했어요. 잠시 후 다시 시도해 주세요.', 429);
  if (
    (status === 403 || status === 422) &&
    /protected branch|repository rule|rule violations|GH006|GH013|pull request|changes must be made through/i.test(
      message,
    )
  )
    return issue('main 브랜치 보호 규칙이 직접 발행을 차단했어요. 현재 토큰 계정에 허용된 발행 절차를 확인해 주세요.');
  if (status === 403)
    return issue(
      method === 'GET'
        ? 'GitHub 읽기 권한이 없어요. 토큰에 블로그 저장소 선택과 Contents 읽기 권한이 있는지 확인해 주세요.'
        : 'GitHub 쓰기 권한이 없어요. 토큰의 Repository access에 kyungwan-gatsby-blog를 선택하고 Contents를 Read and write로 설정해 주세요.',
    );
  if (status === 404)
    return issue(
      'Git 저장소·main·파일을 찾지 못했거나 토큰에 접근 권한이 없어요. 저장소 선택과 WRITE_GITHUB_REPOSITORY를 확인해 주세요.',
      404,
    );
  if (
    (status === 409 || status === 422) &&
    method === 'PATCH' &&
    path === '/git/refs/heads/main' &&
    /fast.?forward|reference update failed/i.test(message)
  )
    return issue('main이 변경됐어요. 다시 발행해 주세요.', 409);
  if (status === 422)
    return issue('GitHub가 파일·커밋 요청을 거절했어요. 표시된 실패 단계와 서버 로그를 확인해 주세요.', 422);
  if (status === 409) return issue('GitHub 저장소 상태가 발행 요청과 충돌했어요. 다시 불러온 뒤 발행해 주세요.', 409);
  return issue('GitHub 서버 요청에 실패했어요. 잠시 후 다시 시도해 주세요.', 502);
}
