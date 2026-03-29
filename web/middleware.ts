import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { hasSupabaseEnv } from "./src/lib/env";

const protectedPrefixes = ["/dashboard", "/permits", "/admin"];
const authPrefixes = ["/login", "/register"];

export async function middleware(request: NextRequest) {
  if (!hasSupabaseEnv()) {
    return NextResponse.next();
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p));
  const isAuthPage = authPrefixes.some((p) => pathname.startsWith(p));
  const isPendingPage = pathname === "/login/pending";

  // 1. 비로그인 + 보호 경로 → 로그인으로
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // 2. 로그인 상태일 때 profile status 확인
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("status, role")
      .eq("id", user.id)
      .single();

    const status = (profile?.status as string) ?? "pending";
    const role = (profile?.role as string) ?? "staff";

    // pending: 보호 경로 접근 차단
    if (status === "pending" && isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = "/login/pending";
      return NextResponse.redirect(url);
    }

    // rejected: 보호 경로 접근 차단
    if (status === "rejected" && isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set(
        "error",
        "계정이 거절되었습니다. 관리자에게 문의해 주세요.",
      );
      return NextResponse.redirect(url);
    }

    // admin 전용 경로: staff 차단
    if (pathname.startsWith("/admin") && role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    // active 사용자가 로그인/가입 페이지 접근 → 대시보드로
    if (isAuthPage && status === "active") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.searchParams.delete("next");
      return NextResponse.redirect(url);
    }

    // active 사용자가 pending 페이지 접근 → 대시보드로
    if (isPendingPage && status === "active") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/permits/:path*",
    "/admin/:path*",
    "/login",
    "/login/pending",
    "/register",
  ],
};
