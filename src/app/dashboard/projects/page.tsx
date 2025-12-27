import { getProjects } from "./actions"
import { CreateProjectModal } from "@/components/dashboard/create-project-modal"
import { ProjectsTable } from "@/components/dashboard/projects-table"

export default async function ProjectsPage() {
    const projects = await getProjects()

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Manage your implementations.</p>
                </div>
                <CreateProjectModal />
            </div>

            {projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center border border-dashed rounded py-8 text-center">
                    <h3 className="text-sm font-semibold mb-1">Inga projekt ännu</h3>
                    <p className="text-xs text-muted-foreground mb-3">
                        Du har inte skapat några projekt än. Klicka på knappen ovan för att börja.
                    </p>
                    <CreateProjectModal />
                </div>
            ) : (
                <ProjectsTable projects={projects} />
            )}
        </div>
    )
}
