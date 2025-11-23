import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { createClient } from "@/lib/supabase/client";

interface PollOption {
  id: string;
  text: string;
}

interface PollVotingModalProps {
  open?: boolean;
  onClose: () => void;
  poll: {
    id: string;
    title: string;
    description?: string;
    options?: PollOption[];
  };
  onSubmit?: (values: Record<string, number>) => void;
  onVoteComplete?: () => void;
}

const TOTAL_POINTS = 100;

export default function PollVotingModal({ 
  open = true, 
  onClose, 
  poll, 
  onSubmit, 
  onVoteComplete 
}: PollVotingModalProps) {
  const [options, setOptions] = useState<PollOption[]>(poll.options || []);
  const [loadingOptions, setLoadingOptions] = useState(!poll.options || poll.options.length === 0);
  const [values, setValues] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const supabase = createClient();

  // Fetch poll options if not provided
  useEffect(() => {
    if (poll.options && poll.options.length > 0) {
      setOptions(poll.options);
      const initialValues: Record<string, number> = {};
      poll.options.forEach((o) => (initialValues[o.id] = 0));
      setValues(initialValues);
      setLoadingOptions(false);
      return;
    }

    const fetchOptions = async () => {
      try {
        const { data, error } = await supabase
          .from("poll_choices")
          .select("id, choice_text")
          .eq("poll_id", poll.id)
          .order("created_at");

        if (error) throw error;

        const fetchedOptions = (data || []).map((choice: any) => ({
          id: choice.id,
          text: choice.choice_text,
        }));

        setOptions(fetchedOptions);

        const initialValues: Record<string, number> = {};
        fetchedOptions.forEach((o: PollOption) => (initialValues[o.id] = 0));
        setValues(initialValues);
      } catch (err) {
        console.error("Error fetching poll options:", err);
        setError("Failed to load poll options");
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchOptions();
  }, [poll.id, poll.options, supabase]);

  const total = Object.values(values).reduce((a, b) => a + b, 0);
  const remaining = TOTAL_POINTS - total;

  const handleChange = (id: string, val: number) => {
    const currentValue = values[id] || 0;
    const maxForThisChoice = currentValue + remaining;
    const newValue = Math.max(0, Math.min(val, maxForThisChoice));
    setValues((prev) => ({ ...prev, [id]: newValue }));
  };

  const handleTextClick = (id: string) => {
    setEditingId(id);
    setEditValue(String(values[id]));
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  };

  const handleTextBlur = (id: string) => {
    const numValue = parseInt(editValue, 10);
    if (!isNaN(numValue)) {
      const currentValue = values[id] || 0;
      const maxForThisChoice = currentValue + remaining;
      const newValue = Math.max(0, Math.min(numValue, maxForThisChoice));
      setValues((prev) => ({ ...prev, [id]: newValue }));
    }
    setEditingId(null);
    setEditValue("");
  };

  const handleTextKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, id: string) => {
    if (e.key === "Enter") {
      handleTextBlur(id);
    } else if (e.key === "Escape") {
      setEditingId(null);
      setEditValue("");
    }
  };

  const handleSubmit = async () => {
    if (remaining !== 0) {
      setError("Please allocate all 100 points");
      return;
    }

    if (total === 0) {
      setError("Please allocate at least 1 point");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Not authenticated");

      const votes = Object.entries(values)
        .filter(([_, points]) => points > 0)
        .map(([choiceId, points]) => ({
          poll_id: poll.id,
          user_id: user.id,
          choice_id: choiceId,
          points,
        }));

      const { error: voteError } = await supabase.from("votes").insert(votes);

      if (voteError) throw voteError;

      onSubmit?.(values);
      onVoteComplete?.();
      onClose();
    } catch (error) {
      console.error("Error submitting vote:", error);
      setError(error instanceof Error ? error.message : "Failed to submit vote");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] flex flex-col p-0 gap-0">

        {/* Required for accessibility */}
        <DialogTitle className="sr-only">{poll.title}</DialogTitle>
        <DialogDescription className="sr-only">
          Allocate your 100 points across the poll options.
        </DialogDescription>

        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-xl font-bold mb-2">{poll.title}</h2>
          {poll.description && (
            <p className="text-sm text-muted-foreground mb-2">{poll.description}</p>
          )}
          <p className="text-sm text-muted-foreground">Allocate your 100 points across the options</p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {loadingOptions ? (
            <p className="text-muted-foreground">Loading options...</p>
          ) : options.length === 0 ? (
            <p className="text-muted-foreground">No options available for this poll.</p>
          ) : (
            options.map((opt) => {
              const currentValue = values[opt.id] || 0;
              const maxForSlider = currentValue + remaining;
              
              return (
                <div key={opt.id} className="w-full p-4 rounded-xl border bg-card shadow-sm">
                  <div className="flex justify-between mb-2">
                    <p className="font-medium">{opt.text}</p>
                    {editingId === opt.id ? (
                      <input
                        type="number"
                        value={editValue}
                        onChange={handleTextChange}
                        onBlur={() => handleTextBlur(opt.id)}
                        onKeyDown={(e) => handleTextKeyDown(e, opt.id)}
                        autoFocus
                        className="w-16 px-2 py-1 text-sm border rounded bg-background text-foreground"
                        min="0"
                        max={Math.min(100, maxForSlider)}
                      />
                    ) : (
                      <p
                        onClick={() => handleTextClick(opt.id)}
                        className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                      >
                        {currentValue} pts
                      </p>
                    )}
                  </div>
                  <Slider
                    value={[currentValue]}
                    max={maxForSlider}
                    step={1}
                    onValueChange={(v) => handleChange(opt.id, v[0])}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border mt-auto">
          <p className="text-sm text-muted-foreground">
            Remaining points: <span className="font-semibold">{remaining}</span>
          </p>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button disabled={remaining !== 0 || loadingOptions} onClick={handleSubmit}>
              {submitting ? "Submitting..." : "Submit Vote"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}