import Link from "next/link";
import { getPermits, getStaffList, type PermitFilters } from "@/lib/permits";
import { PermitsFilter } from "@/components/permits-filter";

const statusTone: Record<string, string> = {
  직접방문수령: "bg-emerald-100 text-emerald-700",
  우편발송예정: "bg-amber-100 text-amber-800",
  내용보완: "bg-rose-100 text-rose-700",
  공문발송: "bg-sky-100 text-sky-700",
  "서울시심의 상정예정": "bg-violet-100 text-violet-700",
  이메일발송완료: "bg-cyan-100 text-cyan-700",
  접수: "bg-slate-100 text-slate-700",
};

type Props = {
  searchParams?: PermitFilters;
};

export async function PermitsTable({ searchParams = {} }: Props) {
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

      <div className="mt-6 overflow-hidden rounded-[28px] border border-slate-200">
        <table className="w-full border-collapse">
          <thead className="bg-slate-50 text-left text-sm text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">관리번호</th>
              <th className="px-4 py-3 font-medium">광고주</th>
              <th className="px-4 py-3 font-medium">종류/구분</th>
              <th className="px-4 py-3 font-medium">상태</th>
              <th className="px-4 py-3 font-medium">안전점검</th>
              <th className="px-4 py-3 font-medium">담당자</th>
              <th className="px-4 py-3 font-medium">원본</th>
            </tr>
          </thead>
          <tbody>
            {permits.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                  조건에 맞는 항목이 없습니다.
                </td>
              </tr>
            ) : (
              permits.map((item) => (
                <tr key={item.id} className="border-t border-slate-200 bg-white hover:bg-slate-50">
                  <td className="px-4 py-4 text-sm font-medium text-slate-950">
                    <Link href={`/permits/${item.id}`} className="hover:underline">
                      {item.id}
                    </Link>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-slate-950">{item.advertiser}</div>
                    <div className="mt-1 text-sm text-slate-500">{item.place}</div>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">
                    {item.kind} / {item.category}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        statusTone[item.status] ?? "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">{item.safetyCheck}</td>
                  <td className="px-4 py-4 text-sm text-slate-700">{item.staffName ?? "-"}</td>
                  <td className="px-4 py-4 text-sm text-slate-700">{item.sourceType}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
