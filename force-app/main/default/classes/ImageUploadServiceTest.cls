@IsTest
private class ImageUploadServiceTest {
  private static final Integer LIMIT_BYTES =
    ImageCompressUploadTestData.MAX_UPLOAD_KB * 1024;

  @TestSetup
  static void setup() {
    ImageCompressUploadTestData.createUploader();
  }

  @IsTest
  static void uploadWithoutRecordKeepsTheFilePrivateToTheUploader() {
    ImageCompressUploadTestData.useDefaultConfig();
    User uploader = ImageCompressUploadTestData.uploader();
    ImageUploadService.UploadResult result;

    System.runAs(uploader) {
      result = upload('holiday.jpg', 100);
    }

    ContentDocument document = [
      SELECT Title, OwnerId, FileExtension, ContentSize
      FROM ContentDocument
      WHERE Id = :result.documentId
    ];
    Assert.areEqual('holiday.jpg', result.name, 'Returns the file name');
    Assert.areEqual('holiday', document.Title, 'Title drops the extension');
    Assert.areEqual('jpg', document.FileExtension, 'Extension is kept');
    Assert.areEqual(100, document.ContentSize, 'Content is stored as sent');
    Assert.areEqual(uploader.Id, document.OwnerId, 'Uploader owns the file');
    Assert.areEqual(
      1,
      [
        SELECT COUNT()
        FROM ContentDocumentLink
        WHERE ContentDocumentId = :result.documentId
      ],
      'Only the owner link exists'
    );
  }

  @IsTest
  static void uploadWithRecordSharesTheFileWithThatRecord() {
    ImageCompressUploadTestData.useDefaultConfig();
    ImageUploadService.UploadResult result;
    Account account = new Account(Name = 'Image Upload Test');

    System.runAs(ImageCompressUploadTestData.uploader()) {
      insert as user account;
      result = ImageUploadService.upload(
        'site.png',
        ImageCompressUploadTestData.base64OfSize(100),
        account.Id
      );
    }

    Assert.areEqual(
      1,
      [
        SELECT COUNT()
        FROM ContentDocumentLink
        WHERE
          ContentDocumentId = :result.documentId
          AND LinkedEntityId = :account.Id
      ],
      'File is linked to the record'
    );
  }

  @IsTest
  static void uploadAcceptsUpperCaseExtensions() {
    ImageCompressUploadTestData.useDefaultConfig();
    ImageUploadService.UploadResult result;

    System.runAs(ImageCompressUploadTestData.uploader()) {
      result = upload('SCAN.JPEG', 10);
    }

    Assert.isNotNull(result.documentId, 'Upper-case extension is accepted');
  }

  @IsTest
  static void uploadAcceptsAFileExactlyAtTheLimit() {
    ImageCompressUploadTestData.useDefaultConfig();
    ImageUploadService.UploadResult result;

    System.runAs(ImageCompressUploadTestData.uploader()) {
      result = upload('edge.webp', LIMIT_BYTES);
    }

    Assert.isNotNull(result.documentId, 'The limit itself is allowed');
  }

  @IsTest
  static void uploadRejectsAFileOneByteOverTheLimit() {
    ImageCompressUploadTestData.useDefaultConfig();
    String message;

    System.runAs(ImageCompressUploadTestData.uploader()) {
      message = rejectionMessage(
        'big.jpg',
        ImageCompressUploadTestData.base64OfSize(LIMIT_BYTES + 1)
      );
    }

    Assert.areEqual(
      String.format(
        System.Label.ICU_Error_Too_Large,
        new List<Object>{
          ImageCompressUploadTestData.MAX_UPLOAD_KB + 1,
          ImageCompressUploadTestData.MAX_UPLOAD_KB
        }
      ),
      message,
      'Size and limit are reported in KB'
    );
    Assert.areEqual(0, storedCount('big.jpg'), 'Nothing is stored');
  }

  @IsTest
  static void uploadRejectsNonImageFiles() {
    ImageCompressUploadTestData.useDefaultConfig();
    String message;

    System.runAs(ImageCompressUploadTestData.uploader()) {
      message = rejectionMessage(
        'contract.pdf',
        ImageCompressUploadTestData.base64OfSize(10)
      );
    }

    Assert.areEqual(unsupportedMessage('contract.pdf'), message, 'PDF');
    Assert.areEqual(0, storedCount('contract.pdf'), 'Nothing is stored');
  }

  @IsTest
  static void uploadRejectsFilesWithoutExtension() {
    ImageCompressUploadTestData.useDefaultConfig();
    String message;

    System.runAs(ImageCompressUploadTestData.uploader()) {
      message = rejectionMessage(
        'photo',
        ImageCompressUploadTestData.base64OfSize(10)
      );
    }

    Assert.areEqual(unsupportedMessage('photo'), message, 'No extension');
  }

  @IsTest
  static void uploadRejectsABlankFileName() {
    ImageCompressUploadTestData.useDefaultConfig();
    String message;

    System.runAs(ImageCompressUploadTestData.uploader()) {
      message = rejectionMessage(
        null,
        ImageCompressUploadTestData.base64OfSize(10)
      );
    }

    Assert.areEqual(unsupportedMessage(null), message, 'Blank name');
  }

  @IsTest
  static void uploadRejectsEmptyContent() {
    ImageCompressUploadTestData.useDefaultConfig();
    String message;

    System.runAs(ImageCompressUploadTestData.uploader()) {
      message = rejectionMessage('empty.jpg', '');
    }

    Assert.areEqual(System.Label.ICU_Error_Empty_File, message, 'Empty');
    Assert.areEqual(0, storedCount('empty.jpg'), 'Nothing is stored');
  }

  private static ImageUploadService.UploadResult upload(
    String fileName,
    Integer bytes
  ) {
    return ImageUploadService.upload(
      fileName,
      ImageCompressUploadTestData.base64OfSize(bytes),
      null
    );
  }

  private static String rejectionMessage(String fileName, String base64Data) {
    try {
      ImageUploadService.upload(fileName, base64Data, null);
    } catch (ImageCompressUploadException e) {
      return e.getMessage();
    }
    Assert.fail('upload() must throw');
    return null;
  }

  private static Integer storedCount(String fileName) {
    return [SELECT COUNT() FROM ContentVersion WHERE PathOnClient = :fileName];
  }

  private static String unsupportedMessage(String fileName) {
    return String.format(
      System.Label.ICU_Error_Unsupported_Type,
      new List<String>{ fileName }
    );
  }
}
