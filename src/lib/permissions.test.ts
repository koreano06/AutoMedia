import { describe, expect, it } from "vitest";
import { hasPermission } from "./permissions";

describe("permissions", () => {
  it("allows admins to execute sensitive actions", () => {
    expect(hasPermission("admin", "post:publish")).toBe(true);
    expect(hasPermission("admin", "finance:manage")).toBe(true);
    expect(hasPermission("admin", "platform:manage")).toBe(true);
  });

  it("blocks regular users from sensitive actions", () => {
    expect(hasPermission("user", "post:publish")).toBe(false);
    expect(hasPermission(undefined, "product:delete")).toBe(false);
  });
});
