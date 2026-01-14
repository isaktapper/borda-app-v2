'use client'

import { useState, useEffect } from 'react'
import { BarChart3, Settings, Layers, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BlockEditorWrapper } from './block-editor-wrapper'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { getActionPlanBlocksForSpace } from '@/app/(app)/spaces/[spaceId]/block-actions'

interface ActionPlanProgressContent {
    title?: string
    description?: string
    viewMode: 'single' | 'multiple'
    actionPlanBlockIds: string[]
    showUpcomingTasks: boolean
    maxUpcomingTasks: number
}

interface ActionPlanOption {
    id: string
    pageId: string
    pageTitle: string
    title: string
    milestonesCount: number
}

interface ActionPlanProgressBlockEditorProps {
    content: ActionPlanProgressContent
    onChange: (updates: Partial<ActionPlanProgressContent>) => void
    spaceId: string
}

export function ActionPlanProgressBlockEditor({
    content,
    onChange,
    spaceId,
}: ActionPlanProgressBlockEditorProps) {
    const [activeTab, setActiveTab] = useState<'config' | 'settings'>('config')
    const [actionPlanOptions, setActionPlanOptions] = useState<ActionPlanOption[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // Fetch action plan blocks on mount
    useEffect(() => {
        async function fetchActionPlans() {
            try {
                const plans = await getActionPlanBlocksForSpace(spaceId)
                setActionPlanOptions(plans)
            } catch (error) {
                console.error('Failed to fetch action plans:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchActionPlans()
    }, [spaceId])

    const selectedIds = content.actionPlanBlockIds || []
    const viewMode = content.viewMode || 'multiple'
    const showUpcomingTasks = content.showUpcomingTasks ?? true
    const maxUpcomingTasks = content.maxUpcomingTasks ?? 3

    const toggleActionPlan = (id: string) => {
        if (selectedIds.includes(id)) {
            onChange({ actionPlanBlockIds: selectedIds.filter(i => i !== id) })
        } else {
            onChange({ actionPlanBlockIds: [...selectedIds, id] })
        }
    }

    const tabs = [
        { id: 'config', label: 'Configuration', icon: BarChart3 },
        { id: 'settings', label: 'Settings', icon: Settings },
    ]

    return (
        <BlockEditorWrapper
            blockType="action_plan_progress"
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={(id) => setActiveTab(id as 'config' | 'settings')}
        >
            {activeTab === 'config' && (
                <div className="space-y-6">
                    {/* Title & Description */}
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="title">Block Title</Label>
                            <Input
                                id="title"
                                value={content.title || ''}
                                onChange={(e) => onChange({ title: e.target.value })}
                                placeholder="Progress"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={content.description || ''}
                                onChange={(e) => onChange({ description: e.target.value })}
                                placeholder="Track your progress across action plans"
                                rows={2}
                            />
                        </div>
                    </div>

                    {/* View Mode */}
                    <div className="space-y-3">
                        <Label>View Mode</Label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => onChange({ viewMode: 'single' })}
                                className={cn(
                                    "p-4 rounded-lg border-2 transition-all text-left",
                                    viewMode === 'single'
                                        ? "border-primary bg-primary/5"
                                        : "border-grey-200 hover:border-grey-300"
                                )}
                            >
                                <div className="flex flex-col gap-1 mb-2">
                                    <div className="h-2 bg-grey-200 rounded-full w-full" />
                                    <div className="h-2 bg-grey-200 rounded-full w-3/4" />
                                    <div className="h-2 bg-grey-200 rounded-full w-1/2" />
                                </div>
                                <span className="text-sm font-medium">Single Plan</span>
                                <p className="text-xs text-muted-foreground">Show milestones from one plan</p>
                            </button>
                            <button
                                type="button"
                                onClick={() => onChange({ viewMode: 'multiple' })}
                                className={cn(
                                    "p-4 rounded-lg border-2 transition-all text-left",
                                    viewMode === 'multiple'
                                        ? "border-primary bg-primary/5"
                                        : "border-grey-200 hover:border-grey-300"
                                )}
                            >
                                <div className="grid grid-cols-2 gap-1 mb-2">
                                    <div className="h-8 bg-grey-200 rounded" />
                                    <div className="h-8 bg-grey-200 rounded" />
                                </div>
                                <span className="text-sm font-medium">Multiple Plans</span>
                                <p className="text-xs text-muted-foreground">Overview of multiple plans</p>
                            </button>
                        </div>
                    </div>

                    {/* Action Plan Selection */}
                    <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                            <Layers className="size-4 text-muted-foreground" />
                            Select Action Plans
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            {viewMode === 'single' 
                                ? 'Choose which action plan to show progress for'
                                : 'Choose which action plans to include in the overview'
                            }
                        </p>

                        {isLoading ? (
                            <div className="text-sm text-muted-foreground py-4 text-center">
                                Loading action plans...
                            </div>
                        ) : actionPlanOptions.length === 0 ? (
                            <div className="text-sm text-muted-foreground py-4 text-center bg-muted/20 rounded-lg">
                                No action plans found in this space. Create an action plan block first.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {actionPlanOptions.map((plan) => {
                                    const isSelected = selectedIds.includes(plan.id)
                                    // In single mode, only allow one selection
                                    const isDisabled = viewMode === 'single' && selectedIds.length > 0 && !isSelected
                                    
                                    return (
                                        <button
                                            key={plan.id}
                                            type="button"
                                            onClick={() => {
                                                if (viewMode === 'single') {
                                                    // In single mode, replace selection
                                                    onChange({ actionPlanBlockIds: isSelected ? [] : [plan.id] })
                                                } else {
                                                    toggleActionPlan(plan.id)
                                                }
                                            }}
                                            disabled={isDisabled}
                                            className={cn(
                                                "w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left",
                                                isSelected
                                                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                                    : "border-grey-200 hover:border-grey-300 hover:bg-grey-50",
                                                isDisabled && "opacity-50 cursor-not-allowed"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "size-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                                                    isSelected
                                                        ? "border-primary bg-primary"
                                                        : "border-grey-300"
                                                )}>
                                                    {isSelected && <Check className="size-3 text-white" />}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-sm">
                                                        {plan.title}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {plan.pageTitle} • {plan.milestonesCount} milestone{plan.milestonesCount !== 1 ? 's' : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        )}

                        {selectedIds.length > 0 && viewMode === 'multiple' && (
                            <div className="flex flex-wrap gap-1.5 pt-2">
                                {selectedIds.map(id => {
                                    const plan = actionPlanOptions.find(p => p.id === id)
                                    if (!plan) return null
                                    return (
                                        <Badge key={id} variant="secondary" className="text-xs">
                                            {plan.title}
                                        </Badge>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="space-y-6">
                    {/* Display Options */}
                    <div className="space-y-4">
                        <Label>Display Options</Label>

                        <div className="flex items-center justify-between py-2">
                            <div>
                                <div className="font-medium text-sm">Show Upcoming Tasks</div>
                                <div className="text-xs text-muted-foreground">
                                    Display upcoming tasks on hover
                                </div>
                            </div>
                            <Switch
                                checked={showUpcomingTasks}
                                onCheckedChange={(checked) => onChange({ showUpcomingTasks: checked })}
                            />
                        </div>

                        {showUpcomingTasks && (
                            <div className="space-y-1.5 pl-4 border-l-2 border-grey-200">
                                <Label htmlFor="maxTasks">Max Tasks to Show</Label>
                                <Input
                                    id="maxTasks"
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={maxUpcomingTasks}
                                    onChange={(e) => onChange({ maxUpcomingTasks: parseInt(e.target.value) || 3 })}
                                    className="w-20"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Number of upcoming tasks to show in the tooltip
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </BlockEditorWrapper>
    )
}
