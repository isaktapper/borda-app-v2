'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Building2, Palette, Users, Megaphone, Upload, X, Loader2, Check, ArrowRight, ArrowLeft, Shield, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isValidHexColor, normalizeHexColor } from '@/lib/branding'
import { createOrganizationWithOnboarding } from './actions'
import { 
    trackOnboardingStep, 
    trackOnboardingCompleted, 
    trackWorkspaceCreated,
    trackTrialStarted 
} from '@/lib/posthog'

interface OnboardingWizardProps {
    domain: string | null
    userEmail: string
}

const INDUSTRIES = [
    { value: 'technology', label: 'Technology' },
    { value: 'finance', label: 'Finance & Banking' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'marketing', label: 'Marketing & Advertising' },
    { value: 'ecommerce', label: 'E-commerce & Retail' },
    { value: 'consulting', label: 'Consulting' },
    { value: 'education', label: 'Education' },
    { value: 'media', label: 'Media & Entertainment' },
    { value: 'other', label: 'Other' },
]

const COMPANY_SIZES = [
    { value: '1-10', label: '1-10 employees' },
    { value: '11-50', label: '11-50 employees' },
    { value: '51-200', label: '51-200 employees' },
    { value: '201-500', label: '201-500 employees' },
    { value: '500+', label: '500+ employees' },
]

const REFERRAL_SOURCES = [
    { value: 'google', label: 'Google Search' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'twitter', label: 'Twitter / X' },
    { value: 'friend', label: 'Friend or colleague' },
    { value: 'podcast', label: 'Podcast' },
    { value: 'blog', label: 'Blog or article' },
    { value: 'other', label: 'Other' },
]

const PRESET_COLORS = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#8B5CF6', // Purple
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#000000', // Black
]

const steps = [
    { id: 1, title: 'Organization', icon: Building2, description: 'Name your workspace' },
    { id: 2, title: 'Branding', icon: Palette, description: 'Logo & colors' },
    { id: 3, title: 'Company', icon: Users, description: 'Tell us about you' },
    { id: 4, title: 'Discovery', icon: Megaphone, description: 'How you found us' },
]

const STEP_NAMES = ['organization', 'branding', 'company', 'discovery'] as const

