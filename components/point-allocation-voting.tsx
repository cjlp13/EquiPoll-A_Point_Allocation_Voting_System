"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, CheckCircle } from "lucide-react"

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
  hideControls?: boolean
}

interface PointAllocationVotingOutputProps {
  choices: Choice[]
  allocation: Record<string, number>
  remainingPoints: number
  onAllocationChange: (choiceId: string, value: number) => void
  submitting: boolean
  error: string | null
  onSubmit: () => void
  onCancel: () => void
}

const TOTAL_POINTS = 100

// Export just the choices list for use in modal
export function PointAllocationVotingChoices({ choices, allocation, remainingPoints, onAllocationChange }: Omit<PointAllocationVotingOutputProps, "submitting" | "error" | "onSubmit" | "onCancel">) {
  return (
    <>
      {choices.map((choice) => {
        const currentValue = allocation[choice.id] || 0
        const maxForThisChoice = currentValue + remainingPoints
        return (
          <div key={choice.id} className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-foreground">{choice.choice_text}</label>
              <span className="text-sm font-semibold text-primary">{currentValue} pts</span>
            </div>
            <div className="flex gap-3 items-center">
              <div className="flex-1">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>0</span>
                  <span>{maxForThisChoice}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={maxForThisChoice}
                  value={currentValue}
                  onChange={(e) => onAllocationChange(choice.id, Number.parseInt(e.target.value))}
                  disabled={remainingPoints === 0 && currentValue === 0}
                  style={{
                    background: `linear-gradient(to right, #8b1d1d 0%, #8b1d1d ${maxForThisChoice > 0 ? (currentValue / maxForThisChoice) * 100 : 0}%, #e5e7eb ${maxForThisChoice > 0 ? (currentValue / maxForThisChoice) * 100 : 0}%, #e5e7eb 100%)`
                  }}
                  className="w-full h-2 rounded-lg appearance-none bg-muted/40 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                />
              </div>
              <input
                type="number"
                min="0"
                max={maxForThisChoice}
                value={currentValue}
                onChange={(e) => onAllocationChange(choice.id, Number.parseInt(e.target.value) || 0)}
                disabled={remainingPoints === 0 && currentValue === 0}
                className="w-20 px-2 py-1 border border-border rounded bg-input text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        )
      })}
    </>
  )
}

export function PointAllocationVoting({ poll, onClose, onVoteComplete, hideControls = false }: PointAllocationVotingProps) {
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
        const initialAllocation: Record<string, number> = {}
        ;(data || []).forEach((choice: Choice) => {
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
    // Clamp value to current allocation + remaining points (can't go over 100 total)
    const currentValue = allocation[choiceId] || 0
    const maxForThisChoice = currentValue + remainingPoints
    const newValue = Math.max(0, Math.min(value, maxForThisChoice))
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
      <Card className="bg-card border-border rounded-lg shadow-lg">
        <CardHeader>
          <p className="text-muted-foreground">Loading options...</p>
        </CardHeader>
      </Card>
    )
  }

  if (hideControls) {
    // Modal mode: only render choices, controls handled by modal
    return (
      <PointAllocationVotingChoices 
        choices={choices} 
        allocation={allocation} 
        remainingPoints={remainingPoints} 
        onAllocationChange={handleAllocationChange} 
      />
    )
  }

  return (
    <Card className="bg-card border-border rounded-lg shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">{poll.title}</CardTitle>
        <CardDescription>Allocate your {TOTAL_POINTS} points across the options</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <PointAllocationVotingChoices 
          choices={choices} 
          allocation={allocation} 
          remainingPoints={remainingPoints} 
          onAllocationChange={handleAllocationChange} 
        />

        <div className="pt-4 border-t border-border">
          <div className="flex justify-between items-center mb-4">
            <span className="font-semibold text-foreground">Points Remaining:</span>
            <span className={`text-lg font-bold ${remainingPoints === 0 ? "text-primary" : "text-muted-foreground"}`}>
              {remainingPoints}
            </span>
          </div>

          {remainingPoints !== 0 && (
            <p className="text-sm text-muted-foreground mb-4">
              Allocate all {TOTAL_POINTS} points to submit your vote
            </p>
          )}

          {error && <p className="text-sm text-destructive mb-4">{error}</p>}

          <div className="flex gap-3">
            <Button onClick={onClose} variant="outline" className="flex-1 flex items-center justify-center gap-2">
              <X className="h-4 w-4" />
              <span>Cancel</span>
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || remainingPoints !== 0} className="flex-1 flex items-center justify-center gap-2" variant="default">
              <CheckCircle className="h-4 w-4" />
              <span>{submitting ? "Submitting..." : "Submit Vote"}</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Export component with state management for external use (modal)
export function usePointAllocationVoting(poll: Poll) {
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
        const initialAllocation: Record<string, number> = {}
        ;(data || []).forEach((choice: Choice) => {
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
    const currentValue = allocation[choiceId] || 0
    const maxForThisChoice = currentValue + remainingPoints
    const newValue = Math.max(0, Math.min(value, maxForThisChoice))
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

      return true
    } catch (error) {
      console.error("Error submitting vote:", error)
      setError(error instanceof Error ? error.message : "Failed to submit vote")
      return false
    } finally {
      setSubmitting(false)
    }
  }

  return {
    choices,
    allocation,
    remainingPoints,
    loading,
    submitting,
    error,
    handleAllocationChange,
    handleSubmit,
  }
}
