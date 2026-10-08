import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Edit, Plus, Trash2 } from "lucide-react";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Textarea,
} from "@codebase/components-web";

import { useLibraryPage } from "./hooks/useLibraryPage";

import type { UserText } from "../lib/library";
import type { ReactNode } from "react";

// 🧭 Route

/**
 * The signed-in reader's own texts.
 */
export const Route = createFileRoute("/library")({
  component: LibraryPage,
});

// 📐 Component interfaces

/**
 * Library create dialog props.
 */
interface LibraryCreateDialogProperties {
  formText: string;
  formTitle: string;
  isCreateOpen: boolean;
  isSubmitting: boolean;
  onCreateConfirm: () => Promise<void>;
  onFormTextChange: (value: string) => void;
  onFormTitleChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
}

/**
 * Library edit dialog props.
 */
interface LibraryEditDialogProperties {
  editingText: null | UserText;
  formText: string;
  formTitle: string;
  isSubmitting: boolean;
  onClose: () => void;
  onFormTextChange: (value: string) => void;
  onFormTitleChange: (value: string) => void;
  onUpdateConfirm: () => Promise<void>;
}

/**
 * Library empty state props.
 */
interface LibraryEmptyStateProperties {
  error: null | string;
  isLoading: boolean;
  texts: UserText[];
}

/**
 * Library selected view props.
 */
interface LibrarySelectedViewProperties {
  onBack: () => void;
  selectedText: null | UserText;
}

/**
 * Library text card props.
 */
interface LibraryTextCardProperties {
  onDelete: (id: string) => Promise<void>;
  onEdit: (text: UserText) => void;
  onSelect: (text: UserText) => void;
  text: UserText;
}

/**
 * Library text grid props.
 */
interface LibraryTextGridProperties {
  error: null | string;
  isLoading: boolean;
  onDelete: (id: string) => Promise<void>;
  onEdit: (text: UserText) => void;
  onSelect: (text: UserText) => void;
  selectedText: null | UserText;
  texts: UserText[];
}

// 🧩 Components

/**
 * Library create dialog.
 */
