import {
  describeSettings,
  formatSize,
  indexFiles,
  savingPercent,
  toFileView
} from "c/imageCompressUploadDemoFormat";

function contentDocument(id, { title, extension, size }) {
  return {
    id,
    fields: {
      Title: { value: title },
      FileExtension: { value: extension },
      ContentSize: { value: size }
    }
  };
}

describe("formatSize", () => {
  it.each([
    [0, "0 B"],
    [1023, "1023 B"],
    [1024, "1 KB"],
    [831488, "812 KB"],
    [1048575, "1024 KB"],
    [1048576, "1.0 MB"],
    [22334668, "21.3 MB"]
  ])("%p bytes -> %p", (bytes, expected) => {
    expect(formatSize(bytes)).toBe(expected);
  });
});

describe("savingPercent", () => {
  it("rounds the saving to a whole percent", () => {
    expect(savingPercent(21851756, 831488)).toBe(96);
  });

  it("is negative when the result grew", () => {
    expect(savingPercent(100, 110)).toBe(-10);
  });

  it("is 0 for an empty original", () => {
    expect(savingPercent(0, 10)).toBe(0);
  });
});

describe("describeSettings", () => {
  it("lists the sizes and every step in order", () => {
    const summary = describeSettings({
      targetSizeBytes: 1048576,
      maxUploadBytes: 2097152,
      steps: [
        { maxWidth: 2048, maxHeight: 2048, quality: 0.8, convertToJpeg: false },
        { maxWidth: 1280, maxHeight: 1280, quality: 0.6, convertToJpeg: true }
      ]
    });

    expect(summary).toBe(
      "Target 1.0 MB · Limit 2.0 MB · Step 1: 2048×2048px, quality 0.8 · Step 2: 1280×1280px, quality 0.6, to JPEG"
    );
  });
});

describe("toFileView", () => {
  it("maps a ContentDocument record to what the demo shows", () => {
    const view = toFileView(
      contentDocument("069A", {
        title: "rituals",
        extension: "jpg",
        size: 831488
      })
    );

    expect(view).toEqual({
      id: "069A",
      fileName: "rituals.jpg",
      size: 831488,
      sizeLabel: "812 KB"
    });
  });
});

describe("indexFiles", () => {
  it("indexes successful results by id and skips failed lookups", () => {
    const files = indexFiles([
      {
        statusCode: 200,
        result: contentDocument("069A", {
          title: "a",
          extension: "png",
          size: 10
        })
      },
      { statusCode: 404, result: [{ errorCode: "NOT_FOUND" }] }
    ]);

    expect(Object.keys(files)).toEqual(["069A"]);
    expect(files["069A"].fileName).toBe("a.png");
  });
});
