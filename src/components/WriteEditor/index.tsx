import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Block, BlockType, Draft, Publication, isHeading, makeBlock, makeDraft } from './model';
import {
  DraftSummary,
  getDraft,
  imageBlockSource,
  listDrafts,
  login,
  saveDraft,
  session,
  uploadImage,
  publishDraft,
  unpublishDraft,
  listGitPosts,
  importGitPost,
  getPublication,
  GitPost,
} from './storage';
import { EditorSurface } from './styled';
import { insertUploadedPhoto, attachPhotosSequentially } from './photo-upload';
import PostArticle from '../PostArticle';
import PostClass from '../../models/post';
import { renderBlocks } from '../../utils/post-blocks';

const commands: { type: BlockType; icon: string; label: string; hint: string }[] = [
  { type: 'paragraph', icon: 'T', label: '본문', hint: '자유롭게 이어 쓰기' },
  { type: 'h1', icon: 'H₁', label: '큰 제목', hint: '글의 큰 흐름 나누기' },
  { type: 'h2', icon: 'H₂', label: '중간 제목', hint: '주제별로 정리하기' },
  { type: 'h3', icon: 'H₃', label: '작은 제목', hint: '조금 더 자세하게' },
  { type: 'image', icon: '▧', label: '사진', hint: '파일 첨부 · 붙여넣기' },
  { type: 'bullet', icon: '•', label: '목록', hint: '차례대로 적어두기' },
  { type: 'quote', icon: '❝', label: '인용', hint: '기억하고 싶은 문장' },
  { type: 'divider', icon: '—', label: '구분선', hint: '잠시 쉬어가는 자리' },
];
const message = (error: unknown) => (error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.');
const dateLabel = (time: number) =>
  new Date(time).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

type EditableProps = {
  block: Block;
  onChange: (text: string) => void;
  onFocus: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
};
function Editable({ block, onChange, onFocus, onKeyDown }: EditableProps) {
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (element.current && element.current.innerText !== block.text) element.current.textContent = block.text;
  }, [block.text]);
  return (
    <div
      ref={element}
      className={`editable ${block.type}`}
      data-edit-id={block.id}
      contentEditable
      suppressContentEditableWarning
      role='textbox'
      aria-multiline='true'
      aria-label={commands.find((c) => c.type === block.type)?.label || '본문'}
      data-placeholder={block.type === 'paragraph' ? "글을 쓰거나 '/'로 블록을 추가하세요" : '제목을 입력하세요'}
      onFocus={onFocus}
      onInput={(event) => onChange(event.currentTarget.innerText)}
      onKeyDown={onKeyDown}
      onPaste={(event) => {
        if (event.clipboardData.files.length) return;
        event.preventDefault();
        document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
      }}
    />
  );
}

