'use client'

import { useState, useEffect } from 'react'
import { Target, Settings, Layers, Zap, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BlockEditorWrapper } from './block-editor-wrapper'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { getActionPlanBlocksForSpace } from '@/app/(app)/spaces/[spaceId]/block-actions'

interface NextTaskBlockContent {
    title?: string
    description?: string
    actionPlanBlockIds: string[]
    sortMode: 'smart' | 'due_date' | 'order'
    layoutStyle: 'bold' | 'light'
    showProgress: boolean
    showMilestoneName: boolean
}

interface ActionPlanOption {
    id: string
    pageId: string
    pageTitle: string
    title: string
    milestonesCount: number
}

interface NextTaskBlockEditorProps {
    content: NextTaskBlockContent
    onChange: (updates: Partial<NextTaskBlockContent>) => void
    spaceId: string
}

export function NextTaskBlockEditor({
    content,
    onChange,
    spaceId,
}: NextTaskBlockEditorProps) {
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
    const sortMode = content.sortMode || 'smart'
    const layoutStyle = content.layoutStyle || 'light'
    const showProgress = content.showProgress ?? true
    const showMilestoneName = content.showMilestoneName ?? true

    const toggleActionPlan = (id: string) => {
        if (selectedIds.includes(id)) {
            onChange({ actionPlanBlockIds: selectedIds.filter(i => i !== id) })
        } else {
            onChange({ actionPlanBlockIds: [...selectedIds, id] })
        }
    }

    const tabs = [
        { id: 'config', label: 'Configuration', icon: Target },
        { id: 'settings', label: 'Settings', icon: Settings },
    ]

    return (
        <BlockEditorWrapper
            blockType="next_task"
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
                                placeholder="Next Task"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={content.description || ''}
                                onChange={(e) => onChange({ description: e.target.value })}
                                placeholder="Your most important task right now"
                                rows={2}
                            />
                        </div>
                    </div>

                    {/* Action Plan Selection */}
                    <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                            <Layers className="size-4 text-muted-foreground" />
                            Select Action Plans
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            Choose which action plans to pull tasks from
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
                                    return (
                                        <button
                                            key={plan.id}
                                            type="button"
                                            onClick={() => toggleActionPlan(plan.id)}
                                            className={cn(
                                                "w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left",
                                                isSelected
                                                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                                    : "border-grey-200 hover:border-grey-300 hover:bg-grey-50"
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

                        {selectedIds.length > 0 && (
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

                    {/* Sort Mode */}
                    <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                            <Zap className="size-4 text-muted-foreground" />
                            Task Priority
                        </Label>
                        <Select
                            value={sortMode}
                            onValueChange={(value) => onChange({ sortMode: value as 'smart' | 'due_date' | 'order' })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="smart">
                                    <div className="flex flex-col">
                                        <span>Smart Priority</span>
                                        <span className="text-xs text-muted-foreground">Overdue → Due today → Upcoming → No date</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="due_date">
                                    <div className="flex flex-col">
                                        <span>By Due Date</span>
                                        <span className="text-xs text-muted-foreground">Soonest due date first</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="order">
                                    <div className="flex flex-col">
                                        <span>Order in Space</span>
                                        <span className="text-xs text-muted-foreground">First action plan, first milestone, first task</span>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="space-y-6">
                    {/* Layout Style */}
                    <div className="space-y-3">
                        <Label>Layout Style</Label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => onChange({ layoutStyle: 'bold' })}
                                className={cn(
                                    "p-4 rounded-lg border-2 transition-all",
                                    layoutStyle === 'bold'
                                        ? "border-primary bg-primary/5"
                                        : "border-grey-200 hover:border-grey-300"
                                )}
                            >
                                <div className="bg-primary rounded-md h-16 mb-2" />
                                <span className="text-sm font-medium">Bold</span>
                                <p className="text-xs text-muted-foreground">Brand color background</p>
                            </button>
                            <button
                                type="button"
                                onClick={() => onChange({ layoutStyle: 'light' })}
                                className={cn(
                                    "p-4 rounded-lg border-2 transition-all",
                                    layoutStyle === 'light'
                                        ? "border-primary bg-primary/5"
                                        : "border-grey-200 hover:border-grey-300"
                                )}
                            >
                                <div className="bg-white border border-grey-200 rounded-md h-16 mb-2" />
                                <span className="text-sm font-medium">Light</span>
                                <p className="text-xs text-muted-foreground">Subtle white background</p>
                            </button>
                        </div>
                    </div>

                    {/* Display Options */}
                    <div className="space-y-4">
                        <Label>Display Options</Label>

                        <div className="flex items-center justify-between py-2">
                            <div>
                                <div className="font-medium text-sm">Show Progress</div>
                                <div className="text-xs text-muted-foreground">
                                    Display &quot;X of Y tasks remaining&quot;
                                </div>
                            </div>
                            <Switch
                                checked={showProgress}
                                onCheckedChange={(checked) => onChange({ showProgress: checked })}
                            />
                        </div>

                        <div className="flex items-center justify-between py-2">
                            <div>
                                <div className="font-medium text-sm">Show Milestone Name</div>
                                <div className="text-xs text-muted-foreground">
                                    Display which milestone the task belongs to
                                </div>
                            </div>
                            <Switch
                                checked={showMilestoneName}
                                onCheckedChange={(checked) => onChange({ showMilestoneName: checked })}
                            />
                        </div>
                    </div>
                </div>
            )}
        </BlockEditorWrapper>
    )
}
