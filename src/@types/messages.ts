import { TabSchema } from '@/containers/home/home.schema'

/**
 * Message sent from popup to background script
 */
export interface StartRotationMessage {
  status: true
  tabs: TabSchema[]
}

/**
 * Message sent from popup to background script to stop rotation
 */
export interface StopRotationMessage {
  status: false
}

/**
 * Union type for all messages sent to background script
 */
export type BackgroundMessage = StartRotationMessage | StopRotationMessage

/**
 * Response from background script
 */
export interface BackgroundResponse {
  status: string
}

/**
 * Type guard to check if message is StartRotationMessage
 */
export function isStartRotationMessage(
  message: BackgroundMessage
): message is StartRotationMessage {
  return message.status === true && 'tabs' in message
}

/**
 * Type guard to check if message is StopRotationMessage
 */
export function isStopRotationMessage(
  message: BackgroundMessage
): message is StopRotationMessage {
  return message.status === false
}

