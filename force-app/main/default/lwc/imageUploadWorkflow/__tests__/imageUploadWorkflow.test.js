import { processImage } from "lightning/mediaUtils";
import uploadImage from "@salesforce/apex/ImageCompressUploadController.uploadImage";
import {
  FILE_STATE,
  errorMessage,
  formatLabel,
  uploadImageFile
} from "c/imageUploadWorkflow";

jest.mock(
  "@salesforce/apex/ImageCompressUploadController.uploadImage",
  () => ({ default: jest.fn() }),
  { virtual: true }
);

// Labels resolve to their "c.Name" key in Jest.
const LABEL = {
  compressing: "c.ICU_Status_Compressing",
  uploading: "c.ICU_Status_Uploading",
  uploaded: "c.ICU_Status_Uploaded",
  aboveTarget: "c.ICU_Warning_Above_Target",
  tooLarge: "c.ICU_Error_Too_Large",
  unsupported: "c.ICU_Error_Unsupported_Type",
  compressionFailed: "c.ICU_Error_Compression_Failed"
};

const CONFIG = {
  targetSizeBytes: 100,
  maxUploadBytes: 300,
  steps: [
    {
      name: "Step_1",
      quality: 0.7,
      maxWidth: 800,
      maxHeight: 800,
      convertToJpeg: true
    }
  ]
};
const CONTEXT = {
  config: CONFIG,
  acceptedExtensions: [".jpg", ".png"],
  recordId: "001000000000001AAA"
};
const UPLOADED = { name: "photo.jpg", documentId: "069000000000001AAA" };

function file(name, bytes, type = "image/jpeg") {
  return new File([new Uint8Array(bytes)], name, { type });
}

function blob(bytes, type = "image/jpeg") {
  return new Blob([new Uint8Array(bytes)], { type });
}

async function run(selectedFile, context = CONTEXT) {
  const onState = jest.fn();
  const result = await uploadImageFile(selectedFile, context, onState);
  return { result, states: onState.mock.calls };
}

describe("uploadImageFile", () => {
  beforeEach(() => {
    uploadImage.mockResolvedValue(UPLOADED);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("uploads a file already within target without compressing it", async () => {
    const { result, states } = await run(file("photo.jpg", 50));

    expect(processImage).not.toHaveBeenCalled();
    expect(uploadImage).toHaveBeenCalledWith({
      fileName: "photo.jpg",
      base64Data: expect.any(String),
      recordId: CONTEXT.recordId
    });
    expect(states).toEqual([
      [FILE_STATE.COMPRESSING, LABEL.compressing],
      [FILE_STATE.UPLOADING, LABEL.uploading],
      [FILE_STATE.UPLOADED, LABEL.uploaded]
    ]);
    expect(result).toEqual(UPLOADED);
  });

  it("uploads the compressed blob, not the original", async () => {
    processImage.mockResolvedValue(blob(3));

    await run(file("photo.jpg", 500));

    // 3 zero bytes encode to "AAAA".
    expect(uploadImage.mock.calls[0][0].base64Data).toBe("AAAA");
  });

  it("renames a PNG that was converted to JPEG", async () => {
    processImage.mockResolvedValue(blob(80, "image/jpeg"));

    await run(file("logo.png", 500, "image/png"));

    expect(uploadImage.mock.calls[0][0].fileName).toBe("logo.jpg");
  });

  it("sends null instead of an undefined record id", async () => {
    await run(file("photo.jpg", 50), { ...CONTEXT, recordId: undefined });

    expect(uploadImage.mock.calls[0][0].recordId).toBeNull();
  });

  it("uploads with a warning when the image stays above target but within the limit", async () => {
    processImage.mockResolvedValue(blob(200));

    const { result, states } = await run(file("photo.jpg", 500));

    expect(result).toEqual(UPLOADED);
    expect(states[states.length - 1]).toEqual([
      FILE_STATE.WARNING,
      LABEL.aboveTarget
    ]);
  });

  it("rejects without uploading when the image stays above the hard limit", async () => {
    processImage.mockResolvedValue(blob(400));

    const { result, states } = await run(file("photo.jpg", 500));

    expect(result).toBeNull();
    expect(uploadImage).not.toHaveBeenCalled();
    expect(states[states.length - 1]).toEqual([
      FILE_STATE.FAILED,
      LABEL.tooLarge
    ]);
  });

  it("rejects a file type outside the accepted list before doing any work", async () => {
    const { result, states } = await run(
      file("notes.pdf", 50, "application/pdf")
    );

    expect(result).toBeNull();
    expect(processImage).not.toHaveBeenCalled();
    expect(uploadImage).not.toHaveBeenCalled();
    expect(states).toEqual([[FILE_STATE.FAILED, LABEL.unsupported]]);
  });

  it("reports a readable message when the browser cannot compress the image", async () => {
    processImage.mockRejectedValue(new Error("canvas exceeded"));

    const { result, states } = await run(file("photo.jpg", 500));

    expect(result).toBeNull();
    expect(states[states.length - 1]).toEqual([
      FILE_STATE.FAILED,
      LABEL.compressionFailed
    ]);
  });

  it("reports the Apex error message when the upload fails", async () => {
    uploadImage.mockRejectedValue({ body: { message: "Insufficient access" } });

    const { result, states } = await run(file("photo.jpg", 50));

    expect(result).toBeNull();
    expect(states[states.length - 1]).toEqual([
      FILE_STATE.FAILED,
      "Insufficient access"
    ]);
  });
});

describe("formatLabel", () => {
  it("replaces numbered placeholders in order", () => {
    expect(formatLabel("{0} KB of {1} KB", 5, 10)).toBe("5 KB of 10 KB");
  });

  it("leaves placeholders without a value untouched", () => {
    expect(formatLabel("{0} and {1}", "a")).toBe("a and {1}");
  });
});

describe("errorMessage", () => {
  it.each([
    [{ body: { message: "From Apex" } }, "From Apex"],
    [new Error("From JS"), "From JS"],
    ["plain text", "plain text"]
  ])("extracts the message from %p", (error, expected) => {
    expect(errorMessage(error)).toBe(expected);
  });
});
