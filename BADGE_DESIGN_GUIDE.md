# Badge Design Guide

Denna guide beskriver hur vi designar badges i Impel v3, baserat på status-badgen i projekttabellen.

## Design Principer

### 1. Ljus Fill + Mörkare Border
Badges ska ha en **ljus färgad bakgrund** (`bg-{color}/10`) kombinerat med en **mörkare border** (`border-{color}`).

Detta skapar en subtil, professionell look som är:
- ✅ Tydlig att läsa
- ✅ Inte för intensiv visuellt
- ✅ Konsekvent med modern UI-design
- ✅ Fungerar bra i både ljust och mörkt läge

### 2. Små och Kompakta
Badges ska vara små och kompakta för att inte ta för mycket plats:
- Höjd: `h-5` (20px)
- Padding: `px-2 py-0.5`
- Text: `text-xs` (12px)
- Font weight: `font-medium`

### 3. Subtila Avrundningar
Använd `rounded-sm` (inte `rounded-full`) för en modern, clean look som passar bättre i tabeller och lista-vyer.

## Badge Variants

Vi använder shadcn/ui Badge-komponenten med följande variants:

### Default (Primary)
```tsx
variant="default"
// Resultat: border-primary bg-primary/10 text-primary
```
- **Användning**: Aktiv status, primära tillstånd
- **Färg**: Ljusblå fill, blå border
- **Exempel**: "Active" projekt-status

### Secondary
```tsx
variant="secondary"
// Resultat: border-border bg-muted text-muted-foreground
```
- **Användning**: Draft, preliminära tillstånd
- **Färg**: Ljusgrå fill, grå border
- **Exempel**: "Draft" projekt-status

### Success
```tsx
variant="success"
// Resultat: border-success bg-success/10 text-success
```
- **Användning**: Completed, lyckade tillstånd
- **Färg**: Ljusgrön fill, grön border
- **Exempel**: "Completed" projekt-status

### Outline
```tsx
variant="outline"
// Resultat: border-border bg-background text-muted-foreground
```
- **Användning**: Arkiverade, inaktiva tillstånd
- **Färg**: Vit fill, grå border
- **Exempel**: "Archived" projekt-status

### Warning
```tsx
variant="warning"
// Resultat: border-warning bg-warning/10 text-warning
```
- **Användning**: Varningar, uppmärksamhetskrävande tillstånd
- **Färg**: Ljusgul/orange fill, varningsfärg border

### Destructive
```tsx
variant="destructive"
// Resultat: border-destructive bg-destructive/10 text-destructive
```
- **Användning**: Fel, kritiska tillstånd
- **Färg**: Ljusröd fill, röd border

## Implementation

### Exempel: StatusBadge Component

```tsx
import { Badge } from '@/components/ui/badge'

type ProjectStatus = 'draft' | 'active' | 'completed' | 'archived'

interface StatusBadgeProps {
  status: ProjectStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variantMap = {
    draft: 'secondary' as const,
    active: 'default' as const,
    completed: 'success' as const,
    archived: 'outline' as const,
  }

  const variant = variantMap[status] || 'outline'

  return (
    <Badge
      variant={variant}
      className={`capitalize text-xs h-5 !rounded-sm ${className || ''}`}
    >
      {status}
    </Badge>
  )
}
```

### Användning i Tabell

```tsx
case 'status':
  return <StatusBadge status={project.status as ProjectStatus} />
```

### Användning som Dropdown Trigger

När en badge används som en klickbar dropdown-trigger, använd samma färgklasser:

```tsx
<SelectTrigger className={`w-auto h-5 px-2 py-0.5 capitalize text-xs font-medium rounded-sm transition-colors ${getVariantClass(currentStatus)}`}>
  <SelectValue>{currentStatus}</SelectValue>
</SelectTrigger>
```

Där `getVariantClass` returnerar samma klasser som Badge-komponenten:

```tsx
const getVariantClass = (status: ProjectStatus) => {
  const variantClasses = {
    draft: 'border-border bg-muted text-muted-foreground hover:bg-muted/90',
    active: 'border-primary bg-primary/10 text-primary hover:bg-primary/15',
    completed: 'border-success bg-success/10 text-success hover:bg-success/15',
    archived: 'border-border bg-background text-muted-foreground hover:bg-accent',
  }
  return variantClasses[status]
}
```

## Styling Detaljer

