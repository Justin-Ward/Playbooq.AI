import { Mark, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export interface InternalLinkAttributes {
  pageId: string
  pageName: string
  pageTitle: string
  createdBy?: string
  createdByName?: string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    internalLink: {
      /**
       * Set an internal link mark
       */
      setInternalLink: (attributes: InternalLinkAttributes) => ReturnType
      /**
       * Toggle an internal link mark
       */
      toggleInternalLink: (attributes: InternalLinkAttributes) => ReturnType
      /**
       * Unset an internal link mark
       */
      unsetInternalLink: () => ReturnType
      /**
       * Remove all internal links with a specific page ID
       */
      removeInternalLinkByPageId: (pageId: string) => ReturnType
    }
  }
}

export const InternalLink = Mark.create<{
  HTMLAttributes: Record<string, any>
}>({
  name: 'internalLink',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  priority: 1000,

  keepOnSplit: false,
  
  inclusive: false,

  onCreate() {
    this.options.HTMLAttributes = {
      'data-internal-link': 'true',
      ...this.options.HTMLAttributes,
    }
  },

  addAttributes() {
    return {
      pageId: {
        default: null,
        parseHTML: element => element.getAttribute('data-page-id'),
        renderHTML: attributes => {
          if (!attributes.pageId) {
            return {}
          }
          return {
            'data-page-id': attributes.pageId,
          }
        },
      },
      pageName: {
        default: null,
        parseHTML: element => element.getAttribute('data-page-name'),
        renderHTML: attributes => {
          if (!attributes.pageName) {
            return {}
          }
          return {
            'data-page-name': attributes.pageName,
          }
        },
      },
      pageTitle: {
        default: null,
        parseHTML: element => element.getAttribute('data-page-title'),
        renderHTML: attributes => {
          if (!attributes.pageTitle) {
            return {}
          }
          return {
            'data-page-title': attributes.pageTitle,
          }
        },
      },
      createdBy: {
        default: null,
        parseHTML: element => element.getAttribute('data-created-by'),
        renderHTML: attributes => {
          if (!attributes.createdBy) {
            return {}
          }
          return {
            'data-created-by': attributes.createdBy,
          }
        },
      },
      createdByName: {
        default: null,
        parseHTML: element => element.getAttribute('data-created-by-name'),
        renderHTML: attributes => {
          if (!attributes.createdByName) {
            return {}
          }
          return {
            'data-created-by-name': attributes.createdByName,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'a[data-internal-link]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const createdByName = HTMLAttributes['data-created-by-name'] || HTMLAttributes.createdByName
    const title = createdByName 
      ? `Internal page link. Created by ${createdByName}` 
      : 'Internal page link'
    
    return [
      'a',
      mergeAttributes(
        {
          'data-internal-link': 'true',
          class: 'internal-link',
          style: 'text-decoration: underline; color: #3b82f6; cursor: pointer;',
          title: title,
        },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
      [
        'span',
        { style: 'display: inline-flex; align-items: center; gap: 2px;' },
        [
          'span',
          {},
          0, // The actual text content
        ],
        [
          'span',
          {
            style: 'display: inline-block; width: 12px; height: 12px; margin-left: 2px;',
            'data-internal-link-icon': 'true'
          },
          '📄', // Small page icon
        ],
      ],
    ]
  },

  addCommands() {
    return {
      setInternalLink:
        (attributes: InternalLinkAttributes) =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes)
        },
      toggleInternalLink:
        (attributes: InternalLinkAttributes) =>
        ({ commands }) => {
          return commands.toggleMark(this.name, attributes)
        },
      unsetInternalLink:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name)
        },
      removeInternalLinkByPageId:
        (pageId: string) =>
        ({ state, dispatch }) => {
          const { doc } = state
          let tr = state.tr
          const ranges: { from: number; to: number }[] = []
          
          // Find all text nodes with internal links matching the pageId
          doc.descendants((node, pos) => {
            if (node.isText && node.marks) {
              const hasMatchingLink = node.marks.some(
                mark => mark.type.name === 'internalLink' && mark.attrs.pageId === pageId
              )
              if (hasMatchingLink) {
                // Store the range to delete (including the text)
                ranges.push({ from: pos, to: pos + node.nodeSize })
              }
            }
          })
          
          // Delete text nodes in reverse order to maintain correct positions
          if (ranges.length > 0) {
            ranges.reverse().forEach(range => {
              tr = tr.delete(range.from, range.to)
            })
            
            if (dispatch) {
              dispatch(tr)
            }
            return true
          }
          
          return false
        },
      insertInternalLink:
        (attributes: InternalLinkAttributes) =>
        ({ commands }) => {
          const title = attributes.createdByName 
            ? `Internal page link. Created by ${attributes.createdByName}` 
            : 'Internal page link'
          const createdByAttr = attributes.createdBy ? ` data-created-by="${attributes.createdBy}"` : ''
          const createdByNameAttr = attributes.createdByName ? ` data-created-by-name="${attributes.createdByName}"` : ''
          
          return commands.insertContent(`<a data-internal-link="true" data-page-id="${attributes.pageId}" data-page-name="${attributes.pageName}" data-page-title="${attributes.pageTitle}"${createdByAttr}${createdByNameAttr} class="internal-link" style="text-decoration: underline; color: #3b82f6; cursor: pointer;" title="${title}">${attributes.pageName}</a>`)
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-k': () => this.editor.commands.toggleInternalLink({ pageId: '', pageName: '', pageTitle: '' }),
    }
  },

  // Add plugin to handle clicks on internal links
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('internalLinkClickHandler'),
        props: {
          handleClick(view, pos, event) {
            const target = event.target as HTMLElement
            
            // Check if click was on an internal link
            const internalLinkNode = target.closest('.internal-link')
            if (internalLinkNode) {
              const pageId = internalLinkNode.getAttribute('data-page-id')
              const pageName = internalLinkNode.getAttribute('data-page-name')
              const pageTitle = internalLinkNode.getAttribute('data-page-title')
              
              if (pageId && pageName) {
                event.preventDefault()
                
                // Dispatch custom event to parent component
                const customEvent = new CustomEvent('internalLinkClick', {
                  detail: { pageId, pageName, pageTitle }
                })
                window.dispatchEvent(customEvent)
                
                return true
              }
            }
            
            return false
          },
        },
      }),
      // Plugin to prevent deletion and editing of internal links
      new Plugin({
        key: new PluginKey('internalLinkDeletePrevention'),
        props: {
          handleKeyDown(view, event) {
            const { selection } = view.state
            const { from, to, $from } = selection
            const doc = view.state.doc
            
            // Check for Backspace or Delete keys
            if (event.key === 'Backspace' || event.key === 'Delete') {
              let hasInternalLink = false
              
              // Check the selected range
              if (from !== to) {
                doc.nodesBetween(from, to, (node) => {
                  if (node.isText && node.marks) {
                    if (node.marks.some(mark => mark.type.name === 'internalLink')) {
                      hasInternalLink = true
                      return false
                    }
                  }
                })
              } else {
                // Check character before cursor (Backspace) or after cursor (Delete)
                const checkPos = event.key === 'Backspace' ? from - 1 : from
                if (checkPos >= 0 && checkPos < doc.content.size) {
                  const resolvedPos = doc.resolve(checkPos)
                  const node = resolvedPos.parent.childAfter(resolvedPos.parentOffset)
                  if (node.node && node.node.isText && node.node.marks) {
                    if (node.node.marks.some(mark => mark.type.name === 'internalLink')) {
                      hasInternalLink = true
                    }
                  }
                }
              }
              
              if (hasInternalLink) {
                event.preventDefault()
                alert('Internal page links cannot be deleted or edited directly. Please use the Edit button on the page tab to delete the internal page.')
                return true
              }
            }
            
            // Check for any text input that would modify internal link
            if (event.key.length === 1 || event.key === 'Enter') {
              // Check if cursor is within an internal link
              const marks = $from.marks()
              if (marks.some(mark => mark.type.name === 'internalLink')) {
                event.preventDefault()
                alert('Internal page links cannot be edited. Please use the Edit button on the page tab to modify the internal page.')
                return true
              }
            }
            
            return false
          },
        },
      }),
    ]
  },
})
