import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyPortalSession } from '@/lib/portal-auth'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { blockId, spaceId, value } = body
        
        // Verify portal session
        const session = await verifyPortalSession(spaceId)
        if (!session) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
        }
        
        const supabase = await createAdminClient()
        
        // Prepare response data
        const responseData = {
            block_id: blockId,
            value,
            updated_at: new Date().toISOString(),
            customer_email: session.email
        }
        
        // Upsert response
        const { error } = await supabase
            .from('responses')
            .upsert(responseData, {
                onConflict: 'block_id'
            })
            .select()
        
        if (error) {
            console.error('[save-response] Upsert error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }
        
        return NextResponse.json({ success: true })
        
    } catch (e) {
        console.error('[save-response] Exception:', e)
        return NextResponse.json({ error: String(e) }, { status: 500 })
    }
}
