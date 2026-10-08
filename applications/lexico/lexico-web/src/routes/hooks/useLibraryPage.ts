import _ from "lodash";
import { useCallback, useEffect, useState } from "react";

import {
  createUserText,
  deleteUserText,
  getUserTexts,
  updateUserText,
} from "../../lib/library";

import type { UserText } from "../../lib/library";
import type React from "react";

/**
 * State object returned by the useLibraryPage hook.
 */
export interface LibraryPageState {
  closeEdit: () => void;
  editingText: null | UserText;
  error: null | string;
  formText: string;
  formTitle: string;
  handleCreate: () => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
  handleUpdate: () => Promise<void>;
  isCreateOpen: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  openEdit: (text: UserText) => void;
  selectedText: null | UserText;
  setFormText: (value: string) => void;
  setFormTitle: (value: string) => void;
  setIsCreateOpen: (open: boolean) => void;
  setSelectedText: (text: null | UserText) => void;
  texts: UserText[];
}

// 🔧 State Initialization
/**
 * Library page hook state.
 */
interface LibraryPageHookState {
  editingText: null | UserText;
  error: null | string;
  formText: string;
  formTitle: string;
  isCreateOpen: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  selectedText: null | UserText;
  setEditingText: (text: null | UserText) => void;
  setError: (error: null | string) => void;
  setFormText: (text: string) => void;
  setFormTitle: (title: string) => void;
  setIsCreateOpen: (open: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setIsSubmitting: (submitting: boolean) => void;
  setSelectedText: (text: null | UserText) => void;
  setTexts: React.Dispatch<React.SetStateAction<UserText[]>>;
  texts: UserText[];
}

/**
 * Hook managing the library page state and operations.
 * Handles text CRUD operations, form state, and UI dialogs.
 */
export function useLibraryPage(): LibraryPageState {
  const state = useLibraryPageStateInitialization();

  const fetchTexts = useCallback(
    async () =>
      fetchTextsAsync(state.setTexts, state.setIsLoading, state.setError),
    [],
  );

  useEffect(() => {
    void fetchTexts();
  }, [fetchTexts]);

  const handleCreate = useCallback(
    async () =>
      createTextAsync({
        formText: state.formText,
        formTitle: state.formTitle,
        setFormText: state.setFormText,
        setFormTitle: state.setFormTitle,
        setIsCreateOpen: state.setIsCreateOpen,
        setIsSubmitting: state.setIsSubmitting,
        setTexts: state.setTexts,
      }),
    [state.formTitle, state.formText],
  );

  const handleUpdate = useCallback(
    async () =>
      updateTextAsync({
        editingText: state.editingText,
        formText: state.formText,
        formTitle: state.formTitle,
        setEditingText: state.setEditingText,
        setFormText: state.setFormText,
        setFormTitle: state.setFormTitle,
        setIsSubmitting: state.setIsSubmitting,
        setTexts: state.setTexts,
      }),
    [state.editingText, state.formTitle, state.formText],
  );

  const handleDelete = useCallback(
    async (id: string) =>
      deleteTextAsync({
        id,
        selectedText: state.selectedText,
        setSelectedText: state.setSelectedText,
        setTexts: state.setTexts,
      }),
    [state.selectedText],
  );

  return buildLibraryPageState({
    handleCreate,
    handleDelete,
    handleUpdate,
    state,
  });
}

// 🔧 State Builder
/**
 * Maps internal hook state and handlers to the external LibraryPageState contract.
 */
function buildLibraryPageState(args: {
  handleCreate: () => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
  handleUpdate: () => Promise<void>;
  state: LibraryPageHookState;
}): LibraryPageState {
  const { handleCreate, handleDelete, handleUpdate, state } = args;
  return {
    closeEdit: () => {
      state.setFormTitle("");
      state.setFormText("");
      state.setEditingText(null);
    },
    editingText: state.editingText,
    error: state.error,
    formText: state.formText,
    formTitle: state.formTitle,
    handleCreate,
    handleDelete,
    handleUpdate,
    isCreateOpen: state.isCreateOpen,
    isLoading: state.isLoading,
    isSubmitting: state.isSubmitting,
    openEdit: (text: UserText) => {
      state.setFormTitle(text.title);
      state.setFormText(text.text);
      state.setEditingText(text);
    },
    selectedText: state.selectedText,
    setFormText: state.setFormText,
    setFormTitle: state.setFormTitle,
    setIsCreateOpen: state.setIsCreateOpen,
    setSelectedText: state.setSelectedText,
    texts: state.texts,
  };
}

// 🔧 Create Handler
/**
 * Creates a new user text and updates local state after a successful mutation.
 */
async function createTextAsync(args: {
  formText: string;
  formTitle: string;
  setFormText: (text: string) => void;
  setFormTitle: (title: string) => void;
  setIsCreateOpen: (open: boolean) => void;
  setIsSubmitting: (submitting: boolean) => void;
  setTexts: (function_: (previous: UserText[]) => UserText[]) => void;
}): Promise<void> {
  const {
    formText,
    formTitle,
    setFormText,
    setFormTitle,
    setIsCreateOpen,
    setIsSubmitting,
    setTexts,
  } = args;
  if (!formTitle.trim() || !formText.trim()) return;
  setIsSubmitting(true);
  try {
    const result = await createUserText({
      data: { text: formText, title: formTitle },
    });
    if (result.success && result.text) {
      setTexts((previous) => {
        const toSort = [...previous, result.text] as UserText[];
        const sorted = _.orderBy(toSort, [(t: UserText) => t.title]);
        return sorted;
      });
      setFormTitle("");
      setFormText("");
      setIsCreateOpen(false);
    }
  } catch (error_) {
    console.error("Failed to create text:", error_);
  } finally {
    setIsSubmitting(false);
  }
}

// 🔧 Delete Handler
/**
 * Deletes a user text and clears selection when the deleted text was active.
 */
async function deleteTextAsync(args: {
  id: string;
  selectedText: null | UserText;
  setSelectedText: (text: null | UserText) => void;
  setTexts: (function_: (previous: UserText[]) => UserText[]) => void;
}): Promise<void> {
  const { id, selectedText, setSelectedText, setTexts } = args;
  try {
    const result = await deleteUserText({ data: { id } });
    if (result.success) {
      setTexts((previous) => previous.filter((t) => t.id !== id));
      if (selectedText?.id === id) {
        setSelectedText(null);
      }
    }
  } catch (error_) {
    console.error("Failed to delete text:", error_);
  }
}

// 🔧 Fetch Handler
/**
 * Loads all user texts and updates loading and error state accordingly.
 */
async function fetchTextsAsync(
  setTexts: (texts: UserText[]) => void,
  setIsLoading: (loading: boolean) => void,
  setError: (error: null | string) => void,
): Promise<void> {
  setIsLoading(true);
  setError(null);
  try {
    const data = await getUserTexts();
    setTexts(data);
  } catch (error_: unknown) {
    const message =
      error_ instanceof Error ? error_.message : "Failed to load texts";
    setError(message);
  } finally {
    setIsLoading(false);
  }
}

// 🔧 Update Handler
/**
 * Updates the currently edited text and synchronizes the local sorted collection.
 */
async function updateTextAsync(args: {
  editingText: null | UserText;
  formText: string;
  formTitle: string;
  setEditingText: (text: null | UserText) => void;
  setFormText: (text: string) => void;
  setFormTitle: (title: string) => void;
  setIsSubmitting: (submitting: boolean) => void;
  setTexts: (function_: (previous: UserText[]) => UserText[]) => void;
}): Promise<void> {
  const {
    editingText,
    formText,
    formTitle,
    setEditingText,
    setFormText,
    setFormTitle,
    setIsSubmitting,
    setTexts,
  } = args;
  if (!editingText || !formTitle.trim() || !formText.trim()) return;
  setIsSubmitting(true);
  try {
    const result = await updateUserText({
      data: { id: editingText.id, text: formText, title: formTitle },
    });
    if (result.success) {
      setTexts((previous) => {
        const mapped = previous.map((t) =>
          t.id === editingText.id
            ? { ...t, text: formText, title: formTitle }
            : t,
        );
        const sorted = _.orderBy(mapped, [(t: UserText) => t.title]);
        return sorted;
      });
      setFormTitle("");
      setFormText("");
      setEditingText(null);
    }
  } catch (error_) {
    console.error("Failed to update text:", error_);
  } finally {
    setIsSubmitting(false);
  }
}

/**
 * Initializes all local state used by the library page hook.
 */
function useLibraryPageStateInitialization(): LibraryPageHookState {
  const [texts, setTexts] = useState<UserText[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<null | string>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingText, setEditingText] = useState<null | UserText>(null);
  const [selectedText, setSelectedText] = useState<null | UserText>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formText, setFormText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  return {
    editingText,
    error,
    formText,
    formTitle,
    isCreateOpen,
    isLoading,
    isSubmitting,
    selectedText,
    setEditingText,
    setError,
    setFormText,
    setFormTitle,
    setIsCreateOpen,
    setIsLoading,
    setIsSubmitting,
    setSelectedText,
    setTexts,
    texts,
  };
}
