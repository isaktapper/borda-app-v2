// Plan-based limits configuration
export const PLAN_LIMITS = {
  growth: {
    maxActiveSpaces: 5,
    maxTemplates: 2,
    hasAnalytics: false,
    canRemoveBranding: false,
  },
  scale: {
    maxActiveSpaces: Infinity,
    maxTemplates: Infinity,
    hasAnalytics: true,
    canRemoveBranding: true,
  },
  trial: {
    // Trial = Scale permissions
    maxActiveSpaces: Infinity,
    maxTemplates: Infinity,
    hasAnalytics: true,
    canRemoveBranding: true,
  },
} as const

export type PlanType = keyof typeof PLAN_LIMITS
