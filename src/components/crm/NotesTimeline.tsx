import { useState } from "react";
import { Note } from "@/types/crm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface NotesTimelineProps {
  notes: Note[];
  onAddNote?: (content: string) => void;
  onDeleteNote?: (id: string) => void;
  isLoading?: boolean;
}

const NotesTimeline = ({ notes, onAddNote, onDeleteNote, isLoading }: NotesTimelineProps) => {
  const [newNote, setNewNote] = useState("");

  const handleSubmit = () => {
    if (!newNote.trim() || !onAddNote) return;
    onAddNote(newNote.trim());
    setNewNote("");
  };

  return (
    <div className="space-y-4">
      {onAddNote && (
        <div className="flex gap-2">
          <Textarea
            placeholder="Add a note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="min-h-[80px]"
          />
          <Button size="icon" onClick={handleSubmit} disabled={!newNote.trim() || isLoading}>
            <Send size={16} />
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {notes.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No notes yet.</p>
        )}
        {notes.map((note) => (
          <div key={note.id} className="flex gap-3 group">
            <div className="mt-1">
              <MessageSquare size={16} className="text-muted-foreground" />
            </div>
            <div className="flex-1 bg-muted rounded-lg p-3">
              <p className="text-sm whitespace-pre-wrap">{note.content}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">
                  {format(new Date(note.created_at), "MMM d, yyyy · h:mm a")}
                </span>
                {onDeleteNote && (
                  <button
                    onClick={() => onDeleteNote(note.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotesTimeline;
