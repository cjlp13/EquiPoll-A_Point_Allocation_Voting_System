"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface Props {
  pollId: string
  pollTitle: string
  onClose: () => void
}

export default function PollAllocationsModal({ pollId, pollTitle, onClose }: Props) {
  const [allocations, setAllocations] = useState<{
    choice_text: string
    points: number
    created_at?: string
  }[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    let mounted = true
    const fetchAlloc = async () => {
      setLoading(true)
      try {
        // include created_at so we can show when the user allocated points per choice
        const { data, error } = await supabase
          .from("votes")
          .select("points, created_at, poll_choices(choice_text)")
          .eq("poll_id", pollId)
          // user can only select their own votes via RLS, so this returns current user's votes
        if (error) throw error
        if (!mounted) return
        const items = (data || []).map((r: any) => ({
          choice_text: r.poll_choices?.choice_text || "",
          points: Number(r.points) || 0,
          created_at: r.created_at,
        }))
        setAllocations(items)
      } catch (err) {
        console.error("Error fetching allocations:", err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchAlloc()

    return () => {
      mounted = false
    }
  }, [pollId, supabase])

  const totalPoints = allocations.reduce((s, a) => s + (a.points || 0), 0)

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-xl w-full max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Accessible title for screen readers */}
        <DialogTitle className="sr-only">{pollTitle}</DialogTitle>

        {/* Fixed header */}
        <div className="px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-xl font-bold">{pollTitle}</h2>
          <p className="text-sm text-muted-foreground">Points you allocated</p>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="text-muted-foreground">Loading your allocations…</div>
          ) : allocations.length === 0 ? (
            <div className="text-muted-foreground">You haven't allocated points for this poll.</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded">
                <div className="text-sm text-muted-foreground">Total points allocated</div>
                <div className="text-sm font-semibold text-primary">{totalPoints}</div>
              </div>

              <div className="space-y-2">
                {allocations.map((a, i) => (
                  <div key={i} className="p-3 bg-card rounded border border-border">
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-foreground">{a.choice_text}</div>
                      <div className="text-sm font-semibold text-primary">{a.points}</div>
                    </div>
                    {a.created_at && (
                      <div className="text-xs text-muted-foreground mt-1">Allocated: {new Date(a.created_at).toLocaleString()}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Fixed footer */}
        <div className="px-6 py-4 border-t border-border flex-shrink-0 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
