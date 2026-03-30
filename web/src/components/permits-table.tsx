import { getPermits, getStaffList, type PermitFilters } from "@/lib/permits";
import { PermitsFilter } from "@/components/permits-filter";
import { PermitsTableClient } from "@/components/permits-table-client";

type Props = {
  searchParams?: PermitFilters;
  isAdmin?: boolean;
};

export async function PermitsTable({ searchParams = {}, isAdmin = false }: Props) {
  const [permits, staffList] = await Promise.all([
    getPermits(searchParams),
    getStaffList(),
  ]);

  return (
    <div className="panel">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Shared Records</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            허가/신고 목록
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            로그인한 담당자 전원이 실시간으로 공유하는 목록입니다.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-slate-100 px-3 py-2 text-slate-700">
            총 {permits.length}건
          </span>
        </div>
      </div>

      <div className="mt-6">
        <PermitsFilter defaultValues={searchParams} staffList={staffList} />
      </div>

      <PermitsTableClient permits={permits} isAdmin={isAdmin} />
    </div>
  );
}
