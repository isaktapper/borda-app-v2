import Image from 'next/image'
import Link from 'next/link'

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen flex">
            {/* Left Panel - Form */}
            <div className="w-full lg:w-1/2 flex flex-col min-h-screen bg-background">
                {/* Logo */}
                <div className="p-6 lg:p-8">
                    <Link href="/" className="inline-block">
                        <Image
                            src="/borda_logo.png"
                            alt="Borda"
                            width={100}
                            height={28}
                            className="h-6 w-auto"
                        />
                    </Link>
                </div>

                {/* Form Content */}
                <div className="flex-1 flex items-center px-6 lg:px-8 pb-12">
                    <div className="w-full max-w-sm">
                        {children}
                    </div>
                </div>
            </div>

            {/* Right Panel - Image/Gradient (hidden on mobile) */}
            <div className="hidden lg:block lg:w-1/2 relative bg-primary">
                {/* Subtle pattern overlay */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{
                        backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
                        backgroundSize: '32px 32px'
                    }} />
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-end h-full p-10 text-white">
                    <div className="max-w-md space-y-3">
                        <h2 className="text-xl font-bold tracking-tight font-[family-name:var(--font-uxum)]">
                            Streamline your customer onboarding
                        </h2>
                        <p className="text-sm text-white/70 leading-relaxed">
                            Create personalized portals, track progress, and deliver exceptional experiences.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
