'use client'

import { useState } from 'react'
import { CheckSquare, MessageSquare, Upload } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ActionSection } from './action-section'
import { TaskRow, FormFieldRow, FileUploadRow } from './action-rows'
import { ActionDrawer } from './action-drawer'
import { ActionItemsByPage } from './action-items-by-page'
import type { ActionItemsData, ActionItem, TaskItem, FormFieldItem, FileUploadItem } from '@/app/(app)/projects/[projectId]/action-items-actions'

type ActionType = 'task' | 'formField' | 'fileUpload'

interface ActionItemsOverviewProps {
  data: ActionItemsData
  projectId: string
}

export function ActionItemsOverview({ data, projectId }: ActionItemsOverviewProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<ActionType | null>(null)
  const [selectedItem, setSelectedItem] = useState<ActionItem | null>(null)

  const openDrawer = (type: ActionType, item: ActionItem) => {
    setSelectedType(type)
    setSelectedItem(item)
    setDrawerOpen(true)
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    setTimeout(() => {
      setSelectedType(null)
      setSelectedItem(null)
    }, 200)
  }

  const hasAnyItems = data.totals.overall.total > 0

  if (!hasAnyItems) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center">
        <p className="text-muted-foreground">
          No action items in this project yet. Add tasks, form fields, or file uploads to your pages to track them here.
        </p>
      </div>
    )
  }

  return (
    <>
      <Tabs defaultValue="by-page" className="w-full">
        <TabsList>
          <TabsTrigger value="by-page">By Page</TabsTrigger>
          <TabsTrigger value="by-type">By Type</TabsTrigger>
        </TabsList>

        <TabsContent value="by-page" className="mt-6">
          <ActionItemsByPage
            data={data.byPage}
            onItemClick={openDrawer}
            projectId={projectId}
          />
        </TabsContent>

        <TabsContent value="by-type" className="mt-6">
          <div className="space-y-6">
            {/* Tasks Section */}
            {data.byType.tasks.length > 0 && (
              <ActionSection
                title="Tasks"
                icon={<CheckSquare className="h-5 w-5" />}
                progress={data.totals.tasks}
                items={data.byType.tasks}
                renderItem={(task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onClick={() => openDrawer('task', task)}
                  />
                )}
              />
            )}

            {/* Form Fields Section */}
            {(data.byType.formFields?.length || 0) > 0 && (
              <ActionSection
                title="Form Fields"
                icon={<MessageSquare className="h-5 w-5" />}
                progress={data.totals.formFields}
                items={data.byType.formFields || []}
                renderItem={(formField) => (
                  <FormFieldRow
                    key={formField.id}
                    formField={formField}
                    onClick={() => openDrawer('formField', formField)}
                  />
                )}
              />
            )}

            {/* File Uploads Section */}
            {(data.byType.fileUploads?.length || 0) > 0 && (
              <ActionSection
                title="File Uploads"
                icon={<Upload className="h-5 w-5" />}
                progress={data.totals.fileUploads}
                items={data.byType.fileUploads || []}
                renderItem={(fileUpload) => (
                  <FileUploadRow
                    key={fileUpload.id}
                    fileUpload={fileUpload}
                    onClick={() => openDrawer('fileUpload', fileUpload)}
                  />
                )}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Drawer */}
      <ActionDrawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        type={selectedType}
        item={selectedItem}
        projectId={projectId}
      />
    </>
  )
}
