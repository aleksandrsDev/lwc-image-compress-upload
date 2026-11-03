/**
 * Runs the real queries against the Custom Metadata deployed with the project,
 * as a user who only has the Image Compress Upload User permission set.
 * Asserts structure only, so admins can tune the values without breaking the tests.
 */
@IsTest
private class ImageCompressionConfigSelectorTest {
  private static final ImageCompressionConfigSelector SELECTOR = new ImageCompressionConfigSelector();

  @TestSetup
  static void setup() {
    ImageCompressUploadTestData.createUploader();
  }

  @IsTest
  static void findSettingsReturnsTheDeployedDefaultRecord() {
    Image_Compression_Settings__mdt settings;

    System.runAs(ImageCompressUploadTestData.uploader()) {
      settings = SELECTOR.findSettings('Default');
    }

    Assert.isNotNull(settings, 'The Default settings record must be deployed');
    Assert.isNotNull(settings.Target_Size_KB__c, 'Target size is queried');
    Assert.isNotNull(
      settings.Max_Upload_Size_KB__c,
      'Max upload size is queried'
    );
  }

  @IsTest
  static void findSettingsReturnsNullForAnUnknownName() {
    Image_Compression_Settings__mdt settings;

    System.runAs(ImageCompressUploadTestData.uploader()) {
      settings = SELECTOR.findSettings('Does_Not_Exist');
    }

    Assert.isNull(settings, 'Unknown settings resolve to null');
  }

  @IsTest
  static void findStepsReturnsTheDefaultStepsInAscendingOrder() {
    List<Image_Compression_Step__mdt> steps;

    System.runAs(ImageCompressUploadTestData.uploader()) {
      steps = SELECTOR.findSteps('Default');
    }

    Assert.isFalse(steps.isEmpty(), 'Default must ship with steps');
    for (Integer i = 1; i < steps.size(); i++) {
      Assert.isTrue(
        steps[i - 1].Order__c <= steps[i].Order__c,
        'Steps must come back sorted by Order__c'
      );
    }
  }

  @IsTest
  static void findStepsReturnsAnEmptyListForAnUnknownSettingsName() {
    List<Image_Compression_Step__mdt> steps;

    System.runAs(ImageCompressUploadTestData.uploader()) {
      steps = SELECTOR.findSteps('Does_Not_Exist');
    }

    Assert.isTrue(steps.isEmpty(), 'Unknown settings have no steps');
  }
}
