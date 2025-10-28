"use client";
import { TableTemplate } from "@/components/Table";
import { ColumnDef } from "@tanstack/react-table";


export default function Home() {
    type Invoice = {
        id: string;
        status: string;
        method: string;
        amount: number;
    };


    const columns: ColumnDef<Invoice>[] = [
        {
            accessorKey: "id",
            header: "Invoice",
        },
        {
            accessorKey: "status",
            header: "Status",
        },
        {
            accessorKey: "method",
            header: "Method",
        },
        {
            accessorKey: "amount",
            header: "Amount",
            cell: ({ row }) => `$${row.getValue("amount")}`,
        },
    ];


    const data: Invoice[] = [
        { id: "INV001", status: "Paid", method: "Credit Card", amount: 250.00 },
    ];
    return (
        <div className="">
            <TableTemplate data={data} columns={columns} details="A list of invoices" />
        </div>
    );
}
