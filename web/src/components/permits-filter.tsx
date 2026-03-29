"use client";

import { permitKinds, permitStatuses, permitCategories } from "@/lib/mock-data";
import type { StaffOption } from "@/lib/permits";

type Props = {
  defaultValues?: {
    q?: string;
    status?: string;
    kind?: string;
    category?: string;
    staffName?: string;
  };
  staffList?: StaffOption[];
};

export function PermitsFilter({ defaultValues = {}, staffList = [] }: Props) {
  return (
    <form method="GET" className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
      <input
        name="q"
        defaultValue={defaultValues.q ?? ""}
        className="field xl:col-span-2"
        placeholder="광고주 또는 표시장소 검색"
      />
      <select name="status" defaultValue={defaultValues.status ?? ""} className="field">
        <option value="">전체 상태</option>
        {permitStatuses.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <select name="kind" defaultValue={defaultValues.kind ?? ""} className="field">
        <option value="">전체 종류</option>
        {permitKinds.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </select>
      <select name="category" defaultValue={defaultValues.category ?? ""} className="field">
        <option value="">전체 구분</option>
        {permitCategories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <select name="staffName" defaultValue={defaultValues.staffName ?? ""} className="field">
        <option value="">전체 담당자</option>
        {staffList.map((s) => (
          <option key={s.id} value={s.name}>
            {s.name}
          </option>
        ))}
      </select>
      <button type="submit" className="button-primary md:col-span-2 xl:col-span-6">
        검색
      </button>
    </form>
  );
}
