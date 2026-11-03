import { createElement } from "lwc";
import ImageCompressUploadDemoFile from "c/imageCompressUploadDemoFile";

function render(props) {
  const element = createElement("c-image-compress-upload-demo-file", {
    is: ImageCompressUploadDemoFile
  });
  Object.assign(element, props);
  document.body.appendChild(element);
  return element;
}

function byId(element, id) {
  return element.shadowRoot.querySelector(`[data-id="${id}"]`);
}

describe("c-image-compress-upload-demo-file", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it("shows the empty message until a file is set", () => {
    const element = render({ emptyMessage: "Nothing yet" });

    expect(byId(element, "empty").textContent.trim()).toBe("Nothing yet");
    expect(byId(element, "size")).toBeNull();
  });

  it("shows the size and the name of the file", () => {
    const element = render({
      emptyMessage: "Nothing yet",
      file: { fileName: "rituals.jpg", sizeLabel: "812 KB" }
    });

    expect(byId(element, "size").textContent.trim()).toBe("812 KB");
    expect(byId(element, "name").textContent.trim()).toBe("rituals.jpg");
    expect(byId(element, "empty")).toBeNull();
  });
});
