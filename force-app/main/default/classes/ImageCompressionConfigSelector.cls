/**
 * Reads the compression Custom Metadata. The only class that queries it,
 * so tests can replace it with an in-memory stub.
 */
public virtual with sharing class ImageCompressionConfigSelector {
  /**
   * Finds a settings record by its DeveloperName.
   * @param developerName DeveloperName of the settings record
   * @return the settings record, or null when it does not exist
   */
  public virtual Image_Compression_Settings__mdt findSettings(
    String developerName
  ) {
    List<Image_Compression_Settings__mdt> records = [
      SELECT DeveloperName, Target_Size_KB__c, Max_Upload_Size_KB__c
      FROM Image_Compression_Settings__mdt
      WHERE DeveloperName = :developerName
      WITH USER_MODE
      LIMIT 1
    ];
    return records.isEmpty() ? null : records[0];
  }

  /**
   * Finds the steps that belong to a settings record.
   * @param settingsDeveloperName DeveloperName of the parent settings record
   * @return the steps of that settings record, in the order they must run
   */
  public virtual List<Image_Compression_Step__mdt> findSteps(
    String settingsDeveloperName
  ) {
    return [
      SELECT
        DeveloperName,
        Order__c,
        Compression_Quality__c,
        Max_Width__c,
        Max_Height__c,
        Convert_To_Jpeg__c
      FROM Image_Compression_Step__mdt
      WHERE Settings__r.DeveloperName = :settingsDeveloperName
      WITH USER_MODE
      ORDER BY Order__c ASC
    ];
  }
}
