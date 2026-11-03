import {
  SIZE_VERDICT,
  classifySize,
  extensionOf,
  isAcceptedFile,
  outputFileName,
  resolveAcceptedExtensions,
  toKilobytes
} from "c/imageUploadPolicy";

const DEFAULTS = [".jpg", ".jpeg", ".png", ".webp"];

describe("extensionOf", () => {
  it.each([
    ["photo.JPG", ".jpg"],
    ["archive.tar.png", ".png"],
    ["no-extension", ""],
    ["", ""],
    [undefined, ""]
  ])("%p -> %p", (fileName, expected) => {
    expect(extensionOf(fileName)).toBe(expected);
  });
});

describe("resolveAcceptedExtensions", () => {
  it("uses the defaults, without GIF, when nothing is configured", () => {
    expect(resolveAcceptedExtensions(undefined)).toEqual(DEFAULTS);
    expect(resolveAcceptedExtensions("")).toEqual(DEFAULTS);
  });

  it("normalizes case, spaces and missing dots", () => {
    expect(resolveAcceptedExtensions(" .PNG , jpg ")).toEqual([".png", ".jpg"]);
  });

  it("allows GIF only when it is asked for explicitly", () => {
    expect(resolveAcceptedExtensions(".gif")).toEqual([".gif"]);
  });

  it("drops types the compressor cannot handle", () => {
    expect(resolveAcceptedExtensions(".pdf,.png,.heic")).toEqual([".png"]);
  });

  it("falls back to the defaults when nothing usable remains", () => {
    expect(resolveAcceptedExtensions(".pdf, image/png")).toEqual(DEFAULTS);
  });

  it("removes duplicates", () => {
    expect(resolveAcceptedExtensions(".png,png,.PNG")).toEqual([".png"]);
  });
});

describe("isAcceptedFile", () => {
  it("accepts a file whose extension is in the list, whatever its case", () => {
    expect(isAcceptedFile({ name: "A.PNG" }, [".png"])).toBe(true);
  });

  it("rejects a file whose extension is not in the list", () => {
    expect(isAcceptedFile({ name: "a.gif" }, DEFAULTS)).toBe(false);
  });

  it("rejects a file without extension", () => {
    expect(isAcceptedFile({ name: "photo" }, DEFAULTS)).toBe(false);
  });
});

describe("classifySize", () => {
  const config = { targetSizeBytes: 1000, maxUploadBytes: 2000 };

  it.each([
    [0, SIZE_VERDICT.WITHIN_TARGET],
    [1000, SIZE_VERDICT.WITHIN_TARGET],
    [1001, SIZE_VERDICT.ABOVE_TARGET],
    [2000, SIZE_VERDICT.ABOVE_TARGET],
    [2001, SIZE_VERDICT.ABOVE_LIMIT]
  ])("%p bytes -> %p", (bytes, expected) => {
    expect(classifySize(bytes, config)).toBe(expected);
  });
});

describe("outputFileName", () => {
  const jpeg = new Blob(["x"], { type: "image/jpeg" });
  const png = new Blob(["x"], { type: "image/png" });

  it("renames to .jpg when a PNG became a JPEG", () => {
    expect(outputFileName("Logo.PNG", jpeg)).toBe("Logo.jpg");
  });

  it("keeps .jpeg names for JPEG output", () => {
    expect(outputFileName("scan.jpeg", jpeg)).toBe("scan.jpeg");
  });

  it("keeps the name when the format did not change", () => {
    expect(outputFileName("logo.png", png)).toBe("logo.png");
  });

  it("adds .jpg to a name without extension", () => {
    expect(outputFileName("camera", jpeg)).toBe("camera.jpg");
  });
});

describe("toKilobytes", () => {
  it.each([
    [0, 0],
    [1, 1],
    [1024, 1],
    [1025, 2]
  ])("%p bytes -> %p KB (rounded up)", (bytes, expected) => {
    expect(toKilobytes(bytes)).toBe(expected);
  });
});
