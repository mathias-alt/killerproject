"use client";

import { useState, useRef } from "react";
import { format } from "date-fns";
import { useIdeas } from "@/hooks/use-ideas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Lightbulb,
  Plus,
  Pencil,
  Trash2,
  Paperclip,
  FileImage,
  FileText,
  X,
  Upload,
} from "lucide-react";
import type { IdeaWithAuthor } from "@/lib/types/database";

export default function IdeasPage() {
  const { ideas, loading, createIdea, updateIdea, deleteIdea, addAttachment, deleteAttachment } = useIdeas();
  const [quickTitle, setQuickTitle] = useState("");
  const [quickLoading, setQuickLoading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<IdeaWithAuthor | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function getInitials(name: string | null) {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  }

  function getFileIcon(type: string | null) {
    if (type?.startsWith("image/")) return <FileImage className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  }

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    setQuickLoading(true);
    await createIdea(quickTitle.trim());
    setQuickTitle("");
    setQuickLoading(false);
  }

  function handleEditOpen(idea: IdeaWithAuthor) {
    setEditingIdea(idea);
    setEditTitle(idea.title);
    setEditDescription(idea.description ?? "");
    setEditDialogOpen(true);
  }

  async function handleEditSave() {
    if (!editingIdea) return;
    setEditLoading(true);
    await updateIdea(editingIdea.id, { title: editTitle, description: editDescription || undefined });
    setEditLoading(false);
    setEditDialogOpen(false);
    setEditingIdea(null);
  }

  async function handleDelete(id: string) {
    await deleteIdea(id);
    setDeleteConfirmId(null);
  }

  async function handleFileUpload(ideaId: string, files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadingId(ideaId);
    try {
      for (let i = 0; i < files.length; i++) {
        await addAttachment(ideaId, files[i]);
      }
    } catch (err) {
      console.error("Upload error:", err);
    }
    setUploadingId(null);
  }

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading ideas...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Lightbulb className="h-6 w-6" />
            Ideas
          </h1>
          <p className="text-sm text-muted-foreground">
            Capture and organize ideas from your team
          </p>
        </div>
      </div>

      {/* Quick add */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleQuickAdd} className="flex gap-3">
            <Input
              placeholder="Got an idea? Type it here..."
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={quickLoading || !quickTitle.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              {quickLoading ? "Adding..." : "Add Idea"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Ideas list */}
      {ideas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg mb-2">No ideas yet</p>
            <p className="text-sm">Add your first idea above to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {ideas.map((idea) => (
            <Card key={idea.id} className="group">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{idea.title}</h3>
                    </div>
                    {idea.description && (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-2">{idea.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {idea.author && (
                        <div className="flex items-center gap-1.5">
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={idea.author.avatar_url ?? undefined} />
                            <AvatarFallback className="text-[8px]">{getInitials(idea.author.full_name)}</AvatarFallback>
                          </Avatar>
                          <span>{idea.author.full_name}</span>
                        </div>
                      )}
                      <span>{format(new Date(idea.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                    </div>

                    {/* Attachments */}
                    {idea.attachments && idea.attachments.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {idea.attachments.map((att) => (
                          <div key={att.id} className="flex items-center gap-1.5 bg-muted rounded-md px-2 py-1 text-xs group/att">
                            {getFileIcon(att.file_type)}
                            <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate max-w-[200px]">
                              {att.file_name}
                            </a>
                            <button
                              onClick={() => deleteAttachment(att.id)}
                              className="ml-1 opacity-0 group-hover/att:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setUploadingId(idea.id);
                        fileInputRef.current?.click();
                      }}
                      disabled={uploadingId === idea.id}
                    >
                      {uploadingId === idea.id ? (
                        <Upload className="h-4 w-4 animate-pulse" />
                      ) : (
                        <Paperclip className="h-4 w-4" />
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditOpen(idea)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteConfirmId(idea.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.txt,.md"
        className="hidden"
        onChange={(e) => {
          if (uploadingId) {
            handleFileUpload(uploadingId, e.target.files);
            e.target.value = "";
          }
        }}
      />

      {/* Edit dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open);
        if (!open) setEditingIdea(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Idea</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="idea-title">Title</Label>
              <Input id="idea-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="idea-desc">Description</Label>
              <Textarea id="idea-desc" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={6} placeholder="Add details, notes, context..." />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleEditSave} disabled={editLoading}>
              {editLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Idea</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this idea? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
