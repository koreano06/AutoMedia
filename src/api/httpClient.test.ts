import { beforeEach, describe, expect, it, vi } from "vitest";
import { API_REFRESH_TOKEN_STORAGE_KEY, API_TOKEN_STORAGE_KEY, apiClient, normalizeList } from "./httpClient";

describe("httpClient", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("normalizes common API envelope formats into arrays", () => {
    expect(normalizeList({ data: [{ id: "1" }] })).toEqual([{ id: "1" }]);
    expect(normalizeList({ result: { items: [{ id: "2" }] } })).toEqual([{ id: "2" }]);
    expect(normalizeList([{ id: "3" }])).toEqual([{ id: "3" }]);
    expect(normalizeList({ unexpected: true })).toEqual([]);
  });

  it("adds bearer token and unwraps response data", async () => {
    window.localStorage.setItem(API_TOKEN_STORAGE_KEY, "access-token");
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: "post_1" } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));

    await expect(apiClient.get("/posts")).resolves.toEqual({ id: "post_1" });
    const [, requestOptions] = fetchMock.mock.calls[0];
    expect(String(fetchMock.mock.calls[0][0])).toContain("/posts");
    expect(requestOptions).toEqual(expect.objectContaining({ method: "GET" }));
    expect((requestOptions?.headers as Headers).get("Authorization")).toBe("Bearer access-token");
  });

  it("refreshes an expired access token once and retries the original request", async () => {
    window.localStorage.setItem(API_TOKEN_STORAGE_KEY, "expired-token");
    window.localStorage.setItem(API_REFRESH_TOKEN_STORAGE_KEY, "refresh-token");
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "expired" } }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: "new-token", refresh_token: "new-refresh" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: "ok" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }));

    await expect(apiClient.getList("/products")).resolves.toEqual([{ id: "ok" }]);
    expect(window.localStorage.getItem(API_TOKEN_STORAGE_KEY)).toBe("new-token");
    expect(window.localStorage.getItem(API_REFRESH_TOKEN_STORAGE_KEY)).toBe("new-refresh");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
