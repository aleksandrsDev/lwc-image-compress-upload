/**
 * Expected, user-facing failure of the image compress & upload feature
 * (missing configuration, unsupported file, file too large).
 * Its message is already translated and safe to show to the user.
 */
public with sharing class ImageCompressUploadException extends Exception {
}