### Exakta CSS-klasser

```css
/* Base classes (används alltid) */
.badge {
  @apply inline-flex items-center justify-center;
  @apply rounded-sm border;
  @apply px-2 py-0.5;
  @apply text-xs font-medium;
  @apply h-5;
  @apply capitalize; /* Om text är lowercase */
}

/* Variant: Default (Primary) */
.badge-default {
  @apply border-primary bg-primary/10 text-primary;
  @apply hover:bg-primary/15;
}

/* Variant: Secondary */
.badge-secondary {
  @apply border-border bg-muted text-muted-foreground;
  @apply hover:bg-muted/90;
}

/* Variant: Success */
.badge-success {
  @apply border-success bg-success/10 text-success;
  @apply hover:bg-success/15;
}

/* Variant: Outline */
.badge-outline {
  @apply border-border bg-background text-muted-foreground;
  @apply hover:bg-accent hover:text-accent-foreground;
}
```

## Best Practices

### ✅ DO

- Använd befintliga variants när det är möjligt
- Håll badges små och kompakta (`h-5`, `text-xs`)
- Använd `rounded-sm` för konsistens
- Använd ljus fill + mörkare border-mönstret
- Kapitalisera text för bättre läsbarhet
- Lägg till hover-states för interaktiva badges

### ❌ DON'T

- Använd inte solid färger (som `bg-blue-600`) - använd `/10` opacity istället
- Använd inte ikoner i små badges (blir för trångt)
- Använd inte `rounded-full` - det passar inte tabell-vyer
- Blanda inte olika border-stilar (håll det konsekvent)
- Gör inte badges för stora (`h-6` eller större är för mycket i tabeller)

## Skapa Nya Badge-typer

När du skapar en ny badge-typ:

1. **Definiera statusarna/typerna**
   ```tsx
   type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
   ```

2. **Mappa till befintliga variants**
   ```tsx
   const variantMap = {
     low: 'outline' as const,
     medium: 'secondary' as const,
     high: 'warning' as const,
     urgent: 'destructive' as const,
   }
   ```

3. **Använd samma styling-mönster**
   ```tsx
   <Badge
     variant={variant}
     className="capitalize text-xs h-5 !rounded-sm"
   >
     {priority}
   </Badge>
   ```

## Färgpalett Referens

Våra badge-färger kommer från Tailwind/shadcn theme:

- **Primary**: Blå (`hsl(var(--primary))`)
- **Success**: Grön (`hsl(var(--success))`)
- **Warning**: Gul/Orange (`hsl(var(--warning))`)
- **Destructive**: Röd (`hsl(var(--destructive))`)
- **Muted**: Grå (`hsl(var(--muted))`)
- **Border**: Neutral border (`hsl(var(--border))`)

Dessa kan anpassas i `globals.css` under CSS-variablerna.

## Exempel på Andra Badges

### Priority Badge
```tsx
type Priority = 'low' | 'medium' | 'high' | 'urgent'

export function PriorityBadge({ priority }: { priority: Priority }) {
  const variantMap = {
    low: 'outline' as const,
    medium: 'secondary' as const,
    high: 'warning' as const,
    urgent: 'destructive' as const,
  }

  return (
    <Badge variant={variantMap[priority]} className="text-xs h-5 !rounded-sm capitalize">
      {priority}
    </Badge>
  )
}
```

### Role Badge
```tsx
type Role = 'owner' | 'admin' | 'member' | 'customer'

export function RoleBadge({ role }: { role: Role }) {
  const variantMap = {
    owner: 'default' as const,
    admin: 'success' as const,
    member: 'secondary' as const,
    customer: 'outline' as const,
  }

  return (
    <Badge variant={variantMap[role]} className="text-xs h-5 !rounded-sm capitalize">
      {role}
    </Badge>
  )
}
```

## Sammanfattning

**Nyckelprinciper för badge-design i Impel v3:**
1. Ljus fill (`bg-{color}/10`) + mörkare border (`border-{color}`)
2. Små och kompakta (`h-5`, `text-xs`, `px-2 py-0.5`)
3. Subtila avrundningar (`rounded-sm`)
4. Använd shadcn/ui Badge variants
5. Kapitaliserad text för läsbarhet
6. Konsekvent hover-states för interaktiva badges

Följ denna guide för att skapa nya badges som matchar projekttabellens design!
