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

  it("allows operational roles only in their areas", () => {
    expect(hasPermission("operator", "post:publish")).toBe(true);
    expect(hasPermission("operator", "finance:manage")).toBe(false);
    expect(hasPermission("reviewer", "media:review")).toBe(true);
    expect(hasPermission("reviewer", "post:delete")).toBe(false);
    expect(hasPermission("finance", "finance:manage")).toBe(true);
    expect(hasPermission("finance", "platform:manage")).toBe(false);
  });
});
