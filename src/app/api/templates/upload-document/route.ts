import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseDocument, isSupportedFileType, SUPPORTED_EXTENSIONS } from '@/lib/document-parser'
import { canUseAITemplates } from '@/lib/permissions'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 403 }
      )
    }

    // Check permission
    const hasPermission = await canUseAITemplates(membership.organization_id)
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'AI templates requires Scale plan' },
        { status: 403 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // Validate file type
    if (!isSupportedFileType(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type. Supported: ${SUPPORTED_EXTENSIONS.join(', ')}` },
        { status: 400 }
      )
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Parse document
    const parsed = await parseDocument(buffer, file.name, file.type)

    return NextResponse.json({
      success: true,
      fileName: parsed.fileName,
      text: parsed.text,
      charCount: parsed.charCount,
    })
  } catch (error) {
    console.error('Error uploading document:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process document' },
      { status: 500 }
    )
  }
}
