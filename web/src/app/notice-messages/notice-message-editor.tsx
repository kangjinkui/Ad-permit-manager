"use client";

import { useRef, useState } from "react";
import { noticeMessageTemplates } from "./notice-message-templates";

type NoticeMessageTemplate = (typeof noticeMessageTemplates)[number];
type SignType = NoticeMessageTemplate["id"];

export function NoticeMessageEditor() {
  const [selected, setSelected] = useState<NoticeMessageTemplate>(noticeMessageTemplates[0]);
  const [drafts, setDrafts] = useState<Partial<Record<SignType, string>>>({});
  const [feedback, setFeedback] = useState<"copied" | "manual" | null>(null);
  const messageField = useRef<HTMLTextAreaElement>(null);
  const message = drafts[selected.id] ?? selected.message;

  async function copyMessage() {
    const field = messageField.current;
    if (!field) return;

    const text = field.value;
    let copied = false;
    setFeedback(null);

    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch {
        // Fall back to copying the selected text when clipboard access is denied.
      }
    }

    if (messageField.current !== field || field.value !== text) return;

    if (!copied) {
      const previousFocus = document.activeElement;
      field.focus();
      field.select();
      try {
        // The Clipboard API is unavailable on some internal HTTP deployments.
        copied = document.execCommand("copy");
      } catch {
        // Leave the text selected for manual copying.
      }
      if (copied && previousFocus instanceof HTMLElement) {
        previousFocus.focus();
      }
    }

    setFeedback(copied ? "copied" : "manual");
  }

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="min-w-0">
        <legend className="mb-2 text-sm font-semibold">간판 종류</legend>
        <div className="flex flex-wrap gap-2">
          {noticeMessageTemplates.map((template) => (
            <label key={template.id} className="cursor-pointer">
              <input
                type="radio"
                name="notice-sign-type"
                value={template.id}
                checked={selected.id === template.id}
                onChange={() => {
                  setSelected(template);
                  setFeedback(null);
                }}
                className="peer sr-only"
              />
              <span className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium peer-checked:border-blue-300 peer-checked:bg-blue-50 peer-checked:text-blue-800 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-600">
                {template.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="notice-message" className="text-sm font-semibold">
            문자 내용
          </label>
          <button
            type="button"
            onClick={copyMessage}
            disabled={!message.trim()}
            className="button-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            문자 복사
          </button>
        </div>
        <textarea
          key={selected.id}
          id="notice-message"
          ref={messageField}
          value={message}
          onChange={(event) => {
            const value = event.currentTarget.value;
            setDrafts((current) => ({ ...current, [selected.id]: value }));
            setFeedback(null);
          }}
          spellCheck={false}
          rows={19}
          className="field block min-h-48 resize-y text-sm leading-6"
        />
        <p role="status" className="mt-2 text-sm leading-6 text-slate-700 empty:mt-0">
          {feedback === "copied"
            ? "문자 내용을 복사했습니다. 발송할 곳에 붙여넣으세요."
            : feedback === "manual"
              ? "문자 내용을 선택했습니다. 선택한 내용을 직접 복사해 주세요."
              : null}
        </p>
      </div>
    </div>
  );
}
