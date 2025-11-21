"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface Poll {
  id: string
  title: string
  description: string
  created_at: string
}

interface PollEditModalProps {
  poll: Poll
  onClose: () => void
  onPollUpdated: (poll: Poll) => void
}

interface Choice {
  id: string
  choice_text: string
}

export function PollEditModal({ poll, onClose, onPollUpdated }: PollEditModalProps) {
  const [title, setTitle] = useState(poll.title)
  const [description, setDescription] = useState(poll.description || "")
  const [choices, setChoices] = useState<Choice[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

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
      } catch (error) {
        console.error("Error fetching choices:", error)
        setError("Failed to load choices")
      } finally {
        setFetching(false)
      }
    }

    fetchChoices()
  }, [poll.id, supabase])

  const updateChoiceText = (id: string, newText: string) => {
    setChoices(choices.map((c) => (c.id === id ? { ...c, choice_text: newText } : c)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError("Please enter a poll title")
      return
    }

    setLoading(true)

    try {
      // Update poll
      const { error: pollError } = await supabase
        .from("polls")
        .update({
          title: title.trim(),
          description: description.trim() || null,
        })
        .eq("id", poll.id)

      if (pollError) throw pollError

      // Update choices
      for (const choice of choices) {
        const { error: choiceError } = await supabase
          .from("poll_choices")
          .update({ choice_text: choice.choice_text })
          .eq("id", choice.id)

        if (choiceError) throw choiceError
      }

      onPollUpdated({
        ...poll,
        title: title.trim(),
        description: description.trim() || "",
      })
    } catch (error) {
      console.error("Error updating poll:", error)
      setError(error instanceof Error ? error.message : "Failed to update poll")
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="fixed inset-0 bg-transparent backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <Card className="bg-card border-border w-full max-w-md rounded-lg shadow-xl">
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Loading choices...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-transparent backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card className="bg-card border-border w-full max-w-lg max-h-[90vh] flex flex-col rounded-xl shadow-2xl">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-start justify-between w-full">
            <div>
              <CardTitle className="text-lg font-semibold">Edit Poll</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">Update your poll details and choices</CardDescription>
            </div>
            <div>
              <Button size="sm" variant="ghost" onClick={onClose} className="-mr-2">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Poll Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-input border-border text-foreground" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="bg-input border-border text-foreground" />
            </div>

            <div className="space-y-2">
              <Label>Choices</Label>
              <div className="space-y-2">
                {choices.map((choice) => (
                  <div key={choice.id} className="flex gap-2 items-center">
                    <Input value={choice.choice_text} onChange={(e) => updateChoiceText(choice.id, e.target.value)} className="bg-input border-border text-foreground" />
                  </div>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-primary text-primary-foreground hover:opacity-95" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
