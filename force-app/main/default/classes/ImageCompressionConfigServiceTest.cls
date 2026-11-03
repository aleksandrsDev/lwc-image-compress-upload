@IsTest
private class ImageCompressionConfigServiceTest {
  @TestSetup
  static void setup() {
    ImageCompressUploadTestData.createUploader();
  }

  @IsTest
  static void loadConvertsKilobytesToBytes() {
    ImageCompressUploadTestData.useDefaultConfig();
    ImageCompressionConfigService.Config config;

    System.runAs(ImageCompressUploadTestData.uploader()) {
      config = ImageCompressionConfigService.load();
    }

    Assert.areEqual(
      ImageCompressUploadTestData.TARGET_KB * 1024,
      config.targetSizeBytes,
      'Target size is exposed in bytes'
    );
    Assert.areEqual(
      ImageCompressUploadTestData.MAX_UPLOAD_KB * 1024,
      config.maxUploadBytes,
      'Max upload size is exposed in bytes'
    );
  }

  @IsTest
  static void loadMapsEveryStepFieldAndKeepsTheSelectorOrder() {
    ImageCompressUploadTestData.useDefaultConfig();
    List<ImageCompressionConfigService.Step> steps;

    System.runAs(ImageCompressUploadTestData.uploader()) {
      steps = ImageCompressionConfigService.load().steps;
    }

    Assert.areEqual(
      new List<Object>{
        new Map<String, Object>{
          'name' => 'Step_1',
          'quality' => 0.8,
          'maxWidth' => 2048,
          'maxHeight' => 2048,
          'convertToJpeg' => false
        },
        new Map<String, Object>{
          'name' => 'Step_2',
          'quality' => 0.6,
          'maxWidth' => 1280,
          'maxHeight' => 1024,
          'convertToJpeg' => true
        }
      },
      JSON.deserializeUntyped(JSON.serialize(steps)),
      'Every field of every step reaches the component, in order'
    );
  }

  @IsTest
  static void loadFailsWithAReadableMessageWhenSettingsAreMissing() {
    ImageCompressUploadTestData.useConfig(
      null,
      ImageCompressUploadTestData.twoSteps()
    );
    String message;

    System.runAs(ImageCompressUploadTestData.uploader()) {
      message = loadErrorMessage();
    }

    Assert.areEqual(
      System.Label.ICU_Error_Config_Missing,
      message,
      'Missing settings are reported'
    );
  }

  @IsTest
  static void loadFailsWithAReadableMessageWhenThereAreNoSteps() {
    ImageCompressUploadTestData.useConfig(
      ImageCompressUploadTestData.settings(),
      new List<Image_Compression_Step__mdt>()
    );
    String message;

    System.runAs(ImageCompressUploadTestData.uploader()) {
      message = loadErrorMessage();
    }

    Assert.areEqual(
      System.Label.ICU_Error_No_Steps,
      message,
      'Missing steps are reported'
    );
  }

  private static String loadErrorMessage() {
    try {
      ImageCompressionConfigService.load();
    } catch (ImageCompressUploadException e) {
      return e.getMessage();
    }
    Assert.fail('load() must throw');
    return null;
  }
}
