import { describe, expect, it, vi } from "vitest";
import { apiClient } from "@/api/httpClient";
import { analyzeProduct, deleteProduct, updateProduct } from "./products";
import { collectMedia, updateMediaAsset } from "./mediaAssets";
import { autoReplyComment, updateComment } from "./comments";
import { deletePost, publishDuePosts, publishPostNow, updatePost } from "./posts";
import { deleteJob, getJob, updateJob } from "./jobs";

vi.mock("@/api/httpClient", () => ({
  apiClient: {
    delete: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
  isNotFoundError: vi.fn(() => false),
}));

describe("service CRUD contract", () => {
  it("uses REST endpoints for products", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({});
    vi.mocked(apiClient.patch).mockResolvedValue({});
    vi.mocked(apiClient.delete).mockResolvedValue({});

    await analyzeProduct({ product_id: "product_1" });
    await updateProduct("product_1", { status: "review" });
    await deleteProduct("product_1");

    expect(apiClient.post).toHaveBeenCalledWith("/products/analyze", { product_id: "product_1" });
    expect(apiClient.patch).toHaveBeenCalledWith("/products/product_1", { status: "review" });
    expect(apiClient.delete).toHaveBeenCalledWith("/products/product_1");
  });

  it("uses REST endpoints for media, comments, posts and jobs", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({});
    vi.mocked(apiClient.patch).mockResolvedValue({});
    vi.mocked(apiClient.delete).mockResolvedValue({});
    vi.mocked(apiClient.get).mockResolvedValue({});

    await collectMedia({ product_id: "product_1", sources: ["web"] });
    await updateMediaAsset("asset_1", { status: "approved" });
    await updateComment("comment_1", { auto_replied: true });
    await autoReplyComment({ comment_id: "comment_1" });
    await updatePost("post_1", { caption: "nova" });
    await publishPostNow("post_1");
    await publishDuePosts(10);
    await deletePost("post_1");
    await getJob("job_1");
    await updateJob("job_1", { status: "cancelled" });
    await deleteJob("job_1");

    expect(apiClient.post).toHaveBeenCalledWith("/media-assets/collect", { product_id: "product_1", sources: ["web"] });
    expect(apiClient.patch).toHaveBeenCalledWith("/media-assets/asset_1", { status: "approved" });
    expect(apiClient.patch).toHaveBeenCalledWith("/comments/comment_1", { auto_replied: true });
    expect(apiClient.post).toHaveBeenCalledWith("/comments/auto-reply", { comment_id: "comment_1" });
    expect(apiClient.patch).toHaveBeenCalledWith("/posts/post_1", { caption: "nova" });
    expect(apiClient.post).toHaveBeenCalledWith("/posts/post_1/publish-now");
    expect(apiClient.post).toHaveBeenCalledWith("/posts/publish-due", { limit: 10 });
    expect(apiClient.delete).toHaveBeenCalledWith("/posts/post_1");
    expect(apiClient.get).toHaveBeenCalledWith("/jobs/job_1");
    expect(apiClient.patch).toHaveBeenCalledWith("/jobs/job_1", { status: "cancelled" });
    expect(apiClient.delete).toHaveBeenCalledWith("/jobs/job_1");
  });
});
