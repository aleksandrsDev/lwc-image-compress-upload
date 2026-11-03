/**
 * One stored file in the demo: its size and name, or a hint before anything was uploaded.
 */
import { LightningElement, api } from "lwc";

export default class ImageCompressUploadDemoFile extends LightningElement {
  /** @type {{fileName: string, sizeLabel: string}} */
  @api file;
  /** Text shown before anything was uploaded. */
  @api emptyMessage;
}
