"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Sun, Moon, Home, List, User } from "lucide-react"

interface NavigationProps {
  userEmail?: string
}

export function Navigation({ userEmail }: NavigationProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  return (
    <nav className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
        <Link href="/home" className="text-2xl font-extrabold text-primary tracking-tight">
          EquiPoll
        </Link>
        <div className="flex gap-3 items-center">
          <Link href="/home">
            <Button variant="ghost" className="text-foreground hover:bg-muted/60 flex items-center gap-2">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Home</span>
            </Button>
          </Link>
          <Link href="/my-polls">
            <Button variant="ghost" className="text-foreground hover:bg-muted/60 flex items-center gap-2">
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">My Polls</span>
            </Button>
          </Link>
          <Link href="/account">
            <Button variant="ghost" className="text-foreground hover:bg-muted/60 flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Account</span>
            </Button>
          </Link>
          <div>
            <Button
              variant="ghost"
              onClick={() => {
                if (!mounted) return
                setTheme(theme === "dark" ? "light" : "dark")
              }}
              className="text-foreground flex items-center gap-2"
              aria-label="Toggle theme"
            >
              {mounted && theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span className="text-sm">{mounted ? (theme === "dark" ? "Light" : "Dark") : ""}</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
