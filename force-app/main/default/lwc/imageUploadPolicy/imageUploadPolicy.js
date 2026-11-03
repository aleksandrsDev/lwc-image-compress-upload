/**
 * Pure rules of the image uploader: which files are accepted, how a final
 * size is judged and how the stored file is named. No DOM, no Apex.
 */

const SUPPORTED_EXTENSIONS = Object.freeze([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif"
]);

// GIF is opt-in: processImage keeps only the first frame of an animation.
const DEFAULT_EXTENSIONS = Object.freeze([".jpg", ".jpeg", ".png", ".webp"]);

const JPEG_MIME_TYPE = "image/jpeg";
const JPEG_EXTENSIONS = Object.freeze([".jpg", ".jpeg"]);

export const SIZE_VERDICT = Object.freeze({
  WITHIN_TARGET: "withinTarget",
  ABOVE_TARGET: "aboveTarget",
  ABOVE_LIMIT: "aboveLimit"
});

/**
 * @param {string} fileName e.g. "Photo.JPG"
 * @returns {string} lower-case extension with its dot (".jpg"), or "" when there is none
 */
export function extensionOf(fileName) {
  const dotIndex = (fileName || "").lastIndexOf(".");
  return dotIndex < 0 ? "" : fileName.slice(dotIndex).toLowerCase();
}

function normalizeExtension(token) {
  const trimmed = token.trim().toLowerCase();
  return trimmed.startsWith(".") ? trimmed : `.${trimmed}`;
}

/**
 * Narrows the admin-provided accept list to the image types the compressor supports.
 * @param {string} [accept] comma-separated extensions, e.g. ".png, jpg"
 * @returns {string[]} supported extensions; the defaults when nothing usable was given
 */
export function resolveAcceptedExtensions(accept) {
  const requested = (accept || "")
    .split(",")
    .filter((token) => token.trim())
    .map(normalizeExtension)
    .filter((extension) => SUPPORTED_EXTENSIONS.includes(extension));
  const unique = [...new Set(requested)];
  return unique.length ? unique : [...DEFAULT_EXTENSIONS];
}

/**
 * The accept attribute filters the browser's dialog but not drag and drop,
 * so every file is checked again here.
 * @param {File} file
 * @param {string[]} acceptedExtensions result of resolveAcceptedExtensions
 * @returns {boolean}
 */
export function isAcceptedFile(file, acceptedExtensions) {
  return acceptedExtensions.includes(extensionOf(file.name));
}

/**
 * @param {number} bytes final size after compression
 * @param {{targetSizeBytes: number, maxUploadBytes: number}} config
 * @returns {string} one of SIZE_VERDICT
 */
export function classifySize(bytes, config) {
  if (bytes > config.maxUploadBytes) {
    return SIZE_VERDICT.ABOVE_LIMIT;
  }
  return bytes > config.targetSizeBytes
    ? SIZE_VERDICT.ABOVE_TARGET
    : SIZE_VERDICT.WITHIN_TARGET;
}

/**
 * processImage may turn a PNG/GIF/WebP into a JPEG; the stored name must match the content.
 * @param {string} originalName
 * @param {Blob} blob the content that will be stored
 * @returns {string}
 */
export function outputFileName(originalName, blob) {
  const extension = extensionOf(originalName);
  if (blob.type !== JPEG_MIME_TYPE || JPEG_EXTENSIONS.includes(extension)) {
    return originalName;
  }
  const baseName = extension
    ? originalName.slice(0, -extension.length)
    : originalName;
  return `${baseName}.jpg`;
}

/**
 * @param {number} bytes
 * @returns {number} size in KB, rounded up so "0 KB" never appears for a non-empty file
 */
export function toKilobytes(bytes) {
  return Math.ceil(bytes / 1024);
}
