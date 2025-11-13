"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts"
import { X } from "lucide-react"

interface Choice {
  id: string
  choice_text: string
  total_points: number
  vote_count: number
}

interface PollResultsModalProps {
  pollId: string
  pollTitle: string
  onClose: () => void
}

export function PollResultsModal({ pollId, pollTitle, onClose }: PollResultsModalProps) {
  const [choices, setChoices] = useState<Choice[]>([])
  const [loading, setLoading] = useState(true)
  const [totalVoters, setTotalVoters] = useState(0)
  const [consensusScore, setConsensusScore] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    const fetchResults = async () => {
      try {
        // Get all choices for this poll
        const { data: choicesData, error: choicesError } = await supabase
          .from("poll_choices")
          .select("id, choice_text")
          .eq("poll_id", pollId)

        if (choicesError) throw choicesError

        // Get vote data for each choice
        const { data: votesData, error: votesError } = await supabase
          .from("votes")
          .select("choice_id, points, user_id")
          .eq("poll_id", pollId)

        if (votesError) throw votesError

        // Calculate total points and vote count for each choice
        const choiceResults = choicesData.map((choice) => {
          const choiceVotes = votesData.filter((v) => v.choice_id === choice.id)
          const totalPoints = choiceVotes.reduce((sum, v) => sum + Number(v.points), 0)
          
          return {
            id: choice.id,
            choice_text: choice.choice_text,
            total_points: totalPoints,
            vote_count: choiceVotes.length,
          }
        })

        // Sort by total points descending
        choiceResults.sort((a, b) => b.total_points - a.total_points)

        // Calculate unique voters
        const uniqueVoters = new Set(votesData.map((v) => v.user_id)).size
        setTotalVoters(uniqueVoters)

        // Calculate consensus score (unanimity index)
        // Using Herfindahl index: sum of squared proportions
        const totalPoints = choiceResults.reduce((sum, c) => sum + c.total_points, 0)
        if (totalPoints > 0) {
          const herfindahl = choiceResults.reduce((sum, c) => {
            const proportion = c.total_points / totalPoints
            return sum + proportion * proportion
          }, 0)
          // Normalize to 0-100 scale (1 = complete consensus, 1/n = complete disagreement)
          const normalizedScore = ((herfindahl - 1 / choiceResults.length) / (1 - 1 / choiceResults.length)) * 100
          setConsensusScore(Math.round(normalizedScore))
        }

        setChoices(choiceResults)
      } catch (error) {
        console.error("Error fetching results:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [pollId, supabase])

  const getBarColor = (index: number) => {
    const colors = ["#a78bfa", "#7bae7f", "#de354c", "#667eea", "#764ba2"]
    return colors[index % colors.length]
  }

  const getConsensusLabel = (score: number) => {
    if (score >= 80) return "Very High Consensus"
    if (score >= 60) return "High Consensus"
    if (score >= 40) return "Moderate Consensus"
    if (score >= 20) return "Low Consensus"
    return "Very Low Consensus"
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <Card className="bg-card border-border w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Loading results...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const chartData = choices.map((choice) => ({
    name: choice.choice_text.length > 20 ? choice.choice_text.substring(0, 20) + "..." : choice.choice_text,
    points: choice.total_points,
    fullName: choice.choice_text,
  }))

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="bg-card border-border w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{pollTitle}</CardTitle>
              <CardDescription>Poll Results</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-muted border-border">
              <CardHeader className="pb-2">
                <CardDescription>Total Voters</CardDescription>
                <CardTitle className="text-3xl">{totalVoters}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-muted border-border">
              <CardHeader className="pb-2">
                <CardDescription>Consensus Score</CardDescription>
                <CardTitle className="text-3xl">{consensusScore}%</CardTitle>
                <p className="text-sm text-muted-foreground">{getConsensusLabel(consensusScore)}</p>
              </CardHeader>
            </Card>
          </div>

          {/* Bar Chart */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Point Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={100}
                  interval={0}
                />
                <YAxis />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-card border border-border p-2 rounded shadow-lg">
                          <p className="font-semibold">{payload[0].payload.fullName}</p>
                          <p className="text-primary">Points: {payload[0].value}</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend />
                <Bar dataKey="points" fill="#a78bfa" name="Total Points">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(index)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Results Table */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Detailed Results</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Rank</TableHead>
                  <TableHead>Choice</TableHead>
                  <TableHead className="text-right">Total Points</TableHead>
                  <TableHead className="text-right">Vote Count</TableHead>
                  <TableHead className="text-right">Avg Points/Vote</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {choices.map((choice, index) => (
                  <TableRow key={choice.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{choice.choice_text}</TableCell>
                    <TableCell className="text-right font-semibold">{choice.total_points.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{choice.vote_count}</TableCell>
                    <TableCell className="text-right">
                      {choice.vote_count > 0 ? (choice.total_points / choice.vote_count).toFixed(2) : "0.00"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Consensus Explanation */}
          <Card className="bg-muted border-border">
            <CardHeader>
              <CardTitle className="text-sm">About Consensus Score</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                The consensus score measures how much agreement exists among voters. A score of 100% indicates 
                complete agreement (all points to one choice), while 0% indicates maximum disagreement 
                (points evenly distributed). This is calculated using the Herfindahl index.
              </p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
}