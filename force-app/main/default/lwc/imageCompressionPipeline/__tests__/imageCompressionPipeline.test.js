import { processImage } from "lightning/mediaUtils";
import {
  buildProcessOptions,
  compressToTarget
} from "c/imageCompressionPipeline";

const STEP_1 = {
  name: "Step_1",
  quality: 0.8,
  maxWidth: 2048,
  maxHeight: 2048,
  convertToJpeg: false
};
const STEP_2 = {
  name: "Step_2",
  quality: 0.6,
  maxWidth: 1280,
  maxHeight: 1024,
  convertToJpeg: true
};
const CONFIG = {
  targetSizeBytes: 100,
  maxUploadBytes: 500,
  steps: [STEP_1, STEP_2]
};

function blobOfSize(bytes) {
  return new Blob([new Uint8Array(bytes)], { type: "image/jpeg" });
}

function fileOfSize(bytes) {
  return new File([new Uint8Array(bytes)], "photo.jpg", { type: "image/jpeg" });
}

describe("buildProcessOptions", () => {
  it("maps a step to processImage options that keep the aspect ratio and only shrink", () => {
    expect(buildProcessOptions(STEP_1)).toEqual({
      resizeMode: "contain",
      resizeStrategy: "reduce",
      targetWidth: 2048,
      targetHeight: 2048,
      compressionQuality: 0.8,
      imageSmoothingEnabled: true,
      preserveTransparency: true,
      backgroundColor: "white"
    });
  });

  it("drops transparency when the step converts to JPEG", () => {
    expect(buildProcessOptions(STEP_2)).toEqual(
      expect.objectContaining({
        targetWidth: 1280,
        targetHeight: 1024,
        compressionQuality: 0.6,
        preserveTransparency: false
      })
    );
  });
});

describe("compressToTarget", () => {
  afterEach(() => {
    processImage.mockReset();
  });

  it("returns a file already within target untouched", async () => {
    const file = fileOfSize(100);

    const result = await compressToTarget(file, CONFIG);

    expect(result).toEqual({ blob: file, stepsRun: 0, withinTarget: true });
    expect(processImage).not.toHaveBeenCalled();
  });

  it("stops after the first step when it is enough", async () => {
    const fitting = blobOfSize(90);
    processImage.mockResolvedValueOnce(fitting);

    const result = await compressToTarget(fileOfSize(400), CONFIG);

    expect(result).toEqual({ blob: fitting, stepsRun: 1, withinTarget: true });
    expect(processImage).toHaveBeenCalledTimes(1);
  });

  it("runs the next step from the original file when the first is not enough", async () => {
    const file = fileOfSize(400);
    const fitting = blobOfSize(80);
    processImage
      .mockResolvedValueOnce(blobOfSize(150))
      .mockResolvedValueOnce(fitting);

    const result = await compressToTarget(file, CONFIG);

    expect(result).toEqual({ blob: fitting, stepsRun: 2, withinTarget: true });
    expect(processImage.mock.calls).toEqual([
      [file, buildProcessOptions(STEP_1)],
      [file, buildProcessOptions(STEP_2)]
    ]);
  });

  it("returns the smallest result when no step reaches the target", async () => {
    const smallest = blobOfSize(120);
    processImage
      .mockResolvedValueOnce(smallest)
      .mockResolvedValueOnce(blobOfSize(130));

    const result = await compressToTarget(fileOfSize(400), CONFIG);

    expect(result).toEqual({
      blob: smallest,
      stepsRun: 1,
      withinTarget: false
    });
    expect(processImage).toHaveBeenCalledTimes(2);
  });

  it("keeps the original when compression only makes it bigger", async () => {
    const file = fileOfSize(150);
    processImage.mockResolvedValue(blobOfSize(300));

    const result = await compressToTarget(file, CONFIG);

    expect(result).toEqual({ blob: file, stepsRun: 0, withinTarget: false });
  });

  it("propagates a processImage failure", async () => {
    processImage.mockRejectedValue(new Error("canvas too large"));

    await expect(compressToTarget(fileOfSize(400), CONFIG)).rejects.toThrow(
      "canvas too large"
    );
  });
});
