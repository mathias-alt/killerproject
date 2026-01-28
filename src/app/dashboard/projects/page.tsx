"use client";

import { useState } from "react";
import { useProjects } from "@/hooks/use-projects";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectDialog } from "@/components/projects/project-dialog";
import { Button } from "@/components/ui/button";

export default function ProjectsPage() {
  const { projects, loading, createProject } = useProjects();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">All Projects</h2>
          <p className="text-sm text-muted-foreground">Manage and view your projects</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>New Project</Button>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg mb-2">No projects yet</p>
          <p className="text-sm">Create your first project to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      <ProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={async (data) => {
          await createProject(data);
        }}
      />
    </div>
  );
}
