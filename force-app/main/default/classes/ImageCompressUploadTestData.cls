/**
 * Shared test fixtures: in-memory Custom Metadata records, a selector stub
 * and a Standard User with the Image Compress Upload User permission set.
 */
@IsTest
public class ImageCompressUploadTestData {
  public static final Integer TARGET_KB = 1024;
  public static final Integer MAX_UPLOAD_KB = 2;
  private static final String UPLOADER_LAST_NAME = 'ICU Uploader';

  /**
   * Builds the Default settings in memory, with a 2 KB hard limit so size tests need no large blobs.
   * @return settings record that is not stored anywhere
   */
  public static Image_Compression_Settings__mdt settings() {
    return (Image_Compression_Settings__mdt) fromFields(
      new Map<String, Object>{
        'DeveloperName' => 'Default',
        'Target_Size_KB__c' => TARGET_KB,
        'Max_Upload_Size_KB__c' => MAX_UPLOAD_KB
      },
      Image_Compression_Settings__mdt.class
    );
  }

  /**
   * Builds a first step that only resizes and keeps the image format.
   * @return step record that is not stored anywhere
   */
  public static Image_Compression_Step__mdt resizeStep() {
    return (Image_Compression_Step__mdt) fromFields(
      new Map<String, Object>{
        'DeveloperName' => 'Step_1',
        'Compression_Quality__c' => 0.8,
        'Max_Width__c' => 2048,
        'Max_Height__c' => 2048,
        'Convert_To_Jpeg__c' => false
      },
      Image_Compression_Step__mdt.class
    );
  }

  /**
   * Builds a second, more aggressive step that also converts to JPEG.
   * @return step record that is not stored anywhere
   */
  public static Image_Compression_Step__mdt jpegStep() {
    return (Image_Compression_Step__mdt) fromFields(
      new Map<String, Object>{
        'DeveloperName' => 'Step_2',
        'Compression_Quality__c' => 0.6,
        'Max_Width__c' => 1280,
        'Max_Height__c' => 1024,
        'Convert_To_Jpeg__c' => true
      },
      Image_Compression_Step__mdt.class
    );
  }

  /**
   * Builds the usual two-step configuration.
   * @return resizeStep() followed by jpegStep()
   */
  public static List<Image_Compression_Step__mdt> twoSteps() {
    return new List<Image_Compression_Step__mdt>{ resizeStep(), jpegStep() };
  }

  /**
   * Makes ImageCompressionConfigService read the given records instead of the org's Custom Metadata.
   * @param settings settings to return; null simulates a missing record
   * @param steps steps to return
   */
  public static void useConfig(
    Image_Compression_Settings__mdt settings,
    List<Image_Compression_Step__mdt> steps
  ) {
    ImageCompressionConfigService.selector = new SelectorStub(settings, steps);
  }

  /**
   * Shortcut for useConfig(settings(), twoSteps()).
   */
  public static void useDefaultConfig() {
    useConfig(settings(), twoSteps());
  }

  /**
   * Builds file content of an exact size.
   * @param bytes decoded size of the content
   * @return base64 encoded content
   */
  public static String base64OfSize(Integer bytes) {
    return EncodingUtil.base64Encode(Blob.valueOf('x'.repeat(bytes)));
  }

  /**
   * Creates the uploader user; call it from @TestSetup.
   */
  public static void createUploader() {
    String uniqueName =
      'icu.uploader.' +
      Crypto.getRandomInteger() +
      '@example.com';
    User uploader = new User(
      Alias = 'icuup',
      Email = uniqueName,
      Username = uniqueName,
      LastName = UPLOADER_LAST_NAME,
      ProfileId = [SELECT Id FROM Profile WHERE Name = 'Standard User' LIMIT 1]
      .Id,
      TimeZoneSidKey = 'Europe/Riga',
      LocaleSidKey = 'en_US',
      EmailEncodingKey = 'UTF-8',
      LanguageLocaleKey = 'en_US'
    );
    insert uploader;
    insert new PermissionSetAssignment(
      AssigneeId = uploader.Id,
      PermissionSetId = [
        SELECT Id
        FROM PermissionSet
        WHERE Name = 'Image_Compress_Upload_User'
        LIMIT 1
      ]
      .Id
    );
  }

  /**
   * Finds the user created by createUploader().
   * @return a Standard User with the Image Compress Upload User permission set
   */
  public static User uploader() {
    return [
      SELECT Id
      FROM User
      WHERE LastName = :UPLOADER_LAST_NAME
      ORDER BY CreatedDate DESC
      LIMIT 1
    ];
  }

  private static SObject fromFields(
    Map<String, Object> fields,
    Type sobjectType
  ) {
    // Custom Metadata fields are read-only in memory; deserializing sets them anyway.
    return (SObject) JSON.deserialize(JSON.serialize(fields), sobjectType);
  }

  private class SelectorStub extends ImageCompressionConfigSelector {
    private final Image_Compression_Settings__mdt settings;
    private final List<Image_Compression_Step__mdt> steps;

    SelectorStub(
      Image_Compression_Settings__mdt settings,
      List<Image_Compression_Step__mdt> steps
    ) {
      this.settings = settings;
      this.steps = steps;
    }

    public override Image_Compression_Settings__mdt findSettings(
      String developerName
    ) {
      return settings;
    }

    public override List<Image_Compression_Step__mdt> findSteps(
      String settingsDeveloperName
    ) {
      return steps;
    }
  }
}
