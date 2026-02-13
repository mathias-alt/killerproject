"use client";

import { useState } from "react";
import { useProjects } from "@/hooks/use-projects";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectDialog } from "@/components/projects/project-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Project } from "@/lib/types/database";

export default function ProjectsPage() {
  const { projects, loading, createProject, updateProject, deleteProject } = useProjects();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>(undefined);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  function handleEdit(project: Project) {
    setEditingProject(project);
    setDialogOpen(true);
  }

  function handleNewProject() {
    setEditingProject(undefined);
    setDialogOpen(true);
  }

  async function handleDelete() {
    if (!deletingProject) return;
    setDeleteLoading(true);
    await deleteProject(deletingProject.id);
    setDeleteLoading(false);
    setDeletingProject(null);
  }

  return (
    <div className="p-5 md:p-8">
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/80 px-5 py-5 shadow-[0_16px_40px_-30px_oklch(0.22_0.02_258/0.45)] backdrop-blur-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Portfolio</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight md:text-2xl">All Projects</h2>
          <p className="mt-1 text-sm text-muted-foreground">Manage and view your projects</p>
        </div>
        <Button className="w-full md:w-auto" onClick={handleNewProject}>New Project</Button>
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
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={handleEdit}
              onDelete={setDeletingProject}
            />
          ))}
        </div>
      )}

      <ProjectDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingProject(undefined);
        }}
        project={editingProject}
        onSubmit={async (data) => {
          if (editingProject) {
            const result = await updateProject(editingProject.id, data);
            if (result?.error) console.error("Update project failed:", result.error);
          } else {
            await createProject(data);
          }
        }}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={!!deletingProject} onOpenChange={(open) => !open && setDeletingProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deletingProject?.name}&rdquo;? This will also delete all tasks in this project. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingProject(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? "Deleting..." : "Delete Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
