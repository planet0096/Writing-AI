
"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown, MoreHorizontal, Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "./ui/skeleton"
import { format } from "date-fns"
import { mkConfig, generateCsv, download } from "export-to-csv";

interface Sale {
    id: string;
    studentName: string;
    planName: string;
    amount: number;
    createdAt: { toDate: () => Date };
}

const columns: ColumnDef<Sale>[] = [
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <div className="text-sm text-slate-700">{format(row.original.createdAt.toDate(), 'PP')}</div>,
  },
  {
    accessorKey: "studentName",
    header: "Student",
    cell: ({ row }) => <div className="text-sm font-medium text-slate-800">{row.getValue("studentName")}</div>,
  },
  {
    accessorKey: "planName",
    header: "Plan Purchased",
    cell: ({ row }) => <div className="text-sm text-slate-700">{row.getValue("planName")}</div>,
  },
  {
    accessorKey: "amount",
    header: ({ column }) => {
      return (
        <div className="text-right">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-right"
          >
            Amount
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )
    },
    cell: ({ row }) => {
      const amount = parseFloat(String(row.getValue("amount"))) / 100
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount)
      return <div className="text-right font-medium text-sm text-slate-800">{formatted}</div>
    },
  },
]

const csvConfig = mkConfig({
    useKeysAsHeaders: true,
    filename: `sales-export-${new Date().toISOString().split('T')[0]}`,
});


interface SalesDataTableProps {
  data: Sale[];
  isLoading: boolean;
}

export function SalesDataTable({ data, isLoading }: SalesDataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
      { id: 'createdAt', desc: true }
  ])

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
  })
  
  const handleExport = () => {
    const dataToExport = table.getRowModel().rows.map(row => ({
        date: format(row.original.createdAt.toDate(), 'yyyy-MM-dd'),
        student: row.original.studentName,
        plan: row.original.planName,
        amount: (row.original.amount / 100).toFixed(2),
    }));
    const csv = generateCsv(csvConfig)(dataToExport);
    download(csvConfig)(csv);
  }

  return (
    <div className="w-full bg-white rounded-lg border border-slate-200 shadow-sm p-6">
      <div className="flex items-center pb-4">
        <h2 className="text-lg font-semibold text-slate-900">Recent Sales</h2>
        <Button onClick={handleExport} variant="outline" size="sm" className="ml-auto">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
        </Button>
      </div>
      <div className="border-t border-slate-200">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
                Array.from({length: 5}).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell colSpan={columns.length}><Skeleton className="h-6 w-full" /></TableCell>
                    </TableRow>
                ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-slate-50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-slate-500"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 pt-4">
        <div className="flex-1 text-sm text-slate-500">
          {table.getFilteredRowModel().rows.length} row(s).
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}

    