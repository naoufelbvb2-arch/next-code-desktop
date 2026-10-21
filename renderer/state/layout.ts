export const dimensions = {
  sidebar: 256,
  rail: 64,
  dock: 360,
  minDock: 320,
  maxDock: 480,
  center: 580,
  gap: 16
} as const

export function fitLayout(
  viewport: number,
  collapsed: boolean,
  dockRequested: boolean,
  savedWidth: number
) {
  const preferredSidebar = collapsed ? dimensions.rail : dimensions.sidebar
  const requestedWidth = Math.max(dimensions.minDock, Math.min(dimensions.maxDock, savedWidth))
  if (!dockRequested)
    return { sidebar: preferredSidebar, dock: 0, dockVisible: false, compact: collapsed }
  const expandedSpace = viewport - preferredSidebar - dimensions.gap * 2 - dimensions.center
  // Preserve preferred Dock width before temporarily compacting the Sidebar.
  const sidebar = expandedSpace >= requestedWidth ? preferredSidebar : dimensions.rail
  const dock = Math.floor(
    Math.min(requestedWidth, viewport - sidebar - dimensions.gap * 2 - dimensions.center)
  )
  if (dock < dimensions.minDock)
    return { sidebar: preferredSidebar, dock: 0, dockVisible: false, compact: collapsed }
  return { sidebar, dock, dockVisible: true, compact: sidebar === dimensions.rail }
}
