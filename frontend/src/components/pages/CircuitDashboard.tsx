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
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useNavigation } from "react-router-dom";
import {
  Circuit,
  FailedRequestResponse,
  RequestResponse,
  SuccessfulRequestResponse,
} from "@/lib/types";
import { toast } from "sonner";

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

async function getCircuits(): Promise<RequestResponse<Array<Circuit>>> {
  const jwt = sessionStorage.getItem("jwt");

  if (!jwt) {
    throw new Error("JWT is undefined. Please log in.");
  }

  const res = await fetch("/api/circuits/all", {
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
  });

  debugger;

  return await res.json();
}

async function exportCircuits() {
  const jwt = sessionStorage.getItem("jwt");

  if (!jwt) {
    throw new Error("JWT is undefined. Please log in.");
  }

  const res = await fetch("/api/circuits/export", {
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch CSV: ${res.statusText}`);
  }

  return await res.blob();
}

function downloadBlob(data: Blob) {
  const url = window.URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;

  // Set filename with a timestamp
  const timestamp = new Date().toISOString().replace(/[-:.]/g, "");
  const filename = `circuits_${timestamp}.csv`;

  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove(); // Clean up the DOM
}

async function importCsvFile(file: File) {
  const jwt = sessionStorage.getItem("jwt");
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/circuits/import", {
    method: "POST",
    body: formData,
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to upload file");
  }

  return (await response.json()) as RequestResponse<string>;
}

export function CircuitDashboard() {
  const jwt = sessionStorage.getItem("jwt");
  const navigate = useNavigate();
  const navigation = useNavigation();
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

  const downloadMutation = useMutation({
    mutationFn: exportCircuits,
    onSuccess: downloadBlob,
    onError: (error) => {
      console.error(error);
      toast.error(`Export failed: ${error}`);
    },
  });

  const importMutation = useMutation({
    mutationFn: importCsvFile,
    onSuccess: (response) => {
      switch (response.status) {
        case "error":
          toast.error(response.message);
          break;
        case "success":
          toast.success(response.data);
          break;
      }
    },
    onError: (err) => {
      console.error(err);
      toast.error("Failed to import");
    },
  });

  const handleFileUpload = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (file && file.type === "text/csv") {
      importMutation.mutate(file);
    } else {
      toast.error("Please select a valid CSV file.");
    }
  };

  const handleButtonClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = handleFileUpload;
    input.click();
  };

  const { data, isLoading, isError, error } = useQuery<
    RequestResponse<Array<Circuit>>
  >({
    queryKey: ["CircuitsAll"],
    queryFn: async () => await getCircuits(),
    staleTime: 36000,
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
    if (!jwt) {
      return;
    }

    navigate("/circuits/dashboard");
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
          <div className="flex flex-row gap-4">
            <Button onClick={() => navigate("/circuits/create")}>
              Add circuit
            </Button>
            <Button
              onClick={() => downloadMutation.mutate()}
              disabled={downloadMutation.isPending}
            >
              {downloadMutation.isPending ? "Exporting..." : "Export"}
            </Button>
            <Button
              onClick={handleButtonClick}
              disabled={importMutation.isPending}
            >
              {importMutation.isPending ? "Importing..." : "Import"}
            </Button>
          </div>
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
