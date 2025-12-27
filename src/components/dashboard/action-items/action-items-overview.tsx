'use client'

import { useState } from 'react'
import { CheckSquare, MessageSquare, Upload, ListChecks } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ActionSection } from './action-section'
import { TaskRow, QuestionRow, FileUploadRow, ChecklistRow } from './action-rows'
import { ActionDrawer } from './action-drawer'
import { ActionItemsByPage } from './action-items-by-page'
import type { ActionItemsData, ActionItem, TaskItem, QuestionItem, FileUploadItem, ChecklistItem } from '@/app/dashboard/projects/[projectId]/action-items-actions'

type ActionType = 'task' | 'question' | 'fileUpload' | 'checklist'

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
          No action items in this project yet. Add tasks, questions, file uploads, or checklists to your pages to track them here.
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

            {/* Questions Section */}
            {data.byType.questions.length > 0 && (
              <ActionSection
                title="Questions"
                icon={<MessageSquare className="h-5 w-5" />}
                progress={data.totals.questions}
                items={data.byType.questions}
                renderItem={(question) => (
                  <QuestionRow
                    key={question.id}
                    question={question}
                    onClick={() => openDrawer('question', question)}
                  />
                )}
              />
            )}

            {/* File Uploads Section */}
            {data.byType.fileUploads.length > 0 && (
              <ActionSection
                title="File Uploads"
                icon={<Upload className="h-5 w-5" />}
                progress={data.totals.fileUploads}
                items={data.byType.fileUploads}
                renderItem={(fileUpload) => (
                  <FileUploadRow
                    key={fileUpload.id}
                    fileUpload={fileUpload}
                    onClick={() => openDrawer('fileUpload', fileUpload)}
                  />
                )}
              />
            )}

            {/* Checklists Section */}
            {data.byType.checklists.length > 0 && (
              <ActionSection
                title="Checklists"
                icon={<ListChecks className="h-5 w-5" />}
                progress={data.totals.checklists}
                items={data.byType.checklists}
                renderItem={(checklist) => (
                  <ChecklistRow
                    key={checklist.id}
                    checklist={checklist}
                    onClick={() => openDrawer('checklist', checklist)}
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
