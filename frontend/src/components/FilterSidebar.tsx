"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Column } from "@tanstack/react-table";
import { X } from "lucide-react";

interface FilterSidebarProps<T> {
    column: Column<T, unknown> | null;
    columnName: string;
    onClose: () => void;
}

export function FilterSidebar<T>({
    column,
    columnName,
    onClose,
}: FilterSidebarProps<T>) {
    if (!column) {
        return (
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        Filter Options
                        <Button variant="ghost" size="sm" onClick={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Click &quot;Add Filter&quot; on a column to set up
                        filtering
                    </p>
                </CardContent>
            </Card>
        );
    }

    const filterValue = (column.getFilterValue() ?? "") as string;

    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    Filter: {columnName}
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="filter-input">Contains</Label>
                    <Input
                        id="filter-input"
                        type="text"
                        placeholder="Type a value..."
                        value={filterValue}
                        onChange={(e) => column.setFilterValue(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            column.setFilterValue("");
                            onClose();
                        }}
                    >
                        Clear
                    </Button>
                    <Button size="sm" onClick={onClose}>
                        Apply
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
