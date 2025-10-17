import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export interface AssignmentDecorationOptions {
  onEdit?: (attrs: any) => void
  onRemove?: (pos: number) => void
  rightSidebarCollapsed?: boolean
}

// Global callback registry to allow runtime updates
const callbackRegistry = {
  onEdit: null as ((attrs: any) => void) | null,
  onRemove: null as ((pos: number) => void) | null,
  rightSidebarCollapsed: false,
}

export function setAssignmentDecorationCallbacks(
  onEdit: (attrs: any) => void,
  onRemove: (pos: number) => void,
  rightSidebarCollapsed?: boolean
) {
  callbackRegistry.onEdit = onEdit
  callbackRegistry.onRemove = onRemove
  if (rightSidebarCollapsed !== undefined) {
    callbackRegistry.rightSidebarCollapsed = rightSidebarCollapsed
  }
}

export function updateRightSidebarState(collapsed: boolean) {
  callbackRegistry.rightSidebarCollapsed = collapsed
}

export const AssignmentDecorations = Extension.create<AssignmentDecorationOptions>({
  name: 'assignmentDecorations',

  addOptions() {
    return {
      onEdit: undefined,
      onRemove: undefined,
    }
  },

  addProseMirrorPlugins() {
    const extension = this

    return [
      new Plugin({
        key: new PluginKey('assignmentDecorations'),
        
        state: {
          init(_, { doc }) {
            return findAssignments(doc, extension.options)
          },
          apply(tr, oldState) {
            return findAssignments(tr.doc, extension.options)
          },
        },

        props: {
          decorations(state) {
            return this.getState(state)
          },
        },
      }),
    ]
  },

  onCreate() {
    // Register callbacks when extension is created
    if (this.options.onEdit) {
      callbackRegistry.onEdit = this.options.onEdit
    }
    if (this.options.onRemove) {
      callbackRegistry.onRemove = this.options.onRemove
    }
    if (this.options.rightSidebarCollapsed !== undefined) {
      callbackRegistry.rightSidebarCollapsed = this.options.rightSidebarCollapsed
    }
  },
})

function findAssignments(doc: any, options: AssignmentDecorationOptions): DecorationSet {
  const decorations: Decoration[] = []
  const assignmentsByLine = new Map<number, Array<{
    from: number
    to: number
    attrs: any
  }>>()

  // Scan the document for assignment marks
  doc.descendants((node: any, pos: number) => {
    if (!node.marks) return

    node.marks.forEach((mark: any) => {
      if (mark.type.name === 'assignment') {
        const from = pos
        const to = pos + node.nodeSize

        // Calculate which line this assignment is on
        // We'll use a simple approach: track position
        const lineNumber = getLineNumber(doc, from)

        if (!assignmentsByLine.has(lineNumber)) {
          assignmentsByLine.set(lineNumber, [])
        }

        assignmentsByLine.get(lineNumber)!.push({
          from,
          to,
          attrs: mark.attrs,
        })
      }
    })
  })

  // Create decorations for each line with assignments
  assignmentsByLine.forEach((assignments, lineNumber) => {
    // Group assignments by unique assignee combinations
    // For now, we'll just show the first assignment on each line
    const assignment = assignments[0]
    
    // Create a widget decoration that will be rendered in the margin
    const widget = Decoration.widget(
      assignment.from,
      () => createAssignmentWidget(assignment.attrs, assignment.from, options),
      {
        side: 1,
        key: `assignment-${assignment.from}`,
      }
    )

    decorations.push(widget)
  })

  return DecorationSet.create(doc, decorations)
}

function getLineNumber(doc: any, pos: number): number {
  let lineNumber = 0
  let currentPos = 0

  doc.descendants((node: any, nodePos: number) => {
    if (nodePos >= pos) return false

    if (node.isBlock) {
      lineNumber++
    }

    currentPos = nodePos + node.nodeSize
    return true
  })

  return lineNumber
}

