/**
 * Read-only list of selected files with their current upload state.
 */
import { LightningElement, api } from "lwc";

const STATE_PRESENTATION = Object.freeze({
  queued: { iconName: "utility:clock", iconVariant: undefined, isError: false },
  compressing: {
    iconName: "utility:sync",
    iconVariant: undefined,
    isError: false
  },
  uploading: {
    iconName: "utility:upload",
    iconVariant: undefined,
    isError: false
  },
  uploaded: {
    iconName: "utility:success",
    iconVariant: "success",
    isError: false
  },
  warning: {
    iconName: "utility:warning",
    iconVariant: "warning",
    isError: false
  },
  failed: { iconName: "utility:error", iconVariant: "error", isError: true }
});

// Messages wrap (and break long file names) so the reason is always readable in full.
const MESSAGE_CLASS = "slds-text-body_small slds-hyphenate";

function toRow(file) {
  const presentation =
    STATE_PRESENTATION[file.state] || STATE_PRESENTATION.queued;
  return {
    ...file,
    iconName: presentation.iconName,
    iconVariant: presentation.iconVariant,
    messageClass: presentation.isError
      ? `${MESSAGE_CLASS} slds-text-color_error`
      : `${MESSAGE_CLASS} slds-text-color_weak`
  };
}

export default class ImageCompressUploadFileList extends LightningElement {
  /** @type {{key: string, name: string, state: string, message: string}[]} */
  @api files = [];

  get rows() {
    return (this.files || []).map(toRow);
  }

  get hasRows() {
    return this.rows.length > 0;
  }
}
