"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface PollCreationModalProps {
  onClose: () => void
  onPollCreated: (poll: any) => void
}

export function PollCreationModal({ onClose, onPollCreated }: PollCreationModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [choices, setChoices] = useState(["", ""])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const addChoice = () => {
    setChoices([...choices, ""])
  }

  const updateChoice = (index: number, value: string) => {
    const newChoices = [...choices]
    newChoices[index] = value
    setChoices(newChoices)
  }

  const removeChoice = (index: number) => {
    if (choices.length > 2) {
      setChoices(choices.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError("Please enter a poll title")
      return
    }

    const validChoices = choices.filter((c) => c.trim())
    if (validChoices.length < 2) {
      setError("Please provide at least 2 choices")
      return
    }

    setLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { data: poll, error: pollError } = await supabase
        .from("polls")
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
        })
        .select()
        .single()

      if (pollError) throw pollError

      const choiceInserts = validChoices.map((choiceText) => ({
        poll_id: poll.id,
        choice_text: choiceText.trim(),
      }))

      const { error: choicesError } = await supabase.from("poll_choices").insert(choiceInserts)

      if (choicesError) throw choicesError

      onPollCreated(poll)
    } catch (error) {
      console.error("Error creating poll:", error)
      setError(error instanceof Error ? error.message : "Failed to create poll")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="bg-card border-border w-full max-w-md">
        <CardHeader>
          <CardTitle>Create New Poll</CardTitle>
          <CardDescription>Add a title, description, and at least 2 choices</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Poll Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's your question?"
                className="bg-input border-border"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add context (optional)"
                className="bg-input border-border"
              />
            </div>

            <div className="space-y-2">
              <Label>Choices *</Label>
              {choices.map((choice, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={choice}
                    onChange={(e) => updateChoice(index, e.target.value)}
                    placeholder={`Choice ${index + 1}`}
                    className="bg-input border-border"
                  />
                  {choices.length > 2 && (
                    <Button
                      type="button"
                      variant="outline"
                      className="border-border text-foreground hover:bg-muted bg-transparent"
                      onClick={() => removeChoice(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="w-full border-border text-foreground hover:bg-muted bg-transparent"
                onClick={addChoice}
              >
                Add Choice
              </Button>
            </div>

            {error && <p className="text-sm text-accent">{error}</p>}

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-border text-foreground hover:bg-muted bg-transparent"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-primary text-primary-foreground hover:opacity-90"
                disabled={loading}
              >
                {loading ? "Creating..." : "Create Poll"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
