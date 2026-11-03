import { createElement } from "lwc";
import { processImage } from "lightning/mediaUtils";
import getCompressionConfig from "@salesforce/apex/ImageCompressUploadController.getCompressionConfig";
import uploadImage from "@salesforce/apex/ImageCompressUploadController.uploadImage";
import { blobToBase64 } from "c/blobEncoding";
import ImageCompressUpload from "c/imageCompressUpload";

jest.mock(
  "@salesforce/apex/ImageCompressUploadController.getCompressionConfig",
  () => {
    const { createApexTestWireAdapter } = require("@salesforce/sfdx-lwc-jest");
    return { default: createApexTestWireAdapter(jest.fn()) };
  },
  { virtual: true }
);
jest.mock(
  "@salesforce/apex/ImageCompressUploadController.uploadImage",
  () => ({ default: jest.fn() }),
  { virtual: true }
);
// FileReader is the only timer-based step; it has its own tests in blobEncoding.
jest.mock("c/blobEncoding", () => ({ blobToBase64: jest.fn() }));

const CONFIG = {
  targetSizeBytes: 100,
  maxUploadBytes: 300,
  steps: [
    {
      name: "Step_1",
      quality: 0.7,
      maxWidth: 800,
      maxHeight: 800,
      convertToJpeg: false
    }
  ]
};
const RECORD_ID = "001000000000001AAA";

function file(name, bytes = 50) {
  return new File([new Uint8Array(bytes)], name, { type: "image/jpeg" });
}

function render(props = {}) {
  const element = createElement("c-image-compress-upload", {
    is: ImageCompressUpload
  });
  Object.assign(element, props);
  document.body.appendChild(element);
  return element;
}

function input(element) {
  return element.shadowRoot.querySelector("lightning-input");
}

function fileRows(element) {
  return element.shadowRoot.querySelector("c-image-compress-upload-file-list")
    .files;
}

// With blobEncoding mocked everything is promise-based: enough microtask turns
// for the whole compress -> encode -> upload chain and the re-render to finish.
const MICROTASK_TURNS = 50;
function settle() {
  return Array.from({ length: MICROTASK_TURNS }).reduce(
    (chain) => chain.then(() => undefined),
    Promise.resolve()
  );
}

async function select(element, files) {
  const fileInput = input(element);
  fileInput.files = files;
  fileInput.dispatchEvent(new CustomEvent("change"));
  await settle();
}

async function renderConfigured(props) {
  const element = render(props);
  getCompressionConfig.emit(CONFIG);
  await settle();
  return element;
}

