import OpenAI from 'openai'
import {
  validateAndRepairTemplate,
  generateTemplateIds,
  type AIGeneratedTemplate
} from './template-schema'
import {
  analyzeDocuments,
  formatAnalysisForPrompt,
  type DocumentAnalysis,
} from './document-analyzer'

// Lazy initialize OpenAI client to avoid issues during build
let openaiClient: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openaiClient
}

const SYSTEM_PROMPT = `You are an expert implementation consultant who creates structured customer onboarding templates. Your task is to analyze the user's description or uploaded documents and generate a comprehensive, well-organized template.

IMPORTANT: All output MUST be in English. This includes page titles, block content, task names, milestone names, and all text. Even if the source documents or description are in another language, translate everything to English.

## MANDATORY STRUCTURE

### Page 1: Welcome (REQUIRED - always first)
The first page MUST be titled "Welcome" with slug "welcome" and this structure:
1. **text block**: Welcome heading and introduction
   - Use markdown: "# Welcome to your implementation journey\\n\\nWe're excited to partner with you..."
   - Explain what to expect during the implementation
   - Keep it warm and professional
2. **action_plan_progress block**: Visual progress overview
   - Shows progress across all action plans in the template
3. **next_task block**: Shows the customer their next action
   - content: {} (empty object, the system populates it)

### Remaining Pages: Mix of Block Types
Create 2-5 additional pages based on the implementation phases. Use a VARIETY of block types:

**action_plan**: For task tracking (1-2 per template max, not on every page!)
**action_plan_progress**: Visual progress overview (great for welcome page!)
**text**: Instructions, context, phase descriptions
**file_upload**: Collect documents from customer (contracts, requirements, data files)
**file_download**: Share resources (guides, templates, checklists)
**contact**: Team member cards (implementation manager, support contact)
**form**: Gather requirements or feedback

## BLOCK TYPE SCHEMAS

### text block
{ "type": "text", "sort_order": 0, "content": { "html": "<h1>Heading</h1><p>Content here with <strong>bold</strong> and <em>italic</em> support.</p>" } }

### next_task block
{ "type": "next_task", "sort_order": 1, "content": { "title": "Your Next Task" } }

### action_plan_progress block (shows visual progress of all action plans)
{ "type": "action_plan_progress", "sort_order": 2, "content": { "title": "Your Progress", "viewMode": "multiple", "actionPlanBlockIds": [], "showUpcomingTasks": true, "maxUpcomingTasks": 3 } }

### action_plan block (3-6 milestones, 3-8 tasks per milestone)
{
  "type": "action_plan",
  "sort_order": 0,
  "content": {
    "title": "Implementation Plan",
    "description": "Track your progress through the implementation",
    "milestones": [
      {
        "id": "m1",
        "title": "Project Kickoff",
        "sortOrder": 0,
        "tasks": [
          { "id": "m1-t1", "title": "Schedule kickoff meeting", "relativeDueDate": { "days": 1, "direction": "after_start" } },
          { "id": "m1-t2", "title": "Share project timeline", "relativeDueDate": { "days": 2, "direction": "after_start" } },
          { "id": "m1-t3", "title": "Assign team members", "relativeDueDate": { "days": 3, "direction": "after_start" } },
          { "id": "m1-t4", "title": "Complete onboarding checklist", "relativeDueDate": { "days": 5, "direction": "after_start" } }
        ]
      },
      {
        "id": "m2",
        "title": "Configuration",
        "sortOrder": 1,
        "tasks": [
          { "id": "m2-t1", "title": "Gather requirements", "relativeDueDate": { "days": 7, "direction": "after_start" } },
          { "id": "m2-t2", "title": "Configure settings", "description": "Customize based on requirements", "relativeDueDate": { "days": 10, "direction": "after_start" } },
          { "id": "m2-t3", "title": "Review configuration", "relativeDueDate": { "days": 12, "direction": "after_start" } }
        ]
      }
    ],
    "permissions": { "stakeholderCanEdit": true, "stakeholderCanComplete": true }
  }
}
NOTE: Each action_plan MUST have a "title" and "description". Each milestone should have 3-8 tasks. Each action_plan should have 3-6 milestones. Make tasks specific and actionable!

### file_upload block
{ "type": "file_upload", "sort_order": 0, "content": { "label": "Upload your requirements document", "description": "Please upload any existing documentation" } }

### file_download block
{ "type": "file_download", "sort_order": 0, "content": { "title": "Implementation Resources", "description": "Download these helpful guides" } }

### contact block
{ "type": "contact", "sort_order": 0, "content": { "title": "Your Implementation Team" } }

### form block (MUST include fields array with questions)
{
  "type": "form",
  "sort_order": 0,
  "content": {
    "title": "Requirements Questionnaire",
    "description": "Help us understand your needs",
    "fields": [
      { "id": "f1", "type": "text", "label": "Company name", "required": true },
      { "id": "f2", "type": "textarea", "label": "Describe your requirements", "required": false },
      { "id": "f3", "type": "select", "label": "Timeline preference", "options": ["ASAP", "1-2 weeks", "1 month"], "required": true }
    ]
  }
}

## RELATIVE DUE DATES
- "after_start": For setup tasks (days 0-15)
- "before_golive": For deadline tasks (training, launch prep)

## PAGE STRUCTURE (REQUIRED PROPERTIES)
Each page MUST have:
- "title": Human-readable page name (e.g., "Welcome", "Getting Started")
- "slug": URL-friendly lowercase slug (e.g., "welcome", "getting-started")
- "sort_order": Page order (0, 1, 2...)
- "blocks": Array of blocks

Example page:
{ "title": "Welcome", "slug": "welcome", "sort_order": 0, "blocks": [...] }

## EXAMPLE TEMPLATE STRUCTURE

Page 1: { "title": "Welcome", "slug": "welcome", "sort_order": 0 }
- text: Welcome heading + intro
- action_plan_progress: Visual progress overview
- next_task: Show next action

Page 2: { "title": "Getting Started", "slug": "getting-started", "sort_order": 1 }
- text: Phase description
- action_plan: Kickoff & setup tasks
- file_upload: Collect initial documents

Page 3: { "title": "Your Team", "slug": "your-team", "sort_order": 2 }
- text: Meet your implementation team
- contact: Team contacts

Page 4: { "title": "Resources", "slug": "resources", "sort_order": 3 }
- text: Helpful materials
- file_download: Guides and templates

Page 5: { "title": "Go-Live", "slug": "go-live", "sort_order": 4 }
- text: Final steps description
- action_plan: Launch checklist

IMPORTANT: Every page MUST have a descriptive "title" like "Welcome", "Getting Started", "Go-Live" - NOT generic names like "Page 1"!

## OUTPUT FORMAT
Return valid JSON. IMPORTANT: Each page MUST have both "title" and "slug" properties:
{
  "name": "Template name",
  "description": "Brief description",
  "pages": [...]
}

## IMPORTANT
- First page MUST be Welcome with text + action_plan_progress + next_task blocks
- EVERY page title MUST be descriptive: "Welcome", "Getting Started", "Configuration", "Training", "Go-Live" etc.
- NEVER use generic titles like "Page 1", "Page 2", "Section A" - always use meaningful names!
- Use VARIETY of block types - NOT just action_plan everywhere
- Maximum 2 action_plan blocks per template
- Use lowercase slugs with hyphens (derived from title)
- Return ONLY valid JSON, no markdown code blocks`

