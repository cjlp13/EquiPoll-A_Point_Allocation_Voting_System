"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface Choice {
  id: string
  choice_text: string
}

interface Poll {
  id: string
  title: string
  description: string
}

interface PointAllocationVotingProps {
  poll: Poll
  onClose: () => void
  onVoteComplete: () => void
}

const TOTAL_POINTS = 100

export function PointAllocationVoting({ poll, onClose, onVoteComplete }: PointAllocationVotingProps) {
  const [choices, setChoices] = useState<Choice[]>([])
  const [allocation, setAllocation] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchChoices = async () => {
      try {
        const { data, error } = await supabase
          .from("poll_choices")
          .select("*")
          .eq("poll_id", poll.id)
          .order("created_at")

        if (error) throw error

        setChoices(data || [])
        const initialAllocation = {}
        ;(data || []).forEach((choice) => {
          initialAllocation[choice.id] = 0
        })
        setAllocation(initialAllocation)
      } catch (error) {
        console.error("Error fetching choices:", error)
        setError("Failed to load poll options")
      } finally {
        setLoading(false)
      }
    }

    fetchChoices()
  }, [poll.id, supabase])

  const totalAllocated = Object.values(allocation).reduce((sum, val) => sum + val, 0)
  const remainingPoints = TOTAL_POINTS - totalAllocated

  const handleAllocationChange = (choiceId: string, value: number) => {
    const newValue = Math.max(0, Math.min(value, TOTAL_POINTS))
    setAllocation((prev) => ({
      ...prev,
      [choiceId]: newValue,
    }))
  }

  const handleSubmit = async () => {
    if (totalAllocated === 0) {
      setError("Please allocate at least 1 point")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const votes = Object.entries(allocation)
        .filter(([_, points]) => points > 0)
        .map(([choiceId, points]) => ({
          poll_id: poll.id,
          user_id: user.id,
          choice_id: choiceId,
          points,
        }))

      const { error } = await supabase.from("votes").insert(votes)

      if (error) throw error

      onVoteComplete()
    } catch (error) {
      console.error("Error submitting vote:", error)
      setError(error instanceof Error ? error.message : "Failed to submit vote")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <p className="text-muted-foreground">Loading options...</p>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle>{poll.title}</CardTitle>
        <CardDescription>Allocate your 100 points across the options</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {choices.map((choice) => (
          <div key={choice.id} className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">{choice.choice_text}</label>
              <span className="text-sm font-semibold text-primary">{allocation[choice.id]} pts</span>
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="range"
                min="0"
                max={TOTAL_POINTS}
                value={allocation[choice.id]}
                onChange={(e) => handleAllocationChange(choice.id, Number.parseInt(e.target.value))}
                className="flex-1"
              />
              <input
                type="number"
                min="0"
                max={TOTAL_POINTS}
                value={allocation[choice.id]}
                onChange={(e) => handleAllocationChange(choice.id, Number.parseInt(e.target.value) || 0)}
                className="w-16 px-2 py-1 border border-border rounded bg-input"
              />
            </div>
          </div>
        ))}

        <div className="pt-4 border-t border-border">
          <div className="flex justify-between items-center mb-4">
            <span className="font-semibold">Points Remaining:</span>
            <span className={`text-lg font-bold ${remainingPoints === 0 ? "text-secondary" : "text-muted-foreground"}`}>
              {remainingPoints}
            </span>
          </div>

          {error && <p className="text-sm text-accent mb-4">{error}</p>}

          <div className="flex gap-2">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 border-border text-foreground hover:bg-muted bg-transparent"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || remainingPoints !== 0}
              className="flex-1 bg-accent text-accent-foreground hover:opacity-90"
            >
              {submitting ? "Submitting..." : "Submit Vote"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
