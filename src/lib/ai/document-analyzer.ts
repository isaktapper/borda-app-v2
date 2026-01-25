import OpenAI from 'openai'
import { z } from 'zod'

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

// Schema for individual document analysis
const documentInfoSchema = z.object({
  fileName: z.string(),
  type: z.enum(['presentation', 'email_template', 'process_doc', 'spreadsheet', 'checklist', 'guide', 'other']),
  purpose: z.enum(['customer_facing', 'internal', 'training', 'reference', 'communication']),
  keyInsights: z.array(z.string()),
  phasesIdentified: z.array(z.string()),
  timelineInfo: z.string().nullable(),
})

// Schema for synthesized analysis
const synthesisSchema = z.object({
  overallProcess: z.string(),
  majorPhases: z.array(z.object({
    name: z.string(),
    description: z.string(),
    estimatedDays: z.number().optional(),
  })),
  keyStakeholders: z.array(z.string()),
  criticalTasks: z.array(z.string()),
  suggestedTimeline: z.string(),
  documentRelationships: z.string().optional(),
})

// Full document analysis schema
export const documentAnalysisSchema = z.object({
  documents: z.array(documentInfoSchema),
  synthesis: synthesisSchema,
})

export type DocumentAnalysis = z.infer<typeof documentAnalysisSchema>

export interface DocumentInfo {
  fileName: string
  text: string
}

const ANALYSIS_SYSTEM_PROMPT = `You are an expert document analyst specializing in implementation and onboarding processes. Your task is to analyze uploaded documents to understand the complete implementation workflow.

IMPORTANT: All your output MUST be in English, regardless of the language of the input documents. Translate any non-English content to English in your analysis.

## Your Analysis Goals

For EACH document:
1. **Identify Document Type**: What kind of document is this?
   - presentation: PowerPoint, slides, deck
   - email_template: Email drafts, communication templates
   - process_doc: Process descriptions, SOPs, workflows
   - spreadsheet: Data files, lists, matrices
   - checklist: Task lists, checklists, requirements lists
   - guide: User guides, manuals, how-to documents
   - other: Anything else

2. **Identify Purpose**: Who is this for?
   - customer_facing: Meant to be shared with customers
   - internal: Internal team documentation
   - training: Training materials
   - reference: Reference documentation
   - communication: Templates for customer communication

3. **Extract Key Insights**: What important information does this document contain about the implementation process?

4. **Identify Phases**: What phases, stages, or milestones are mentioned?

5. **Timeline Information**: Any mentions of timelines, durations, deadlines?

## Synthesis

After analyzing each document, SYNTHESIZE your understanding:
- What is the OVERALL implementation process being described?
- What are the MAJOR PHASES and what happens in each?
- Who are the KEY STAKEHOLDERS involved?
- What are the CRITICAL TASKS that must be completed?
- What timeline does this implementation typically follow?
- How do the documents RELATE to each other?

## Important Guidelines

- Be SPECIFIC - extract actual phase names, task names, and timelines from the documents
- Don't invent information not present in the documents
- If documents describe different processes, note that in your synthesis
- Focus on information relevant to creating a customer-facing implementation template

Return your analysis as valid JSON matching this structure:
{
  "documents": [
    {
      "fileName": "Document name",
      "type": "presentation|email_template|process_doc|spreadsheet|checklist|guide|other",
      "purpose": "customer_facing|internal|training|reference|communication",
      "keyInsights": ["insight 1", "insight 2"],
      "phasesIdentified": ["Phase 1", "Phase 2"],
      "timelineInfo": "Timeline description or null"
    }
  ],
  "synthesis": {
    "overallProcess": "Description of the overall process",
    "majorPhases": [
      { "name": "Phase Name", "description": "What happens", "estimatedDays": 7 }
    ],
    "keyStakeholders": ["stakeholder 1", "stakeholder 2"],
    "criticalTasks": ["task 1", "task 2"],
    "suggestedTimeline": "Overall timeline suggestion",
    "documentRelationships": "How the documents relate to each other"
  }
}`

/**
 * Build the analysis prompt from documents and optional user description
 */