export interface GenerateTemplateOptions {
  description?: string
  documentTexts?: string[]
}

export interface GenerateTemplateResult {
  success: boolean
  template?: AIGeneratedTemplate
  error?: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  analysis?: {
    phasesIdentified: string[]
    criticalTasks: string[]
    overallProcess: string
  }
}

/**
 * Build the user prompt from description only (no document analysis)
 */
function buildUserPrompt(options: GenerateTemplateOptions): string {
  const { description } = options

  let prompt = 'Create a customer implementation template based on:\n\n'

  if (description) {
    prompt += `## User Description\n${description}\n\n`
  }

  if (!description) {
    prompt += `## Request\nCreate a generic customer onboarding template with typical implementation phases: kickoff, setup, training, and go-live.\n\n`
  }

  prompt += `Generate a complete template following the structure rules above. Return ONLY valid JSON.`

  return prompt
}

/**
 * Build the user prompt incorporating document analysis results
 */
function buildPromptWithAnalysis(
  analysis: DocumentAnalysis,
  description?: string
): string {
  let prompt = 'Create a customer implementation template based on the following document analysis:\n\n'

  // Include formatted analysis
  prompt += formatAnalysisForPrompt(analysis)
  prompt += '\n'

  if (description) {
    prompt += `## Additional User Instructions\n${description}\n\n`
  }

  prompt += `## Template Generation Instructions

Based on the document analysis above, create a template that:

1. **Reflects the actual process**: Use the phase names, tasks, and timeline from the analysis - NOT generic placeholders
2. **Matches the identified phases**: Create pages/milestones that correspond to the major phases identified
3. **Includes specific tasks**: Use the critical tasks from the analysis as action items
4. **Respects the timeline**: Set relativeDueDates based on the suggested timeline

IMPORTANT:
- ALL OUTPUT MUST BE IN ENGLISH - translate any non-English phase names, task names, and content
- Do NOT use generic phase names like "Kickoff", "Configuration", "Go-Live" unless those exact terms appear in the analysis
- Do NOT invent tasks that weren't mentioned in the documents
- DO use the specific terminology and process flow from the documents (translated to English)
- If the analysis mentions specific stakeholders, include contact blocks for them
- If the analysis mentions deliverables or documents to collect, include file_upload blocks

Generate a complete template following the structure rules in the system prompt. Return ONLY valid JSON in English.`

  return prompt
}

