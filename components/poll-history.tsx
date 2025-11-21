"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { BarChart2 } from "lucide-react"

interface HistoryItem {
  id: string
  title: string
  last_voted_at: string
  total_points?: number
}

interface Props {
  items: HistoryItem[]
  onOpenResults?: (id: string, title: string) => void
}

export default function PollHistory({ items, onOpenResults }: Props) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? items : items.slice(0, 5)

  if (!items || items.length === 0) {
    return (
      <div className="mt-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-foreground">Poll History</h2>
        </div>
        <div className="text-center py-6">
          <p className="text-muted-foreground">You haven't answered any polls yet.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-foreground">Poll History</h2>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {visible.map((ap) => (
          <div key={ap.id} className="flex gap-4 items-center justify-between p-4 border rounded bg-card">
            <div>
              <div className="text-sm font-medium text-foreground">{ap.title}</div>
              <div className="text-xs text-muted-foreground">Last answered: {new Date(ap.last_voted_at).toLocaleString()}</div>
              {typeof ap.total_points === "number" && (
                <div className="text-xs text-foreground mt-1">Points allocated: <span className="font-semibold">{ap.total_points}</span></div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {onOpenResults && (
                <Button size="sm" variant="ghost" onClick={() => onOpenResults(ap.id, ap.title)} className="flex items-center gap-2">
                  <BarChart2 className="h-4 w-4" />
                  <span className="hidden sm:inline">View allocated points</span>
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {items.length > 5 && (
        <div className="mt-4 flex justify-center">
          <Button variant="ghost" size="sm" onClick={() => setShowAll((s) => !s)}>
            {showAll ? "Show less" : `Show all (${items.length})`}
          </Button>
        </div>
      )}
    </div>
  )
}
