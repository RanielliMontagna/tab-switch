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
 * Message sent from popup to background script to pause rotation
 */
export interface PauseRotationMessage {
  action: 'pause'
}

/**
 * Message sent from popup to background script to resume rotation
 */
export interface ResumeRotationMessage {
  action: 'resume'
}

/**
 * Message sent from popup to background script to get rotation state
 */
export interface GetRotationStateMessage {
  action: 'getState'
}

/**
 * Union type for all messages sent to background script
 */
export type BackgroundMessage =
  | StartRotationMessage
  | StopRotationMessage
  | PauseRotationMessage
  | ResumeRotationMessage
  | GetRotationStateMessage

/**
 * Response from background script
 */
export interface BackgroundResponse {
  status: string
  success?: boolean
  message?: string
}

/**
 * Response from background script for getState action
 */
export interface RotationStateResponse extends BackgroundResponse {
  isActive: boolean
  isPaused: boolean
  tabsCount?: number
}

/**
 * Type guard to check if message is StartRotationMessage
 */
export function isStartRotationMessage(
  message: BackgroundMessage
): message is StartRotationMessage {
  return 'status' in message && message.status === true && 'tabs' in message
}

/**
 * Type guard to check if message is StopRotationMessage
 */
export function isStopRotationMessage(message: BackgroundMessage): message is StopRotationMessage {
  return 'status' in message && message.status === false
}

/**
 * Type guard to check if message is PauseRotationMessage
 */
export function isPauseRotationMessage(
  message: BackgroundMessage
): message is PauseRotationMessage {
  return 'action' in message && message.action === 'pause'
}

/**
 * Type guard to check if message is ResumeRotationMessage
 */
export function isResumeRotationMessage(
  message: BackgroundMessage
): message is ResumeRotationMessage {
  return 'action' in message && message.action === 'resume'
}