function createAssignmentWidget(
  attrs: any,
  pos: number,
  options: AssignmentDecorationOptions
): HTMLElement {
  const widget = document.createElement('div')
  widget.className = 'assignment-decoration'
  widget.contentEditable = 'false'
  widget.setAttribute('data-assignment-pos', pos.toString())
  
  const isRightSidebarCollapsed = callbackRegistry.rightSidebarCollapsed || options.rightSidebarCollapsed || false
  
  // Style the widget based on sidebar state
  Object.assign(widget.style, {
    position: 'absolute',
    right: isRightSidebarCollapsed ? '-200px' : '10px', // Closer to text when collapsed, near when expanded
    top: '0',
    width: '180px',
    padding: '6px 10px',
    fontSize: '11px',
    fontWeight: '500',
    borderRadius: '6px',
    border: '1px solid rgba(0,0,0,0.1)',
    backgroundColor: attrs.assignmentColor || '#fef3c7',
    color: '#374151',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    transition: 'all 0.2s ease',
    zIndex: '10',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    // Show/hide based on sidebar state - when expanded, initially hidden (will show on hover)
    opacity: isRightSidebarCollapsed ? '1' : '0',
    pointerEvents: isRightSidebarCollapsed ? 'auto' : 'none',
  })

  // Create content container
  const contentDiv = document.createElement('div')
  contentDiv.style.flex = '1'
  contentDiv.style.overflow = 'hidden'
  contentDiv.style.textOverflow = 'ellipsis'
  
  // Add assignee name
  const nameSpan = document.createElement('span')
  nameSpan.textContent = attrs.assignedToName || 'Unknown'
  nameSpan.style.fontWeight = '600'
  contentDiv.appendChild(nameSpan)

  // Add due date to tooltip
  if (attrs.dueDate) {
    const dueDate = new Date(attrs.dueDate)
    const dueDateStr = formatDueDate(dueDate)
    widget.title = `Assigned to: ${attrs.assignedToName}\nDue: ${dueDateStr}`
  } else {
    widget.title = `Assigned to: ${attrs.assignedToName}`
  }

  widget.appendChild(contentDiv)

  // Add action buttons container
  const actionsDiv = document.createElement('div')
  actionsDiv.style.display = 'flex'
  actionsDiv.style.gap = '4px'
  actionsDiv.style.marginLeft = '8px'

  // Edit button
  const editBtn = document.createElement('button')
  editBtn.innerHTML = '✏️'
  editBtn.style.border = 'none'
  editBtn.style.background = 'rgba(255,255,255,0.8)'
  editBtn.style.borderRadius = '3px'
  editBtn.style.cursor = 'pointer'
  editBtn.style.padding = '2px 5px'
  editBtn.style.fontSize = '12px'
  editBtn.title = 'Edit assignment'
  
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    if (callbackRegistry.onEdit) {
      callbackRegistry.onEdit(attrs)
    } else if (options.onEdit) {
      options.onEdit(attrs)
    }
  })

  // Remove button
  const removeBtn = document.createElement('button')
  removeBtn.innerHTML = '✕'
  removeBtn.style.border = 'none'
  removeBtn.style.background = 'rgba(255,255,255,0.8)'
  removeBtn.style.borderRadius = '3px'
  removeBtn.style.cursor = 'pointer'
  removeBtn.style.padding = '2px 5px'
  removeBtn.style.fontSize = '12px'
  removeBtn.style.fontWeight = 'bold'
  removeBtn.title = 'Remove assignment'
  
  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    if (callbackRegistry.onRemove) {
      callbackRegistry.onRemove(pos)
    } else if (options.onRemove) {
      options.onRemove(pos)
    }
  })

  actionsDiv.appendChild(editBtn)
  actionsDiv.appendChild(removeBtn)
  widget.appendChild(actionsDiv)

  // Hover effects for the widget itself
  widget.addEventListener('mouseenter', () => {
    const isCollapsed = callbackRegistry.rightSidebarCollapsed
    if (isCollapsed) {
      widget.style.transform = 'translateX(-5px)'
      widget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.15)'
    }
  })

  widget.addEventListener('mouseleave', () => {
    const isCollapsed = callbackRegistry.rightSidebarCollapsed
    if (isCollapsed) {
      widget.style.transform = 'translateX(0)'
      widget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
    }
  })

  // Set up a data attribute to help with hover detection
  widget.setAttribute('data-assignment-widget', 'true')

  return widget
}

function formatDueDate(date: Date): string {
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`
  } else if (diffDays === 0) {
    return 'Due today'
  } else if (diffDays === 1) {
    return 'Due tomorrow'
  } else if (diffDays <= 7) {
    return `Due in ${diffDays} days`
  } else {
    return date.toLocaleDateString()
  }
}

