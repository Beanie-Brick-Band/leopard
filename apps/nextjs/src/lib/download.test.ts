import { beforeEach, describe, expect, it, vi } from "vitest";

import { triggerDownload } from "~/lib/download";

describe("triggerDownload", () => {
  let clickSpy: ReturnType<typeof vi.fn>;
  let appendChildSpy: ReturnType<typeof vi.fn>;
  let removeChildSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clickSpy = vi.fn();
    appendChildSpy = vi
      .spyOn(document.body, "appendChild")
      .mockImplementation((node) => node);
    removeChildSpy = vi
      .spyOn(document.body, "removeChild")
      .mockImplementation((node) => node);

    vi.spyOn(document, "createElement").mockReturnValue({
      href: "",
      download: "",
      click: clickSpy,
    } as unknown as HTMLAnchorElement);
  });

  it("creates an anchor element, clicks it, and removes it", () => {
    triggerDownload("https://example.com/file.zip");

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(document.createElement).toHaveBeenCalledWith("a");
    expect(appendChildSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(removeChildSpy).toHaveBeenCalledTimes(1);
  });

  it("sets the href to the provided URL", () => {
    const fakeLink = {
      href: "",
      download: "",
      click: vi.fn(),
    } as unknown as HTMLAnchorElement;
    vi.spyOn(document, "createElement").mockReturnValue(fakeLink);

    triggerDownload("https://storage.example.com/submission.zip");

    expect(fakeLink.href).toBe("https://storage.example.com/submission.zip");
  });

  it("sets download attribute to empty string for browser default naming", () => {
    const fakeLink = {
      href: "",
      download: "should-be-overwritten",
      click: vi.fn(),
    } as unknown as HTMLAnchorElement;
    vi.spyOn(document, "createElement").mockReturnValue(fakeLink);

    triggerDownload("https://example.com/f.zip");

    expect(fakeLink.download).toBe("");
  });
});
