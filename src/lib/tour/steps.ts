import type { Tour } from 'nextstepjs'

export const tours: Tour[] = [
  {
    tour: 'explore-dashboard',
    steps: [
      {
        icon: '👋',
        title: 'Welcome to Borda!',
        content:
          'Let us give you a quick tour of your dashboard. You can always replay this from the Getting Started checklist.',
        side: 'bottom',
        showControls: true,
        showSkip: true,
        pointerPadding: 0,
        pointerRadius: 12,
      },
      {
        icon: '📊',
        title: 'Your Spaces Overview',
        content:
          'These cards give you a snapshot of your active spaces, engagement levels, and overdue tasks. Click any card to filter the table below.',
        selector: '#tour-stats-strip',
        side: 'bottom',
        showControls: true,
        showSkip: true,
        pointerPadding: 10,
        pointerRadius: 12,
      },
      {
        icon: '📁',
        title: 'Your Spaces',
        content:
          'This is where all your customer spaces live. Each space is a dedicated portal for a client — with pages, tasks, and files.',
        selector: '#tour-spaces-table',
        side: 'top',
        showControls: true,
        showSkip: true,
        pointerPadding: 10,
        pointerRadius: 12,
      },
      {
        icon: '✨',
        title: 'Create a New Space',
        content:
          'Ready to onboard a new customer? Click here to create a space. You can start from scratch or use a template.',
        selector: '#tour-new-space-button',
        side: 'left',
        showControls: true,
        showSkip: true,
        pointerPadding: 8,
        pointerRadius: 10,
      },
      {
        icon: '🧭',
        title: 'Navigation Sidebar',
        content:
          'Use the sidebar to jump between Spaces, Tasks, Activity, Templates, and Settings. Everything is one click away.',
        selector: '#tour-sidebar-nav',
        side: 'right',
        showControls: true,
        showSkip: true,
        pointerPadding: 8,
        pointerRadius: 10,
      },
    ],
  },
  {
    tour: 'explore-demo-space',
    steps: [
      {
        icon: '🗂️',
        title: 'Inside a Space',
        content:
          'These tabs let you switch between the Editor, Activity feed, Responses, Chat, and Settings for this space.',
        selector: '#tour-space-tabs',
        side: 'bottom',
        showControls: true,
        showSkip: true,
        pointerPadding: 8,
        pointerRadius: 10,
      },
      {
        icon: '📝',
        title: 'Pages & Blocks Panel',
        content:
          'Manage your pages and blocks here. Add text, tasks, file uploads, questions, and more — then drag to reorder.',
        selector: '#tour-editor-sidebar',
        side: 'right',
        showControls: true,
        showSkip: true,
        pointerPadding: 8,
        pointerRadius: 10,
      },
      {
        icon: '👁️',
        title: 'Content Preview',
        content:
          'This is the live preview of what your customer will see. Click any block to select and edit it in the sidebar.',
        selector: '#tour-content-preview',
        side: 'left',
        showControls: true,
        showSkip: true,
        pointerPadding: 8,
        pointerRadius: 12,
      },
      {
        icon: '🚀',
        title: 'Preview & Share',
        content:
          'Use these buttons to preview the portal as your customer sees it, or share the space with stakeholders.',
        selector: '#tour-space-actions',
        side: 'left',
        showControls: true,
        showSkip: true,
        pointerPadding: 8,
        pointerRadius: 10,
      },
    ],
  },
  {
    tour: 'invite-stakeholders',
    steps: [
      {
        icon: '⚙️',
        title: 'Space Settings',
        content:
          'The Settings tab is where you manage your space details, team access, and sharing options.',
        selector: '#tour-settings-tab',
        side: 'bottom',
        showControls: true,
        showSkip: true,
        pointerPadding: 6,
        pointerRadius: 8,
      },
      {
        icon: '📤',
        title: 'Share Your Space',
        content:
          'Click Share to invite customers via email. They\'ll get a secure, passwordless link to access their portal.',
        selector: '#tour-share-button',
        side: 'left',
        showControls: true,
        showSkip: true,
        pointerPadding: 8,
        pointerRadius: 10,
      },
      {
        icon: '🟢',
        title: 'Set Status to Active',
        content:
          'When you\'re ready to go live, change the status to Active. Your customer will be able to access the space immediately.',
        selector: '#tour-status-select',
        side: 'left',
        showControls: true,
        showSkip: true,
        pointerPadding: 8,
        pointerRadius: 10,
      },
    ],
  },
]
