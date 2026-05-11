'use client'

import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useTheme } from './ThemeProvider'

export default function ThemeToggle(): React.ReactElement {
  const { theme, toggleTheme } = useTheme()

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Toggle theme"
          onClick={toggleTheme}
        >
          {theme === 'light' ? (
            <Moon className="size-4" aria-hidden="true" />
          ) : (
            <Sun className="size-4" aria-hidden="true" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>Toggle theme</p>
      </TooltipContent>
    </Tooltip>
  )
}