function LibraryCreateDialog({
  formText,
  formTitle,
  isCreateOpen,
  isSubmitting,
  onCreateConfirm,
  onFormTextChange,
  onFormTitleChange,
  onOpenChange,
}: LibraryCreateDialogProperties): ReactNode {
  return (
    <Dialog
      onOpenChange={onOpenChange}
      open={isCreateOpen}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Text
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Text</DialogTitle>
          <DialogDescription>
            Add a Latin text to your library for reading practice.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              onChange={(event) => onFormTitleChange(event.currentTarget.value)}
              placeholder="e.g., Cicero's First Catilinarian"
              value={formTitle}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="text">Text</Label>
            <Textarea
              className="min-h-50"
              id="text"
              onChange={(event) => onFormTextChange(event.currentTarget.value)}
              placeholder="Paste your Latin text here..."
              value={formText}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={isSubmitting || !formTitle.trim() || !formText.trim()}
            onClick={() => void onCreateConfirm()}
          >
            {isSubmitting ? "Adding..." : "Add Text"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Library edit dialog.
 */
function LibraryEditDialog({
  editingText,
  formText,
  formTitle,
  isSubmitting,
  onClose,
  onFormTextChange,
  onFormTitleChange,
  onUpdateConfirm,
}: LibraryEditDialogProperties): ReactNode {
  return (
    <Dialog
      onOpenChange={(open) => !open && onClose()}
      open={Boolean(editingText)}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Text</DialogTitle>
          <DialogDescription>
            Update the title or content of your text.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              onChange={(event) => onFormTitleChange(event.currentTarget.value)}
              value={formTitle}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-text">Text</Label>
            <Textarea
              className="min-h-50"
              id="edit-text"
              onChange={(event) => onFormTextChange(event.currentTarget.value)}
              value={formText}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={onClose}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={isSubmitting || !formTitle.trim() || !formText.trim()}
            onClick={() => void onUpdateConfirm()}
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Library empty state.
 */
function LibraryEmptyState({
  error,
  isLoading,
  texts,
}: LibraryEmptyStateProperties): ReactNode {
  if (isLoading || error || texts.length > 0) {
    return null;
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>Your Library is Empty</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground">
        <p>
          Add Latin texts to your library for reading practice. Click the
          &quot;Add Text&quot; button above to get started.
        </p>
      </CardContent>
    </Card>
  );
}

// 🧩 Component

/**
 * Library page component that displays and manages user's saved texts.
 *
 * @returns React node.
 */
function LibraryPage(): ReactNode {
  // 🪝 Hooks
  const {
    closeEdit,
    editingText,
    error,
    formText,
    formTitle,
    handleCreate,
    handleDelete,
    handleUpdate,
    isCreateOpen,
    isLoading,
    isSubmitting,
    openEdit,
    selectedText,
    setFormText,
    setFormTitle,
    setIsCreateOpen,
    setSelectedText,
    texts,
  } = useLibraryPage();

  // 🏗 Setup

  // 💪 Handlers

  // ♻️ Lifecycle

  // 🏁 Early Returns

  // 🎨 Markup
  return (
    <section className="space-y-6">
      <h1 className="flex items-center gap-3 text-3xl font-bold">
        <BookOpen className="h-8 w-8 text-primary" />
        Library
      </h1>
      <div className="flex justify-end">
        <LibraryCreateDialog
          formText={formText}
          formTitle={formTitle}
          isCreateOpen={isCreateOpen}
          isSubmitting={isSubmitting}
          onCreateConfirm={handleCreate}
          onFormTextChange={setFormText}
          onFormTitleChange={setFormTitle}
          onOpenChange={setIsCreateOpen}
        />
      </div>
      <LibraryEditDialog
        editingText={editingText}
        formText={formText}
        formTitle={formTitle}
        isSubmitting={isSubmitting}
        onClose={closeEdit}
        onFormTextChange={setFormText}
        onFormTitleChange={setFormTitle}
        onUpdateConfirm={handleUpdate}
      />
      {isLoading && (
        <div className="text-center text-muted-foreground">
          <p>Loading library...</p>
        </div>
      )}
      {error && (
        <div className="text-center text-destructive">
          <p>Error: {error}</p>
        </div>
      )}
      <LibraryTextGrid
        error={error}
        isLoading={isLoading}
        onDelete={handleDelete}
        onEdit={openEdit}
        onSelect={setSelectedText}
        selectedText={selectedText}
        texts={texts}
      />
      <LibrarySelectedView
        onBack={() => setSelectedText(null)}
        selectedText={selectedText}
      />
      <LibraryEmptyState
        error={error}
        isLoading={isLoading}
        texts={texts}
      />
    </section>
  );
}

/**
 * Library selected view.
 */
function LibrarySelectedView({
  onBack,
  selectedText,
}: LibrarySelectedViewProperties): ReactNode {
  if (!selectedText) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Button
        onClick={onBack}
        variant="outline"
      >
        ← Back to Library
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>{selectedText.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap leading-relaxed">
            {selectedText.text}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Library text card.
 */
function LibraryTextCard({
  onDelete,
  onEdit,
  onSelect,
  text,
}: LibraryTextCardProperties): ReactNode {
  return (
    <Card
      className="cursor-pointer transition-transform hover:scale-[1.02]"
      onClick={() => onSelect(text)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="line-clamp-1 text-lg">{text.title}</CardTitle>
          <div className="flex gap-1">
            <Button
              className="h-8 w-8"
              onClick={(event) => {
                event.stopPropagation();
                onEdit(text);
              }}
              size="icon"
              variant="ghost"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={(event) => {
                event.stopPropagation();
                void onDelete(text.id);
              }}
              size="icon"
              variant="ghost"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CardDescription className="line-clamp-2">
          {text.text.slice(0, 150)}...
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

/**
 * Library text grid.
 */
function LibraryTextGrid({
  error,
  isLoading,
  onDelete,
  onEdit,
  onSelect,
  selectedText,
  texts,
}: LibraryTextGridProperties): ReactNode {
  if (isLoading || error || texts.length === 0 || selectedText) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {texts.map((text) => (
        <LibraryTextCard
          key={text.id}
          onDelete={onDelete}
          onEdit={onEdit}
          onSelect={onSelect}
          text={text}
        />
      ))}
    </div>
  );
}
