/**
 * Apex entry points for the imageCompressUpload LWC.
 * Delegates to the services and turns failures into AuraHandledException
 * so the component can show a readable message.
 */
public with sharing class ImageCompressUploadController {
  /**
   * Returns the image compression configuration for the component.
   * @return the Default compression configuration (cacheable, used with @wire)
   */
  @AuraEnabled(cacheable=true)
  public static ImageCompressionConfigService.Config getCompressionConfig() {
    try {
      return ImageCompressionConfigService.load();
    } catch (ImageCompressUploadException e) {
      throw toAuraException(e.getMessage());
    }
  }

  /**
   * Stores one compressed image as a Salesforce File.
   * @param fileName   file name including its extension
   * @param base64Data compressed file content, base64 encoded
   * @param recordId   record to share the file with; null keeps the file private
   * @return the stored file's name and ContentDocument Id
   */
  @AuraEnabled
  public static ImageUploadService.UploadResult uploadImage(
    String fileName,
    String base64Data,
    Id recordId
  ) {
    try {
      return ImageUploadService.upload(fileName, base64Data, recordId);
    } catch (ImageCompressUploadException e) {
      throw toAuraException(e.getMessage());
    } catch (DmlException e) {
      throw toAuraException(
        String.format(
          System.Label.ICU_Error_Upload_Failed,
          new List<String>{ e.getDmlMessage(0) }
        )
      );
    }
  }

  private static AuraHandledException toAuraException(String message) {
    AuraHandledException auraException = new AuraHandledException(message);
    auraException.setMessage(message);
    return auraException;
  }
}
