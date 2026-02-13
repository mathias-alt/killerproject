"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, FolderOpen } from "lucide-react";
import type { Project } from "@/lib/types/database";

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  return (
    <Card className="group relative border-border/70 bg-card/85 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_30px_-24px_oklch(0.22_0.02_258/0.5)]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Link href={`/dashboard/projects/${project.id}`} className="flex items-center gap-2 flex-1 min-w-0">
            <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
            <CardTitle className="text-lg truncate">{project.name}</CardTitle>
          </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/projects/${project.id}`} className="flex items-center">
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Open
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onEdit(project)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onDelete(project)} className="text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {project.description && (
          <Link href={`/dashboard/projects/${project.id}`}>
            <CardDescription className="line-clamp-2">{project.description}</CardDescription>
          </Link>
        )}
        {(project.start_date || project.end_date) && (
          <p className="text-xs text-muted-foreground mt-1">
            {project.start_date && new Date(project.start_date).toLocaleDateString()}
            {project.start_date && project.end_date && " – "}
            {project.end_date && new Date(project.end_date).toLocaleDateString()}
          </p>
        )}
      </CardHeader>
    </Card>
  );
}
