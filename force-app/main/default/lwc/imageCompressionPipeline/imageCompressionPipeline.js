/**
 * Shrinks an image towards the configured target size with lightning/mediaUtils.
 * Every step starts again from the original file, so step settings are absolute
 * and artefacts never stack up across steps.
 */
import { processImage } from "lightning/mediaUtils";

/**
 * @param {{quality: number, maxWidth: number, maxHeight: number, convertToJpeg: boolean}} step
 * @returns {object} processImage options for that step
 */
export function buildProcessOptions(step) {
  return {
    resizeMode: "contain",
    resizeStrategy: "reduce",
    targetWidth: step.maxWidth,
    targetHeight: step.maxHeight,
    compressionQuality: step.quality,
    imageSmoothingEnabled: true,
    preserveTransparency: !step.convertToJpeg,
    backgroundColor: "white"
  };
}

function smaller(current, candidate) {
  return candidate.blob.size < current.blob.size ? candidate : current;
}

async function runSteps(file, steps, targetBytes, index, best) {
  if (index >= steps.length) {
    return { ...best, withinTarget: false };
  }
  const blob = await processImage(file, buildProcessOptions(steps[index]));
  const attempt = { blob, stepsRun: index + 1 };
  if (blob.size <= targetBytes) {
    return { ...attempt, withinTarget: true };
  }
  return runSteps(file, steps, targetBytes, index + 1, smaller(best, attempt));
}

/**
 * Runs the steps in order and stops at the first result that fits the target.
 * When none fits, returns the smallest candidate seen (the original included).
 * @param {File} file
 * @param {{targetSizeBytes: number, steps: object[]}} config
 * @returns {Promise<{blob: Blob, stepsRun: number, withinTarget: boolean}>}
 */
export function compressToTarget(file, config) {
  const original = { blob: file, stepsRun: 0 };
  if (file.size <= config.targetSizeBytes) {
    return Promise.resolve({ ...original, withinTarget: true });
  }
  return runSteps(file, config.steps, config.targetSizeBytes, 0, original);
}
