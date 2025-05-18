/**
 * This module contains utility functions for working with storage methods
 * that may need to handle both number and string IDs.
 */

export class StorageHelper {
  /**
   * Deletes a message from the in-memory storage
   */
  static async deleteMessageFromMemStorage(
    messagesMap: Map<number, any>,
    id: number | string
  ): Promise<boolean> {
    // Convert string ID to number if needed
    const messageId = typeof id === 'string' ? parseInt(id) : id;
    
    // Check if message exists
    if (messagesMap.has(messageId)) {
      // Delete the message
      messagesMap.delete(messageId);
      return true;
    }
    
    return false;
  }
}