export function OnboardingWizard({ domain, userEmail }: OnboardingWizardProps) {
    const [currentStep, setCurrentStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    
    // Tracking state
    const onboardingStartTime = useRef(Date.now())
    const stepStartTime = useRef(Date.now())

    // Form state
    const [orgName, setOrgName] = useState('')
    const [logoFile, setLogoFile] = useState<File | null>(null)
    const [logoPreview, setLogoPreview] = useState<string | null>(null)
    const [brandColor, setBrandColor] = useState('#3B82F6')
    const [colorInput, setColorInput] = useState('#3B82F6')
    const [industry, setIndustry] = useState('')
    const [companySize, setCompanySize] = useState('')
    const [referralSource, setReferralSource] = useState('')
    const [referralSourceOther, setReferralSourceOther] = useState('')
    const [joinPolicy, setJoinPolicy] = useState<'invite_only' | 'domain_auto_join'>('invite_only')

    // Track step views
    useEffect(() => {
        const timeOnPreviousStep = Math.round((Date.now() - stepStartTime.current) / 1000)
        stepStartTime.current = Date.now()
        
        trackOnboardingStep({
            step: currentStep,
            step_name: STEP_NAMES[currentStep - 1],
            time_on_step_seconds: currentStep > 1 ? timeOnPreviousStep : undefined
        })
    }, [currentStep])

    const canProceed = () => {
        switch (currentStep) {
            case 1:
                return orgName.trim().length > 0
            case 2:
                return true // Branding is optional
            case 3:
                return industry && companySize
            case 4:
                return referralSource && (referralSource !== 'other' || referralSourceOther.trim())
            default:
                return false
        }
    }

    const handleNext = () => {
        if (currentStep < 4 && canProceed()) {
            setCurrentStep(currentStep + 1)
        }
    }

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1)
        }
    }

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setLogoFile(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setLogoPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleRemoveLogo = () => {
        setLogoFile(null)
        setLogoPreview(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleColorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setColorInput(value)
        if (isValidHexColor(value)) {
            setBrandColor(normalizeHexColor(value))
        }
    }

    const handleSubmit = async () => {
        if (!canProceed()) return

        setIsSubmitting(true)
        setError(null)

        const formData = new FormData()
        formData.append('name', orgName)
        if (domain) {
            formData.append('domain', domain)
            formData.append('joinPolicy', joinPolicy)
        }
        formData.append('brandColor', brandColor)
        formData.append('industry', industry)
        formData.append('companySize', companySize)
        formData.append('referralSource', referralSource)
        if (referralSource === 'other' && referralSourceOther) {
            formData.append('referralSourceOther', referralSourceOther)
        }
        if (logoFile) {
            formData.append('logo', logoFile)
        }

        const result = await createOrganizationWithOnboarding(formData)

        if (result?.error) {
            setError(result.error)
            setIsSubmitting(false)
        } else {
            // Track successful onboarding completion
            const totalTimeSeconds = Math.round((Date.now() - onboardingStartTime.current) / 1000)
            
            trackOnboardingCompleted({
                time_to_complete_seconds: totalTimeSeconds,
                steps_completed: 4,
                industry,
                company_size: companySize,
                referral_source: referralSource
            })

            trackWorkspaceCreated({
                workspace_name: orgName,
                has_logo: !!logoFile,
                has_brand_color: brandColor !== '#3B82F6',
                industry,
                company_size: companySize
            })

            // Track trial start (14 days is Borda's default)
            trackTrialStarted(14)
        }
        // On success, the action will redirect
    }

    return (
        <div className="w-full max-w-2xl mx-auto">
            {/* Step Indicators */}
            <div className="flex items-center justify-center mb-8">
                {steps.map((step, index) => (
                    <div key={step.id} className="flex items-center">
                        <div className="flex flex-col items-center">
                            <div
                                className={cn(
                                    'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300',
                                    currentStep === step.id
                                        ? 'bg-primary text-primary-foreground'
                                        : currentStep > step.id
                                            ? 'bg-primary/20 text-primary'
                                            : 'bg-muted text-muted-foreground'
                                )}
                            >
                                {currentStep > step.id ? (
                                    <Check className="size-5" />
                                ) : (
                                    <step.icon className="size-5" />
                                )}
                            </div>
                            <span className={cn(
                                'text-xs mt-1.5 font-medium hidden sm:block',
                                currentStep === step.id ? 'text-primary' : 'text-muted-foreground'
                            )}>
                                {step.title}
                            </span>
                        </div>
                        {index < steps.length - 1 && (
                            <div
                                className={cn(
                                    'w-12 sm:w-20 h-0.5 mx-2',
                                    currentStep > step.id ? 'bg-primary' : 'bg-muted'
                                )}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Step Content */}
            <Card className="border-0 shadow-lg">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                    >
                        {/* Step 1: Organization Name */}
                        {currentStep === 1 && (
                            <>
                                <CardHeader className="text-center pb-2">
                                    <CardTitle className="text-2xl">What's your organization called?</CardTitle>
                                    <CardDescription>
                                        This will be your workspace name in Borda
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6 pt-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="orgName">Organization Name</Label>
                                        <Input
                                            id="orgName"
                                            placeholder="e.g. Acme Corp"
                                            value={orgName}
                                            onChange={(e) => setOrgName(e.target.value)}
                                            className="text-lg h-12"
                                            autoFocus
                                        />
                                    </div>
                                    {domain && (
                                        <>
                                            <p className="text-sm text-muted-foreground">
                                                Your workspace will be associated with <strong>@{domain}</strong>
                                            </p>
                                            
                                            {/* Join Policy Selection */}
                                            <div className="space-y-3 pt-2">
                                                <Label>Team Access Policy</Label>
                                                <p className="text-sm text-muted-foreground">
                                                    How should colleagues with @{domain} emails join your workspace?
                                                </p>
                                                <RadioGroup 
                                                    value={joinPolicy} 
                                                    onValueChange={(v) => setJoinPolicy(v as 'invite_only' | 'domain_auto_join')}
                                                    className="grid gap-3"
                                                >
                                                    <Label
                                                        htmlFor="policy_invite_only"
                                                        className={cn(
                                                            'flex items-start gap-3 rounded-lg border-2 p-4 cursor-pointer transition-colors',
                                                            joinPolicy === 'invite_only' 
                                                                ? 'border-primary bg-primary/5' 
                                                                : 'border-muted hover:border-muted-foreground/20'
                                                        )}
                                                    >
                                                        <RadioGroupItem value="invite_only" id="policy_invite_only" className="mt-0.5" />
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <Shield className="size-4 text-primary" />
                                                                <span className="font-medium">Require approval</span>
                                                            </div>
                                                            <p className="text-sm text-muted-foreground">
                                                                New users must request access and be approved by an admin
                                                            </p>
                                                        </div>
                                                    </Label>
                                                    
                                                    <Label
                                                        htmlFor="policy_auto_join"
                                                        className={cn(
                                                            'flex items-start gap-3 rounded-lg border-2 p-4 cursor-pointer transition-colors',
                                                            joinPolicy === 'domain_auto_join' 
                                                                ? 'border-primary bg-primary/5' 
                                                                : 'border-muted hover:border-muted-foreground/20'
                                                        )}
                                                    >
                                                        <RadioGroupItem value="domain_auto_join" id="policy_auto_join" className="mt-0.5" />
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <UserPlus className="size-4 text-primary" />
                                                                <span className="font-medium">Auto-join</span>
                                                            </div>
                                                            <p className="text-sm text-muted-foreground">
                                                                Anyone with @{domain} can join automatically
                                                            </p>
                                                        </div>
                                                    </Label>
                                                </RadioGroup>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </>
                        )}

                        {/* Step 2: Branding */}
                        {currentStep === 2 && (
                            <>
                                <CardHeader className="text-center pb-2">
                                    <CardTitle className="text-2xl">Customize your brand</CardTitle>
                                    <CardDescription>
                                        Add your logo and brand color (you can change this later)
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6 pt-4">
                                    {/* Logo Upload */}
                                    <div className="space-y-3">
                                        <Label>Organization Logo</Label>
                                        {!logoPreview ? (
                                            <div
                                                onClick={() => fileInputRef.current?.click()}
                                                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                                            >
                                                <Upload className="size-8 mx-auto mb-2 text-muted-foreground" />
                                                <p className="text-sm text-muted-foreground">
                                                    Click to upload your logo
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    PNG, JPG, SVG or WEBP (max 5MB)
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="relative border rounded-lg p-4 flex items-center gap-4">
                                                <img
                                                    src={logoPreview}
                                                    alt="Logo preview"
                                                    className="h-16 w-16 object-contain rounded"
                                                />
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium">{logoFile?.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {logoFile && (logoFile.size / 1024).toFixed(1)} KB
                                                    </p>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleRemoveLogo}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/png,image/jpeg,image/jpg,image/webp"
                                            onChange={handleLogoChange}
                                            className="hidden"
                                        />
                                    </div>

                                    {/* Brand Color */}
                                    <div className="space-y-3">
                                        <Label>Brand Color</Label>
                                        <div className="flex gap-2 flex-wrap">
                                            {PRESET_COLORS.map((color) => (
                                                <button
                                                    key={color}
                                                    type="button"
                                                    onClick={() => {
                                                        setBrandColor(color)
                                                        setColorInput(color)
                                                    }}
                                                    className={cn(
                                                        'w-10 h-10 rounded-lg border-2 transition-all',
                                                        brandColor === color
                                                            ? 'border-primary scale-110'
                                                            : 'border-transparent hover:scale-105'
                                                    )}
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <div
                                                className="w-10 h-10 rounded-lg border"
                                                style={{ backgroundColor: brandColor }}
                                            />
                                            <Input
                                                value={colorInput}
                                                onChange={handleColorInputChange}
                                                placeholder="#3B82F6"
                                                className="w-32 font-mono"
                                            />
                                            <input
                                                type="color"
                                                value={brandColor}
                                                onChange={(e) => {
                                                    setBrandColor(e.target.value)
                                                    setColorInput(e.target.value)
                                                }}
                                                className="w-10 h-10 rounded cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </>
                        )}

                        {/* Step 3: Company Details */}
                        {currentStep === 3 && (
                            <>
                                <CardHeader className="text-center pb-2">
                                    <CardTitle className="text-2xl">Tell us about your company</CardTitle>
                                    <CardDescription>
                                        Help us understand your needs better
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6 pt-4">
                                    <div className="space-y-2">
                                        <Label>Industry</Label>
                                        <Select value={industry} onValueChange={setIndustry}>
                                            <SelectTrigger className="h-12">
                                                <SelectValue placeholder="Select your industry" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {INDUSTRIES.map((ind) => (
                                                    <SelectItem key={ind.value} value={ind.value}>
                                                        {ind.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-3">
                                        <Label>Company Size</Label>
                                        <RadioGroup value={companySize} onValueChange={setCompanySize} className="grid grid-cols-1 gap-2">
                                            {COMPANY_SIZES.map((size) => (
                                                <div key={size.value} className="flex items-center">
                                                    <RadioGroupItem value={size.value} id={size.value} className="peer sr-only" />
                                                    <Label
                                                        htmlFor={size.value}
                                                        className={cn(
                                                            'flex-1 flex items-center justify-between rounded-lg border-2 p-4 cursor-pointer transition-all',
                                                            companySize === size.value
                                                                ? 'border-primary bg-primary/5'
                                                                : 'border-muted hover:border-muted-foreground/20'
                                                        )}
                                                    >
                                                        <span>{size.label}</span>
                                                        {companySize === size.value && (
                                                            <Check className="size-4 text-primary" />
                                                        )}
                                                    </Label>
                                                </div>
                                            ))}
                                        </RadioGroup>
                                    </div>
                                </CardContent>
                            </>
                        )}

                        {/* Step 4: Referral Source */}
                        {currentStep === 4 && (
                            <>
                                <CardHeader className="text-center pb-2">
                                    <CardTitle className="text-2xl">How did you hear about us?</CardTitle>
                                    <CardDescription>
                                        This helps us improve our outreach
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6 pt-4">
                                    <RadioGroup value={referralSource} onValueChange={setReferralSource} className="grid grid-cols-1 gap-2">
                                        {REFERRAL_SOURCES.map((source) => (
                                            <div key={source.value} className="flex items-center">
                                                <RadioGroupItem value={source.value} id={source.value} className="peer sr-only" />
                                                <Label
                                                    htmlFor={source.value}
                                                    className={cn(
                                                        'flex-1 flex items-center justify-between rounded-lg border-2 p-4 cursor-pointer transition-all',
                                                        referralSource === source.value
                                                            ? 'border-primary bg-primary/5'
                                                            : 'border-muted hover:border-muted-foreground/20'
                                                    )}
                                                >
                                                    <span>{source.label}</span>
                                                    {referralSource === source.value && (
                                                        <Check className="size-4 text-primary" />
                                                    )}
                                                </Label>
                                            </div>
                                        ))}
                                    </RadioGroup>

                                    {referralSource === 'other' && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="space-y-2"
                                        >
                                            <Label htmlFor="otherSource">Please specify</Label>
                                            <Input
                                                id="otherSource"
                                                placeholder="Tell us how you found Borda"
                                                value={referralSourceOther}
                                                onChange={(e) => setReferralSourceOther(e.target.value)}
                                            />
                                        </motion.div>
                                    )}

                                    {error && (
                                        <p className="text-sm text-destructive">{error}</p>
                                    )}
                                </CardContent>
                            </>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Navigation */}
                <div className="px-6 pb-6 pt-4 flex justify-between">
                    <Button
                        variant="ghost"
                        onClick={handleBack}
                        disabled={currentStep === 1}
                        className="gap-2"
                    >
                        <ArrowLeft className="size-4" />
                        Back
                    </Button>

                    {currentStep < 4 ? (
                        <Button
                            onClick={handleNext}
                            disabled={!canProceed()}
                            className="gap-2"
                        >
                            Continue
                            <ArrowRight className="size-4" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSubmit}
                            disabled={!canProceed() || isSubmitting}
                            className="gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="size-4 animate-spin" />
                                    Creating workspace...
                                </>
                            ) : (
                                <>
                                    Complete Setup
                                    <Check className="size-4" />
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </Card>

            {/* Skip Option */}
            {currentStep === 2 && (
                <p className="text-center mt-4 text-sm text-muted-foreground">
                    You can always update your branding later in Settings
                </p>
            )}
        </div>
    )
}

