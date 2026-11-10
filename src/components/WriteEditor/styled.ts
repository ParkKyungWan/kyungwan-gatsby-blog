import styled from '@emotion/styled';

export const EditorSurface = styled.div`
  --ink: ${({ theme }) => theme.color.black100};
  --muted: ${({ theme }) => theme.color.gray80};
  --line: ${({ theme }) => theme.color.gray20};
  --soft: ${({ theme }) => theme.color.gray10};
  --paper: ${({ theme }) => theme.color.white100};
  width: 100%;
  touch-action: manipulation;
  position: relative;
  color: var(--ink);
  padding: 0 12px 72px;
  font-family: 'Noto Sans KR', sans-serif;
  font-size: 14px;
  button,
  input,
  textarea {
    font: inherit;
    color: inherit;
  }
  button {
    border: 0;
    background: transparent;
    cursor: pointer;
    border-radius: 6px;
    transition: background 120ms, opacity 120ms;
  }
  button:hover {
    background: var(--soft);
  }
  button:disabled {
    cursor: default;
    opacity: 0.4;
  }
  button:focus-visible,
  input:focus-visible,
  textarea:focus-visible,
  summary:focus-visible {
    outline: 2px solid var(--muted);
    outline-offset: 3px;
  }
  input,
  textarea {
    background: transparent;
    border: 0;
    border-radius: 0;
    outline: none;
  }
  input::placeholder,
  textarea::placeholder {
    color: ${({ theme }) => theme.color.gray40};
  }
  .writer-bar {
    border-top: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
    padding: 16px 0;
    margin-bottom: 24px;
  }
  .bar-actions {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    width: 100%;
  }
  .bar-actions button {
    min-height: 48px;
    padding: 12px 16px;
    font-size: 14px;
    white-space: nowrap;
  }
  .eyebrow {
    font-size: 10px;
    letter-spacing: 0.18em;
    color: var(--muted);
  }
  .count {
    color: var(--muted);
    margin-left: 4px;
    font-variant-numeric: tabular-nums;
  }
  button.primary {
    background: var(--ink);
    color: var(--paper);
    padding: 8px 16px;
  }
  button.primary:hover {
    opacity: 0.85;
  }
  .original-post-preview {
    font-family: GmarketSansMedium, sans-serif;
  }
  .document-meta {
    display: flex;
    align-items: center;
    gap: 13px;
    color: var(--muted);
    font-size: 12px;
    margin-bottom: 20px;
  }
  .meta-label {
    font-size: 10px;
    color: ${({ theme }) => theme.color.gray60};
  }
  .document-meta input {
    min-width: 0;
    flex: 1;
    font-size: 12px;
    padding: 5px 0;
  }
  .meta-date {
    margin-left: auto;
    white-space: nowrap;
    font-size: 11px;
  }
  .emoji-area {
    position: relative;
    margin: 0 0 18px;
  }
  .post-emoji,
  .emoji-trigger {
    font-size: 44px;
    line-height: 1.3;
  }
  .emoji-trigger {
    padding: 3px 8px;
    margin-left: -8px;
  }
  .emoji-trigger.empty {
    font-size: 12px;
    color: var(--muted);
  }
  .emoji-menu {
    position: absolute;
    top: 100%;
    left: 0;
    width: 285px;
    max-width: 100%;
    z-index: 25;
    background: var(--paper);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 14px;
    box-shadow: 0 8px 32px #00000015;
  }
  .emoji-menu-title {
    color: var(--muted);
    font-size: 11px;
    margin: 2px 0 12px;
  }
  .emoji-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 3px;
  }
  .emoji-grid button {
    font-size: 23px;
    padding: 7px 0;
  }
  .emoji-grid button[aria-pressed='true'] {
    background: var(--soft);
  }
  .custom-emoji {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 11px;
    color: var(--muted);
    border-top: 1px solid var(--line);
    margin-top: 12px;
    padding-top: 12px;
  }
  .custom-emoji input {
    flex: 1;
    width: 0;
    font-size: 18px;
    padding: 6px;
    background: var(--soft);
    border-radius: 4px;
  }
  .remove-emoji {
    font-size: 11px;
    color: var(--muted);
    margin-top: 12px;
    padding: 7px;
  }
  .document-title {
    font-size: 38px;
    line-height: 1.45;
    font-weight: 600;
    letter-spacing: -0.055em;
    margin: 0 0 29px;
    overflow-wrap: anywhere;
  }
  .title-input {
    display: block;
    width: 100%;
    min-height: 58px;
    resize: none;
    overflow: hidden;
  }
  .format-bar {
    display: flex;
    align-items: center;
    gap: 4px;
    border-bottom: 1px solid var(--line);
    padding: 9px 0 13px;
    margin-bottom: 28px;
  }
  .format-bar button {
    min-width: 32px;
    height: 30px;
    font-family: Georgia, serif;
    font-size: 17px;
    color: var(--muted);
  }
  .format-bar button[aria-pressed='true'] {
    color: var(--ink);
    background: var(--soft);
  }
  .format-bar .outline-toggle {
    display: none;
    margin-left: auto;
    font-family: inherit;
    font-size: 11px;
  }
  .writing-body {
    min-height: 280px;
    padding-bottom: 30px;
    overflow-wrap: anywhere;
  }
  .block {
    position: relative;
    margin: 3px 0;
    scroll-margin-top: 110px;
  }
  .editable,
  .preview p {
    outline: none;
    padding: 4px 0;
    min-height: 36px;
    line-height: 1.95;
    white-space: pre-wrap;
    font-size: 16px;
    letter-spacing: -0.025em;
    word-break: break-word;
  }
  .editable:empty::before {
    content: attr(data-placeholder);
    color: ${({ theme }) => theme.color.gray40};
    pointer-events: none;
  }
  .editable.h1,
  .preview h1 {
    font-size: 28px;
    font-weight: 600;
    line-height: 1.55;
    letter-spacing: -0.045em;
  }
  .editable.h2,
  .preview h2 {
    font-size: 23px;
    font-weight: 500;
    line-height: 1.6;
    letter-spacing: -0.04em;
  }
  .editable.h3,
  .preview h3 {
    font-size: 19px;
    font-weight: 500;
    line-height: 1.6;
    letter-spacing: -0.03em;
  }
  .h1-block,
  .h2-block,
  .h3-block {
    margin-top: 34px;
    margin-bottom: 10px;
  }
  .h1-block:first-child,
  .h2-block:first-child,
  .h3-block:first-child {
    margin-top: 0;
  }
  .bullet-block {
    padding-left: 20px;
  }
  .bullet-block::before {
    content: '•';
    position: absolute;
    left: 3px;
    top: 9px;
  }
  .preview .bullet-block {
    padding-left: 0;
  }
  .preview .bullet-block::before {
    display: none;
  }
  .quote-block {
    border-left: 2px solid ${({ theme }) => theme.color.gray40};
    padding-left: 20px;
    margin: 24px 0;
    color: var(--muted);
  }
  .block hr {
    border: 0;
    border-top: 1px solid var(--line);
    margin: 34px 0;
  }
  .block figure {
    margin: 28px 0;
  }
  .block img {
    display: block;
    max-width: 100%;
    max-height: 800px;
    width: auto;
    height: auto;
    margin: 0 auto;
    border-radius: 5px;
  }
  figcaption {
    display: block;
    width: 100%;
    text-align: center;
    padding: 12px 0;
    color: var(--muted);
    font-size: 12px;
    line-height: 1.6;
  }
  .block-handle {
    position: absolute;
    right: 100%;
    margin-right: 6px;
    top: 5px;
    display: flex;
    gap: 0;
    opacity: 0;
    transition: opacity 100ms;
  }
  .block:hover .block-handle,
  .block:focus-within .block-handle {
    opacity: 1;
  }
  .block-handle > button,
  .block-handle summary {
    width: 32px;
    height: 41px;
    display: grid;
    place-items: center;
    font-size: 23px;
    color: var(--muted);
    cursor: pointer;
    border-radius: 4px;
  }
  summary {
    list-style: none;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  .block-handle details[open] {
    z-index: 12;
  }
  .block-options {
    position: absolute;
    left: 0;
    top: 46px;
    width: 135px;
    padding: 5px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--paper);
    box-shadow: 0 8px 30px #00000010;
  }
  .block-options button {
    display: block;
    width: 100%;
    text-align: left;
    padding: 9px;
    font-size: 12px;
  }
  .command-menu {
    position: absolute;
    z-index: 20;
    top: 100%;
    left: 0;
    width: 256px;
    max-width: 100%;
    padding: 8px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: var(--paper);
    box-shadow: 0 10px 40px #00000016;
  }
  .menu-heading {
    display: block;
    font-size: 10px;
    color: var(--muted);
    padding: 7px 8px 10px;
  }
  .command-menu button {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 7px;
    width: 100%;
    text-align: left;
  }
  .command-menu .highlighted {
    background: var(--soft);
  }
  .command-icon {
    width: 32px;
    height: 34px;
    border: 1px solid var(--line);
    border-radius: 5px;
    display: grid;
    place-items: center;
    font-family: Georgia, serif;
    font-size: 19px;
  }
  .command-menu strong {
    display: block;
    font-size: 12px;
    font-weight: 500;
  }
  .command-menu small {
    display: block;
    color: var(--muted);
    font-size: 10px;
    margin-top: 3px;
  }
  .end-block {
    color: ${({ theme }) => theme.color.gray60};
    font-size: 12px;
    padding: 12px 0;
    text-align: left;
    width: 100%;
  }
  .back-to-top {
    display: block;
    width: 100%;
    min-height: 60px;
    margin-top: 28px;
    padding: 18px 24px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: var(--soft);
    font-size: 16px;
    font-weight: 500;
  }
  .preview-outline-toggle {
    display: none;
    font-size: 12px;
    color: var(--muted);
    margin-bottom: 24px;
  }
  .outline {
    position: absolute;
    left: calc(100% + 36px);
    top: 245px;
    width: 144px;
    padding-left: 16px;
    border-left: 1px solid var(--line);
  }
  .outline-label {
    color: var(--muted);
    font-size: 10px;
    margin-bottom: 17px;
  }
  .outline p {
    font-size: 11px;
    color: ${({ theme }) => theme.color.gray60};
    line-height: 1.9;
  }
  .outline button {
    display: block;
    width: 100%;
    padding: 7px 0;
    text-align: left;
    color: var(--muted);
    font-size: 11px;
    line-height: 1.7;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .outline .h2 {
    padding-left: 8px;
  }
  .outline .h3 {
    padding-left: 16px;
  }
  .outline .current {
    color: var(--ink);
  }
  .draft-panel {
    border-bottom: 1px solid var(--line);
    margin: 0 0 24px;
    padding: 0 0 20px;
  }
  .panel-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
  }
  .panel-heading h2 {
    font-size: 14px;
    font-weight: 500;
  }
  .panel-heading button {
    font-size: 12px;
    padding: 8px;
    color: var(--muted);
  }
  .draft-list {
    max-height: 240px;
    overflow-y: auto;
  }
  .draft-list button {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    gap: 16px;
    padding: 14px 10px;
    text-align: left;
    font-size: 13px;
  }
  .draft-list .selected {
    background: var(--soft);
  }
  .draft-list span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .draft-list time {
    font-size: 10px;
    white-space: nowrap;
    color: var(--muted);
  }
  .storage-note,
  .muted {
    color: var(--muted);
    font-size: 11px;
    line-height: 1.8;
    padding-top: 14px;
  }
  .notice {
    margin-top: 16px;
    font-size: 12px;
    line-height: 1.8;
    padding: 14px 16px;
    background: var(--soft);
    border-radius: 6px;
  }
  .notice button {
    text-decoration: underline;
    margin-left: 14px;
  }
  .drop-overlay {
    position: absolute;
    inset: 0;
    background: var(--paper);
    opacity: 0.94;
    border: 1px dashed var(--muted);
    border-radius: 8px;
    display: grid;
    place-items: center;
    z-index: 50;
    pointer-events: none;
  }
  .gate {
    padding: 65px 0 140px;
  }
  .gate h1 {
    font-size: 30px;
    line-height: 1.6;
    font-weight: 500;
    letter-spacing: -0.05em;
    margin: 24px 0;
  }
  .gate p {
    color: var(--muted);
    line-height: 1.9;
  }
  .gate form {
    display: flex;
    flex-direction: column;
    gap: 14px;
    max-width: 320px;
    margin: 38px 0;
  }
  .gate label {
    color: var(--muted);
    font-size: 12px;
  }
  .gate input {
    border-bottom: 1px solid var(--line);
    padding: 12px 0;
  }
  .gate button {
    padding: 12px;
  }
  @media (max-width: 1160px) {
    .preview-outline-toggle {
      display: block;
    }
    .outline {
      display: none;
      position: static;
      width: 100%;
      margin-bottom: 28px;
    }
    .outline.open {
      display: block;
    }
    .format-bar .outline-toggle {
      display: block;
    }
  }
  @media (max-width: 768px) {
    padding: 0 0 40px;
    .writer-bar {
      margin-bottom: 20px;
      padding: 12px 0;
    }
    .bar-actions {
      gap: 8px;
    }
    .bar-actions button {
      padding: 12px 6px;
      min-height: 48px;
      font-size: 12px;
    }
    .document-title {
      font-size: 30px;
      margin-bottom: 22px;
    }
    .document-meta {
      gap: 9px;
    }
    .meta-date {
      font-size: 10px;
    }
    .document-meta input {
      width: 80px;
    }
    .format-bar {
      gap: 2px;
      margin-bottom: 22px;
    }
    .format-bar button {
      min-width: 29px;
    }
    .writing-body {
      padding-left: 56px;
    }
    .editable,
    .preview p {
      font-size: 16px;
    }
    .block-handle {
      margin-right: 1px;
      opacity: 1;
    }
    .block-handle > button {
      width: 27px;
      font-size: 23px;
    }
    .block-handle details {
      display: block;
    }
    .block-handle summary {
      width: 27px;
    }
    .editable.h1,
    .preview h1 {
      font-size: 25px;
    }
    .editable.h2,
    .preview h2 {
      font-size: 21px;
    }
    .editable.h3,
    .preview h3 {
      font-size: 18px;
    }
    .preview {
      padding-left: 0;
    }
  }
  /* Keep mobile focus from triggering the browser small-input zoom. */
  @media (max-width: 768px), (pointer: coarse) {
    .document-meta input,
    .gate input {
      font-size: 16px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before {
      transition: none !important;
      scroll-behavior: auto !important;
    }
  }
  .source-editor {
    max-width: 900px;
    margin: 0 auto 24px;
    padding: 0 20px;
  }
  .source-editor textarea {
    width: 100%;
    min-height: 65vh;
    resize: vertical;
    padding: 16px;
    border: 1px solid #d5d5d8;
    border-radius: 8px;
    font-family: monospace;
    font-size: 14px;
    line-height: 1.7;
    color: inherit;
    background: transparent;
  }
  .source-files {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 12px;
  }
`;
