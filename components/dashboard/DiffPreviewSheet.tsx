// components/dashboard/DiffPreviewSheet.tsx
"use client"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { AiSuggestion } from "@/lib/mock-data"

interface DiffPreviewSheetProps {
  open: boolean
  suggestion: AiSuggestion
  onConfirm: () => void
  onCancel: () => void
}

export default function DiffPreviewSheet({
  open,
  suggestion,
  onConfirm,
  onCancel,
}: DiffPreviewSheetProps): React.ReactElement {
  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel() }}>
      <SheetContent side="right" className="w-[480px] sm:max-w-[480px] flex flex-col gap-0 p-0">
        <SheetHeader className="px-4 py-3 border-b shrink-0">
          <SheetTitle className="text-sm">Preview changes</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-auto p-4">
          <p className="text-xs text-muted-foreground">
            Action: <span className="font-medium text-foreground">{suggestion.suggestedAction}</span>
          </p>
          {suggestion.destinationPath && (
            <p className="text-xs text-muted-foreground mt-1">
              Destination: <span className="font-mono text-foreground">{suggestion.destinationPath}</span>
            </p>
          )}
        </div>

        <SheetFooter className="px-4 py-3 border-t flex gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
            className="flex-1 text-xs"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            className="flex-1 text-xs bg-accent text-accent-foreground hover:bg-accent/90"
          >
            Confirm
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
