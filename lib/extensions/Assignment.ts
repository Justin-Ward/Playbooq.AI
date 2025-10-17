import { Mark, mergeAttributes } from '@tiptap/core'

export interface AssignmentAttributes {
  assignedTo: string
  assignedToName: string
  dueDate: string // ISO string
  assignmentColor: string // hex color
}

export interface AssignmentOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    assignment: {
      /**
       * Add an assignment mark to the selected text
       */
      addAssignment: (attributes: AssignmentAttributes) => ReturnType
      /**
       * Remove assignment marks from the selected text
       */
      removeAssignment: () => ReturnType
    }
  }
}

export const Assignment = Mark.create<AssignmentOptions>({
  name: 'assignment',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      assignedTo: {
        default: null,
        parseHTML: element => element.getAttribute('data-assigned-to'),
        renderHTML: attributes => {
          if (!attributes.assignedTo) {
            return {}
          }
          return {
            'data-assigned-to': attributes.assignedTo,
          }
        },
      },
      assignedToName: {
        default: null,
        parseHTML: element => element.getAttribute('data-assigned-to-name'),
        renderHTML: attributes => {
          if (!attributes.assignedToName) {
            return {}
          }
          return {
            'data-assigned-to-name': attributes.assignedToName,
          }
        },
      },
      dueDate: {
        default: null,
        parseHTML: element => element.getAttribute('data-due-date'),
        renderHTML: attributes => {
          if (!attributes.dueDate) {
            return {}
          }
          return {
            'data-due-date': attributes.dueDate,
          }
        },
      },
      assignmentColor: {
        default: '#fef3c7', // default yellow color
        parseHTML: element => element.getAttribute('data-assignment-color'),
        renderHTML: attributes => {
          return {
            'data-assignment-color': attributes.assignmentColor,
            style: `background-color: ${attributes.assignmentColor}`,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'mark[data-assignment]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'mark',
      mergeAttributes(
        { 'data-assignment': 'true' },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
      0,
    ]
  },

  addCommands() {
    return {
      addAssignment:
        (attributes: AssignmentAttributes) =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes)
        },
      removeAssignment:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name)
        },
    }
  },

  inclusive: true, // Allow multiple marks to overlap
})
