"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface NavigationProps {
  userEmail?: string
}

export function Navigation({ userEmail }: NavigationProps) {
  const router = useRouter()

  return (
    <nav className="border-b border-border bg-card sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/home" className="text-2xl font-bold text-primary">
          EquiPoll
        </Link>
        <div className="flex gap-4 items-center">
          <Link href="/home">
            <Button variant="ghost" className="text-foreground hover:bg-muted">
              Home
            </Button>
          </Link>
          <Link href="/my-polls">
            <Button variant="ghost" className="text-foreground hover:bg-muted">
              My Polls
            </Button>
          </Link>
          <Link href="/account">
            <Button variant="ghost" className="text-foreground hover:bg-muted">
              Account
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  )
}
