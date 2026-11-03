/**
 * Drop-in alternative to lightning-file-upload for images: same look and
 * uploadfinished event, but every image is compressed in the browser first,
 * as configured in the Image Compression Settings / Step Custom Metadata.
 */
import { LightningElement, api, wire } from "lwc";
import getCompressionConfig from "@salesforce/apex/ImageCompressUploadController.getCompressionConfig";
import DEFAULT_LABEL from "@salesforce/label/c.ICU_Default_Label";
import QUEUED from "@salesforce/label/c.ICU_Status_Queued";
import CONFIG_UNAVAILABLE from "@salesforce/label/c.ICU_Error_Config_Unavailable";
import { resolveAcceptedExtensions } from "c/imageUploadPolicy";
import {
  FILE_STATE,
  errorMessage,
  formatLabel,
  uploadImageFile
} from "c/imageUploadWorkflow";

function createRow(file, index) {
  return {
    key: `${index}-${file.name}`,
    index,
    name: file.name,
    state: FILE_STATE.QUEUED,
    message: QUEUED
  };
}

export default class ImageCompressUpload extends LightningElement {
  /** Text above the file selector. */
  @api label;
  /** Record to share uploaded files with; without it files stay private to the user. */
  @api recordId;
  /** Allow selecting several files at once. */
  @api multiple = false;
  @api disabled = false;
  /** Comma-separated extensions; can only narrow the supported image types. */
  @api accept;

  config;
  configErrorMessage;
  fileRows = [];
  isBusy = false;

  @wire(getCompressionConfig)
  wiredConfig({ data, error }) {
    this.config = data;
    this.configErrorMessage = error
      ? formatLabel(CONFIG_UNAVAILABLE, errorMessage(error))
      : undefined;
  }

  get inputLabel() {
    return this.label || DEFAULT_LABEL;
  }

  get acceptedExtensions() {
    return resolveAcceptedExtensions(this.accept);
  }

  get acceptAttribute() {
    return this.acceptedExtensions.join(",");
  }

  get isInputDisabled() {
    return this.disabled || this.isBusy || !this.config;
  }

  async handleFilesSelected(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }
    this.fileRows = files.map(createRow);
    this.isBusy = true;
    const uploaded = await this.uploadInOrder(files);
    this.isBusy = false;
    this.notifyFinished(uploaded.filter(Boolean));
  }

  /**
   * Sequential on purpose: one Apex request at a time keeps heap and payload predictable.
   * @returns {Promise<Array>} one result per file, null for files that were not stored
   */
  uploadInOrder(files) {
    const context = {
      config: this.config,
      acceptedExtensions: this.acceptedExtensions,
      recordId: this.recordId
    };
    return files.reduce(
      (previous, file, index) =>
        previous.then(async (results) => [
          ...results,
          await this.uploadOne(file, index, context)
        ]),
      Promise.resolve([])
    );
  }

  uploadOne(file, index, context) {
    return uploadImageFile(file, context, (state, message) =>
      this.updateRow(index, state, message)
    );
  }

  updateRow(index, state, message) {
    this.fileRows = this.fileRows.map((row) => {
      return row.index === index ? { ...row, state, message } : row;
    });
  }

  notifyFinished(files) {
    if (files.length) {
      this.dispatchEvent(
        new CustomEvent("uploadfinished", { detail: { files } })
      );
    }
  }
}
