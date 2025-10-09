import { useEffect, useCallback } from 'react'

interface KeyboardShortcuts {
  onSave?: () => void
  onNew?: () => void
  onGenerate?: () => void
  onFind?: () => void
}

export function useKeyboardShortcuts({
  onSave,
  onNew,
  onGenerate,
  onFind
}: KeyboardShortcuts) {
  
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
    const ctrlKey = isMac ? event.metaKey : event.ctrlKey
    
    // Prevent default browser behavior for our shortcuts
    if (ctrlKey && !event.shiftKey && !event.altKey) {
      switch (event.key.toLowerCase()) {
        case 's':
          event.preventDefault()
          onSave?.()
          break
        case 'n':
          event.preventDefault()
          onNew?.()
          break
        case 'g':
          event.preventDefault()
          onGenerate?.()
          break
        case 'f':
          event.preventDefault()
          onFind?.()
          break
      }
    }
  }, [onSave, onNew, onGenerate, onFind])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  // Return keyboard shortcut info for UI display
  const shortcuts = {
    save: navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? 'Cmd + S' : 'Ctrl + S',
    new: navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? 'Cmd + N' : 'Ctrl + N',
    generate: navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? 'Cmd + G' : 'Ctrl + G',
    find: navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? 'Cmd + F' : 'Ctrl + F'
  }

  return { shortcuts }
}

