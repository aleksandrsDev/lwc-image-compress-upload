/**
 * Takes one selected file all the way to a Salesforce File:
 * accept check -> compression -> size check -> base64 -> Apex upload.
 * Progress is reported through a callback; failures never throw out of uploadImageFile.
 */
import uploadImage from "@salesforce/apex/ImageCompressUploadController.uploadImage";
import COMPRESSING from "@salesforce/label/c.ICU_Status_Compressing";
import UPLOADING from "@salesforce/label/c.ICU_Status_Uploading";
import UPLOADED from "@salesforce/label/c.ICU_Status_Uploaded";
import ABOVE_TARGET from "@salesforce/label/c.ICU_Warning_Above_Target";
import TOO_LARGE from "@salesforce/label/c.ICU_Error_Too_Large";
import UNSUPPORTED_TYPE from "@salesforce/label/c.ICU_Error_Unsupported_Type";
import COMPRESSION_FAILED from "@salesforce/label/c.ICU_Error_Compression_Failed";
import { compressToTarget } from "c/imageCompressionPipeline";
import { blobToBase64 } from "c/blobEncoding";
import {
  SIZE_VERDICT,
  classifySize,
  isAcceptedFile,
  outputFileName,
  toKilobytes
} from "c/imageUploadPolicy";

export const FILE_STATE = Object.freeze({
  QUEUED: "queued",
  COMPRESSING: "compressing",
  UPLOADING: "uploading",
  UPLOADED: "uploaded",
  WARNING: "warning",
  FAILED: "failed"
});

/** Expected rejection whose message is already user-facing. */
class FileRejectedError extends Error {}

/**
 * @param {string} label custom label with {0}, {1}... placeholders
 * @param {...*} values
 * @returns {string}
 */
export function formatLabel(label, ...values) {
  return label.replace(/\{(\d+)\}/g, (placeholder, index) => {
    return index < values.length ? String(values[index]) : placeholder;
  });
}

/**
 * @param {*} error Apex error ({body: {message}}), Error, or anything else
 * @returns {string} the most readable message available
 */
export function errorMessage(error) {
  return error?.body?.message || error?.message || String(error);
}

function assertAccepted(file, acceptedExtensions) {
  if (!isAcceptedFile(file, acceptedExtensions)) {
    throw new FileRejectedError(formatLabel(UNSUPPORTED_TYPE, file.name));
  }
}

async function compress(file, config) {
  try {
    return await compressToTarget(file, config);
  } catch {
    throw new FileRejectedError(COMPRESSION_FAILED);
  }
}

function assertUploadable(blob, config) {
  const verdict = classifySize(blob.size, config);
  if (verdict === SIZE_VERDICT.ABOVE_LIMIT) {
    throw new FileRejectedError(
      formatLabel(
        TOO_LARGE,
        toKilobytes(blob.size),
        toKilobytes(config.maxUploadBytes)
      )
    );
  }
  return verdict;
}

async function send(file, blob, recordId) {
  const base64Data = await blobToBase64(blob);
  return uploadImage({
    fileName: outputFileName(file.name, blob),
    base64Data,
    recordId: recordId || null
  });
}

function successState(verdict, blob, config) {
  const sizeKb = toKilobytes(blob.size);
  return verdict === SIZE_VERDICT.ABOVE_TARGET
    ? {
        state: FILE_STATE.WARNING,
        message: formatLabel(
          ABOVE_TARGET,
          sizeKb,
          toKilobytes(config.targetSizeBytes)
        )
      }
    : { state: FILE_STATE.UPLOADED, message: formatLabel(UPLOADED, sizeKb) };
}

/**
 * @param {File} file
 * @param {{config: object, acceptedExtensions: string[], recordId: (string|undefined)}} context
 * @param {function(string, string): void} onState called with (FILE_STATE value, message)
 * @returns {Promise<({name: string, documentId: string}|null)>} null when the file was not stored
 */
export async function uploadImageFile(file, context, onState) {
  try {
    assertAccepted(file, context.acceptedExtensions);
    onState(FILE_STATE.COMPRESSING, COMPRESSING);
    const { blob } = await compress(file, context.config);
    const verdict = assertUploadable(blob, context.config);
    onState(FILE_STATE.UPLOADING, UPLOADING);
    const uploaded = await send(file, blob, context.recordId);
    const { state, message } = successState(verdict, blob, context.config);
    onState(state, message);
    return uploaded;
  } catch (error) {
    onState(FILE_STATE.FAILED, errorMessage(error));
    return null;
  }
}
