"use client";

import { useState } from "react";
import { deletePermit } from "./actions";

type Props = {
  permitId: string;
  advertiser: string;
};

export function DeleteButton({ permitId, advertiser }: Props) {
  const [error, setError] = useState<string>();

  async function handleDelete(formData: FormData) {
    const confirmed = confirm(
      `[${permitId}] ${advertiser} 항목을 삭제하시겠습니까?\n이력을 포함한 모든 데이터가 영구 삭제됩니다.`,
    );
    if (!confirmed) return;
    setError(undefined);
    const result = await deletePermit(formData);
    if (result?.error) setError(result.error);
  }

  return (
    <form action={handleDelete}>
      <input type="hidden" name="permit_id" value={permitId} />
      <button
        type="submit"
        className="rounded-[20px] bg-rose-600 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-700"
      >
        삭제
      </button>
      {error ? <p role="alert" className="mt-2 text-sm text-rose-700">{error}</p> : null}
    </form>
  );
}