function buildAnalysisPrompt(
  documents: DocumentInfo[],
  userDescription?: string
): string {
  let prompt = '## Documents to Analyze\n\n'

  documents.forEach((doc, i) => {
    prompt += `### ${doc.fileName || `Document ${i + 1}`}\n`
    prompt += '```\n'
    // Truncate very long documents to avoid token limits
    const truncatedText = doc.text.length > 15000
      ? doc.text.substring(0, 15000) + '\n\n[Document truncated due to length...]'
      : doc.text
    prompt += truncatedText
    prompt += '\n```\n\n'
  })

  if (userDescription) {
    prompt += `## Additional Context from User\n${userDescription}\n\n`
  }

  prompt += `## Instructions
Analyze each document above, then synthesize your understanding of the overall implementation process.
Return ONLY valid JSON matching the schema described in the system prompt.`

  return prompt
}

/**
 * Analyze documents to understand the implementation process
 * Uses gpt-4o-mini for cost efficiency while maintaining quality
 */
export async function analyzeDocuments(
  documents: DocumentInfo[],
  userDescription?: string
): Promise<DocumentAnalysis> {
  const openai = getOpenAI()

  console.log(`[DocumentAnalyzer] Analyzing ${documents.length} document(s)...`)

  const userPrompt = buildAnalysisPrompt(documents, userDescription)

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content

    if (!content) {
      throw new Error('No response content from AI')
    }

    // Parse and validate the response
    const parsed = JSON.parse(content)

    // Log analysis summary
    console.log(`[DocumentAnalyzer] Analysis complete:`)
    console.log(`  - Documents analyzed: ${parsed.documents?.length || 0}`)
    console.log(`  - Major phases identified: ${parsed.synthesis?.majorPhases?.length || 0}`)
    console.log(`  - Overall process: ${parsed.synthesis?.overallProcess?.substring(0, 100)}...`)

    // Validate with Zod schema
    const validated = documentAnalysisSchema.parse(parsed)

    return validated
  } catch (error) {
    console.error('[DocumentAnalyzer] Error analyzing documents:', error)

    // Return a minimal analysis if parsing fails
    if (error instanceof z.ZodError) {
      console.error('[DocumentAnalyzer] Validation errors:', error.issues)
    }

    throw error
  }
}

/**
 * Format document analysis for use in template generation prompt
 */
export function formatAnalysisForPrompt(analysis: DocumentAnalysis): string {
  let formatted = '## Document Analysis Results\n\n'

  // Summary of documents
  formatted += '### Documents Analyzed\n'
  analysis.documents.forEach((doc, i) => {
    formatted += `${i + 1}. **${doc.fileName}** (${doc.type}, ${doc.purpose})\n`
    if (doc.keyInsights.length > 0) {
      formatted += `   Key insights: ${doc.keyInsights.slice(0, 3).join('; ')}\n`
    }
    if (doc.phasesIdentified.length > 0) {
      formatted += `   Phases: ${doc.phasesIdentified.join(', ')}\n`
    }
    if (doc.timelineInfo) {
      formatted += `   Timeline: ${doc.timelineInfo}\n`
    }
    formatted += '\n'
  })

  // Synthesized understanding
  formatted += '### Synthesized Understanding\n\n'
  formatted += `**Overall Process:** ${analysis.synthesis.overallProcess}\n\n`

  formatted += '**Major Phases:**\n'
  analysis.synthesis.majorPhases.forEach((phase, i) => {
    formatted += `${i + 1}. **${phase.name}**: ${phase.description}`
    if (phase.estimatedDays) {
      formatted += ` (Est. ${phase.estimatedDays} days)`
    }
    formatted += '\n'
  })
  formatted += '\n'

  if (analysis.synthesis.keyStakeholders.length > 0) {
    formatted += `**Key Stakeholders:** ${analysis.synthesis.keyStakeholders.join(', ')}\n\n`
  }

  formatted += '**Critical Tasks:**\n'
  analysis.synthesis.criticalTasks.forEach(task => {
    formatted += `- ${task}\n`
  })
  formatted += '\n'

  formatted += `**Suggested Timeline:** ${analysis.synthesis.suggestedTimeline}\n\n`

  if (analysis.synthesis.documentRelationships) {
    formatted += `**Document Relationships:** ${analysis.synthesis.documentRelationships}\n`
  }

  return formatted
}
