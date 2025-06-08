// src/middleware.ts

import { NextRequest, NextResponse } from "next/server";

const publicPaths = ["/login", "/register", "/auth"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 공개 경로는 그대로 허용
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const token = req.cookies.get("token")?.value;

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 사용자 정보 요청
  const res = await fetch("http://localhost:8000/users/me", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const user = await res.json();

  // 관리자만 /admin 접근 허용
  if (pathname.startsWith("/admin") && user.role !== "admin") {
    const url = req.nextUrl.clone();
    url.pathname = "/unauthorized";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard", "/tasks/:path*", "/help-requests/:path*"],
};
