import { createElement } from "lwc";
import ImageCompressUploadFileList from "c/imageCompressUploadFileList";

function render(files) {
  const element = createElement("c-image-compress-upload-file-list", {
    is: ImageCompressUploadFileList
  });
  element.files = files;
  document.body.appendChild(element);
  return element;
}

function rowOf(element, state) {
  return element.shadowRoot.querySelector(`li[data-state="${state}"]`);
}

describe("c-image-compress-upload-file-list", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it.each([[[]], [null]])("renders nothing when files is %p", (files) => {
    const element = render(files);

    expect(element.shadowRoot.querySelector("ul")).toBeNull();
  });

  it("renders one row per file with its name and message", () => {
    const element = render([
      {
        key: "0",
        name: "a.jpg",
        state: "uploaded",
        message: "Uploaded (12 KB)"
      },
      { key: "1", name: "b.png", state: "queued", message: "Waiting…" }
    ]);

    const rows = element.shadowRoot.querySelectorAll("li");
    expect(rows).toHaveLength(2);
    expect(rows[0].querySelector('[data-id="name"]').textContent.trim()).toBe(
      "a.jpg"
    );
    expect(rows[0].querySelector('[data-id="message"]').textContent).toBe(
      "Uploaded (12 KB)"
    );
  });

  it.each([
    ["queued", "utility:clock", undefined],
    ["compressing", "utility:sync", undefined],
    ["uploading", "utility:upload", undefined],
    ["uploaded", "utility:success", "success"],
    ["warning", "utility:warning", "warning"],
    ["failed", "utility:error", "error"]
  ])("shows the %s state with %s", (state, iconName, variant) => {
    const element = render([
      { key: "0", name: "a.jpg", state, message: "msg" }
    ]);

    const icon = rowOf(element, state).querySelector("lightning-icon");
    expect(icon.iconName).toBe(iconName);
    expect(icon.variant).toBe(variant);
    expect(icon.alternativeText).toBe("msg");
  });

  it("colours only failure messages as errors", () => {
    const element = render([
      { key: "0", name: "a.jpg", state: "failed", message: "Nope" },
      { key: "1", name: "b.jpg", state: "warning", message: "Big" }
    ]);

    const failed = rowOf(element, "failed").querySelector(
      '[data-id="message"]'
    );
    const warning = rowOf(element, "warning").querySelector(
      '[data-id="message"]'
    );
    expect(failed.classList).toContain("slds-text-color_error");
    expect(warning.classList).toContain("slds-text-color_weak");
  });

  it("falls back to the queued look for an unknown state", () => {
    const element = render([
      { key: "0", name: "a.jpg", state: "mystery", message: "" }
    ]);

    expect(
      rowOf(element, "mystery").querySelector("lightning-icon").iconName
    ).toBe("utility:clock");
  });

  it("truncates long file names but always shows the full message", () => {
    const element = render([
      {
        key: "0",
        name: "a-very-long-certificate-file-name.pdf",
        state: "failed",
        message:
          "Not uploaded: a-very-long-certificate-file-name.pdf isn't a supported image"
      }
    ]);

    const row = rowOf(element, "failed");
    const container = row.querySelector("lightning-layout-item:last-child");
    expect(row.querySelector('[data-id="name"]').classList).toContain(
      "slds-truncate"
    );
    expect(container.classList).not.toContain("slds-truncate");
    expect(row.querySelector('[data-id="message"]').classList).toContain(
      "slds-hyphenate"
    );
  });
});
