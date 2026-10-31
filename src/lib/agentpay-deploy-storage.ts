// Browser storage for the deploy page. Pure rules live in agentpay-deploy.ts.
// Only the validated, public SavedDeployment fields are written.

import { useSyncExternalStore } from 'react'
import { arc } from 'viem/chains'
import { getAgentPayAddress } from '@/lib/agentpay-address'
import {
  DEPLOY_STORAGE_KEY,
  isDeployNavVisible,
  parseSavedDeployment,
  serializeSavedDeployment,
  type SavedDeployment,
} from '@/lib/agentpay-deploy'

const CHANGE_EVENT = 'agentpay:deploy-state'

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(DEPLOY_STORAGE_KEY)
  } catch {
    return null // storage unavailable (private mode): behave as "nothing saved"
  }
}

export function readSavedDeployment(): SavedDeployment | undefined {
  return parseSavedDeployment(readRaw())
}

export function writeSavedDeployment(deployment: SavedDeployment): void {
  try {
    window.localStorage.setItem(DEPLOY_STORAGE_KEY, serializeSavedDeployment(deployment))
  } catch {
    // Storage full or blocked: the on-page state still works for this session.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function clearSavedDeployment(): void {
  try {
    window.localStorage.removeItem(DEPLOY_STORAGE_KEY)
  } catch {
    // nothing to clear
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('storage', onChange)
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(CHANGE_EVENT, onChange)
  }
}

/** The saved deployment, kept in sync across the header, nav and deploy page. */
export function useSavedDeployment(): SavedDeployment | undefined {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null)
  return parseSavedDeployment(raw)
}

/** Whether the Deploy navigation item should be shown in the public app. */
export function useDeployNavVisible(): boolean {
  const saved = useSavedDeployment()
  return isDeployNavVisible({ configuredAddress: getAgentPayAddress(arc.id), saved })
}
