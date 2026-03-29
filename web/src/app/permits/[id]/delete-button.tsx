"use client";

import { deletePermit } from "./actions";

type Props = {
  permitId: string;
  advertiser: string;
};

export function DeleteButton({ permitId, advertiser }: Props) {
  async function handleDelete(formData: FormData) {
    const confirmed = confirm(
      `[${permitId}] ${advertiser} 항목을 삭제하시겠습니까?\n이력을 포함한 모든 데이터가 영구 삭제됩니다.`,
    );
    if (!confirmed) return;
    await deletePermit(formData);
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
    </form>
  );
}
