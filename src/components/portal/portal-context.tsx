'use client'

import React, { createContext, useContext, useState, useTransition, useRef } from 'react'
import { toggleTaskStatus, saveResponse, uploadFile, deleteFile } from '@/app/portal/actions'
import { toast } from 'sonner'

interface PortalState {
    tasks: Record<string, 'pending' | 'completed'>
    responses: Record<string, any>
    files: Record<string, any[]>
}

interface PortalContextType {
    state: PortalState
    projectId: string
    toggleTask: (taskId: string) => Promise<void>
    updateResponse: (blockId: string, value: any) => Promise<void>
    addFile: (blockId: string, file: any) => void
    removeFile: (blockId: string, fileId: string) => Promise<void>
    isPending: boolean
}

const PortalContext = createContext<PortalContextType | undefined>(undefined)

export function PortalProvider({
    children,
    projectId,
    initialTasks = {},
    initialResponses = {},
    initialFiles = {}
}: {
    children: React.ReactNode
    projectId: string
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

    const toggleTask = async (taskId: string) => {
        const currentStatus = state.tasks[taskId] || 'pending'
        const newStatus = currentStatus === 'completed' ? 'pending' : 'completed'

        // Optimistic update
        setState(prev => ({
            ...prev,
            tasks: { ...prev.tasks, [taskId]: newStatus }
        }))

        try {
            const result = await toggleTaskStatus(taskId, projectId)
            if (result.error) {
                // Rollback
                setState(prev => ({
                    ...prev,
                    tasks: { ...prev.tasks, [taskId]: currentStatus }
                }))
                toast.error('Kunde inte uppdatera uppgiften')
            }
        } catch (error) {
            setState(prev => ({
                ...prev,
                tasks: { ...prev.tasks, [taskId]: currentStatus }
            }))
            toast.error('Ett oväntat fel uppstod')
        }
    }

    const updateResponse = async (blockId: string, value: any) => {
        // Optimistic update
        setState(prev => ({
            ...prev,
            responses: { ...prev.responses, [blockId]: value }
        }))

        // Clear existing timeout for this block
        if (saveTimeoutRef.current[blockId]) {
            clearTimeout(saveTimeoutRef.current[blockId])
        }

        // Debounce: Wait 1 second after last change before saving
        saveTimeoutRef.current[blockId] = setTimeout(async () => {
            try {
                const result = await saveResponse(blockId, projectId, value)
                if (result.error) {
                    toast.error('Kunde inte spara svaret')
                } else {
                    toast.success('Sparat', { duration: 1000 })
                }
            } catch (error) {
                toast.error('Ett oväntat fel uppstod')
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
            const result = await deleteFile(fileId, projectId)
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
            toast.error('Ett oväntat fel uppstod')
        }
    }

    return (
        <PortalContext.Provider value={{ state, projectId, toggleTask, updateResponse, addFile, removeFile, isPending }}>
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
