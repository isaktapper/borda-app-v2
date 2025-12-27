export interface TemplateBlock {
  type: string
  sort_order: number
  content: Record<string, any>
}

export interface TemplatePage {
  title: string
  slug: string
  description?: string
  sort_order: number
  blocks: TemplateBlock[]
}

export interface TemplateData {
  pages: TemplatePage[]
}

export interface Template {
  id: string
  organization_id: string | null
  name: string
  description: string | null
  template_data: TemplateData
  is_public: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}
