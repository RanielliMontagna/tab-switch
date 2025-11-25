/**
 * Tab Behavior Settings Component
 * Allows users to choose how existing tabs are handled when starting rotation
 */

import { Settings2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import type { TabBehavior } from '@/hooks/use-tab-behavior'
import { useTabBehavior } from '@/hooks/use-tab-behavior'

export function TabBehaviorSettings() {
  const { t } = useTranslation()
  const { tabBehavior, setTabBehavior, isLoading } = useTabBehavior()

  const options: Array<{ value: TabBehavior; label: string; description: string }> = [
    {
      value: 'keep-tabs',
      label: t('tabBehavior.keep-tabs'),
      description: t('tabBehavior.keep-tabs-description'),
    },
    {
      value: 'close-others',
      label: t('tabBehavior.close-others'),
      description: t('tabBehavior.close-others-description'),
    },
  ]

  if (isLoading) {
    return null
  }

  return (
    <div className="space-y-3 p-4 border rounded-lg bg-card">
      <div className="flex items-start gap-2">
        <Settings2 className="w-4 h-4 mt-0.5 text-muted-foreground" />
        <div className="flex-1">
          <Label className="text-sm font-semibold">{t('tabBehavior.title')}</Label>
          <p className="text-xs text-muted-foreground mt-1">{t('tabBehavior.description')}</p>
        </div>
      </div>
      <div className="space-y-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex items-start gap-3 p-3 border rounded-md cursor-pointer hover:bg-accent/50 transition-colors"
          >
            <input
              type="radio"
              name="tab-behavior"
              value={option.value}
              checked={tabBehavior === option.value}
              onChange={(e) => setTabBehavior(e.target.value as TabBehavior)}
              className="mt-1"
            />
            <div className="flex-1 space-y-1">
              <div className="text-sm font-medium">{option.label}</div>
              <p className="text-xs text-muted-foreground">{option.description}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}
