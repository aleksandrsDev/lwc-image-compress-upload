import { createElement } from "lwc";
// Namespace import: the test drives the getRecords test adapter (emit, getLastConfig), it does not wire it.
import * as uiRecordApi from "lightning/uiRecordApi";
import getCompressionConfig from "@salesforce/apex/ImageCompressUploadController.getCompressionConfig";
import ImageCompressUploadDemo from "c/imageCompressUploadDemo";

jest.mock(
  "@salesforce/apex/ImageCompressUploadController.getCompressionConfig",
  () => {
    const { createApexTestWireAdapter } = require("@salesforce/sfdx-lwc-jest");
    return { default: createApexTestWireAdapter(jest.fn()) };
  },
  { virtual: true }
);

const RECORD_ID = "001000000000001AAA";
const CONFIG = {
  targetSizeBytes: 1048576,
  maxUploadBytes: 2097152,
  steps: [
    { maxWidth: 2048, maxHeight: 2048, quality: 0.8, convertToJpeg: false }
  ]
};

function contentDocument(id, title, extension, size) {
  return {
    statusCode: 200,
    result: {
      id,
      fields: {
        Title: { value: title },
        FileExtension: { value: extension },
        ContentSize: { value: size }
      }
    }
  };
}

function render() {
  const element = createElement("c-image-compress-upload-demo", {
    is: ImageCompressUploadDemo
  });
  element.recordId = RECORD_ID;
  document.body.appendChild(element);
  return element;
}

function query(element, selector) {
  return element.shadowRoot.querySelector(selector);
}

function finishUpload(element, slot, documentId) {
  query(element, `[data-slot="${slot}"]`).dispatchEvent(
    new CustomEvent("uploadfinished", {
      detail: { files: [{ name: "x", documentId }] }
    })
  );
  return Promise.resolve();
}

describe("c-image-compress-upload-demo", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
  });

  it("puts the standard and the compressing uploader on the same record", () => {
    const element = render();

    const standard = query(element, "lightning-file-upload");
    const compressing = query(
      element,
      'c-image-compress-upload[data-slot="compressed"]'
    );
    expect(standard.recordId).toBe(RECORD_ID);
    expect(standard.accept).toEqual([".jpg", ".jpeg", ".png", ".webp"]);
    expect(compressing.recordId).toBe(RECORD_ID);
  });

  it("offers a batch uploader that accepts several files", () => {
    const element = render();

    const batch = query(element, '[data-id="batch"]');
    expect(batch.multiple).toBe(true);
    expect(batch.recordId).toBe(RECORD_ID);
  });

  it("offers a separate single-file uploader for the rejection case", () => {
    const element = render();

    const rejection = query(element, '[data-id="rejection"]');
    expect(rejection.multiple).toBe(false);
    expect(rejection.recordId).toBe(RECORD_ID);
  });

  it("summarizes the active compression settings", async () => {
    const element = render();

    getCompressionConfig.emit(CONFIG);
    await Promise.resolve();

    expect(query(element, '[data-id="settings"]').textContent.trim()).toBe(
      "Target 1.0 MB · Limit 2.0 MB · Step 1: 2048×2048px, quality 0.8"
    );
  });

  it("hides the settings line when they cannot be loaded", async () => {
    const element = render();

    getCompressionConfig.error();
    await Promise.resolve();

    expect(query(element, '[data-id="settings"]')).toBeNull();
  });

  it("loads nothing and shows no comparison before any upload", () => {
    const element = render();

    expect(uiRecordApi.getRecords.getLastConfig().records).toBeUndefined();
    expect(query(element, '[data-id="comparison"]')).toBeNull();
  });

  it("loads the stored file of each side and compares their sizes", async () => {
    const element = render();

    await finishUpload(element, "original", "069O");
    await finishUpload(element, "compressed", "069C");
    expect(uiRecordApi.getRecords.getLastConfig().records[0].recordIds).toEqual(
      ["069O", "069C"]
    );

    uiRecordApi.getRecords.emit({
      results: [
        contentDocument("069O", "rituals", "png", 21851756),
        contentDocument("069C", "rituals", "jpg", 831488)
      ]
    });
    await Promise.resolve();

    expect(query(element, '[data-id="comparison"]').textContent.trim()).toBe(
      "20.8 MB → 812 KB · 96% smaller"
    );
    expect(query(element, '[data-id="original-file"]').file.fileName).toBe(
      "rituals.png"
    );
    expect(query(element, '[data-id="compressed-file"]').file.fileName).toBe(
      "rituals.jpg"
    );
  });

  it("shows one side without a comparison while the other is still empty", async () => {
    const element = render();

    await finishUpload(element, "compressed", "069C");
    uiRecordApi.getRecords.emit({
      results: [contentDocument("069C", "rituals", "jpg", 831488)]
    });
    await Promise.resolve();

    expect(query(element, '[data-id="compressed-file"]').file.sizeLabel).toBe(
      "812 KB"
    );
    expect(query(element, '[data-id="original-file"]').file).toBeUndefined();
    expect(query(element, '[data-id="comparison"]')).toBeNull();
  });
});
