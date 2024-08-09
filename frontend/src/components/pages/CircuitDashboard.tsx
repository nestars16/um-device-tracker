import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  Row,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoaderCircle, MoreHorizontal, ServerCrash } from "lucide-react";
import { Input } from "@/components/ui/input";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useNavigation } from "react-router-dom";
import {
  Circuit,
  FailedRequestResponse,
  RequestResponse,
  SuccessfulRequestResponse,
} from "@/lib/types";

const circuitColumns: Array<keyof Circuit> = [
  "state",
  "site_name",
  "ckt_id",
  "parent",
  "link_type",
  "provider",
  "z_loc",
  "rtr_name_z_loc",
  "to_description",
  "rtr_port_z_loc",
  "interf_ip_z_loc",
  "a_loc",
  "rtr_name_a_loc",
  "rtr_port",
  "interf_ip_a_loc",
  "bw_mbps",
  "single_isp",
  "ups_closet",
  "router_ip",
];

export const columns: ColumnDef<Circuit>[] = [
  ...circuitColumns.map((column) => ({
    enableResizing: true,
    enableHiding: true,
    accessorKey: column,
    header: column
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" "),
    cell: ({ row }: { row: Row<any> }) => <div>{row.getValue(column)}</div>,
  })),
  {
    enableResizing: false,
    id: "actions",
    size: 50,
    enableHiding: false,
    cell: ({ row }) => {
      const circuit = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(circuit.id)}
            >
              Copy circuit ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Link to={`/circuits/view/${row.original.id}`}>View details</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

/*
export const columns: ColumnDef<Circuit>[] = [
  {
    enableResizing: true,
    size: 20,
    accessorKey: "state",
    header: "State",
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("state")}</div>
    ),
  },
  {
    enableResizing: true,
    accessorKey: "site_name",
    header: "Site Name",
    size: 150,
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("site_name")}</div>
    ),
  },
  {
    enableResizing: true,
    accessorKey: "ckt_id",
    header: "Circuit ID",
    size: 80,
    cell: ({ row }) => <div>{row.getValue("ckt_id")}</div>,
  },
  {
    enableResizing: true,
    accessorKey: "provider",
    header: "Provider",
    size: 100,
    cell: ({ row }) => <div>{row.getValue("provider")}</div>,
  },
  {
    enableResizing: true,
    accessorKey: "bw_mbps",
    header: "Bandwidth (Mbps)",
    cell: ({ row }) => <div>{row.getValue("bw_mbps")}</div>,
  },
  {
    enableResizing: false,
    id: "actions",
    size: 50,
    enableHiding: false,
    cell: ({ row }) => {
      const circuit = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(circuit.id)}
            >
              Copy circuit ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Link to={`/circuits/view/${row.original.id}`}>View details</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
*/

async function getCircuits(
  jwt: string,
): Promise<RequestResponse<Array<Circuit>>> {
  const res = await fetch("/api/circuits/all", {
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
  });

  return await res.json();
}

export function CircuitDashboard() {
  const navigate = useNavigate();

  const navigation = useNavigation();
  const jwt = sessionStorage.getItem("jwt");
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );

  const [pagination, setPagination] = React.useState({
    pageIndex: 0, //initial page index
    pageSize: 10, //default page size
  });

  const [selectedFilterColumn, setSelectedFilterColumn] =
    React.useState<string>("site_name");

  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({
      state: true,
      site_name: true,
      ckt_id: true,
      parent: true,
      link_type: true,
      provider: false,
      z_loc: false,
      rtr_name_z_loc: false,
      to_description: false,
      rtr_port_z_loc: false,
      interf_ip_z_loc: false,
      a_loc: false,
      rtr_name_a_loc: false,
      rtr_port: false,
      interf_ip_a_loc: false,
      bw_mbps: false,
      single_isp: false,
      ups_closet: false,
      router_ip: false,
    });

  const { data, isLoading, isError, error } = useQuery<
    RequestResponse<Array<Circuit>>
  >({
    queryKey: ["CircuitsAll"],
    queryFn: async () => await getCircuits(jwt || ""),
    staleTime: 36000000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const table = useReactTable({
    data:
      data?.status === "success"
        ? (data as SuccessfulRequestResponse<Circuit[]>).data
        : [],
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      pagination,
      columnVisibility,
    },
  });

  React.useEffect(() => {
    if (jwt) {
      return;
    }

    navigate("/dashboard");
  }, [jwt, navigate]);

  const cellStyle = "1px solid #ddd";
  const lastCellStyle = "none";

  return (
    <>
      <div className="w-full m-4">
        <div className="flex items-center justify-between py-4 gap-4">
          <div className="flex items-center py-4 gap-4">
            <Input
              placeholder={`Filter ${selectedFilterColumn} names...`}
              value={
                (table
                  .getColumn(selectedFilterColumn)
                  ?.getFilterValue() as string) ?? ""
              }
              onChange={(event) =>
                table
                  .getColumn(selectedFilterColumn)
                  ?.setFilterValue(event.target.value)
              }
              className="max-w-sm"
            />
            <Select
              onValueChange={setSelectedFilterColumn}
              value={selectedFilterColumn}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Filter By Column</SelectLabel>
                  {circuitColumns.map((col) => (
                    <SelectItem key={col} value={col}>
                      {col
                        .split("_")
                        .map(
                          (word) =>
                            word.charAt(0).toUpperCase() + word.slice(1),
                        )
                        .join(" ")}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Input
              onChange={(e) => {
                setPagination({
                  ...pagination,
                  pageSize: parseInt(e.target.value),
                });
              }}
              type="number"
              value={pagination.pageSize}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Toggle Columns</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80 grid grid-cols-3">
                {table
                  .getAllColumns()
                  .slice(0, -1)
                  .map((column) => (
                    <DropdownMenuItem key={column.id} asChild>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={column.getIsVisible()}
                          onChange={column.getToggleVisibilityHandler()}
                          className="mr-2"
                        />
                        {column.columnDef.header?.toString()}
                      </label>
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Button onClick={() => navigate("/circuits/create")}>
            Add circuit
          </Button>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-muted">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header, index, array) => {
                    return (
                      <TableHead
                        key={header.id}
                        style={{
                          borderRight:
                            index === array.length - 2
                              ? lastCellStyle
                              : cellStyle,
                          width: `${header.getSize()}px`,
                        }}
                        className="pl-4 pr-0"
                        colSpan={header.colSpan}
                      >
                        {header.isPlaceholder ? null : (
                          <div className="flex flex-row justify-between h-full items-center">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                            {index !== array.length - 1 && (
                              <div
                                className="w-[10px] h-full bg-muted p-0 m-0 relative-left cursor-move opacity-0"
                                onMouseDown={header.getResizeHandler()} //for desktop
                                onTouchStart={header.getResizeHandler()} //for mobile
                                style={{
                                  transform: header.column.getIsResizing()
                                    ? `translateX(${table.getState().columnSizingInfo.deltaOffset}px)`
                                    : "",
                                }}
                              />
                            )}
                          </div>
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    <div className="flex items-center flex-col justify-center">
                      <LoaderCircle className="animate-spin" />
                      <p className="leading-7 [&:not(:first-child)]:mt-6">
                        Loading...
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : isError || data?.status === "error" ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    <div className="flex items-center flex-col justify-center">
                      <ServerCrash />
                      <p className="leading-7 [&:not(:first-child)]:mt-6">{`There seems to be an error: ${error?.message || (data as FailedRequestResponse)?.message}`}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : table.getRowModel()?.rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell, index, arr) => (
                      <TableCell
                        key={cell.id}
                        style={{
                          borderRight:
                            index === arr.length - 2
                              ? lastCellStyle
                              : cellStyle,
                        }}
                        className="py-0.5"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-end space-x-2 py-4">
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
      <div
        className={
          navigation.state === "loading"
            ? "w-screen h-screen backdrop-blur-sm z-10 absolute top-0 left-0 flex justify-center items-center flex-row"
            : "hidden"
        }
      >
        <LoaderCircle className="animate-spin" />
      </div>
    </>
  );
}
