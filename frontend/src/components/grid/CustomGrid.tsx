import { useRef, useCallback, useEffect, useMemo } from 'react'
import { AgGridReact } from 'ag-grid-react'
import {
  themeQuartz,
  type GridApi,
  type GridReadyEvent,
  type ColDef,
  type RowClickedEvent,
  ClientSideRowModelModule,
  ClientSideRowModelApiModule,
  ColumnAutoSizeModule,
  QuickFilterModule,
  ValidationModule,
  CellStyleModule,
  TextFilterModule,
  NumberFilterModule,
  DateFilterModule,
  PaginationModule,
  RowSelectionModule,
  ModuleRegistry,
} from 'ag-grid-community'

ModuleRegistry.registerModules([
  QuickFilterModule,
  ClientSideRowModelModule,
  ClientSideRowModelApiModule,
  ColumnAutoSizeModule,
  CellStyleModule,
  TextFilterModule,
  NumberFilterModule,
  DateFilterModule,
  RowSelectionModule,
  PaginationModule,
  ...(!import.meta.env.PROD ? [ValidationModule] : []),
])

const GRID_MODULES = [
  QuickFilterModule,
  ClientSideRowModelModule,
  ClientSideRowModelApiModule,
  ColumnAutoSizeModule,
  CellStyleModule,
  TextFilterModule,
  NumberFilterModule,
  DateFilterModule,
  RowSelectionModule,
  PaginationModule,
]

const gridTheme = themeQuartz.withParams({
  backgroundColor: 'transparent',
  spacing: 10,
  headerFontSize: 13,
  foregroundColor: '#374151',
  headerTextColor: '#6b7280',
  borderColor: '#e5e7eb',
  rowHoverColor: '#f9fafb',
  selectedRowBackgroundColor: '#f3f4f6',
  chromeBackgroundColor: 'transparent',
  headerBackgroundColor: '#f9fafb',
  fontFamily: 'inherit',
  fontSize: 13,
  rowBorder: { color: '#e5e7eb', width: 1 },
  headerRowBorder: { color: '#e5e7eb', width: 1 },
})

export interface CustomGridProps<T> {
  rowData: T[]
  columnDefs: ColDef[]
  height?: string
  defaultColDef?: ColDef
  pagination?: boolean
  paginationPageSize?: number
  enableRowSelection?: boolean
  onGridReady?: (params: GridReadyEvent) => void
  onSelectionChanged?: (selectedRows: T[]) => void
  onRowClicked?: (row: T) => void
  suppressCellFocus?: boolean
  enableCellTextSelection?: boolean
}

function CustomGrid<T>({
  rowData,
  columnDefs,
  height = '500px',
  defaultColDef: propDefaultColDef,
  pagination = false,
  paginationPageSize = 25,
  enableRowSelection = false,
  onGridReady: propOnGridReady,
  onSelectionChanged,
  onRowClicked,
  suppressCellFocus = true,
  enableCellTextSelection = true,
}: CustomGridProps<T>) {
  const gridApiRef = useRef<GridApi | null>(null)

  useEffect(() => {
    return () => {
      if ((gridApiRef.current as any)?.resizeCleanup) {
        ;(gridApiRef.current as any).resizeCleanup()
      }
    }
  }, [])

  const onGridReady = useCallback(
    (params: GridReadyEvent) => {
      gridApiRef.current = params.api
      params.api.sizeColumnsToFit()

      const handleResize = () => setTimeout(() => params.api.sizeColumnsToFit(), 100)
      window.addEventListener('resize', handleResize)
      ;(params.api as any).resizeCleanup = () => window.removeEventListener('resize', handleResize)

      propOnGridReady?.(params)
    },
    [propOnGridReady],
  )

  const handleSelectionChanged = useCallback(() => {
    if (gridApiRef.current && onSelectionChanged) {
      onSelectionChanged(gridApiRef.current.getSelectedRows() as T[])
    }
  }, [onSelectionChanged])

  const handleRowClicked = useCallback(
    (e: RowClickedEvent<T>) => onRowClicked?.(e.data as T),
    [onRowClicked],
  )

  const defaultColDef = useMemo(
    () => ({
      resizable: true,
      suppressMovable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: false,
      ...propDefaultColDef,
    }),
    [propDefaultColDef],
  )

  return (
    <div style={{ height, width: '100%' }}>
      <AgGridReact
        theme={gridTheme}
        modules={GRID_MODULES}
        columnDefs={columnDefs}
        rowData={rowData}
        defaultColDef={defaultColDef}
        onGridReady={onGridReady}
        animateRows={true}
        rowSelection={enableRowSelection ? 'multiple' : undefined}
        onSelectionChanged={handleSelectionChanged}
        onRowClicked={onRowClicked ? handleRowClicked : undefined}
        pagination={pagination}
        paginationPageSize={paginationPageSize}
        suppressCellFocus={suppressCellFocus}
        enableCellTextSelection={enableCellTextSelection}
        rowBuffer={10}
        cacheQuickFilter={true}
      />
    </div>
  )
}

export default CustomGrid
