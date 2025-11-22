import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

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

export default function PollVotingModal({ open = true, onClose, poll, onSubmit, onVoteComplete }: PollVotingModalProps) {
  const initialValues: Record<string, number> = {};
  (poll.options || []).forEach((o) => (initialValues[o.id] = 0));

  const [values, setValues] = useState<Record<string, number>>(initialValues);

  const total = Object.values(values).reduce((a, b) => a + b, 0);
  const remaining = 100 - total;

  const handleChange = (id: string, val: number) => {
    setValues((prev) => ({ ...prev, [id]: val }));
  };

  const handleSubmit = () => {
    if (remaining !== 0) return;
    onSubmit?.(values);
    onVoteComplete?.();
    onClose();
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
          {(poll.options || []).map((opt) => (
            <div key={opt.id} className="w-full p-4 rounded-xl border bg-card shadow-sm">
              <div className="flex justify-between mb-2">
                <p className="font-medium">{opt.text}</p>
                <p className="text-sm text-muted-foreground">{values[opt.id]} pts</p>
              </div>
              <Slider
                value={[values[opt.id]]}
                max={100}
                step={1}
                onValueChange={(v) => handleChange(opt.id, v[0])}
              />
            </div>
          ))}
        </div>

        {/* Footer */}
        <DialogFooter className="flex items-center justify-between px-6 py-4 border-t border-border mt-auto">
          <p className="text-sm text-muted-foreground">
            Remaining points: <span className="font-semibold">{remaining}</span>
          </p>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button disabled={remaining !== 0} onClick={handleSubmit}>
              Submit Vote
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}