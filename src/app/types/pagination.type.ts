export type TPagination = {
    totalPages: number;
    totalCount: number;
    currentPage: number;
    data: any[];
};

export const ResetPagination: TPagination = {
    totalPages: 0,
    totalCount: 0,
    currentPage: 0,
    data: []
}