export default function WriteEditor() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [drafts, setDrafts] = useState<DraftSummary[]>([]);
  const [auth, setAuth] = useState<'loading' | 'ready' | 'login' | 'setup' | 'error'>('loading');
  const [storage, setStorage] = useState('');
  const [gitConfigured, setGitConfigured] = useState(false);
  const [gitPosts, setGitPosts] = useState<GitPost[]>([]);
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'saved' | 'dirty' | 'saving' | 'error'>('saved');
  const [notice, setNotice] = useState('');
  const [active, setActive] = useState<string | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [menuIndex, setMenuIndex] = useState(0);
  const [showDrafts, setShowDrafts] = useState(false);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [showOutline, setShowOutline] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [publication, setPublication] = useState<Publication | null>(null);
  useEffect(() => {
    let cancelled = false;
    setPublication(draft?.publication ?? null);
    if (draft?.revision)
      void getPublication(draft.id)
        .then((value) => {
          if (!cancelled) setPublication(value);
        })
        .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [draft?.id]);
  useEffect(() => {
    if (!draft || publication?.state !== 'pending') return;
    let cancelled = false;
    const id = draft.id;
    const timer = setInterval(() => {
      void getPublication(id)
        .then((value) => {
          if (!cancelled) {
            setPublication(value);
            if (value?.state === 'published')
              setNotice(value.draft ? '공개 해제 배포가 완료됐어요.' : '발행이 완료됐어요.');
            else if (value?.state === 'failed')
              setNotice('배포에 실패했어요. Git 변경 내역과 배포 로그를 확인해 주세요.');
          }
        })
        .catch(() => {});
    }, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [draft?.id, publication?.commitSha, publication?.state]);
  const fileInput = useRef<HTMLInputElement>(null);
  const titleInput = useRef<HTMLTextAreaElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const current = useRef(draft);
  current.current = draft;
  const saved = useRef<Draft | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const pendingFocus = useRef<{ id: string; offset: number } | null>(null);
  const imageTarget = useRef<string | null>(null);
  const saving = useRef(0);
  const uploading = useRef(false);
  const pendingSaves = useRef(new WeakMap<Draft, Promise<boolean>>());

  const load = useCallback(async () => {
    setNotice('');
    setAuth('loading');
    try {
      const state = await session();
      setStorage(state.storage);
      setGitConfigured(state.gitConfigured);
      if (!state.configured) {
        setAuth('setup');
        return;
      }
      if (!state.signedIn) {
        setAuth('login');
        return;
      }
      const list = await listDrafts();
      setDrafts(list);
      const initial = list.length ? await getDraft(list[0].id) : makeDraft();
      saved.current = list.length ? initial : null;
      setDraft(initial);
      setActive(initial.blocks[0]?.id ?? null);
      setAuth('ready');
    } catch (error) {
      setNotice(message(error));
      setAuth('error');
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const persist = useCallback((snapshot: Draft): Promise<boolean> => {
    const pending = pendingSaves.current.get(snapshot);
    if (pending) return pending;
    if (saved.current === snapshot) return Promise.resolve(true);
    const task = (async () => {
      saving.current++;
      setStatus('saving');
      try {
        const result = await saveDraft(snapshot);
        const enriched = {
          ...snapshot,
          files: result.files,
          revision: result.revision,
          ...(snapshot.markdown === undefined
            ? {}
            : { title: result.title, category: result.category, emoji: result.emoji }),
        };
        saved.current = current.current === snapshot ? enriched : snapshot;
        if (current.current === snapshot) {
          current.current = enriched;
          setDraft(enriched);
        }
        setDrafts((list) => [
          { id: result.id, title: result.title, category: result.category, updatedAt: result.updatedAt },
          ...list.filter((item) => item.id !== result.id),
        ]);
        if (current.current === enriched) {
          setStatus('saved');
          setNotice('');
        }
        return true;
      } catch (error) {
        setStatus('error');
        setNotice(message(error));
        return false;
      } finally {
        saving.current--;
      }
    })();
    pendingSaves.current.set(snapshot, task);
    void task.finally(() => pendingSaves.current.delete(snapshot));
    return task;
  }, []);
  useEffect(() => {
    if (!draft || auth !== 'ready' || saved.current === draft) return;
    setStatus('dirty');
    timer.current = setTimeout(() => {
      void persist(draft);
    }, 900);
    return () => clearTimeout(timer.current);
  }, [draft, auth, persist]);
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => {
      if (current.current && (saved.current !== current.current || saving.current || uploading.current)) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    const outside = (event: PointerEvent) => {
      if (!(event.target as Element).closest('[data-block-menu]')) setMenu(null);
      if (!(event.target as Element).closest('[data-emoji-picker]')) setShowEmoji(false);
    };
    const navigate = (event: MouseEvent) => {
      const link = (event.target as Element).closest<HTMLAnchorElement>('a[href]');
      const snapshot = current.current;
      if (
        uploading.current &&
        link &&
        !link.getAttribute('href')?.startsWith('#') &&
        link.target !== '_blank' &&
        !link.hasAttribute('download')
      ) {
        event.preventDefault();
        event.stopPropagation();
        setNotice('사진 첨부가 끝난 뒤 이동해 주세요.');
        return;
      }
      if (
        !link ||
        !snapshot ||
        saved.current === snapshot ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        link.target === '_blank' ||
        link.hasAttribute('download') ||
        link.getAttribute('href')?.startsWith('#')
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      clearTimeout(timer.current);
      void persist(snapshot).then((success) => {
        if (success && current.current === snapshot) window.location.assign(link.href);
      });
    };
    const hidden = () => {
      if (document.visibilityState === 'hidden' && current.current && saved.current !== current.current) {
        clearTimeout(timer.current);
        void persist(current.current);
      }
    };
    document.addEventListener('click', navigate, true);
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('beforeunload', unload);
    document.addEventListener('pointerdown', outside);
    return () => {
      document.removeEventListener('click', navigate, true);
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('beforeunload', unload);
      document.removeEventListener('pointerdown', outside);
    };
  }, [persist]);
  useEffect(() => {
    if (!pendingFocus.current || preview) return;
    const { id, offset } = pendingFocus.current;
    const element = root.current?.querySelector<HTMLElement>(`[data-edit-id="${id}"]`);
    if (!element) return;
    element.focus({ preventScroll: true });
    const selection = window.getSelection();
    const range = document.createRange();
    if (element.firstChild)
      range.setStart(element.firstChild, Math.min(offset, element.firstChild.textContent?.length ?? 0));
    else range.setStart(element, 0);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
    pendingFocus.current = null;
  }, [draft, preview]);
  useEffect(() => {
    const resizeTitle = () => {
      if (titleInput.current) {
        titleInput.current.style.height = 'auto';
        titleInput.current.style.height = `${titleInput.current.scrollHeight}px`;
      }
    };
    resizeTitle();
    window.addEventListener('resize', resizeTitle);
    return () => window.removeEventListener('resize', resizeTitle);
  }, [draft?.title, preview]);
  const change = (update: (value: Draft) => Draft) =>
    setDraft((value) => (value ? { ...update(value), updatedAt: Date.now() } : value));
  const updateBlock = (id: string, update: Partial<Block>) =>
    change((value) => ({
      ...value,
      blocks: value.blocks.map((block) => (block.id === id ? { ...block, ...update } : block)),
    }));
  const focus = (id: string, offset = 0) => {
    pendingFocus.current = { id, offset };
    setActive(id);
  };
  const addAfter = (id: string, block = makeBlock()) => {
    focus(block.id);
    change((value) => {
      const blocks = [...value.blocks];
      blocks.splice(blocks.findIndex((b) => b.id === id) + 1, 0, block);
      return { ...value, blocks };
    });
    setMenu(null);
  };
  const choose = (id: string, type: BlockType) => {
    setMenu(null);
    if (type === 'image') {
      imageTarget.current = id;
      fileInput.current?.click();
      return;
    }
    focus(id);
    updateBlock(id, {
      type,
      text: current.current?.blocks.find((b) => b.id === id)?.text.startsWith('/')
        ? ''
        : current.current?.blocks.find((b) => b.id === id)?.text || '',
    });
    if (type === 'divider') addAfter(id);
  };
  const removeBlock = (id: string) =>
    change((value) => {
      const index = value.blocks.findIndex((b) => b.id === id);
      const blocks = value.blocks.filter((b) => b.id !== id);
      if (!blocks.length) blocks.push(makeBlock());
      const previous = blocks[Math.max(0, index - 1)];
      focus(previous.id, previous.text.length);
      return { ...value, blocks };
    });
  const moveBlock = (id: string, direction: number) =>
    change((value) => {
      const blocks = [...value.blocks];
      const index = blocks.findIndex((b) => b.id === id);
      const next = index + direction;
      if (next >= 0 && next < blocks.length) [blocks[index], blocks[next]] = [blocks[next], blocks[index]];
      return { ...value, blocks };
    });
  const attach = async (files: FileList | File[]) => {
    if (!files.length || !draft || busy || uploading.current) return;
    const targetDraft = draft.id;
    let cursor = imageTarget.current ?? active;
    uploading.current = true;
    setBusy(true);
    clearTimeout(timer.current);
    const failures: string[] = [];
    try {
      const result = await attachPhotosSequentially(Array.from(files), {
        prepare: imageBlockSource,
        upload: (data) => uploadImage(targetDraft, data),
        progress: (index, total) => setNotice(`사진 ${index}/${total} · 첨부한 사진부터 저장하고 있어요…`),
        failure: (file, error) => failures.push(`${file.name}: ${message(error)}`),
        commit: async (file, uploaded) => {
          const latest = current.current;
          if (!latest || latest.id !== targetDraft) throw new Error('편집 중인 글이 변경됐어요.');
          const photo = { ...makeBlock('image'), ...uploaded, alt: file.name };
          const name = decodeURIComponent(uploaded.src.split('/').pop()!);
          const next =
            latest.markdown !== undefined
              ? { ...latest, markdown: latest.markdown + `\n\n![](<./${name}>)\n`, updatedAt: Date.now() }
              : insertUploadedPhoto(latest, photo, cursor);
          cursor = photo.id;
          clearTimeout(timer.current);
          current.current = next;
          setDraft(next);
          if (!(await persist(next)))
            throw new Error('초안 저장이 완료되지 않아 나머지 첨부를 멈췄어요. 연결을 확인한 뒤 저장해 주세요.');
        },
      });
      setNotice(`${result.saved}장의 사진을 첨부하고 저장했어요.${failures.length ? ` ${failures.join(' / ')}` : ''}`);
    } catch (error) {
      setNotice(message(error));
    } finally {
      uploading.current = false;
      setBusy(false);
      imageTarget.current = null;
      if (fileInput.current) fileInput.current.value = '';
    }
  };
  const handleKey = (event: React.KeyboardEvent<HTMLDivElement>, block: Block) => {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (menu === block.id) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        setMenuIndex((index) => (index + (event.key === 'ArrowDown' ? 1 : commands.length - 1)) % commands.length);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setMenu(null);
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        choose(block.id, commands[menuIndex].type);
        return;
      }
    }
    if (event.key === ' ' && ['#', '##', '###', '>', '-'].includes(block.text)) {
      event.preventDefault();
      focus(block.id);
      updateBlock(block.id, {
        type: ({ '#': 'h1', '##': 'h2', '###': 'h3', '>': 'quote', '-': 'bullet' } as Record<string, BlockType>)[
          block.text
        ],
        text: '',
      });
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      const selection = window.getSelection();
      const before = document.createRange();
      before.selectNodeContents(event.currentTarget);
      let start = block.text.length,
        end = start;
      if (selection?.rangeCount && event.currentTarget.contains(selection.anchorNode)) {
        const selected = selection.getRangeAt(0);
        before.setEnd(selected.startContainer, selected.startOffset);
        start = before.toString().length;
        end = start + selected.toString().length;
      }
      if (!block.text && block.type !== 'paragraph') {
        updateBlock(block.id, { type: 'paragraph' });
        return;
      }
      const next = makeBlock(block.type === 'bullet' ? 'bullet' : 'paragraph', block.text.slice(end));
      focus(next.id);
      change((value) => {
        const index = value.blocks.findIndex((b) => b.id === block.id);
        const blocks = [...value.blocks];
        blocks.splice(index, 1, { ...block, text: block.text.slice(0, start) }, next);
        return { ...value, blocks };
      });
    }
    if (event.key === 'Backspace' && !block.text) {
      event.preventDefault();
      if (block.type !== 'paragraph') updateBlock(block.id, { type: 'paragraph' });
      else removeBlock(block.id);
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      clearTimeout(timer.current);
      if (current.current) void persist(current.current);
    }
  };
  const switchDraft = async (id?: string) => {
    clearTimeout(timer.current);
    setBusy(true);
    try {
      if (current.current && !(await persist(current.current))) return;
      const next = id ? await getDraft(id) : makeDraft();
      saved.current = id ? next : null;
      setDraft(next);
      setStatus(id ? 'saved' : 'dirty');
      setActive(next.blocks[0]?.id ?? null);
      setPreview(false);
      setMenu(null);
      setShowDrafts(false);
      setNotice('');
    } catch (error) {
      setNotice(message(error));
    } finally {
      setBusy(false);
    }
  };
  const importPost = async (slug: string, replace = false) => {
    if (busy) return;
    clearTimeout(timer.current);
    setBusy(true);
    try {
      if (current.current && !(await persist(current.current))) return;
      const next = await importGitPost(slug, replace);
      saved.current = next;
      current.current = next;
      setDraft(next);
      setPublication(next.publication ?? null);
      setStatus('saved');
      setPreview(false);
      setShowDrafts(false);
      setDrafts(await listDrafts());
      setNotice('Git 원문을 불러왔어요. 수정 내용은 발행할 때만 main에 반영됩니다.');
    } catch (error) {
      setNotice(message(error));
    } finally {
      setBusy(false);
    }
  };
  const publish = async () => {
    const snapshot = current.current;
    if (!snapshot || busy) return;
    clearTimeout(timer.current);
    setBusy(true);
    setNotice('');
    try {
      if (!(await persist(snapshot))) return;
      if (current.current !== saved.current) {
        setNotice('작성 중인 변경을 저장한 뒤 다시 발행해 주세요.');
        return;
      }
      const result = await publishDraft(snapshot);
      setPublication(result);
      setNotice('main에 반영했어요. Gatsby 빌드·배포가 끝나면 사이트에 공개됩니다.');
    } catch (error) {
      setNotice(message(error));
    } finally {
      setBusy(false);
    }
  };
  const unpublish = async () => {
    if (!draft || (!publication && !draft.origin) || busy) return;
    setBusy(true);
    try {
      clearTimeout(timer.current);
      if (!(await persist(draft))) return;
      const result = await unpublishDraft(draft.id, draft.revision ?? publication?.revision ?? 0);
      setPublication(result);
      setNotice('공개 해제를 main에 반영했어요. 배포가 끝나면 사이트에서 내려갑니다.');
    } catch (error) {
      setNotice(message(error));
    } finally {
      setBusy(false);
    }
  };
  if (auth !== 'ready' || !draft)
    return (
      <EditorSurface>
        <div className='gate'>
          <span className='eyebrow'>WRITE / YOUR SPACE</span>
          <h1>
            {auth === 'login'
              ? '관리자 로그인'
              : auth === 'setup'
              ? '글을 담을 준비.'
              : auth === 'error'
              ? '연결을 확인해 주세요.'
              : '글을 불러오고 있어요.'}
          </h1>
          {auth === 'login' && <p>글 작성과 관리는 로그인 후 이용할 수 있어요.</p>}
          {auth === 'login' && (
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                setBusy(true);
                try {
                  await login(password);
                  setPassword('');
                  await load();
                } catch (error) {
                  setNotice(message(error));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label htmlFor='writer-password'>글쓰기 비밀번호</label>
              <input
                id='writer-password'
                type='password'
                autoComplete='current-password'
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button className='primary' disabled={busy}>
                글쓰기 시작
              </button>
            </form>
          )}
          {auth === 'setup' && <p>서버 저장과 로그인 설정을 마치면 이곳에서 글을 쓸 수 있어요.</p>}
          {notice && <p role='alert'>{notice}</p>}
          {auth === 'error' && <button onClick={() => void load()}>다시 연결</button>}
        </div>
      </EditorSurface>
    );
  const headings = draft.blocks.filter((block) => isHeading(block) && block.text.trim());
  const activeBlock = draft.blocks.find((block) => block.id === active);
  return (
    <EditorSurface
      ref={root}
      onPaste={(event) => {
        if (preview || !event.clipboardData.files.length) return;
        event.preventDefault();
        void attach(event.clipboardData.files);
      }}
      onDragOver={(event) => {
        if (!preview && event.dataTransfer.types.includes('Files')) {
          event.preventDefault();
          setDragging(true);
        }
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (!preview) void attach(event.dataTransfer.files);
      }}
    >
      <header className='writer-bar'>
        <div className='bar-actions'>
          <button onClick={() => setShowDrafts(!showDrafts)} aria-expanded={showDrafts} disabled={busy}>
            내 글 <span className='count'>{drafts.length}</span>
          </button>
          <button
            onClick={() => {
              setPreview(!preview);
              setMenu(null);
            }}
            aria-pressed={preview}
          >
            {draft.markdown !== undefined
              ? preview
                ? '원문 편집'
                : '원문 읽기'
              : preview
              ? '이어서 쓰기'
              : '미리보기'}
          </button>
          <button
            disabled={busy || status === 'saving'}
            onClick={() => {
              clearTimeout(timer.current);
              void persist(draft);
            }}
          >
            저장
          </button>
          <button className='primary' disabled={busy || status === 'saving'} onClick={() => void publish()}>
            {publication && !publication.draft ? '업데이트' : '발행'}
          </button>
        </div>
      </header>
      {!gitConfigured && (
        <p className='storage-note'>임시저장은 가능합니다. 발행하려면 서버에 GitHub 연결을 설정해 주세요.</p>
      )}
      {showDrafts && (
        <section className='draft-panel' aria-label='저장한 글'>
          <div className='panel-heading'>
            <h2>나의 이야기</h2>
            {publication && !publication.draft && (
              <button disabled={busy} onClick={() => void unpublish()}>
                공개 해제
              </button>
            )}
            <button disabled={busy} onClick={() => void switchDraft()}>
              ＋ 새 글
            </button>
          </div>
          {drafts.length === 0 ? (
            <p className='muted'>첫 문장부터 차곡차곡 저장할게요.</p>
          ) : (
            <div className='draft-list'>
              {drafts.map((item) => (
                <button
                  className={item.id === draft.id ? 'selected' : ''}
                  key={item.id}
                  disabled={busy}
                  onClick={() => void switchDraft(item.id)}
                >
                  <span>{item.title || '제목 없는 글'}</span>
                  <time>{dateLabel(item.updatedAt)}</time>
                </button>
              ))}
            </div>
          )}
          <div className='panel-heading'>
            <h3>Git에 저장된 글</h3>
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  setGitPosts(await listGitPosts());
                } catch (error) {
                  setNotice(message(error));
                } finally {
                  setBusy(false);
                }
              }}
            >
              기존 글 불러오기
            </button>
          </div>
          <div className='draft-list'>
            {gitPosts.map((item) => (
              <button key={item.slug} disabled={busy} onClick={() => void importPost(item.slug)}>
                <span>{item.title}</span>
                <span>
                  /{item.slug}/ {item.draft ? '· 비공개' : ''}
                </span>
              </button>
            ))}
          </div>
          <p className='storage-note'>
            {storage === 'local-server'
              ? '이 컴퓨터의 로컬 서버에 저장하고 있어요.'
              : '서버에 저장되어 다른 기기에서도 이어 쓸 수 있어요.'}
          </p>
        </section>
      )}
      {draft.markdown !== undefined ? (
        <section className='source-editor'>
          <div className='panel-heading'>
            <h2>{draft.title || 'Markdown 원문'}</h2>
            {draft.origin && !publication && !draft.origin.draft && (
              <button disabled={busy} onClick={() => void unpublish()}>
                공개 해제
              </button>
            )}
            <button disabled={busy} onClick={() => fileInput.current?.click()}>
              사진 첨부
            </button>
            {draft.origin && (
              <button
                disabled={busy}
                onClick={() => {
                  if (window.confirm('현재 임시저장본을 버리고 Git의 최신 원문을 다시 불러올까요?'))
                    void importPost(draft.origin!.slug, true);
                }}
              >
                Git 원문 다시 불러오기
              </button>
            )}
          </div>
          <p className='storage-note'>
            기존 문법과 Frontmatter를 원문 그대로 보존합니다. 사진은 아래 파일명을 상대 경로로 참조하세요.
          </p>
          <textarea
            aria-label='Markdown 원문'
            value={draft.markdown}
            readOnly={busy || preview}
            onChange={(event) => change((value) => ({ ...value, markdown: event.target.value }))}
            spellCheck={false}
          />
          <div className='source-files'>
            {Object.keys(draft.files || {}).map((name) => (
              <a
                key={name}
                href={`/api/write/drafts/${draft.id}/files/${name.split('/').map(encodeURIComponent).join('/')}`}
                target='_blank'
                rel='noopener noreferrer'
              >
                {name}
              </a>
            ))}
          </div>
        </section>
      ) : preview ? (
        <div className='original-post-preview'>
          <PostArticle
            post={
              new PostClass({
                id: draft.id,
                excerpt: '',
                html: renderBlocks(draft.blocks),
                fields: { slug: publication?.slug || '/write/' },
                frontmatter: {
                  title: draft.title || '제목 없는 글',
                  author: 'KyungWan',
                  emoji: draft.emoji ?? '📝',
                  categories: draft.category ? [draft.category] : [],
                  date: new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' })
                    .format(new Date(publication?.publishedAt || draft.updatedAt))
                    .replace(/-/g, '.'),
                },
              })
            }
          />
        </div>
      ) : (
        <>
          <div className='document-meta'>
            <span className='meta-label'>분류</span>
            {preview ? (
              <span>{draft.category || '미분류'}</span>
            ) : (
              <input
                aria-label='글 분류'
                placeholder='어떤 이야기인가요?'
                value={draft.category}
                maxLength={100}
                onChange={(event) => change((value) => ({ ...value, category: event.target.value }))}
              />
            )}
            <span className='meta-date'>
              {new Date(draft.updatedAt).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
          <div className='emoji-area' data-emoji-picker>
            {preview ? (
              (draft.emoji ?? '📝') && <div className='post-emoji'>{draft.emoji ?? '📝'}</div>
            ) : (
              <>
                <button
                  className={`emoji-trigger ${draft.emoji ?? '📝' ? '' : 'empty'}`}
                  aria-label='메인 이모지 고르기'
                  aria-expanded={showEmoji}
                  onClick={() => setShowEmoji(!showEmoji)}
                >
                  {draft.emoji ?? '📝'}
                  {draft.emoji === '' && '＋ 이모지'}
                </button>
                {showEmoji && (
                  <div className='emoji-menu' role='dialog' aria-label='메인 이모지 선택'>
                    <div className='emoji-menu-title'>이 글을 표현하는 이모지</div>
                    <div className='emoji-grid'>
                      {[
                        '📝',
                        '☕',
                        '🍷',
                        '🧗',
                        '📷',
                        '📚',
                        '🎨',
                        '🎧',
                        '💭',
                        '✨',
                        '🌿',
                        '🌙',
                        '☀️',
                        '🌊',
                        '🍃',
                        '🐹',
                        '🏡',
                        '✈️',
                        '🚶',
                        '💻',
                        '🎬',
                        '🍽️',
                        '❤️',
                        '🙂',
                      ].map((emoji) => (
                        <button
                          key={emoji}
                          aria-label={`${emoji} 선택`}
                          aria-pressed={draft.emoji === emoji}
                          onClick={() => {
                            change((value) => ({ ...value, emoji }));
                            setShowEmoji(false);
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <label className='custom-emoji'>
                      직접 입력
                      <input
                        aria-label='메인 이모지 직접 입력'
                        placeholder='이모지 붙여넣기'
                        value={draft.emoji ?? '📝'}
                        maxLength={32}
                        onChange={(event) => change((value) => ({ ...value, emoji: event.target.value }))}
                      />
                    </label>
                    <button
                      className='remove-emoji'
                      onClick={() => {
                        change((value) => ({ ...value, emoji: '' }));
                        setShowEmoji(false);
                      }}
                    >
                      이모지 없이 쓰기
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
          {preview ? (
            <h1 className='document-title'>{draft.title || '제목 없는 글'}</h1>
          ) : (
            <textarea
              ref={titleInput}
              className='document-title title-input'
              aria-label='글 제목'
              placeholder='제목 없는 글'
              rows={1}
              maxLength={300}
              value={draft.title}
              onChange={(event) => {
                event.target.style.height = 'auto';
                event.target.style.height = `${event.target.scrollHeight}px`;
                change((value) => ({ ...value, title: event.target.value }));
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  const first = draft.blocks.find((b) => b.type !== 'image' && b.type !== 'divider');
                  if (first) {
                    focus(first.id);
                    setDraft({ ...draft });
                  }
                }
              }}
            />
          )}
          {!preview && (
            <nav className='format-bar' aria-label='블록 도구'>
              {commands
                .filter((command) => ['paragraph', 'h1', 'h2', 'image', 'quote', 'bullet'].includes(command.type))
                .map((command) => (
                  <button
                    key={command.type}
                    aria-label={`${command.label} 블록 넣기`}
                    title={command.label}
                    aria-pressed={activeBlock?.type === command.type}
                    disabled={busy}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(active || draft.blocks[0].id, command.type)}
                  >
                    {command.icon}
                  </button>
                ))}
              <button
                className='outline-toggle'
                onClick={() => setShowOutline(!showOutline)}
                aria-expanded={showOutline}
              >
                목차
              </button>
            </nav>
          )}
          {preview && (
            <button
              className='preview-outline-toggle'
              onClick={() => setShowOutline(!showOutline)}
              aria-expanded={showOutline}
            >
              이 글의 목차 {showOutline ? '−' : '＋'}
            </button>
          )}
          <aside className={`outline ${showOutline ? 'open' : ''}`} aria-label='글 목차'>
            <div className='outline-label'>이 글의 흐름</div>
            {headings.length ? (
              headings.map((block) => (
                <button
                  key={block.id}
                  className={`${block.type} ${active === block.id ? 'current' : ''}`}
                  onClick={() => {
                    document
                      .getElementById(`block-${block.id}`)
                      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setActive(block.id);
                  }}
                >
                  {block.text}
                </button>
              ))
            ) : (
              <p>
                제목을 넣으면
                <br />
                목차가 생겨요.
              </p>
            )}
          </aside>
          <article
            className={`writing-body ${preview ? 'preview' : ''}`}
            aria-label={preview ? '글 미리보기' : '본문 편집'}
          >
            {draft.blocks.map((block, index) => (
              <div
                id={`block-${block.id}`}
                key={block.id}
                className={`block ${block.type}-block ${active === block.id ? 'active' : ''}`}
              >
                {!preview && (
                  <div className='block-handle' data-block-menu>
                    <button
                      aria-label='블록 추가'
                      onClick={() => {
                        if (block.type === 'paragraph' && !block.text) {
                          setMenu(menu === block.id ? null : block.id);
                          setActive(block.id);
                        } else {
                          const next = makeBlock();
                          addAfter(block.id, next);
                          setMenu(next.id);
                        }
                        setMenuIndex(0);
                      }}
                    >
                      ＋
                    </button>
                    <details>
                      <summary aria-label='블록 이동 및 삭제'>⠿</summary>
                      <div className='block-options'>
                        <button disabled={!index} onClick={() => moveBlock(block.id, -1)}>
                          위로 이동
                        </button>
                        <button disabled={index === draft.blocks.length - 1} onClick={() => moveBlock(block.id, 1)}>
                          아래로 이동
                        </button>
                        <button onClick={() => removeBlock(block.id)}>블록 삭제</button>
                      </div>
                    </details>
                  </div>
                )}
                {block.type === 'image' ? (
                  <figure>
                    <img
                      src={block.src}
                      width={block.width}
                      height={block.height}
                      alt={block.alt || block.text || '첨부 사진'}
                      loading='lazy'
                      decoding='async'
                    />
                    {block.text && <figcaption>{block.text}</figcaption>}
                  </figure>
                ) : block.type === 'divider' ? (
                  <hr />
                ) : preview ? (
                  React.createElement(
                    isHeading(block) ? block.type : block.type === 'quote' ? 'blockquote' : 'p',
                    { className: block.type },
                    block.type === 'bullet' ? `• ${block.text}` : block.text || '\u00a0',
                  )
                ) : (
                  <Editable
                    block={block}
                    onFocus={() => setActive(block.id)}
                    onChange={(text) => {
                      updateBlock(block.id, { text });
                      if (text === '/') {
                        setMenu(block.id);
                        setMenuIndex(0);
                      } else if (menu === block.id && !text.startsWith('/')) setMenu(null);
                    }}
                    onKeyDown={(event) => handleKey(event, block)}
                  />
                )}
                {!preview && menu === block.id && (
                  <div className='command-menu' data-block-menu role='menu' aria-label='블록 종류'>
                    <span className='menu-heading'>무엇을 담을까요?</span>
                    {commands.map((command, i) => (
                      <button
                        role='menuitem'
                        className={menuIndex === i ? 'highlighted' : ''}
                        key={command.type}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => choose(block.id, command.type)}
                        onMouseEnter={() => setMenuIndex(i)}
                      >
                        <span className='command-icon'>{command.icon}</span>
                        <span>
                          <strong>{command.label}</strong>
                          <small>{command.hint}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </article>
          {!preview && (
            <button
              className='end-block'
              disabled={busy}
              onClick={() => addAfter(draft.blocks[draft.blocks.length - 1].id)}
            >
              ＋ 다음 문장 이어 쓰기
            </button>
          )}
        </>
      )}
      <button
        type='button'
        className='back-to-top'
        onClick={() => {
          window.scrollTo({
            top: 0,
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
          });
        }}
      >
        맨 위로 ↑
      </button>
      {notice && (
        <div className='notice' role={status === 'error' ? 'alert' : 'status'}>
          {notice}
          {status === 'error' && <button onClick={() => void persist(draft)}>다시 저장</button>}
        </div>
      )}
      {dragging && (
        <div className='drop-overlay'>
          <span>사진을 여기에 놓아주세요</span>
        </div>
      )}
      <input
        ref={fileInput}
        hidden
        type='file'
        accept='image/*'
        multiple
        onChange={(event) => {
          if (event.target.files) void attach(event.target.files);
        }}
      />
    </EditorSurface>
  );
}
