/**
 * Loads the compression configuration used by the imageCompressUpload component.
 * Field-level rules (positive sizes, quality range) are enforced by validation
 * rules on the Custom Metadata types; this class guards the structure:
 * the Default settings record exists and has at least one step.
 */
public with sharing class ImageCompressionConfigService {
  @TestVisible
  private static final String SETTINGS_NAME = 'Default';
  private static final Integer BYTES_PER_KB = 1024;

  @TestVisible
  private static ImageCompressionConfigSelector selector = new ImageCompressionConfigSelector();

  /**
   * Loads and checks the Default settings and their steps.
   * @return the Default configuration with its steps in run order
   * @throws ImageCompressUploadException when the settings record or its steps are missing
   */
  public static Config load() {
    Image_Compression_Settings__mdt settings = selector.findSettings(
      SETTINGS_NAME
    );
    if (settings == null) {
      throw new ImageCompressUploadException(
        System.Label.ICU_Error_Config_Missing
      );
    }
    List<Image_Compression_Step__mdt> steps = selector.findSteps(SETTINGS_NAME);
    if (steps.isEmpty()) {
      throw new ImageCompressUploadException(System.Label.ICU_Error_No_Steps);
    }
    return new Config(settings, steps);
  }

  private static Integer toBytes(Decimal kilobytes) {
    return Integer.valueOf(kilobytes) * BYTES_PER_KB;
  }

  /** Configuration as the component consumes it: sizes in bytes, steps in run order. */
  public class Config {
    @AuraEnabled
    public Integer targetSizeBytes;
    @AuraEnabled
    public Integer maxUploadBytes;
    @AuraEnabled
    public List<Step> steps = new List<Step>();

    private Config(
      Image_Compression_Settings__mdt settings,
      List<Image_Compression_Step__mdt> stepRecords
    ) {
      targetSizeBytes = toBytes(settings.Target_Size_KB__c);
      maxUploadBytes = toBytes(settings.Max_Upload_Size_KB__c);
      for (Image_Compression_Step__mdt record : stepRecords) {
        steps.add(new Step(record));
      }
    }
  }

  /** One compression pass, mapped 1:1 onto lightning/mediaUtils processImage options. */
  public class Step {
    @AuraEnabled
    public String name;
    @AuraEnabled
    public Decimal quality;
    @AuraEnabled
    public Integer maxWidth;
    @AuraEnabled
    public Integer maxHeight;
    @AuraEnabled
    public Boolean convertToJpeg;

    private Step(Image_Compression_Step__mdt record) {
      name = record.DeveloperName;
      quality = record.Compression_Quality__c;
      maxWidth = Integer.valueOf(record.Max_Width__c);
      maxHeight = Integer.valueOf(record.Max_Height__c);
      convertToJpeg = record.Convert_To_Jpeg__c;
    }
  }
}
