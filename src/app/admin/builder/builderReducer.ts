import { arrayMove } from '@dnd-kit/sortable'
import type { BuilderState, BuilderAction, PageBlock } from '@/types/builder'

export const initialState: BuilderState = {
  blocks: [],
  selectedId: null,
  libraryOpen: false,
  isDirty: false,
  past: [],
  future: [],
}

function snapshot(state: BuilderState): BuilderState {
  return {
    ...state,
    past: [...state.past.slice(-49), state.blocks],
    future: [],
    isDirty: true,
  }
}

export function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case 'INIT':
      return { ...initialState, blocks: action.payload }

    case 'SELECT':
      return { ...state, selectedId: action.payload, libraryOpen: false }

    case 'TOGGLE_LIBRARY':
      return { ...state, libraryOpen: !state.libraryOpen, selectedId: null }

    case 'ADD_BLOCK': {
      const next = snapshot(state)
      return { ...next, blocks: [...state.blocks, action.payload], selectedId: action.payload.id }
    }

    case 'UPDATE_CONFIG': {
      const next = snapshot(state)
      return {
        ...next,
        blocks: state.blocks.map(b =>
          b.id === action.payload.id
            ? { ...b, config: action.payload.config }
            : b
        ),
      }
    }

    case 'UPDATE_STYLES': {
      const next = snapshot(state)
      return {
        ...next,
        blocks: state.blocks.map(b =>
          b.id === action.payload.id
            ? { ...b, styles: { ...b.styles, ...action.payload.styles } }
            : b
        ),
      }
    }

    case 'UPDATE_SPAN': {
      const next = snapshot(state)
      return {
        ...next,
        blocks: state.blocks.map(b =>
          b.id === action.payload.id ? { ...b, colSpan: action.payload.colSpan } : b
        ),
      }
    }

    case 'REORDER': {
      const next = snapshot(state)
      return { ...next, blocks: action.payload }
    }

    case 'DELETE_BLOCK': {
      const next = snapshot(state)
      return {
        ...next,
        blocks: state.blocks.filter(b => b.id !== action.payload),
        selectedId: state.selectedId === action.payload ? null : state.selectedId,
      }
    }

    case 'DUPLICATE_BLOCK': {
      const src = state.blocks.find(b => b.id === action.payload)
      if (!src) return state
      const clone: PageBlock = { ...src, id: `new-${Date.now()}`, order: src.order + 0.5 }
      const idx = state.blocks.findIndex(b => b.id === action.payload)
      const newBlocks = [...state.blocks]
      newBlocks.splice(idx + 1, 0, clone)
      const next = snapshot(state)
      return { ...next, blocks: newBlocks, selectedId: clone.id }
    }

    case 'INSERT_AFTER': {
      const idx = state.blocks.findIndex(b => b.id === action.payload.afterId)
      const newBlocks = [...state.blocks]
      newBlocks.splice(idx + 1, 0, action.payload.block)
      const next = snapshot(state)
      return { ...next, blocks: newBlocks, selectedId: action.payload.block.id }
    }

    case 'TOGGLE_VISIBLE': {
      const next = snapshot(state)
      return {
        ...next,
        blocks: state.blocks.map(b =>
          b.id === action.payload ? { ...b, visible: !b.visible } : b
        ),
      }
    }

    case 'UNDO': {
      if (state.past.length === 0) return state
      const previous = state.past[state.past.length - 1]
      return {
        ...state,
        blocks: previous,
        past: state.past.slice(0, -1),
        future: [state.blocks, ...state.future],
        isDirty: true,
      }
    }

    case 'REDO': {
      if (state.future.length === 0) return state
      const next = state.future[0]
      return {
        ...state,
        blocks: next,
        past: [...state.past, state.blocks],
        future: state.future.slice(1),
        isDirty: true,
      }
    }

    case 'MARK_CLEAN':
      return { ...state, isDirty: false }

    default:
      return state
  }
}

export { arrayMove }
