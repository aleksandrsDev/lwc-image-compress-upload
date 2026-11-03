/**
 * Jest stand-in for lightning/mediaUtils (sfdx-lwc-jest ships no stub for it).
 * Tests set the behaviour with processImage.mockResolvedValue(...) and friends.
 */
export const processImage = jest.fn();