describe("c-image-compress-upload", () => {
  beforeEach(() => {
    blobToBase64.mockResolvedValue("QUJD");
    uploadImage.mockImplementation(({ fileName }) =>
      Promise.resolve({ name: fileName, documentId: `069-${fileName}` })
    );
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.resetAllMocks();
  });

  describe("file selector", () => {
    it("is a file input with the default label, single selection and image-only accept list", async () => {
      const element = await renderConfigured();

      const fileInput = input(element);
      expect(fileInput.type).toBe("file");
      expect(fileInput.label).toBe("c.ICU_Default_Label");
      expect(fileInput.multiple).toBe(false);
      expect(fileInput.accept).toBe(".jpg,.jpeg,.png,.webp");
    });

    it("passes label, multiple and a narrowed accept list through", async () => {
      const element = await renderConfigured({
        label: "Site photos",
        multiple: true,
        accept: ".png,.pdf"
      });

      const fileInput = input(element);
      expect(fileInput.label).toBe("Site photos");
      expect(fileInput.multiple).toBe(true);
      expect(fileInput.accept).toBe(".png");
    });

    it("stays disabled until the configuration has loaded", async () => {
      const element = render();
      expect(input(element).disabled).toBe(true);

      getCompressionConfig.emit(CONFIG);
      await settle();

      expect(input(element).disabled).toBe(false);
    });

    it("honours the disabled property", async () => {
      const element = await renderConfigured({ disabled: true });

      expect(input(element).disabled).toBe(true);
    });
  });

  describe("configuration errors", () => {
    it("shows the error and keeps the selector disabled", async () => {
      const element = render();

      getCompressionConfig.error({ message: "Default settings missing" });
      await settle();

      const error = element.shadowRoot.querySelector(
        '[data-id="config-error"]'
      );
      expect(error.textContent.trim()).toBe("c.ICU_Error_Config_Unavailable");
      expect(input(element).disabled).toBe(true);
    });
  });

  describe("uploading", () => {
    it("uploads a file to the record and fires uploadfinished like lightning-file-upload", async () => {
      const element = await renderConfigured({ recordId: RECORD_ID });
      const handler = jest.fn();
      element.addEventListener("uploadfinished", handler);

      await select(element, [file("photo.jpg")]);

      expect(uploadImage).toHaveBeenCalledWith(
        expect.objectContaining({ fileName: "photo.jpg", recordId: RECORD_ID })
      );
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail).toEqual({
        files: [{ name: "photo.jpg", documentId: "069-photo.jpg" }]
      });
      expect(fileRows(element)).toEqual([
        expect.objectContaining({ name: "photo.jpg", state: "uploaded" })
      ]);
    });

    it("compresses a file above target before uploading it", async () => {
      processImage.mockResolvedValue(
        new Blob([new Uint8Array(60)], { type: "image/jpeg" })
      );
      const element = await renderConfigured();

      await select(element, [file("big.jpg", 1000)]);

      expect(processImage).toHaveBeenCalledTimes(1);
      expect(uploadImage).toHaveBeenCalledTimes(1);
    });

    it("uploads several files one after another, in selection order", async () => {
      const element = await renderConfigured({ multiple: true });
      const handler = jest.fn();
      element.addEventListener("uploadfinished", handler);

      await select(element, [file("one.jpg"), file("two.jpg")]);

      expect(uploadImage.mock.calls.map(([params]) => params.fileName)).toEqual(
        ["one.jpg", "two.jpg"]
      );
      expect(handler.mock.calls[0][0].detail.files).toHaveLength(2);
    });

    it("reports only the files that were stored", async () => {
      const element = await renderConfigured({ multiple: true });
      const handler = jest.fn();
      element.addEventListener("uploadfinished", handler);

      await select(element, [file("notes.pdf"), file("photo.jpg")]);

      expect(handler.mock.calls[0][0].detail.files).toEqual([
        { name: "photo.jpg", documentId: "069-photo.jpg" }
      ]);
      expect(fileRows(element).map((row) => row.state)).toEqual([
        "failed",
        "uploaded"
      ]);
    });

    it("does not fire uploadfinished when nothing was stored", async () => {
      uploadImage.mockRejectedValue({
        body: { message: "Insufficient access" }
      });
      const element = await renderConfigured();
      const handler = jest.fn();
      element.addEventListener("uploadfinished", handler);

      await select(element, [file("photo.jpg")]);

      expect(handler).not.toHaveBeenCalled();
      expect(fileRows(element)).toEqual([
        expect.objectContaining({
          state: "failed",
          message: "Insufficient access"
        })
      ]);
    });

    it("disables the selector while files are being processed", async () => {
      let finishUpload;
      uploadImage.mockReturnValue(
        new Promise((resolve) => {
          finishUpload = resolve;
        })
      );
      const element = await renderConfigured();

      await select(element, [file("photo.jpg")]);
      expect(input(element).disabled).toBe(true);
      expect(fileRows(element)[0].state).toBe("uploading");

      finishUpload({ name: "photo.jpg", documentId: "069x" });
      await settle();
      expect(input(element).disabled).toBe(false);
    });

    it.each([[[]], [undefined]])(
      "ignores a change event with files = %p",
      async (files) => {
        const element = await renderConfigured();

        await select(element, files);

        expect(uploadImage).not.toHaveBeenCalled();
        expect(fileRows(element)).toEqual([]);
      }
    );
  });
});
