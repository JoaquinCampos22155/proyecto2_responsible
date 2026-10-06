import { describe, it, expect, vi } from "vitest";
import { createEventTracker } from "./events";
describe("meaningful reader events", () => {
  it("deduplicates impressions per session and allows a later retry after failure", async () => {
    const send = vi
      .fn()
      .mockRejectedValueOnce(Error("offline"))
      .mockResolvedValue({});
    const tracker = createEventTracker(send);
    await tracker.once("impression", "one");
    await tracker.once("impression", "one");
    await tracker.once("impression", "one");
    expect(send).toHaveBeenCalledTimes(2);
  });
  it("submits a bounded aggregated interval, not timer ticks", async () => {
    const send = vi.fn().mockResolvedValue({});
    const tracker = createEventTracker(send);
    await tracker.reading("one", 4500000);
    expect(send.mock.calls[0][0]).toEqual({
      type: "reading_time",
      articleId: "one",
      durationSeconds: 3600,
    });
  });
});
