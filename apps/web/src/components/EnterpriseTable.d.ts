import React from 'react';
export interface EnterpriseColumn<T> {
    key: string;
    title: string;
    dataIndex?: keyof T | string;
    sorter?: (a: T, b: T) => number;
    render?: (value: any, record: T, index: number) => React.ReactNode;
    width?: number | string;
    defaultVisible?: boolean;
}
interface EnterpriseTableProps<T extends Record<string, any>> {
    columns: EnterpriseColumn<T>[];
    dataSource: T[];
    loading?: boolean;
    error?: string | null;
    searchPlaceholder?: string;
    searchFields?: (keyof T | string)[];
    title?: string;
    onRefresh?: () => void;
    exportFileName?: string;
    extraHeaderActions?: React.ReactNode;
}
export declare function EnterpriseTable<T extends {
    id?: string | number;
}>({ columns, dataSource, loading, error, searchPlaceholder, searchFields, title, onRefresh, exportFileName, extraHeaderActions }: EnterpriseTableProps<T>): React.JSX.Element;
export {};
//# sourceMappingURL=EnterpriseTable.d.ts.map