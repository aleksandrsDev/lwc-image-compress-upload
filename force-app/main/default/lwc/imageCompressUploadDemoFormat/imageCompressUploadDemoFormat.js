/**
 * Pure display helpers for the demo card: sizes, savings, settings and file records.
 */

const KB = 1024;
const MB = KB * 1024;
const OK_STATUS = 200;

/**
 * @param {number} bytes
 * @returns {string} e.g. "512 B", "812 KB", "21.3 MB"
 */
export function formatSize(bytes) {
  if (bytes < KB) {
    return `${bytes} B`;
  }
  if (bytes < MB) {
    return `${Math.round(bytes / KB)} KB`;
  }
  return `${(bytes / MB).toFixed(1)} MB`;
}

/**
 * @param {number} originalBytes
 * @param {number} compressedBytes
 * @returns {number} whole percent saved; negative when the result grew, 0 for an empty original
 */
export function savingPercent(originalBytes, compressedBytes) {
  if (!originalBytes) {
    return 0;
  }
  return Math.round((1 - compressedBytes / originalBytes) * 100);
}

function describeStep(step, index) {
  const jpeg = step.convertToJpeg ? ", to JPEG" : "";
  return `Step ${index + 1}: ${step.maxWidth}×${step.maxHeight}px, quality ${step.quality}${jpeg}`;
}

/**
 * @param {{targetSizeBytes: number, maxUploadBytes: number, steps: object[]}} config
 * @returns {string} one-line summary of the active compression settings
 */
export function describeSettings(config) {
  return [
    `Target ${formatSize(config.targetSizeBytes)}`,
    `Limit ${formatSize(config.maxUploadBytes)}`,
    ...config.steps.map(describeStep)
  ].join(" · ");
}

/**
 * @param {object} record UI API ContentDocument record
 * @returns {{id: string, fileName: string, size: number, sizeLabel: string}}
 */
export function toFileView(record) {
  const { Title, FileExtension, ContentSize } = record.fields;
  return {
    id: record.id,
    fileName: `${Title.value}.${FileExtension.value}`,
    size: ContentSize.value,
    sizeLabel: formatSize(ContentSize.value)
  };
}

/**
 * @param {{statusCode: number, result: object}[]} results getRecords results
 * @returns {Object<string, object>} file views by ContentDocument Id; failed lookups are skipped
 */
export function indexFiles(results) {
  return results
    .filter(({ statusCode }) => statusCode === OK_STATUS)
    .map(({ result }) => toFileView(result))
    .reduce((byId, file) => ({ ...byId, [file.id]: file }), {});
}
