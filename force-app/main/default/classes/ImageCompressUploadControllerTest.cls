@IsTest
private class ImageCompressUploadControllerTest {
  @TestSetup
  static void setup() {
    ImageCompressUploadTestData.createUploader();
  }

  @IsTest
  static void getCompressionConfigReturnsTheConfiguration() {
    ImageCompressUploadTestData.useDefaultConfig();
    ImageCompressionConfigService.Config config;

    System.runAs(ImageCompressUploadTestData.uploader()) {
      config = ImageCompressUploadController.getCompressionConfig();
    }

    Assert.areEqual(2, config.steps.size(), 'Steps are returned');
  }

  @IsTest
  static void getCompressionConfigTurnsMissingSettingsIntoAuraException() {
    ImageCompressUploadTestData.useConfig(
      null,
      ImageCompressUploadTestData.twoSteps()
    );
    String message;

    System.runAs(ImageCompressUploadTestData.uploader()) {
      try {
        ImageCompressUploadController.getCompressionConfig();
        Assert.fail('Must throw');
      } catch (AuraHandledException e) {
        message = e.getMessage();
      }
    }

    Assert.areEqual(
      System.Label.ICU_Error_Config_Missing,
      message,
      'The service message reaches the component'
    );
  }

  @IsTest
  static void uploadImageReturnsTheStoredDocument() {
    ImageCompressUploadTestData.useDefaultConfig();
    ImageUploadService.UploadResult result;

    System.runAs(ImageCompressUploadTestData.uploader()) {
      result = ImageCompressUploadController.uploadImage(
        'photo.jpg',
        ImageCompressUploadTestData.base64OfSize(10),
        null
      );
    }

    Assert.areEqual('photo.jpg', result.name, 'Name is returned');
    Assert.isNotNull(result.documentId, 'Document Id is returned');
  }

  @IsTest
  static void uploadImageTurnsValidationErrorsIntoAuraException() {
    ImageCompressUploadTestData.useDefaultConfig();
    String message;

    System.runAs(ImageCompressUploadTestData.uploader()) {
      message = uploadErrorMessage('notes.txt', null);
    }

    Assert.areEqual(
      String.format(
        System.Label.ICU_Error_Unsupported_Type,
        new List<String>{ 'notes.txt' }
      ),
      message,
      'Validation message reaches the component'
    );
  }

  @IsTest
  static void uploadImageTurnsDmlErrorsIntoAuraException() {
    ImageCompressUploadTestData.useDefaultConfig();
    String message;

    System.runAs(ImageCompressUploadTestData.uploader()) {
      Account account = new Account(Name = 'Deleted before upload');
      insert as user account;
      delete as user account;
      message = uploadErrorMessage('photo.jpg', account.Id);
    }

    Assert.isTrue(
      message.startsWith(
        System.Label.ICU_Error_Upload_Failed.substringBefore('{0}')
      ),
      'DML failure is wrapped in the upload-failed message: ' + message
    );
  }

  private static String uploadErrorMessage(String fileName, Id recordId) {
    try {
      ImageCompressUploadController.uploadImage(
        fileName,
        ImageCompressUploadTestData.base64OfSize(10),
        recordId
      );
    } catch (AuraHandledException e) {
      return e.getMessage();
    }
    Assert.fail('uploadImage() must throw');
    return null;
  }
}
