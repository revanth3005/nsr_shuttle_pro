// Standard JSON API helpers + a wrapper that centralises error handling and
// logging for route handlers.
import { NextResponse } from "next/server";

export function ok(data, init) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(message, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

// Wrap a route handler so thrown errors become clean JSON responses and every
// failure is logged server-side.
export function handler(fn) {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      const status = err?.status || 500;
      if (status >= 500) {
        console.error("[API ERROR]", err);
      }
      return fail(err?.message || "Internal Server Error", status);
    }
  };
}
