import { blobToBase64 } from "c/blobEncoding";

describe("blobToBase64", () => {
  const OriginalFileReader = window.FileReader;

  afterEach(() => {
    window.FileReader = OriginalFileReader;
  });

  it("returns plain base64 without the data URL prefix", async () => {
    await expect(
      blobToBase64(new Blob(["hello"], { type: "image/png" }))
    ).resolves.toBe("aGVsbG8=");
  });

  it("returns an empty string for an empty blob", async () => {
    await expect(blobToBase64(new Blob([]))).resolves.toBe("");
  });

  it("rejects with the reader error when reading fails", async () => {
    const readError = new Error("read failed");
    window.FileReader = class {
      readAsDataURL() {
        this.error = readError;
        this.onerror();
      }
    };

    await expect(blobToBase64(new Blob(["x"]))).rejects.toBe(readError);
  });
});
