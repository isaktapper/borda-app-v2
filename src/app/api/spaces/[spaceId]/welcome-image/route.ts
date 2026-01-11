import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ spaceId: string }> }
) {
    const { spaceId } = await params
    const supabase = await createClient()

    // Check auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Get organization from space
    const { data: space } = await supabase
        .from('spaces')
        .select('organization_id')
        .eq('id', spaceId)
        .single()

    if (!space) {
        return NextResponse.json({ error: 'Space not found' }, { status: 404 })
    }

    // Generate storage path
    const ext = file.name.split('.').pop() || 'png'
    const filename = `${randomUUID()}.${ext}`
    const storagePath = `${space.organization_id}/${spaceId}/welcome/${filename}`

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(storagePath, buffer, {
            contentType: file.type,
            upsert: true
        })

    if (uploadError) {
        console.error('Upload error:', uploadError)
        return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Create signed URL
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('project-files')
        .createSignedUrl(storagePath, 60 * 60 * 24 * 365) // 1 year

    if (signedUrlError) {
        console.error('Signed URL error:', signedUrlError)
        return NextResponse.json({ error: signedUrlError.message }, { status: 500 })
    }

    return NextResponse.json({ 
        url: signedUrlData.signedUrl,
        path: storagePath 
    })
}
