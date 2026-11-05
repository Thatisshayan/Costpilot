import { describe, expect, it } from "vitest";
import * as web from "./entry-type";
import * as mobile from "../../../mobile-app/src/lib/entry-type";

describe.each([["web", web], ["mobile", mobile]])("%s refund/credit representation", (_name, lib) => {
  it("stores a refund as a negative amount from a positive magnitude", () => {
    expect(lib.signedAmount(4.5, "refund")).toBe(-4.5);
    expect(lib.signedAmount(-4.5, "expense")).toBe(4.5);
  });

  it("round-trips the entry type from the stored sign", () => {
    expect(lib.entryTypeOf(-0.01)).toBe("refund");
    expect(lib.entryTypeOf(12)).toBe("expense");
  });

  it("labels credits so they cannot be read as spending", () => {
    expect(lib.formatEntryAmount(-4.5, "EUR")).toBe("−4.50 EUR refund / credit");
    expect(lib.formatEntryAmount(12, "USD")).toBe("12.00 USD");
  });
});
