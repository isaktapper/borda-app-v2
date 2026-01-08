'use client'

import React, { createContext, useContext, useState, useTransition, useRef } from 'react'
import { toggleTaskStatus, saveResponse, uploadFile, deleteFile, logTaskActivity } from '@/app/space/actions'
import { toast } from 'sonner'

interface PortalState {
    tasks: Record<string, 'pending' | 'completed'>
    responses: Record<string, any>
    files: Record<string, any[]>
}

interface PortalContextType {
    state: PortalState
    spaceId: string
    toggleTask: (taskId: string, taskTitle?: string) => Promise<void>
    updateResponse: (blockId: string, value: any) => Promise<void>
    addFile: (blockId: string, file: any) => void
    removeFile: (blockId: string, fileId: string) => Promise<void>
    isPending: boolean
}

const PortalContext = createContext<PortalContextType | undefined>(undefined)

export function PortalProvider({
    children,
    spaceId,
    initialTasks = {},
    initialResponses = {},
    initialFiles = {}
}: {
    children: React.ReactNode
    spaceId: string
    initialTasks?: Record<string, 'pending' | 'completed'>
    initialResponses?: Record<string, any>
    initialFiles?: Record<string, any[]>
}) {
    const [state, setState] = useState<PortalState>({
        tasks: initialTasks,
        responses: initialResponses,
        files: initialFiles
    })
    const [isPending, startTransition] = useTransition()
    const saveTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({})

    const toggleTask = async (compositeId: string, taskTitle?: string) => {
        // compositeId format: "blockId-taskId"
        const [blockId, taskId] = compositeId.split('-').reduce<[string, string]>((acc, part, idx, arr) => {
            if (idx < 5) {
                // First 5 parts belong to blockId (UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
                acc[0] = acc[0] ? `${acc[0]}-${part}` : part
            } else {
                // Remaining parts belong to taskId
                acc[1] = acc[1] ? `${acc[1]}-${part}` : part
            }
            return acc
        }, ['', ''])

        const currentStatus = state.tasks[compositeId] || 'pending'
        const newStatus = currentStatus === 'completed' ? 'pending' : 'completed'

        // Optimistic update
        setState(prev => ({
            ...prev,
            tasks: { ...prev.tasks, [compositeId]: newStatus }
        }))

        try {
            // Get current task statuses for this block
            const blockTasks = Object.keys(state.tasks)
                .filter(key => key.startsWith(blockId + '-'))
                .reduce((acc, key) => {
                    const tid = key.replace(blockId + '-', '')
                    acc[tid] = state.tasks[key]
                    return acc
                }, {} as Record<string, string>)

            // Update the specific task
            blockTasks[taskId] = newStatus

            // Save to responses table
            const result = await saveResponse(blockId, spaceId, { tasks: blockTasks })
            if (result.error) {
                // Rollback
                setState(prev => ({
                    ...prev,
                    tasks: { ...prev.tasks, [compositeId]: currentStatus }
                }))
                toast.error('Kunde inte uppdatera uppgiften')
            } else {
                // Log task activity
                await logTaskActivity(spaceId, blockId, taskId, taskTitle || 'Task', newStatus)
            }
        } catch (error) {
            setState(prev => ({
                ...prev,
                tasks: { ...prev.tasks, [compositeId]: currentStatus }
            }))
            toast.error('An unexpected error occurred.')
        }
    }

    const updateResponse = async (responseKey: string, value: any) => {
        // responseKey can be either:
        // 1. blockId (for old single-question blocks)
        // 2. "blockId-questionId" (for new multi-question blocks)

        // Optimistic update
        setState(prev => ({
            ...prev,
            responses: { ...prev.responses, [responseKey]: value }
        }))

        // Extract blockId from responseKey
        const parts = responseKey.split('-')
        let blockId: string
        let questionId: string | null = null

        if (parts.length === 5) {
            // This is just a blockId (UUID has 5 parts when split by -)
            blockId = responseKey
        } else {
            // This is "blockId-questionId"
            blockId = parts.slice(0, 5).join('-')
            questionId = parts.slice(5).join('-')
        }

        // Clear existing timeout for this response key
        if (saveTimeoutRef.current[responseKey]) {
            clearTimeout(saveTimeoutRef.current[responseKey])
        }

        // Debounce: Wait 1 second after last change before saving
        saveTimeoutRef.current[responseKey] = setTimeout(async () => {
            try {
                let valueToSave = value

                // If this is a multi-question block, consolidate all question responses
                if (questionId !== null) {
                    const blockResponses = Object.keys(state.responses)
                        .filter(key => key.startsWith(blockId + '-'))
                        .reduce((acc, key) => {
                            const qid = key.replace(blockId + '-', '')
                            acc[qid] = state.responses[key]
                            return acc
                        }, {} as Record<string, any>)

                    // Update the specific question
                    blockResponses[questionId] = value
                    valueToSave = { questions: blockResponses }
                }

                const result = await saveResponse(blockId, spaceId, valueToSave)
                if (result.error) {
                    console.error('[saveResponse] Failed:', result.error)
                    toast.error('Kunde inte spara svaret')
                }
            } catch (error) {
                console.error('[saveResponse] Error:', error)
                toast.error('An unexpected error occurred.')
            }
        }, 1000)
    }

    const addFile = (blockId: string, file: any) => {
        setState(prev => ({
            ...prev,
            files: {
                ...prev.files,
                [blockId]: [file, ...(prev.files[blockId] || [])]
            }
        }))
    }

    const removeFile = async (blockId: string, fileId: string) => {
        const previousFiles = state.files[blockId]
        setState(prev => ({
            ...prev,
            files: {
                ...prev.files,
                [blockId]: prev.files[blockId].filter(f => f.id !== fileId)
            }
        }))

        try {
            const result = await deleteFile(fileId, spaceId)
            if (result.error) {
                setState(prev => ({
                    ...prev,
                    files: { ...prev.files, [blockId]: previousFiles }
                }))
                toast.error('Kunde inte ta bort filen')
            }
        } catch (error) {
            setState(prev => ({
                ...prev,
                files: { ...prev.files, [blockId]: previousFiles }
            }))
            toast.error('An unexpected error occurred.')
        }
    }

    return (
        <PortalContext.Provider value={{ state, spaceId, toggleTask, updateResponse, addFile, removeFile, isPending }}>
            {children}
        </PortalContext.Provider>
    )
}

export function usePortal() {
    const context = useContext(PortalContext)
    if (context === undefined) {
        throw new Error('usePortal must be used within a PortalProvider')
    }
    return context
}
