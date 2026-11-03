/**
 * Stores an already-compressed image as a Salesforce File (ContentVersion),
 * optionally shared with a record, enforcing the user's permissions.
 */
public with sharing class ImageUploadService {
  @TestVisible
  private static final Set<String> SUPPORTED_EXTENSIONS = new Set<String>{
    'jpg',
    'jpeg',
    'png',
    'webp',
    'gif'
  };

  /**
   * Validates the image and stores it as a ContentVersion owned by the current user.
   * @param fileName   original file name including its extension
   * @param base64Data file content, base64 encoded
   * @param recordId   record to share the file with; null keeps the file private to the user
   * @return the stored file's name and ContentDocument Id
   * @throws ImageCompressUploadException for an unsupported, empty or too large file
   */
  public static UploadResult upload(
    String fileName,
    String base64Data,
    Id recordId
  ) {
    assertSupportedExtension(fileName);
    Blob content = decode(base64Data);
    assertWithinLimit(content);
    ContentVersion version = insertVersion(fileName, content, recordId);
    return new UploadResult(fileName, findDocumentId(version.Id));
  }

  private static void assertSupportedExtension(String fileName) {
    String extension = String.isBlank(fileName)
      ? ''
      : fileName.substringAfterLast('.').toLowerCase();
    if (!SUPPORTED_EXTENSIONS.contains(extension)) {
      throw new ImageCompressUploadException(
        String.format(
          System.Label.ICU_Error_Unsupported_Type,
          new List<String>{ fileName }
        )
      );
    }
  }

  private static Blob decode(String base64Data) {
    if (String.isBlank(base64Data)) {
      throw new ImageCompressUploadException(System.Label.ICU_Error_Empty_File);
    }
    return EncodingUtil.base64Decode(base64Data);
  }

  private static void assertWithinLimit(Blob content) {
    Integer maxUploadBytes = ImageCompressionConfigService.load()
      .maxUploadBytes;
    if (content.size() > maxUploadBytes) {
      throw new ImageCompressUploadException(
        String.format(
          System.Label.ICU_Error_Too_Large,
          new List<Object>{
            toKilobytes(content.size()),
            toKilobytes(maxUploadBytes)
          }
        )
      );
    }
  }

  private static ContentVersion insertVersion(
    String fileName,
    Blob content,
    Id recordId
  ) {
    ContentVersion version = new ContentVersion(
      Title = fileName.substringBeforeLast('.'),
      PathOnClient = fileName,
      VersionData = content,
      FirstPublishLocationId = recordId
    );
    Database.insert(version, AccessLevel.USER_MODE);
    return version;
  }

  private static Id findDocumentId(Id versionId) {
    return [
      SELECT ContentDocumentId
      FROM ContentVersion
      WHERE Id = :versionId
      WITH USER_MODE
    ]
    .ContentDocumentId;
  }

  private static Integer toKilobytes(Integer bytes) {
    return (Integer) Math.ceil(bytes / 1024.0);
  }

  /** Same shape as one entry of lightning-file-upload's uploadfinished files. */
  public class UploadResult {
    @AuraEnabled
    public String name;
    @AuraEnabled
    public Id documentId;

    private UploadResult(String name, Id documentId) {
      this.name = name;
      this.documentId = documentId;
    }
  }
}
