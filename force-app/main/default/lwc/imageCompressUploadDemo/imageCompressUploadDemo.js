/**
 * Showcase of c-image-compress-upload for the README screenshot.
 * Upload the same picture to both sides: the banner shows both stored sizes and the saving.
 * The batch tile shows uploaded, converted and rejected files together.
 */
import { LightningElement, api, wire } from "lwc";
import { getRecords } from "lightning/uiRecordApi";
import getCompressionConfig from "@salesforce/apex/ImageCompressUploadController.getCompressionConfig";
import CONTENT_SIZE from "@salesforce/schema/ContentDocument.ContentSize";
import TITLE from "@salesforce/schema/ContentDocument.Title";
import FILE_EXTENSION from "@salesforce/schema/ContentDocument.FileExtension";
import {
  describeSettings,
  formatSize,
  indexFiles,
  savingPercent
} from "c/imageCompressUploadDemoFormat";

const FILE_FIELDS = [CONTENT_SIZE, TITLE, FILE_EXTENSION];
const ACCEPTED_FORMATS = Object.freeze([".jpg", ".jpeg", ".png", ".webp"]);

export default class ImageCompressUploadDemo extends LightningElement {
  @api recordId;

  acceptedFormats = ACCEPTED_FORMATS;
  settingsSummary;
  documentIds = { original: undefined, compressed: undefined };
  filesById = {};

  @wire(getCompressionConfig)
  wiredConfig({ data }) {
    this.settingsSummary = data ? describeSettings(data) : undefined;
  }

  @wire(getRecords, { records: "$recordsToLoad" })
  wiredFiles({ data }) {
    if (data) {
      this.filesById = indexFiles(data.results);
    }
  }

  get recordsToLoad() {
    const recordIds = Object.values(this.documentIds).filter(Boolean);
    return recordIds.length ? [{ recordIds, fields: FILE_FIELDS }] : undefined;
  }

  get originalFile() {
    return this.filesById[this.documentIds.original];
  }

  get compressedFile() {
    return this.filesById[this.documentIds.compressed];
  }

  get comparison() {
    const { originalFile, compressedFile } = this;
    if (!originalFile || !compressedFile) {
      return undefined;
    }
    const saved = savingPercent(originalFile.size, compressedFile.size);
    return `${formatSize(originalFile.size)} → ${formatSize(compressedFile.size)} · ${saved}% smaller`;
  }

  /** Both uploaders fire uploadfinished with the same shape; data-slot says which side it was. */
  handleUploadFinished(event) {
    const slot = event.target.dataset.slot;
    const [uploaded] = event.detail.files;
    this.documentIds = { ...this.documentIds, [slot]: uploaded.documentId };
  }
}
