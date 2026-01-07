import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const adminSupabase = await createAdminClient()

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get file info with project details
  const { data: file, error } = await adminSupabase
    .from('files')
    .select(`
      id,
      original_name,
      storage_path,
      block_id,
      project_id
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error || !file) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  // Get project to verify access
  const { data: project } = await adminSupabase
    .from('projects')
    .select('organization_id')
    .eq('id', file.project_id)
    .single()

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  // Verify user has access to this organization
  const { data: membership } = await supabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', project.organization_id)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  // Generate signed URL for download
  const { data: signedUrl, error: urlError } = await adminSupabase.storage
    .from('project-files')
    .createSignedUrl(file.storage_path, 3600) // 1 hour expiry

  if (urlError || !signedUrl) {
    console.error('Failed to generate signed URL:', urlError)
    return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 })
  }

  // Redirect to the signed URL
  return NextResponse.redirect(signedUrl.signedUrl)
}