/**
 * Generate a template using OpenAI with two-step pipeline:
 * 1. Analyze documents (if provided) to understand the implementation process
 * 2. Generate template based on the analysis
 */
export async function generateTemplate(
  options: GenerateTemplateOptions
): Promise<GenerateTemplateResult> {
  const { description, documentTexts = [] } = options
  const openai = getOpenAI()

  try {
    // Step 1: Analyze documents if provided
    let analysis: DocumentAnalysis | null = null
    if (documentTexts.length > 0) {
      console.log('[TemplateGenerator] Step 1: Analyzing documents...')
      try {
        analysis = await analyzeDocuments(
          documentTexts.map((text, i) => ({
            fileName: `Document ${i + 1}`,
            text,
          })),
          description
        )
        console.log('[TemplateGenerator] Document analysis complete')
        console.log(`  - Identified ${analysis.synthesis.majorPhases.length} major phases`)
        console.log(`  - Found ${analysis.synthesis.criticalTasks.length} critical tasks`)
      } catch (analysisError) {
        console.error('[TemplateGenerator] Document analysis failed, falling back to direct generation:', analysisError)
        // Continue without analysis - fall back to old behavior
        analysis = null
      }
    }

    // Step 2: Generate template
    console.log('[TemplateGenerator] Step 2: Generating template...')

    // Build prompt based on whether we have analysis
    const userPrompt = analysis
      ? buildPromptWithAnalysis(analysis, description)
      : buildUserPrompt(options)

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.35, // Lower temperature for more consistent output
      max_tokens: 8000,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    
    if (!content) {
      return {
        success: false,
        error: 'No response content from AI',
      }
    }

    // Parse JSON response
    let parsedContent: unknown
    try {
      parsedContent = JSON.parse(content)
    } catch {
      return {
        success: false,
        error: 'Failed to parse AI response as JSON',
      }
    }

    // Log the raw AI output for debugging
    console.log('AI raw output:', JSON.stringify(parsedContent, null, 2))

    // Validate and repair the template
    const validationResult = validateAndRepairTemplate(parsedContent)
    
    if (!validationResult.valid || !validationResult.template) {
      console.error('Validation errors:', validationResult.errors)
      return {
        success: false,
        error: `Invalid template structure: ${validationResult.errors?.slice(0, 5).join(', ')}${validationResult.errors && validationResult.errors.length > 5 ? '...' : ''}`,
      }
    }

    // Generate unique IDs
    const templateWithIds = generateTemplateIds(validationResult.template)

    return {
      success: true,
      template: templateWithIds,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
      // Include analysis summary for debugging/logging
      ...(analysis && {
        analysis: {
          phasesIdentified: analysis.synthesis.majorPhases.map(p => p.name),
          criticalTasks: analysis.synthesis.criticalTasks,
          overallProcess: analysis.synthesis.overallProcess,
        },
      }),
    }
  } catch (error) {
    console.error('Error generating template:', error)
    
    if (error instanceof OpenAI.APIError) {
      if (error.status === 429) {
        return {
          success: false,
          error: 'Rate limit exceeded. Please try again in a few minutes.',
        }
      }
      if (error.status === 401) {
        return {
          success: false,
          error: 'API authentication failed. Please contact support.',
        }
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}
