"use client";

/** POST to the API through the Next.js /backend proxy and unwrap the shared error envelope. */
export async function postOperation<T = unknown>(path: string, body: unknown = {}): Promise<T> {
  const response = await fetch(`/backend${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message ?? `HTTP ${response.status}`);
  return data as T;
}
