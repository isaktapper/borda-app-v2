import { createAdminClient } from '@/lib/supabase/server'

/**
 * Creates a demo space with pre-populated content for new organizations.
 * Uses admin client to bypass RLS (same pattern as duplicateSpace).
 */
export async function createDemoSpace(organizationId: string, userId: string) {
    const supabase = await createAdminClient()

    // 1. Create the demo space
    const { data: space, error: spaceError } = await supabase
        .from('spaces')
        .insert({
            organization_id: organizationId,
            name: 'Demo Space',
            client_name: 'Acme Corp (Demo)',
            status: 'draft',
            is_demo: true,
            created_by: userId,
            assigned_to: userId,
        })
        .select()
        .single()

    if (spaceError || !space) {
        console.error('Failed to create demo space:', spaceError)
        return null
    }

    // 2. Add owner membership
    await supabase.from('space_members').insert({
        space_id: space.id,
        user_id: userId,
        role: 'owner',
        joined_at: new Date().toISOString(),
    })

    // 3. Create Page 1: "Welcome"
    const { data: welcomePage } = await supabase
        .from('pages')
        .insert({
            space_id: space.id,
            title: 'Welcome',
            slug: 'welcome',
            sort_order: 0,
        })
        .select()
        .single()

    if (welcomePage) {
        // Welcome text block
        await supabase.from('blocks').insert({
            page_id: welcomePage.id,
            type: 'text',
            content: {
                html: '<h2>Welcome to your demo space</h2><p>This is a sample space to help you explore how Borda works. A <strong>space</strong> is where you organize content for a customer — pages, tasks, forms, files, and more.</p><p>Feel free to edit anything here, or create a new space for a real customer when you\'re ready.</p>',
            },
            sort_order: 0,
        })

        // Task block with demo tasks
        const taskBlockContent = {
            tasks: [
                {
                    id: 'demo-task-1',
                    title: 'Explore this demo space',
                    description: 'Click through the pages to see how blocks work',
                },
                {
                    id: 'demo-task-2',
                    title: 'Preview the customer portal',
                    description: 'See what your customers will see when they open a space',
                },
                {
                    id: 'demo-task-3',
                    title: 'Create your first real space',
                    description: 'Set up a space for an actual customer',
                },
            ],
        }

        await supabase.from('blocks').insert({
            page_id: welcomePage.id,
            type: 'task',
            content: taskBlockContent,
            sort_order: 1,
        })

        // Divider
        await supabase.from('blocks').insert({
            page_id: welcomePage.id,
            type: 'divider',
            content: { style: 'line' },
            sort_order: 2,
        })

        // Explanatory text block
        await supabase.from('blocks').insert({
            page_id: welcomePage.id,
            type: 'text',
            content: {
                html: '<h3>What are blocks?</h3><p>Every piece of content in a space is a <strong>block</strong>. You can add text, tasks, forms, file uploads, embeds, and more. Drag blocks to reorder them, or click the <strong>+</strong> button to add new ones.</p>',
            },
            sort_order: 3,
        })
    }

    // 4. Create Page 2: "Collect Info"
    const { data: collectPage } = await supabase
        .from('pages')
        .insert({
            space_id: space.id,
            title: 'Collect Info',
            slug: 'collect-info',
            sort_order: 1,
        })
        .select()
        .single()

    if (collectPage) {
        // Intro text
        await supabase.from('blocks').insert({
            page_id: collectPage.id,
            type: 'text',
            content: {
                html: '<h2>Collect information from your customer</h2><p>Use <strong>form blocks</strong> to gather answers, and <strong>file upload blocks</strong> to collect documents. Customers fill these out directly in the portal.</p>',
            },
            sort_order: 0,
        })

        // Form block with example questions
        await supabase.from('blocks').insert({
            page_id: collectPage.id,
            type: 'form',
            content: {
                questions: [
                    {
                        id: 'demo-q1',
                        question: 'Tell us about your company',
                        type: 'textarea',
                        required: false,
                    },
                    {
                        id: 'demo-q2',
                        question: 'What is your preferred communication channel?',
                        type: 'select',
                        options: ['Email', 'Slack', 'Microsoft Teams', 'Phone'],
                        required: false,
                    },
                    {
                        id: 'demo-q3',
                        question: 'When is your target launch date?',
                        type: 'date',
                        required: false,
                    },
                ],
            },
            sort_order: 1,
        })

        // File upload block
        await supabase.from('blocks').insert({
            page_id: collectPage.id,
            type: 'file_upload',
            content: {
                label: 'Brand Assets',
                description: 'Upload your logo, brand guidelines, or any other assets',
                acceptedTypes: ['image/png', 'image/jpeg', 'image/svg+xml', 'application/pdf'],
                maxFiles: 5,
            },
            sort_order: 2,
        })
    }

    return space.id
}
