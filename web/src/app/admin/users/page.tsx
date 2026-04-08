import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { approveUser, rejectUser } from "./actions";

type StatusFilter = "all" | "pending" | "active" | "rejected";

type UsersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const statusLabels: Record<string, string> = {
  pending: "대기",
  active: "활성",
  rejected: "거절",
};

const roleLabels: Record<string, string> = {
  staff: "일반",
  admin: "관리자",
};

export default async function UsersPage({ searchParams }: UsersPageProps) {
  await requireAdmin();

  const params = (await searchParams) ?? {};
  const filterRaw = Array.isArray(params.status)
    ? params.status[0]
    : params.status;
  const filter: StatusFilter =
    filterRaw === "pending" ||
    filterRaw === "active" ||
    filterRaw === "rejected"
      ? filterRaw
      : "all";

  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select("id, name, email, role, status, department, created_at")
    .order("created_at", { ascending: false });

  if (filter !== "all") {
    query = query.eq("status", filter);
  }

  const { data: users } = await query;

  const filterTabs: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "전체" },
    { value: "pending", label: "승인 대기" },
    { value: "active", label: "활성" },
    { value: "rejected", label: "거절됨" },
  ];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          사용자 관리
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          가입 요청을 승인하거나 거절하는 사용자 관리 전용 화면입니다.
        </p>
      </div>

      {/* 필터 탭 */}
      <div className="mb-6 flex gap-2">
        {filterTabs.map((tab) => (
          <a
            key={tab.value}
            href={
              tab.value === "all"
                ? "/admin/users"
                : `/admin/users?status=${tab.value}`
            }
            className={[
              "rounded-2xl px-4 py-2 text-sm font-medium transition",
              filter === tab.value
                ? "bg-sky-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200",
            ].join(" ")}
          >
            {tab.label}
          </a>
        ))}
      </div>

      {/* 사용자 테이블 */}
      <div className="panel overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 bg-slate-50">
            <tr>
              <th className="px-5 py-3 text-left font-semibold text-slate-600">
                이름
              </th>
              <th className="px-5 py-3 text-left font-semibold text-slate-600">
                이메일
              </th>
              <th className="px-5 py-3 text-left font-semibold text-slate-600">
                역할
              </th>
              <th className="px-5 py-3 text-left font-semibold text-slate-600">
                상태
              </th>
              <th className="px-5 py-3 text-left font-semibold text-slate-600">
                가입일
              </th>
              <th className="px-5 py-3 text-left font-semibold text-slate-600">
                액션
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!users || users.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-8 text-center text-slate-400"
                >
                  해당하는 사용자가 없습니다.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-medium text-slate-900">
                    {user.name}
                  </td>
                  <td className="px-5 py-4 text-slate-600">{user.email}</td>
                  <td className="px-5 py-4">
                    <span
                      className={[
                        "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
                        user.role === "admin"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-slate-100 text-slate-600",
                      ].join(" ")}
                    >
                      {roleLabels[user.role] ?? user.role}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={[
                        "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
                        user.status === "active"
                          ? "bg-emerald-100 text-emerald-700"
                          : user.status === "pending"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-rose-100 text-rose-700",
                      ].join(" ")}
                    >
                      {statusLabels[user.status] ?? user.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-500">
                    {new Date(user.created_at).toLocaleDateString("ko-KR")}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      {user.status === "pending" && (
                        <>
                          <form
                            action={approveUser.bind(null, user.id)}
                            className="inline"
                          >
                            <button
                              type="submit"
                              className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                            >
                              승인
                            </button>
                          </form>
                          <form
                            action={rejectUser.bind(null, user.id)}
                            className="inline"
                          >
                            <button
                              type="submit"
                              className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700"
                            >
                              거절
                            </button>
                          </form>
                        </>
                      )}
                      {user.status === "active" && (
                        <>
                          <form
                            action={rejectUser.bind(null, user.id)}
                            className="inline"
                          >
                            <button
                              type="submit"
                              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                            >
                              비활성화
                            </button>
                          </form>
                        </>
                      )}
                      {user.status === "rejected" && (
                        <form
                          action={approveUser.bind(null, user.id)}
                          className="inline"
                        >
                          <button
                            type="submit"
                            className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                          >
                            재승인
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
